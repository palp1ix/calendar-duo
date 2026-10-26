import * as api from './api';

export function pushAvailability(): string | null {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !matchMedia('(display-mode: standalone)').matches && !(navigator as Navigator & {standalone?: boolean}).standalone)
    return 'На iPhone откройте сайт в Safari → «Поделиться» → «На экран Домой». Затем откройте UsTime с иконки (нужна iOS 16.4 или новее).';
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return 'Этот браузер не поддерживает push-уведомления. Откройте приложение в Safari на iPhone или Chrome на Android через HTTPS.';
  return null;
}

export async function pushRegistration() {
  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  // ready resolves only after an active worker exists, including a first install.
  await navigator.serviceWorker.ready;
  return registration;
}

export async function pushConfig(): Promise<{publicKey: string}> {
  return api.request('/functions/v1/web-push', {method: 'GET'});
}

export async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  await api.request('/rest/v1/push_subscriptions?on_conflict=endpoint', {
    method: 'POST', headers: {Prefer: 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify({owner: api.userId(), endpoint: subscription.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth}),
  });
}

export async function enablePush(registration: ServiceWorkerRegistration, publicKey: string) {
  // Called directly from the button: iOS requires the permission prompt during a user gesture.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Разрешите уведомления для UsTime в настройках телефона или браузера.');
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    subscription = await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: bytes});
  }
  await saveSubscription(subscription);
}

export async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  // Remove the server binding first, so logout cannot leave a live subscription for this account.
  await api.request(`/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(subscription.endpoint)}`, {method: 'DELETE'});
  await subscription.unsubscribe();
}

export async function testPush() {
  return api.request('/functions/v1/web-push', {method: 'POST', body: JSON.stringify({action: 'test'})});
}
