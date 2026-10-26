import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect, it, vi} from 'vitest';
import {allowedEndpoint} from '../../supabase/functions/web-push/validation';
function worker(clients: object = {}) {
  const listeners: Record<string, (event: any) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const self = {registration: {scope: 'https://example.com/calendar-duo/', showNotification}, addEventListener: (name: string, fn: any) => {listeners[name] = fn;}, clients};
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {self, URL});
  return {listeners, showNotification};
}
it('shows a push while no app window is open with a stable tag to deduplicate retries', async () => {
  const w = worker(); let done: Promise<void> | undefined;
  w.listeners.push({data: {json: () => ({id: 'notice-1', body: 'Привет'})}, waitUntil: (p: Promise<void>) => {done = p;}});
  await done;
  expect(w.showNotification).toHaveBeenCalledWith('UsTime ♡', expect.objectContaining({body: 'Привет', tag: 'notice-1', data: {url: 'https://example.com/calendar-duo/#notifications'}}));
});
it('opens the installed app inbox on a cold notification click', async () => {
  const openWindow = vi.fn(); let done: Promise<void> | undefined;
  const w = worker({matchAll: async () => [], openWindow});
  w.listeners.notificationclick({notification: {close: vi.fn()}, waitUntil: (p: Promise<void>) => {done = p;}});
  await done;
  expect(openWindow).toHaveBeenCalledWith('https://example.com/calendar-duo/#notifications');
});
it('focuses an existing app and opens the inbox without duplicating windows', async () => {
  const client = {url: 'https://example.com/calendar-duo/', focus: vi.fn(), postMessage: vi.fn()};
  const openWindow = vi.fn(); let done: Promise<void> | undefined;
  const w = worker({matchAll: async () => [client], openWindow});
  w.listeners.notificationclick({notification: {close: vi.fn()}, waitUntil: (p: Promise<void>) => {done = p;}});
  await done;
  expect(client.focus).toHaveBeenCalledOnce();
  expect(client.postMessage).toHaveBeenCalledWith({type: 'OPEN_NOTIFICATIONS'});
  expect(openWindow).not.toHaveBeenCalled();
});
it('permits only HTTPS push service endpoints, blocking SSRF', () => {
  for (const url of ['https://fcm.googleapis.com/fcm/send/123', 'https://web.push.apple.com/Q123', 'https://updates.push.services.mozilla.com/wpush/v2/123']) expect(allowedEndpoint(url)).toBe(true);
  for (const url of ['http://fcm.googleapis.com/a','https://fcm.googleapis.com.attacker.com/a','https://127.0.0.1/a','https://localhost/a','https://fcm.googleapis.com:444/a','https://evil@fcm.googleapis.com/a']) expect(allowedEndpoint(url)).toBe(false);
});
