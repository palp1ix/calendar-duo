-- Server reminders reuse notifications -> push_deliveries -> web-push.
-- The ledger is server-only: repeated cron runs never repeat a reminder.
create table private.meeting_reminders (
 reminder_key text not null,
 recipient uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('before','finish','inactive')),
 meeting_id uuid references public.meetings(id) on delete cascade,
 notification_id uuid references public.notifications(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key(reminder_key,recipient)
);
alter table private.meeting_reminders enable row level security;
revoke all on private.meeting_reminders from public,anon,authenticated;
create index meeting_reminders_meeting on private.meeting_reminders(meeting_id) where meeting_id is not null;

create function private.send_meeting_reminder(reminder_key text,recipient uuid,kind text,body text,meeting_id uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare inserted integer; notice_id uuid;
begin
 insert into private.meeting_reminders(reminder_key,recipient,kind,meeting_id)
 values(reminder_key,recipient,kind,meeting_id) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return false; end if;
 insert into public.notifications(recipient,body) values(recipient,body) returning id into notice_id;
 update private.meeting_reminders r set notification_id=notice_id
 where r.reminder_key=send_meeting_reminder.reminder_key and r.recipient=send_meeting_reminder.recipient;
 return true;
end$$;
revoke all on function private.send_meeting_reminder(text,uuid,text,text,uuid) from public,anon,authenticated;

create function private.generate_meeting_reminders(as_of timestamptz default now()) returns integer
language plpgsql security definer set search_path='' as $$
declare
 m public.meetings; person public.profiles; reminder_kind text; reminder_key text; message text;
 last_together timestamptz; sent integer:=0; bucket bigint;
begin
 -- Skip overlapping cron executions; meeting locks serialize cancellation/completion.
 if not pg_try_advisory_xact_lock(741954) then return 0; end if;
 -- An upcoming reminder must not be retried after its meeting has begun.
 update public.notifications n set read_at=coalesce(n.read_at,as_of)
 where n.read_at is null and n.id in (select r.notification_id from private.meeting_reminders r join public.meetings upcoming on upcoming.id=r.meeting_id where r.kind='before' and (upcoming.status<>'accepted' or upcoming.start_at<=as_of));
 for m in select * from public.meetings
   where status='accepted' and (
     (start_at>as_of and start_at<=as_of+interval '1 hour')
     or start_at<=as_of-interval '12 hours'
   ) for update skip locked
 loop
   reminder_kind:=case when m.start_at>as_of then 'before' else 'finish' end;
   reminder_key:=reminder_kind||':'||m.id::text||':'||extract(epoch from m.start_at)::text||':'||m.version::text;
   message:=case when reminder_kind='before'
     then 'Скоро ваше время вместе ♡ «'||m.place||'» начнётся в течение часа. Проверьте время на странице встречи.'
     else 'Вы уже встретились? ♡ С начала «'||m.place||'» прошло 12 часов. Завершите встречу, чтобы ваш сад подрос, или отмените её, если планы изменились.' end;
   for person in select * from public.profiles loop
     if private.send_meeting_reminder(reminder_key,person.id,reminder_kind,message,m.id) then sent:=sent+1; end if;
   end loop;
 end loop;
 perform pg_advisory_xact_lock(741953);
 -- No history yet: count from the newer of the two account creation times.
 select max(coalesce(end_at,start_at)) into last_together from public.meetings where status='completed';
 if last_together is null then
   select max(u.created_at) into last_together from auth.users u join public.profiles p on p.id=u.id;
 end if;
 if (select count(*) from public.profiles)=2 and last_together<=as_of-interval '14 days'
   and not exists(select 1 from public.meetings where status='accepted' and start_at>=as_of-interval '14 days')
   and extract(hour from as_of at time zone 'Europe/Minsk') between 9 and 20
 then
   -- Only the current week is emitted after downtime, without a backlog.
   bucket:=floor(extract(epoch from (as_of-last_together-interval '14 days'))/604800);
   reminder_key:='inactive:'||extract(epoch from last_together)::text||':'||bucket::text;
   for person in select * from public.profiles loop
     if private.send_meeting_reminder(reminder_key,person.id,'inactive',
       'Давно не виделись ♡ Уже две недели без встреч. Может, чай, прогулка или вечер вместе? Ваш маленький дом ждёт новой истории.') then sent:=sent+1; end if;
   end loop;
 end if;
 return sent;
end$$;
revoke all on function private.generate_meeting_reminders(timestamptz) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.generate_meeting_reminders(timestamptz) to service_role;

-- Cancel queued reminder pushes when the underlying meeting changes.
create function private.dismiss_meeting_reminders() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status is distinct from old.status or new.start_at is distinct from old.start_at then
   update public.notifications n set read_at=coalesce(n.read_at,now())
   where n.id in(select notification_id from private.meeting_reminders where meeting_id=new.id);
 end if;
 if new.status in ('accepted','completed') then
   update public.notifications n set read_at=coalesce(n.read_at,now())
   where n.read_at is null and n.id in(select notification_id from private.meeting_reminders where kind='inactive');
 end if;
 return new;
end$$;
revoke all on function private.dismiss_meeting_reminders() from public,anon,authenticated;
create trigger dismiss_meeting_reminders after insert or update on public.meetings
for each row execute function private.dismiss_meeting_reminders();

select cron.schedule('ustime-meeting-reminders','*/5 * * * *','select private.generate_meeting_reminders()');
