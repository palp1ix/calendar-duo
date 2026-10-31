import {afterEach, expect, it, vi} from 'vitest';
afterEach(() => {vi.unstubAllGlobals(); vi.resetModules();});
it('accepts empty 201 responses when saving a device subscription with return=minimal', async () => {
  vi.stubGlobal('localStorage', {getItem: () => JSON.stringify({access_token: 'test', refresh_token: 'test', expires_at: Date.now()/1000+3600,user:{id:'me'}})});
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status:201})));
  const api = await import('./api');
  await expect(api.request('/rest/v1/push_subscriptions', {method:'POST',body:'{}'})).resolves.toBeNull();
});

it('keeps HTTP status so unknown server failures can retry an operation safely',async()=>{
 vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600,user:{id:'me'}})});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({message:'Temporary server failure'}),{status:503})));
 const api=await import('./api');await expect(api.request('/rest/v1/rpc/change_home',{method:'POST',body:'{}'})).rejects.toMatchObject({status:503,message:'Temporary server failure'});
});

it('downloads private photos directly with authorization and no persistent HTTP cache',async()=>{
 vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600,user:{id:'me'}})});
 const fetch=vi.fn().mockResolvedValue(new Response(new Blob(['photo'],{type:'image/jpeg'})));vi.stubGlobal('fetch',fetch);
 const api=await import('./api');expect((await api.downloadPhoto('owner/photo.jpg')).size).toBe(5);
 expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/storage/v1/object/authenticated/memories/owner/photo.jpg'),expect.objectContaining({cache:'no-store',credentials:'omit',headers:expect.objectContaining({Authorization:'Bearer test'})}));
});
