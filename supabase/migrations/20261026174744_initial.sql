-- UsTime: exactly two permanent seats. No public registration.
create schema if not exists private;
revoke all on schema private from public;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 slot smallint not null unique check(slot in(1,2)), name text not null check(length(name) between 1 and 40),
 hair text not null default '#55392e' check(hair ~ '^#[a-fA-F0-9]{6}$'),outfit text not null default '#69816b' check(outfit ~ '^#[a-fA-F0-9]{6}$'),
 hairstyle text not null default 'short' check(hairstyle in('short','long')),
 travel integer not null default 35 check(travel between 0 and 240),prep integer not null default 10 check(prep between 0 and 120),
 return_buffer integer not null default 0 check(return_buffer between 0 and 240),together_until timestamptz
);
create function private.member() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=(select auth.uid()))$$;
revoke all on function private.member() from public;
grant usage on schema private to authenticated;
grant execute on function private.member() to authenticated;
alter table public.profiles enable row level security;
create policy members_read on public.profiles for select to authenticated using(private.member());
create policy own_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant select on public.profiles to authenticated;
grant update(name,hair,outfit,hairstyle,travel,prep,return_buffer,together_until) on public.profiles to authenticated;
create table public.schedules(
 id uuid primary key default gen_random_uuid(),owner uuid not null references public.profiles(id),
 day date not null,start_time time not null,end_time time not null check(end_time>start_time),
 kind text not null check(kind in('college','work','personal','busy','free','preferred','unavailable')),
 state text not null check(state in('available','unavailable','unknown')),
 weekdays integer[] not null default '{}',interval_weeks integer not null default 1 check(interval_weeks in(1,2)),
 until_day date,exceptions date[] not null default '{}',is_private boolean not null default false,
 check(until_day is null or until_day>=day),check(weekdays <@ array[0,1,2,3,4,5,6])
);
create table public.schedule_details(id uuid primary key references public.schedules(id) on delete cascade,title text not null check(length(title)<=160));
alter table public.schedules enable row level security;
alter table public.schedule_details enable row level security;
create policy member_read on public.schedules for select to authenticated using(private.member());
create policy own_insert on public.schedules for insert to authenticated with check(owner=(select auth.uid()) and private.member());
create policy own_update on public.schedules for update to authenticated using(owner=(select auth.uid())) with check(owner=(select auth.uid()));
create policy own_delete on public.schedules for delete to authenticated using(owner=(select auth.uid()));
create policy details_read on public.schedule_details for select to authenticated using(exists(select 1 from public.schedules s where s.id=schedule_details.id and (s.owner=(select auth.uid()) or not s.is_private)));
create policy details_write on public.schedule_details for all to authenticated using(exists(select 1 from public.schedules s where s.id=schedule_details.id and s.owner=(select auth.uid()))) with check(exists(select 1 from public.schedules s where s.id=schedule_details.id and s.owner=(select auth.uid())));
grant select,insert,update,delete on public.schedules,public.schedule_details to authenticated;
create table public.meetings(
 id uuid primary key default gen_random_uuid(),proposer uuid not null references public.profiles(id),start_at timestamptz not null,end_at timestamptz,
 place text not null check(length(place) between 1 and 160),description text not null default '' check(length(description)<=2000),message text not null default '' check(length(message)<=500),
 status text not null default 'proposed' check(status in('proposed','accepted','declined','counter','cancelled','completed')),
 version integer not null default 1,countered boolean not null default false,cozy boolean not null default false,created_at timestamptz not null default now(),
 check(end_at is null or end_at>start_at)
);
alter table public.meetings enable row level security;
create policy member_read on public.meetings for select to authenticated using(private.member());
create policy propose on public.meetings for insert to authenticated with check(private.member() and proposer=(select auth.uid()) and status='proposed' and version=1 and not countered and not cozy and start_at>now());
grant select,insert on public.meetings to authenticated;
create table public.notifications(id uuid primary key default gen_random_uuid(),recipient uuid not null references public.profiles(id),body text not null,read_at timestamptz,created_at timestamptz not null default now());
alter table public.notifications enable row level security;
create policy own_read on public.notifications for select to authenticated using(recipient=(select auth.uid()) and private.member());
create policy own_update on public.notifications for update to authenticated using(recipient=(select auth.uid())) with check(recipient=(select auth.uid()));
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
create function private.notify() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); msg text;
begin
 if not private.member() then raise exception 'Access denied';end if;
 if TG_TABLE_NAME='meetings' then
 msg:=case new.status when 'proposed' then 'Вас вызывают на обнимательное совещание. Новое приглашение!' when 'accepted' then 'Свидание подтверждено. Отступать поздно.' when 'counter' then 'Есть встречное предложение по времени.' when 'declined' then 'Сейчас не получается. Давайте найдём другое время.' when 'cancelled' then 'Встреча отменена. Плед официально грустит.' else 'Ещё одна встреча в нашей истории.' end;
 elsif TG_TABLE_NAME='memories' then msg:='В нашей истории новое воспоминание.';
 else msg:=case new.kind when 'hug' then 'Вам доставлены виртуальные обнимашки.' when 'heart' then 'Вам передали маленькое пиксельное сердце.' when 'tea' then 'Чайник вскипел. Вас ждут на воображаемый чай.' else 'Вас нежно тыкнули. Проверка связи.' end;end if;
 insert into public.notifications(recipient,body) select id,msg from public.profiles where id<>actor;
 return new;
end$$;
revoke all on function private.notify() from public;
create trigger meeting_notify after insert or update on public.meetings for each row execute function private.notify();
-- Atomic row-locked transition. SECURITY DEFINER is needed because direct UPDATE is revoked.
create function public.respond_meeting(meeting_id uuid,expected_version integer,action text,new_start timestamptz default null,new_end timestamptz default null,new_place text default null,was_cozy boolean default false) returns public.meetings language plpgsql security definer set search_path='' as $$
declare m public.meetings;uid uuid:=auth.uid();
begin
 if uid is null or not private.member() then raise exception 'Access denied';end if;
 select * into m from public.meetings where id=meeting_id for update;
 if not found then raise exception 'Meeting not found';end if;
 if m.version<>expected_version then raise exception 'STALE: приглашение уже изменилось. Обновите экран.';end if;
 if action in('accepted','declined','counter') then
 if m.status not in('proposed','counter') or m.proposer=uid then raise exception 'Ответить может только второй человек';end if;
 elsif action='cancelled' then
 if m.status not in('proposed','counter','accepted') then raise exception 'Встреча уже закрыта';end if;
 elsif action='completed' then
 if m.status<>'accepted' or m.start_at>now() then raise exception 'Сначала дождитесь подтверждённой встречи';end if;
 if new_end is null or new_end<=m.start_at or new_end>now() then raise exception 'Укажите фактическое время окончания';end if;
 else raise exception 'Invalid action';end if;
 if ((action='accepted' and m.start_at<=now()) or (action='counter' and (new_start is null or new_start<=now()))) then raise exception 'Выберите будущее время';end if;
 if action='counter' and (new_start is null or new_end is null or new_end<=new_start) then raise exception 'Проверьте время';end if;
 if action='accepted' and exists(select 1 from public.meetings x where x.id<>m.id and x.status='accepted' and x.start_at<coalesce(m.end_at,m.start_at+interval '90 minutes') and coalesce(x.end_at,x.start_at+interval '90 minutes')>m.start_at) then raise exception 'На это время уже есть встреча';end if;
 -- Serialize accepts across distinct rows, preventing two simultaneous overlapping accepts.
 perform pg_advisory_xact_lock(741953);
 if action='accepted' and exists(select 1 from public.meetings x where x.id<>m.id and x.status='accepted' and x.start_at<coalesce(m.end_at,m.start_at+interval '90 minutes') and coalesce(x.end_at,x.start_at+interval '90 minutes')>m.start_at) then raise exception 'На это время уже есть встреча';end if;
 update public.meetings set status=action,version=version+1,
 proposer=case when action='counter' then uid else proposer end,
 start_at=case when action='counter' then new_start else start_at end,
 end_at=case when action in('counter','completed') then new_end else end_at end,
 place=case when action='counter' then coalesce(new_place,place) else place end,
 countered=countered or action='counter',cozy=case when action='completed' then was_cozy else cozy end
 where id=meeting_id returning * into m;return m;
end$$;
revoke all on function public.respond_meeting(uuid,integer,text,timestamptz,timestamptz,text,boolean) from public;
grant execute on function public.respond_meeting(uuid,integer,text,timestamptz,timestamptz,text,boolean) to authenticated;
create table public.interactions(id uuid primary key default gen_random_uuid(),actor uuid not null references public.profiles(id),kind text not null check(kind in('hug','heart','poke','tea')),created_at timestamptz not null default now());
alter table public.interactions enable row level security;
create policy member_read on public.interactions for select to authenticated using(private.member());
create policy own_insert on public.interactions for insert to authenticated with check(private.member() and actor=(select auth.uid()));
grant select,insert on public.interactions to authenticated;
create trigger interaction_notify after insert on public.interactions for each row execute function private.notify();
create table public.memories(id uuid primary key default gen_random_uuid(),meeting_id uuid not null references public.meetings(id),author uuid not null references public.profiles(id),note text not null check(length(note) between 1 and 2000),moment text not null default '' check(length(moment)<=500),label text not null default '' check(length(label)<=80),photo text,created_at timestamptz not null default now());
alter table public.memories enable row level security;
create policy member_read on public.memories for select to authenticated using(private.member());
create policy own_insert on public.memories for insert to authenticated with check(private.member() and author=(select auth.uid()) and exists(select 1 from public.meetings where id=meeting_id and status='completed') and (photo is null or photo like author::text||'/%'));
grant select,insert on public.memories to authenticated;
create trigger memory_notify after insert on public.memories for each row execute function private.notify();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('memories','memories',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy couple_photos_read on storage.objects for select to authenticated using(bucket_id='memories' and private.member());
create policy own_photos_insert on storage.objects for insert to authenticated with check(bucket_id='memories' and private.member() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_photos_delete on storage.objects for delete to authenticated using(bucket_id='memories' and private.member() and (storage.foldername(name))[1]=(select auth.uid())::text);
create index schedules_owner on public.schedules(owner);
create index meetings_start on public.meetings(start_at);
create index notifications_recipient on public.notifications(recipient,created_at desc);
create index memories_meeting on public.memories(meeting_id);
-- Supabase default privileges must be revoked explicitly, including named roles.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(name,hair,outfit,hairstyle,travel,prep,return_buffer,together_until) on public.profiles to authenticated;
grant select,insert,update,delete on public.schedules,public.schedule_details to authenticated;
grant select,insert on public.meetings,public.interactions,public.memories to authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
revoke execute on all functions in schema public from anon;
create or replace function public.save_schedule(payload jsonb,event_title text) returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.schedules;
begin
 if (payload->>'owner')::uuid <> auth.uid() then raise exception 'Access denied';end if;
 insert into public.schedules(owner,day,start_time,end_time,kind,state,weekdays,interval_weeks,until_day,exceptions,is_private)
 values(auth.uid(),(payload->>'day')::date,(payload->>'start_time')::time,(payload->>'end_time')::time,
 case when (payload->>'is_private')::boolean then case when payload->>'state'='available' then 'free' else 'busy' end else payload->>'kind' end,
 payload->>'state',array(select jsonb_array_elements_text(payload->'weekdays')::integer),(payload->>'interval_weeks')::integer,(payload->>'until_day')::date,array(select jsonb_array_elements_text(payload->'exceptions')::date),(payload->>'is_private')::boolean) returning * into s;
 insert into public.schedule_details(id,title) values(s.id,event_title);
 if payload->>'replaces' is not null then
 update public.schedules set exceptions=array_append(exceptions,(payload->>'exception_day')::date) where id=(payload->>'replaces')::uuid and owner=auth.uid();
 if not found then raise exception 'Исходное событие уже изменилось';end if;
 end if;
 return s.id;
end$$;
create or replace function public.except_schedule(schedule_id uuid,exception_day date) returns void language sql security invoker set search_path='' as $$update public.schedules set exceptions=array_append(exceptions,exception_day) where id=schedule_id and owner=auth.uid() and not exception_day=any(exceptions)$$;
revoke all on function public.save_schedule(jsonb,text),public.except_schedule(uuid,date) from public,anon;
grant execute on function public.save_schedule(jsonb,text),public.except_schedule(uuid,date) to authenticated;
-- Enforce the same private-type masking even for direct Data API writes.
create function private.mask_schedule() returns trigger language plpgsql set search_path='' as $$begin if new.is_private then new.kind:=case when new.state='available' then 'free' else 'busy' end;end if;return new;end$$;
revoke all on function private.mask_schedule() from public;
create trigger mask_private_schedule before insert or update on public.schedules for each row execute function private.mask_schedule();
-- Auth itself rejects any account outside the two fixed identifiers.
create function private.guard_account() returns trigger language plpgsql set search_path='' as $$begin if new.email not in('me@ustime.invalid','her@ustime.invalid') then raise exception 'This home has exactly two keys';end if;if TG_OP='UPDATE' and old.email<>new.email then raise exception 'Account identifiers are permanent';end if;return new;end$$;
revoke all on function private.guard_account() from public;
create trigger ustime_two_accounts before insert or update of email on auth.users for each row execute function private.guard_account();
-- Privileged mutation lives outside exposed schemas; the API wrapper is invoker.
alter function public.respond_meeting(uuid,integer,text,timestamptz,timestamptz,text,boolean) set schema private;
revoke all on function private.respond_meeting(uuid,integer,text,timestamptz,timestamptz,text,boolean) from public,anon;
grant execute on function private.respond_meeting(uuid,integer,text,timestamptz,timestamptz,text,boolean) to authenticated;
create function public.respond_meeting(meeting_id uuid,expected_version integer,action text,new_start timestamptz default null,new_end timestamptz default null,new_place text default null,was_cozy boolean default false) returns public.meetings language sql security invoker set search_path='' as $$select private.respond_meeting(meeting_id,expected_version,action,new_start,new_end,new_place,was_cozy)$$;
revoke all on function public.respond_meeting(uuid,integer,text,timestamptz,timestamptz,text,boolean) from public,anon;
grant execute on function public.respond_meeting(uuid,integer,text,timestamptz,timestamptz,text,boolean) to authenticated;
