import {useEffect, useState} from 'react';
import * as api from '../lib/api';
import {pushAvailability, pushRegistration, pushConfig, enablePush, disablePush, testPush} from '../lib/push';

export default function PushSettings() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [key, setKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const unavailable = pushAvailability();
  async function load() {
    setBusy(true); setMessage('');
    try {
      const [worker, config] = await Promise.all([pushRegistration(), pushConfig()]);
      setRegistration(worker); setKey(config.publicKey);
      const subscription = await worker.pushManager.getSubscription();
      const rows = subscription ? await api.request(`/rest/v1/push_subscriptions?select=endpoint&endpoint=eq.${encodeURIComponent(subscription.endpoint)}`) : [];
      setEnabled(Notification.permission === 'granted' && rows.length > 0);
    } catch {setMessage('Не удалось подключить уведомления. Проверьте интернет и попробуйте снова.');}
    finally {setBusy(false);}
  }
  useEffect(() => {if (!unavailable) void load(); else setBusy(false);}, []);
  async function toggle() {
    setBusy(true); setMessage('');
    try {
      if (enabled) {await disablePush(); setEnabled(false); setMessage('Уведомления на этом устройстве выключены.');}
      else {await enablePush(registration!, key); setEnabled(true); setMessage('Готово! Теперь важное придёт и при закрытом приложении.');}
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Не удалось изменить уведомления.');}
    finally {setBusy(false);}
  }
  return <section className="push-settings" aria-label="Уведомления на устройстве">
    <h3>Уведомления на телефоне</h3>
    <p className="muted">Приглашения, ответы, воспоминания и знаки внимания — даже когда UsTime закрыт. Настройка действует на этом устройстве.</p>
    {unavailable ? <p>{unavailable}</p> : <>
      <p>{enabled ? 'На этом устройстве включены.' : Notification.permission === 'denied' ? 'Доступ запрещён. Разрешите уведомления для UsTime в настройках телефона или браузера, затем вернитесь сюда.' : 'На этом устройстве выключены.'}</p>
      {registration && key ? <button className="secondary full" disabled={busy || (!enabled && Notification.permission === 'denied')} onClick={toggle}>{busy ? 'Подключаем…' : enabled ? 'Выключить уведомления' : 'Включить уведомления'}</button> : <button className="secondary full" disabled={busy} onClick={load}>{busy ? 'Подключаем…' : 'Повторить подключение'}</button>}
      {enabled && <button className="text-button" disabled={busy} onClick={async () => {setBusy(true); try {await testPush(); setMessage('Тестовое уведомление отправлено.');} catch {setMessage('Не удалось отправить тест. Попробуйте снова.');} finally {setBusy(false);}}}>Отправить тестовое уведомление</button>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
