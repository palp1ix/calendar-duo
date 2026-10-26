// Read-only authenticated smoke test. Never prints account passwords or session tokens.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(line=>line.includes('=')).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1).trim()]}));
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const accounts = JSON.parse(readFileSync('.accounts.local.json','utf8'));
const account = Array.isArray(accounts) ? accounts[0] : Object.values(accounts).find(a => a?.email && a?.password);
assert(account?.email && account?.password, 'Local test account required');
const unauthorized = await fetch(`${url}/functions/v1/web-push`);
assert.equal(unauthorized.status,401);
const login = await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:account.password})});
assert.equal(login.status,200,'Login failed');
const session = await login.json();
try {
 const headers = {apikey:key,Authorization:`Bearer ${session.access_token}`};
 const first = await fetch(`${url}/functions/v1/web-push`,{headers});
 assert.equal(first.status,200,'Push config failed');
 const config = await first.json();
 assert.deepEqual(Object.keys(config),['publicKey']);
 assert.match(config.publicKey,/^[A-Za-z0-9_-]{87}$/);
 const second = await fetch(`${url}/functions/v1/web-push`,{headers});
 assert.deepEqual(await second.json(),config,'VAPID public key must be stable');
 const forbidden = await fetch(`${url}/rest/v1/push_config?select=*`,{headers});
 assert([401,403].includes(forbidden.status),'Private config accessible');
 const spoof = await fetch(`${url}/functions/v1/web-push`,{method:'POST',headers:{'Content-Type':'application/json','x-push-dispatch':'invalid'},body:'{}'});
 assert.equal(spoof.status,401,'Dispatcher accepted invalid secret');
 console.log('Push server OK: auth, stable VAPID key, private key isolation, dispatcher authentication.');
} finally {
 // Revoke only this test session, preserving the user's other devices.
 await fetch(`${url}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${session.access_token}`}});
}
