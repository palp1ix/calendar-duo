import {afterEach, expect, it, vi} from 'vitest';
afterEach(() => {vi.unstubAllGlobals(); vi.resetModules();});
it('accepts empty 201 responses when saving a device subscription with return=minimal', async () => {
  vi.stubGlobal('localStorage', {getItem: () => JSON.stringify({access_token: 'test', refresh_token: 'test', expires_at: Date.now()/1000+3600,user:{id:'me'}})});
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status:201})));
  const api = await import('./api');
  await expect(api.request('/rest/v1/push_subscriptions', {method:'POST',body:'{}'})).resolves.toBeNull();
});
