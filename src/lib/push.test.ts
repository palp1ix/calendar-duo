import {afterEach, describe, expect, it, vi} from 'vitest';
vi.mock('./api', () => ({request: vi.fn(), userId: () => 'me'}));
import * as api from './api';
import {disablePush, enablePush, pushAvailability} from './push';
const request = vi.mocked(api.request);
afterEach(() => {vi.unstubAllGlobals(); vi.clearAllMocks();});
describe('device notifications', () => {
  it('explains installation on iPhone before asking permission', () => {
    vi.stubGlobal('navigator', {userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 1});
    vi.stubGlobal('matchMedia', () => ({matches: false}));
    expect(pushAvailability()).toContain('На экран Домой');
  });
  it('requests permission immediately and saves a subscription only after permission', async () => {
    const subscribe = vi.fn().mockResolvedValue({endpoint: 'https://push.test/one', toJSON: () => ({keys: {p256dh: 'public', auth: 'secret'}})});
    const worker = {pushManager: {getSubscription: vi.fn().mockResolvedValue(null), subscribe}} as unknown as ServiceWorkerRegistration;
    const permission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('Notification', {requestPermission: permission});
    request.mockResolvedValue(null);
    const result = enablePush(worker, 'AQID');
    expect(permission).toHaveBeenCalledOnce();
    await result;
    expect(subscribe).toHaveBeenCalledWith({userVisibleOnly: true, applicationServerKey: new Uint8Array([1,2,3])});
    expect(JSON.parse(request.mock.calls[0][1]!.body as string).owner).toBe('me');
  });
  it('does not register a device when permission is denied', async () => {
    vi.stubGlobal('Notification', {requestPermission: vi.fn().mockResolvedValue('denied')});
    await expect(enablePush({} as ServiceWorkerRegistration, 'AQID')).rejects.toThrow('Разрешите');
    expect(request).not.toHaveBeenCalled();
  });
  it('keeps the device subscribed if server removal fails so logout can be retried', async () => {
    const unsubscribe = vi.fn();
    vi.stubGlobal('navigator', {serviceWorker: {getRegistration: async () => ({pushManager: {getSubscription: async () => ({endpoint: 'https://push.test/one', unsubscribe})}})}});
    request.mockRejectedValue(new Error('offline'));
    await expect(disablePush()).rejects.toThrow('offline');
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
