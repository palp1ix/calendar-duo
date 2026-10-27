import {homeMock} from './fixtures/sharedHome';
import {expect, test, type Page} from '@playwright/test';
async function setup(page: Page, denied = false) {
  await page.addInitScript(({denied}) => {
    localStorage.setItem('ustime.session', JSON.stringify({access_token: 'ui-test-only', refresh_token: 'ui-test-only', expires_at: Date.now()/1000+3600, user: {id: 'me'}}));
    let subscription: any = null;
    const pushManager = {
      getSubscription: async () => subscription,
      subscribe: async () => {subscription = {endpoint: 'https://fcm.googleapis.com/test-device', toJSON: () => ({keys: {p256dh: 'a'.repeat(87), auth: 'b'.repeat(22)}}), unsubscribe: async () => {subscription = null; return true;}}; return subscription;},
    };
    const registration = {pushManager};
    Object.defineProperty(window, 'PushManager', {value: function() {}});
    Object.defineProperty(window, 'Notification', {value: {permission: denied ? 'denied' : 'default', requestPermission: async () => {return 'granted';}}});
    Object.defineProperty(navigator, 'serviceWorker', {value: {register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration, addEventListener() {}, removeEventListener() {}}});
  }, {denied});
  const shared=homeMock([]);
  let saved = false;
  const requests: string[] = [];
  await page.route('**/*.supabase.co/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
    requests.push(`${method} ${path}`);
    let data: unknown = [];if(path.endsWith('/get_home'))data=shared.snapshot();
    if (path.endsWith('/profiles')) data = [{id: 'me',slot: 1,name: 'Саша',hair: '#000000',outfit: '#76896a',hairstyle: 'short',travel: 35,prep: 10,return_buffer: 0,together_until: null},{id: 'her',slot: 2,name: 'Маша',hair: '#f2d784',outfit: '#bd8271',hairstyle: 'bob',travel: 20,prep: 10,return_buffer: 0,together_until: null}];
    if (path.endsWith('/web-push')) data = method === 'GET' ? {publicKey: 'AQID'} : {queued: true};
    if (path.endsWith('/push_subscriptions')) {
      if (method === 'POST') saved = true;
      if (method === 'DELETE') saved = false;
      data = saved ? [{endpoint: 'https://fcm.googleapis.com/test-device'}] : [];
    }
    if (path.endsWith('/push_subscriptions') && method === 'POST') await route.fulfill({status: 201,body: ''});
    else await route.fulfill({status: 200,contentType: 'application/json',body: JSON.stringify(data)});
  });
  await page.goto('./');
  await page.getByRole('button', {name: 'Мои настройки'}).click();
  return requests;
}
test('enable, send test, disable and enable again on the current device', async ({page}) => {
  const requests = await setup(page);
  await page.getByRole('button', {name: 'Включить уведомления',exact: true}).click();
  await expect(page.getByText('На этом устройстве включены.')).toBeVisible();
  expect(requests).toContain('POST /rest/v1/push_subscriptions');
  await page.getByRole('button', {name: 'Отправить тестовое уведомление'}).click();
  await expect(page.locator('.push-settings').getByRole('status')).toContainText('Тестовое уведомление отправлено');
  expect(requests).toContain('POST /functions/v1/web-push');
  await page.getByRole('button', {name: 'Выключить уведомления',exact: true}).click();
  await expect(page.getByText('На этом устройстве выключены.', {exact: true})).toBeVisible();
  expect(requests).toContain('DELETE /rest/v1/push_subscriptions');
  await page.getByRole('button', {name: 'Включить уведомления',exact: true}).click();
  await expect(page.getByText('На этом устройстве включены.')).toBeVisible();
  await page.getByRole('button', {name: 'Выйти из квартиры'}).click();
  await expect(page.getByRole('button', {name: 'Войти в нашу квартиру →'})).toBeVisible();
  const logout = requests.indexOf('POST /auth/v1/logout');
  expect(requests[logout-1]).toBe('DELETE /rest/v1/push_subscriptions');
});
test('denied permission explains system settings and does not register a subscription', async ({page}) => {
  const requests = await setup(page, true);
  await expect(page.getByText(/Доступ запрещён/)).toBeVisible();
  await expect(page.getByRole('button', {name: 'Включить уведомления',exact: true})).toBeDisabled();
  expect(requests).not.toContain('POST /rest/v1/push_subscriptions');
});
test('notification deep link opens the inbox after a cold launch', async ({page}) => {
  await setup(page);
  await page.goto('./#notifications');
  await expect(page.getByRole('heading', {name: 'Почта нашего дома'})).toBeVisible();
});
