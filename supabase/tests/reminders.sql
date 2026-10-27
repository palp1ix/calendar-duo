-- Database admin only. Never dispatches a real push: everything rolls back.
begin;
create function pg_temp.assert(ok boolean,msg text) returns void language plpgsql as $$begin if not coalesce(ok,false) then raise exception 'assert: %',msg;end if;end$$;
-- Isolate the existing couple history without deleting user data.
alter table public.meetings disable trigger meeting_notify;
update public.meetings set status='cancelled';
delete from private.meeting_reminders;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=1),true);
insert into public.push_subscriptions(owner,endpoint,p256dh,auth)
select id,'https://fcm.googleapis.com/reminders-rollback-test',repeat('a',87),repeat('b',22) from public.profiles where slot=1;
create temporary table reminder_fixture(label text,id uuid default gen_random_uuid());
insert into reminder_fixture(label) values('before'),('too-early'),('finish'),('not-yet'),('cancelled'),('pending'),('completed');
insert into public.meetings(id,proposer,start_at,end_at,place,status)
select f.id,p.id,
 case f.label when 'before' then '2026-10-27 12:30Z'::timestamptz when 'too-early' then '2026-10-27 14:00Z'::timestamptz when 'finish' then '2026-10-27 00:00Z'::timestamptz when 'not-yet' then '2026-10-27 00:01Z'::timestamptz else '2026-10-27 12:30Z'::timestamptz end,
 null,'REMINDER TEST '||f.label,
 case f.label when 'cancelled' then 'cancelled' when 'pending' then 'proposed' when 'completed' then 'completed' else 'accepted' end
from reminder_fixture f cross join public.profiles p where p.slot=1;
select pg_temp.assert(private.generate_meeting_reminders('2026-10-27 12:00Z')=4,'before within hour and overdue at exactly 12h notify both people');
select pg_temp.assert((select count(*)=4 from private.meeting_reminders),'no reminders for pending, cancelled, completed or not-yet-due meetings');
select pg_temp.assert((select count(*)=2 from public.push_deliveries d join private.meeting_reminders r on r.notification_id=d.notification_id),'reminders enter existing push transport');
select pg_temp.assert(private.generate_meeting_reminders('2026-10-27 12:00Z')=0,'same cron run is idempotent');
update public.meetings set status='cancelled' where id=(select id from reminder_fixture where label='before');
select pg_temp.assert((select bool_and(n.read_at is not null) from public.notifications n join private.meeting_reminders r on r.notification_id=n.id where r.meeting_id=(select id from reminder_fixture where label='before')),'cancellation dismisses queued reminders');
update public.meetings set status='completed',end_at='2026-10-27 12:00Z' where id=(select id from reminder_fixture where label='finish');
select pg_temp.assert((select bool_and(n.read_at is not null) from public.notifications n join private.meeting_reminders r on r.notification_id=n.id where r.meeting_id=(select id from reminder_fixture where label='finish')),'completion dismisses finish reminders');
-- Remaining fixtures no longer affect inactivity checks.
update public.meetings set status='cancelled';
insert into public.meetings(proposer,start_at,end_at,place,status)
select id,'2026-10-01 10:00Z','2026-10-01 12:00Z','REMINDER TEST last meeting','completed' from public.profiles where slot=1;
select pg_temp.assert(private.generate_meeting_reminders('2026-10-15 11:59Z')=0,'no inactivity reminder before 14 days');
select pg_temp.assert(private.generate_meeting_reminders('2026-10-15 12:00Z')=2,'14-day inactivity reminder goes to both');
select pg_temp.assert(private.generate_meeting_reminders('2026-10-21 12:00Z')=0,'no repeat before a week');
select pg_temp.assert(private.generate_meeting_reminders('2026-10-22 12:00Z')=2,'a weekly reminder is allowed');
select pg_temp.assert(private.generate_meeting_reminders('2026-10-29 23:00Z')=0,'inactivity reminder waits for daytime Minsk');
select pg_temp.assert(private.generate_meeting_reminders('2026-11-15 12:00Z')=2,'downtime produces only the current reminder without backlog');
insert into public.meetings(proposer,start_at,place,status)
select id,'2026-11-25 12:00Z','REMINDER TEST planned','accepted' from public.profiles where slot=1;
select pg_temp.assert(private.generate_meeting_reminders('2026-11-24 12:00Z')=0,'an accepted upcoming plan suppresses inactivity reminders');
select pg_temp.assert((select bool_and(n.read_at is not null) from public.notifications n join private.meeting_reminders r on r.notification_id=n.id where r.kind='inactive'),'new plan dismisses queued inactivity reminders');
select pg_temp.assert(not has_table_privilege('authenticated','private.meeting_reminders','select'),'reminder ledger is server-only');
select pg_temp.assert(not has_function_privilege('authenticated','private.generate_meeting_reminders(timestamptz)','execute'),'client cannot generate reminders');
select pg_temp.assert(not has_function_privilege('anon','private.send_meeting_reminder(text,uuid,text,text,uuid)','execute'),'client cannot forge notices');
select pg_temp.assert((select count(*)=1 from cron.job where jobname='ustime-meeting-reminders' and schedule='*/5 * * * *'),'scheduler is installed');
select 'PASS: reminder timing, deduplication, lifecycle, inactivity cadence, quiet hours, push queue and access control' as result;
rollback;
