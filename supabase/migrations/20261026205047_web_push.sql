-- Web Push subscriptions are private to their owner; keys/config/queue are server-only.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table public.push_config (
 id boolean primary key default true check(id),
 public_key text not null,
 private_key text not null,
 dispatch_token text not null default gen_random_uuid()::text,
 project_url text not null check(project_url ~ '^https://[a-z0-9]+\.supabase\.co$')
);
alter table public.push_config enable row level security;
revoke all on public.push_config from public, anon, authenticated;
grant all on public.push_config to service_role;

create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 owner uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 1 and 2048 and endpoint ~ '^https://'),
 p256dh text not null check(length(p256dh) between 80 and 100 and p256dh ~ '^[A-Za-z0-9_-]+$'),
 auth text not null check(length(auth) between 20 and 30 and auth ~ '^[A-Za-z0-9_-]+$'),
 created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;
grant select,insert,delete on public.push_subscriptions to authenticated;
grant update(owner,endpoint,p256dh,auth) on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
create policy own_select on public.push_subscriptions for select to authenticated using(owner=(select auth.uid()) and private.member());
create policy own_insert on public.push_subscriptions for insert to authenticated with check(owner=(select auth.uid()) and private.member());
create policy own_update on public.push_subscriptions for update to authenticated using(owner=(select auth.uid()) and private.member()) with check(owner=(select auth.uid()) and private.member());
create policy own_delete on public.push_subscriptions for delete to authenticated using(owner=(select auth.uid()) and private.member());
create index push_subscriptions_owner on public.push_subscriptions(owner);

create table public.push_deliveries (
 id bigint generated always as identity primary key,
 notification_id uuid not null references public.notifications(id) on delete cascade,
 subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 delivered_at timestamptz,
 unique(notification_id,subscription_id)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public, anon, authenticated;
grant all on public.push_deliveries to service_role;
grant usage,select on sequence public.push_deliveries_id_seq to service_role;
create index push_deliveries_pending on public.push_deliveries(next_attempt_at) where delivered_at is null;

-- pg_net makes the request after commit. Failures never roll back the user's action.
create function private.dispatch_push() returns void language plpgsql security definer set search_path='' as $$
declare c public.push_config;
begin
 if not exists(select 1 from public.push_deliveries d join public.notifications n on n.id=d.notification_id where d.delivered_at is null and d.attempts<8 and d.next_attempt_at<=now() and n.read_at is null and n.created_at>now()-interval '24 hours') then return; end if;
 select * into c from public.push_config where id;
 if not found then return; end if;
 perform net.http_post(
   url:=c.project_url||'/functions/v1/web-push',
   headers:=jsonb_build_object('Content-Type','application/json','x-push-dispatch',c.dispatch_token),
   body:='{"action":"dispatch"}'::jsonb, timeout_milliseconds:=5000
 );
exception when others then raise warning 'Push dispatcher unavailable';
end$$;
revoke all on function private.dispatch_push() from public,anon,authenticated;

create function private.queue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.push_deliveries(notification_id,subscription_id)
 select new.id,id from public.push_subscriptions where owner=new.recipient;
 perform private.dispatch_push();
 return new;
end$$;
revoke all on function private.queue_push() from public,anon,authenticated;
create trigger notification_push after insert on public.notifications for each row execute function private.queue_push();

-- Atomic leases prevent concurrent invocations from sending the same job together.
create function public.claim_push_deliveries() returns table(
 id bigint,notification_id uuid,subscription_id uuid,endpoint text,p256dh text,auth text,body text
) language sql security invoker set search_path='' as $$
 with picked as (
   select d.id from public.push_deliveries d join public.notifications n on n.id=d.notification_id
   where d.delivered_at is null and d.attempts<8 and d.next_attempt_at<=now()
     and n.created_at>now()-interval '24 hours' and n.read_at is null
   order by d.id for update of d skip locked limit 20
 ), leased as (
   update public.push_deliveries d set attempts=attempts+1,
     next_attempt_at=now()+least(60,power(2,d.attempts)::integer)*interval '1 minute'
   from picked where d.id=picked.id returning d.*
 ) select d.id,n.id,s.id,s.endpoint,s.p256dh,s.auth,n.body
 from leased d join public.notifications n on n.id=d.notification_id
 join public.push_subscriptions s on s.id=d.subscription_id
$$;
revoke all on function public.claim_push_deliveries() from public,anon,authenticated;
grant execute on function public.claim_push_deliveries() to service_role;

-- Retry failed requests, and prune the transport queue (in-app history remains).
select cron.schedule('ustime-push-retry','* * * * *','select private.dispatch_push()');
select cron.schedule('ustime-push-cleanup','17 3 * * *',
 $$delete from public.push_deliveries where notification_id in (select id from public.notifications where created_at<now()-interval '2 days')$$);
