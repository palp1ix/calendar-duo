-- Run after web_push migration as database admin. All fixtures roll back.
begin;
create function pg_temp.assert(ok boolean,msg text) returns void language plpgsql as $$begin if not coalesce(ok,false) then raise exception 'assert: %',msg;end if;end$$;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=1),true);
set local role authenticated;
insert into public.push_subscriptions(owner,endpoint,p256dh,auth)
values(auth.uid(),'https://fcm.googleapis.com/ustime-rls-test',repeat('a',87),repeat('b',22));
select pg_temp.assert((select count(*)=1 from public.push_subscriptions where endpoint='https://fcm.googleapis.com/ustime-rls-test'),'owner sees subscription');
do $$begin
 begin perform * from public.push_config; raise exception 'config was readable'; exception when insufficient_privilege then null;end;
 begin perform * from public.push_deliveries; raise exception 'queue was readable'; exception when insufficient_privilege then null;end;
 begin perform * from public.claim_push_deliveries(); raise exception 'claim was callable'; exception when insufficient_privilege then null;end;
 begin insert into public.push_subscriptions(owner,endpoint,p256dh,auth) values((select id from public.profiles where slot=2),'https://fcm.googleapis.com/forged',repeat('a',87),repeat('b',22)); raise exception 'forged owner allowed'; exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=2),true);
set local role authenticated;
select pg_temp.assert((select count(*)=0 from public.push_subscriptions where endpoint='https://fcm.googleapis.com/ustime-rls-test'),'partner cannot see endpoint or keys');
update public.push_subscriptions set owner=auth.uid() where endpoint='https://fcm.googleapis.com/ustime-rls-test';
delete from public.push_subscriptions where endpoint='https://fcm.googleapis.com/ustime-rls-test';
reset role;
select pg_temp.assert((select count(*)=1 from public.push_subscriptions where endpoint='https://fcm.googleapis.com/ustime-rls-test'),'partner cannot change or remove subscription');
insert into public.notifications(recipient,body) select id,'PUSH TRANSACTION TEST' from public.profiles where slot=1;
select pg_temp.assert((select count(*)=1 from public.push_deliveries d join public.notifications n on n.id=d.notification_id where n.body='PUSH TRANSACTION TEST'),'notification queues one delivery');
-- Ignore existing real jobs while testing leases inside the rolled-back transaction.
update public.push_deliveries set next_attempt_at=now()+interval '1 day' where notification_id not in(select id from public.notifications where body='PUSH TRANSACTION TEST');
set local role service_role;
select pg_temp.assert((select count(*)=1 from public.claim_push_deliveries()),'service can claim the job');
select pg_temp.assert((select count(*)=0 from public.claim_push_deliveries()),'lease prevents a second simultaneous send');
reset role;
update public.push_deliveries set next_attempt_at=now()-interval '1 minute' where notification_id in(select id from public.notifications where body='PUSH TRANSACTION TEST');
set local role service_role;
select pg_temp.assert((select count(*)=1 from public.claim_push_deliveries()),'failed delivery can be retried after lease');
reset role;
update public.notifications set read_at=now() where body='PUSH TRANSACTION TEST';
update public.push_deliveries set next_attempt_at=now()-interval '1 minute' where notification_id in(select id from public.notifications where body='PUSH TRANSACTION TEST');
set local role service_role;
select pg_temp.assert((select count(*)=0 from public.claim_push_deliveries()),'read notifications are not pushed again');
reset role;
delete from public.push_subscriptions where endpoint='https://fcm.googleapis.com/ustime-rls-test';
select pg_temp.assert((select count(*)=0 from public.push_deliveries d join public.notifications n on n.id=d.notification_id where n.body='PUSH TRANSACTION TEST'),'unsubscribe deletes queued jobs');
rollback;
