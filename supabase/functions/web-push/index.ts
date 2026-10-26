import webpush from 'npm:web-push@3.6.7';
import {allowedEndpoint} from './validation.ts';

const projectUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
async function db(path: string, init: RequestInit = {}) {
  const response = await fetch(`${projectUrl}/rest/v1/${path}`, {...init, headers: {apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...init.headers}});
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
type Config = {public_key: string; private_key: string; dispatch_token: string};
async function configuration(): Promise<Config> {
  let rows = await db('push_config?id=eq.true');
  if (!rows.length) {
    const keys = webpush.generateVAPIDKeys();
    // Atomically keep the first key pair if two first-time requests race.
    await db('push_config?on_conflict=id', {method: 'POST', headers: {Prefer: 'resolution=ignore-duplicates,return=minimal'}, body: JSON.stringify({id: true, public_key: keys.publicKey, private_key: keys.privateKey, project_url: projectUrl})});
    rows = await db('push_config?id=eq.true');
  }
  return rows[0];
}
type Job = {id: number; notification_id: string; subscription_id: string; endpoint: string; p256dh: string; auth: string; body: string};
async function dispatch(config: Config) {
  const jobs: Job[] = await db('rpc/claim_push_deliveries', {method: 'POST', body: '{}'});
  let sent = 0;
  await Promise.all(jobs.map(async job => {
    try {
      // Endpoints are untrusted client data. Never contact arbitrary/internal hosts.
      if (!allowedEndpoint(job.endpoint)) {
        await db(`push_subscriptions?id=eq.${job.subscription_id}`, {method: 'DELETE'});
        return;
      }
      const details = webpush.generateRequestDetails({endpoint: job.endpoint, keys: {p256dh: job.p256dh, auth: job.auth}}, JSON.stringify({id: job.notification_id, body: job.body}), {
        TTL: 86400, urgency: 'normal', vapidDetails: {subject: 'https://palp1ix.github.io/calendar-duo/', publicKey: config.public_key, privateKey: config.private_key},
      });
      const response = await fetch(details.endpoint, {method: 'POST', headers: details.headers, body: new Uint8Array(details.body), redirect: 'error', signal: AbortSignal.timeout(10000)});
      await response.body?.cancel();
      if (response.ok) {
        await db(`push_deliveries?id=eq.${job.id}`, {method: 'PATCH', body: JSON.stringify({delivered_at: new Date().toISOString()})});
        sent++;
      } else if (response.status === 404 || response.status === 410) {
        await db(`push_subscriptions?id=eq.${job.subscription_id}`, {method: 'DELETE'});
      }
      // Other statuses keep their lease and retry with exponential backoff.
    } catch { console.error('Push delivery failed', job.id); }
  }));
  return {processed: jobs.length, sent};
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, {headers: cors});
  if (!['GET', 'POST'].includes(request.method)) return reply({error: 'Method not allowed'}, 405);
  try {
    const dispatchToken = request.headers.get('x-push-dispatch');
    if (dispatchToken) {
      const config = await configuration();
      if (request.method !== 'POST' || dispatchToken !== config.dispatch_token) return reply({error: 'Unauthorized'}, 401);
      return reply(await dispatch(config));
    }
    // Gateway JWT verification is off to support the internal dispatcher. Validate browser JWTs with Auth.
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({error: 'Unauthorized'}, 401);
    const auth = await fetch(`${projectUrl}/auth/v1/user`, {headers: {apikey: serviceKey, Authorization: authorization}});
    if (!auth.ok) return reply({error: 'Unauthorized'}, 401);
    const user = await auth.json();
    const profiles = await db(`profiles?select=id&id=eq.${encodeURIComponent(user.id)}`);
    if (!profiles.length) return reply({error: 'Forbidden'}, 403);
    const config = await configuration();
    if (request.method === 'GET') return reply({publicKey: config.public_key});
    const body = await request.json();
    if (body.action !== 'test') return reply({error: 'Unknown action'}, 400);
    const subscriptions = await db(`push_subscriptions?select=id&owner=eq.${user.id}`);
    if (!subscriptions.length) return reply({error: 'Сначала включите уведомления.'}, 400);
    // The same durable queue handles tests and actual events; no recipient is accepted from the caller.
    const recent = await db(`notifications?select=id&recipient=eq.${user.id}&body=eq.${encodeURIComponent('Уведомления работают. Наш маленький мир на связи ♡')}&created_at=gt.${encodeURIComponent(new Date(Date.now() - 30000).toISOString())}`);
    if (recent.length) return reply({error: 'Подождите 30 секунд перед следующим тестом.'}, 429);
    await db('notifications', {method: 'POST', body: JSON.stringify({recipient: user.id, body: 'Уведомления работают. Наш маленький мир на связи ♡'})});
    return reply({queued: true});
  } catch { return reply({error: 'Push service unavailable'}, 503); }
});
