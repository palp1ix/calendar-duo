-- Private shared story; no client-written timestamps or counters.
create table private.couple_story(id boolean primary key default true check(id), since date);
insert into private.couple_story(id) values(true);
create table private.together_sessions(
 id uuid primary key, proposer uuid not null references public.profiles(id),
 requested_at timestamptz not null default now(), cancelled_at timestamptz, started_at timestamptz, ends_at timestamptz,
 check ((started_at is null and ends_at is null) or (started_at is not null and ends_at>=started_at))
);
create table private.love_letters(
 id uuid primary key, author uuid not null references public.profiles(id),
 body text not null check(char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default now(), opened_at timestamptz
);
alter table private.couple_story enable row level security;
alter table private.together_sessions enable row level security;
alter table private.love_letters enable row level security;
revoke all on private.couple_story,private.together_sessions,private.love_letters from public,anon,authenticated;

-- Union intervals: completing a calendar meeting never counts the same time twice.
create function private.shared_minutes(after_at timestamptz default '-infinity', until_at timestamptz default now())
returns numeric language sql stable set search_path='' as $$
 with spans as (
 select greatest(start_at,after_at) a,least(end_at,until_at) b from public.meetings
 where status='completed' and end_at is not null and end_at>after_at and start_at<until_at
 union all
 select greatest(started_at,after_at),least(ends_at,until_at) from private.together_sessions
 where started_at is not null and ends_at>after_at and started_at<until_at
 ), running as (select *,max(b) over(order by a,b rows between unbounded preceding and 1 preceding) prior_end from spans where b>a),
 islands as (select *,sum(case when prior_end is null or a>prior_end then 1 else 0 end) over(order by a,b) grp from running),
 merged as (select min(a) a,max(b) b from islands group by grp)
 select coalesce(sum(extract(epoch from b-a)/60),0) from merged
$$;
revoke all on function private.shared_minutes(timestamptz,timestamptz) from public,anon,authenticated;

create function private.story_action(action text, operation_id uuid default null, payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare member_id uuid:=auth.uid(); current_session private.together_sessions; letter private.love_letters; result jsonb; story_day date;
begin
 if member_id is null or not private.member() then raise exception 'Access denied'; end if;
 -- One lock serializes both members, including simultaneous starts and retries.
 perform 1 from private.couple_story where id for update;
 if action='since' then
  story_day:=(payload->>'since')::date;
  if story_day is null or story_day>current_date or story_day<date '1900-01-01' then raise exception 'Выберите дату в прошлом или сегодня'; end if;
  update private.couple_story set since=story_day where id;
 elsif action='start' then
  if operation_id is null then raise exception 'Operation ID required'; end if;
  if exists(select 1 from private.together_sessions where id=operation_id and proposer<>member_id) then raise exception 'Operation ID already used'; end if;
  if not exists(select 1 from private.together_sessions where id=operation_id) then
   if exists(select 1 from private.together_sessions where cancelled_at is null and (ends_at>now() or (started_at is null and requested_at>now()-interval '30 minutes'))) then raise exception 'Встреча уже начата или ждёт подтверждения'; end if;
   insert into private.together_sessions(id,proposer) values(operation_id,member_id);
  end if;
 elsif action in ('accept','stop') then
  select * into current_session from private.together_sessions where id=operation_id for update;
  if not found then raise exception 'Встреча не найдена'; end if;
  if action='accept' then
   if current_session.proposer=member_id then raise exception 'Подтвердить должен второй человек'; end if;
   if current_session.started_at is null then
    if current_session.cancelled_at is not null or current_session.requested_at<=now()-interval '30 minutes' then raise exception 'Приглашение устарело. Начните заново'; end if;
    update private.together_sessions set started_at=now(),ends_at=now()+interval '12 hours' where id=operation_id;
   end if;
  else
   if current_session.started_at is null then update private.together_sessions set cancelled_at=coalesce(cancelled_at,now()) where id=operation_id;
   else update private.together_sessions set ends_at=least(ends_at,now()) where id=operation_id; end if;
  end if;
 elsif action='letter' then
  if operation_id is null or coalesce(char_length(btrim(payload->>'body')),0) not between 1 and 1000 then raise exception 'Записка: от 1 до 1000 символов'; end if;
  select * into letter from private.love_letters where id=operation_id;
  if found then
   if letter.author<>member_id or letter.body<>btrim(payload->>'body') then raise exception 'Operation ID already used'; end if;
  else insert into private.love_letters(id,author,body) values(operation_id,member_id,btrim(payload->>'body')); end if;
 elsif action='open' then
  update private.love_letters set opened_at=coalesce(opened_at,now()) where id=operation_id and author<>member_id;
  if not found then raise exception 'Открыть записку может только получатель'; end if;
 elsif action<>'read' or action is null then raise exception 'Unknown action';
 end if;
 select jsonb_build_object('since',since,'server_now',now(),
  'sessions',(select coalesce(jsonb_agg(to_jsonb(s) order by s.requested_at),'[]') from private.together_sessions s),
  'letters',(select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc),'[]') from private.love_letters l)) into result from private.couple_story where id;
 return result;
end$$;
revoke all on function private.story_action(text,uuid,jsonb) from public,anon;
grant execute on function private.story_action(text,uuid,jsonb) to authenticated;
create function public.story_action(action text default 'read',operation_id uuid default null,payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$select private.story_action(action,operation_id,payload)$$;
revoke all on function public.story_action(text,uuid,jsonb) from public,anon;
grant execute on function public.story_action(text,uuid,jsonb) to authenticated;

create or replace function private.home_action(operation_id uuid default null, payload jsonb default '{"kind":"read"}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 h private.home_state; previous jsonb; recorded private.home_operations; member_id uuid:=auth.uid();
 kind text:=payload->>'kind'; loc text:=payload->>'location'; target text:=payload->>'target';
 completed jsonb; total integer; capacity integer; species text; title text; plant jsonb; updated jsonb;
 baseline jsonb; required integer; steps integer; item jsonb; damage jsonb; choices jsonb; chosen jsonb;
 story_day date; elapsed_days numeric; live_minutes numeric; legacy_steps integer;
 millis bigint:=(extract(epoch from clock_timestamp())*1000)::bigint; did_import boolean;
begin
 if member_id is null or not private.member() then raise exception 'Access denied'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>24000 then raise exception 'Invalid operation'; end if;
 if kind is null or kind not in ('read','plant','place','repair','import') then raise exception 'Invalid operation'; end if;
 if kind<>'read' and operation_id is null then raise exception 'Operation ID required'; end if;
 insert into private.home_state(id,state) values(true,jsonb_build_object(
  'version',2,'location','living','items',jsonb_build_object('living','[]'::jsonb,'bedroom','[]'::jsonb,'greenhouse','[]'::jsonb),
  'plants','[]'::jsonb,'completedMeetings','[]'::jsonb,'damage','[]'::jsonb,'mischief',0,
  'nextMischiefAt',millis+45000,'lastEvent','Кошка недовольна. Пока просто смотрит.'
 )) on conflict do nothing;
 select * into h from private.home_state where id for update;
 previous:=h.state;
 select coalesce(jsonb_agg(id::text order by id),'[]'::jsonb) into completed from public.meetings where status='completed';
 select since into story_day from private.couple_story where id;
 elapsed_days:=greatest(0,current_date-story_day);
 live_minutes:=private.shared_minutes();
 total:=greatest(coalesce((h.state->>'progressUnits')::integer,0),jsonb_array_length(completed),floor(live_minutes/90)::integer,coalesce(floor(elapsed_days/14)::integer,0));
 capacity:=least(6,3+total/3);
 h.state:=jsonb_set(h.state,'{progressUnits}',to_jsonb(total));
 h.state:=jsonb_set(h.state,'{progressValue}',to_jsonb(greatest(total::numeric,live_minutes/90,coalesce(elapsed_days/14,0))));
 h.state:=jsonb_set(h.state,'{completedMeetings}',completed);
 -- Recalculate growth from authoritative meetings on every snapshot.
 updated:='[]'::jsonb;
 for plant in select value from jsonb_array_elements(h.state->'plants') loop
  required:=case plant->>'species' when 'marigold' then 3 when 'mint' then 3 when 'lavender' then 5 when 'monstera' then 6 else 4 end;
  select count(*) into steps from jsonb_array_elements(completed) c where not (plant->'baseline') @> jsonb_build_array(c.value);
  -- Existing meeting-based growth stays valid. New growth also advances while together and with calendar time.
  updated:=updated||jsonb_build_array(jsonb_set(plant,'{growth}',to_jsonb(least(1.0,greatest(
   coalesce((plant->>'growth')::numeric,0),steps::numeric/required,
   private.shared_minutes(to_timestamp((plant->>'plantedAt')::numeric/1000))/(required*90)
    + greatest(0,extract(epoch from now()-to_timestamp((plant->>'plantedAt')::numeric/1000)))/(required*7*86400)
  )))));
 end loop;
 h.state:=jsonb_set(h.state,'{plants}',updated);
 if operation_id is not null then
  select * into recorded from private.home_operations where id=operation_id;
  if found then
   if recorded.actor<>member_id or recorded.payload<>payload then raise exception 'Operation ID already used'; end if;
   kind:='read'; loc:=null; -- A lost response can be retried without replaying the action.
  end if;
 end if;
 if kind in ('plant','place','repair') and (loc is null or loc not in ('living','bedroom','greenhouse')) then raise exception 'Choose a room'; end if;
 if kind in ('plant','place','repair') and total<(case loc when 'bedroom' then 2 when 'greenhouse' then 3 else 0 end) then raise exception 'Эта комната ещё закрыта'; end if;
 if kind='plant' then
  if loc<>'greenhouse' then raise exception 'Растения сажают в оранжерее'; end if;
  species:=payload->>'species'; title:=btrim(payload->>'name');
  if species is null or species not in ('marigold','cactus','mint','pumpkin','fern','lavender','monstera') then raise exception 'Unknown plant'; end if;
  if title is null or char_length(title) not between 1 and 24 then raise exception 'Имя должно содержать от 1 до 24 символов'; end if;
  if total<(case species when 'mint' then 1 when 'pumpkin' then 2 when 'fern' then 3 when 'lavender' then 5 when 'monstera' then 8 else 0 end) then raise exception 'Этот вид ещё закрыт'; end if;
  if jsonb_array_length(h.state->'plants')>=capacity then raise exception 'В саду пока нет свободных мест'; end if;
  plant:=jsonb_build_object('id',operation_id::text,'species',species,'name',title,'plantedAt',millis,'baseline',completed,'growth',0);
  h.state:=jsonb_set(h.state,'{plants}',(h.state->'plants')||jsonb_build_array(plant));
 elsif kind='place' then
  if target is null or target not in ('candles','cushion','pumpkin','books','ghost','garland') or jsonb_typeof(payload->'placed') is distinct from 'boolean' then raise exception 'Invalid decoration'; end if;
  if total<(case target when 'candles' then 1 when 'cushion' then 2 when 'pumpkin' then 3 when 'books' then 4 when 'ghost' then 5 else 6 end) then raise exception 'Это украшение ещё закрыто'; end if;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into updated from jsonb_array_elements(h.state#>array['items',loc]) where value<>to_jsonb(target);
  if (payload->>'placed')::boolean then updated:=updated||jsonb_build_array(target); end if;
  h.state:=jsonb_set(h.state,array['items',loc],updated);
 elsif kind='repair' then
  if target is null or target='' then raise exception 'Выберите повреждение'; end if;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into updated from jsonb_array_elements(h.state->'damage') where not(value->>'id'=target and value->>'location'=loc);
  h.state:=jsonb_set(h.state,'{damage}',updated);
  h.state:=jsonb_set(h.state,'{lastEvent}',to_jsonb('Всё починено. Кошка смотрит с неодобрением и строит планы.'::text));
 elsif kind='import' then
  -- Per-user, additive legacy import. No whole-snapshot overwrites or imported damage.
  select exists(select 1 from private.home_operations ops where ops.actor=member_id and ops.payload->>'kind'='import') into did_import;

  if jsonb_typeof(payload->'plants') is distinct from 'array' or jsonb_array_length(payload->'plants')>6 then raise exception 'Invalid legacy plants'; end if;
  for plant in select value from jsonb_array_elements(payload->'plants') loop
   if jsonb_typeof(plant)<>'object' or coalesce(plant->>'id','')='' or char_length(plant->>'id')>100 or coalesce(btrim(plant->>'name'),'')='' or char_length(btrim(plant->>'name'))>24 or coalesce(plant->>'species','') not in ('marigold','cactus','mint','pumpkin','fern','lavender','monstera') or jsonb_typeof(plant->'baseline') is distinct from 'array' then raise exception 'Invalid legacy plant'; end if;
   if exists(select 1 from jsonb_array_elements(h.state->'plants') p where p.value->>'id'=plant->>'id') then continue; end if;
   if jsonb_array_length(h.state->'plants')>=capacity then raise exception 'Выберите меньше растений для переноса: в саду не хватает мест'; end if;
   select coalesce(jsonb_agg(c.value),'[]'::jsonb) into baseline from jsonb_array_elements(completed) c where plant->'baseline' @> jsonb_build_array(c.value);
   required:=case plant->>'species' when 'marigold' then 3 when 'mint' then 3 when 'lavender' then 5 when 'monstera' then 6 else 4 end;
  steps:=jsonb_array_length(completed)-jsonb_array_length(baseline);
  plant:=jsonb_build_object('id',plant->>'id','species',plant->>'species','name',btrim(plant->>'name'),'baseline',baseline,'plantedAt',millis,'growth',least(1.0,steps::numeric/required));
   h.state:=jsonb_set(h.state,'{plants}',(h.state->'plants')||jsonb_build_array(plant));
  end loop;
  if not did_import then
  for loc in select unnest(array['living','bedroom','greenhouse']) loop
   if total<(case loc when 'bedroom' then 2 when 'greenhouse' then 3 else 0 end) then continue; end if;
   if jsonb_typeof(payload#>array['items',loc]) is distinct from 'array' then continue; end if;
   for item in select value from jsonb_array_elements(payload#>array['items',loc]) loop
    target:=item#>>'{}';
    if target not in ('candles','cushion','pumpkin','books','ghost','garland') then continue; end if;
    if total<(case target when 'candles' then 1 when 'cushion' then 2 when 'pumpkin' then 3 when 'books' then 4 when 'ghost' then 5 else 6 end) then continue; end if;
    if not (h.state#>array['items',loc]) @> jsonb_build_array(target) then h.state:=jsonb_set(h.state,array['items',loc],(h.state#>array['items',loc])||jsonb_build_array(target)); end if;
   end loop;
  end loop;
  end if;
  loc:=null;
 end if;
 if kind<>'read' then insert into private.home_operations(id,actor,payload) values(operation_id,member_id,payload); end if;
 -- Heartbeats from an unlocked visible room drive one shared, leased cat event.
 if kind='read' and loc in ('living','bedroom','greenhouse') and total>=(case loc when 'bedroom' then 2 when 'greenhouse' then 3 else 0 end) then
  if h.active_at is null or h.active_at<now()-interval '25 seconds' then
   h.state:=jsonb_set(h.state,'{nextMischiefAt}',to_jsonb(millis+45000));
  elsif (h.state->>'nextMischiefAt')::bigint<=millis then
   choices:=jsonb_build_array(jsonb_build_object('target','sofa','text',case loc when 'bedroom' then 'Кошка подрала покрывало. Ей не понравился цвет.' when 'greenhouse' then 'Кошка подрала бортик грядки. Просто так.' else 'Кошка подрала диван. Теперь это её дизайнерская работа.' end),jsonb_build_object('target','pot','text','Кошка опрокинула горшок. Земля теперь тоже декор.'));
   for item in select value from jsonb_array_elements(h.state#>array['items',loc]) loop choices:=choices||jsonb_build_array(jsonb_build_object('target',item#>>'{}','text','Кошка испортила украшение. И даже не извинилась.')); end loop;
   select value into chosen from jsonb_array_elements(choices) c where not exists(select 1 from jsonb_array_elements(h.state->'damage') d where d.value->>'location'=loc and d.value->>'target'=c.value->>'target') order by random() limit 1;
   if found then
    damage:=chosen||jsonb_build_object('id',gen_random_uuid()::text,'location',loc);
    h.state:=jsonb_set(h.state,'{damage}',(h.state->'damage')||jsonb_build_array(damage));
    h.state:=jsonb_set(h.state,'{mischief}',to_jsonb((h.state->>'mischief')::integer+1));
    h.state:=jsonb_set(h.state,'{lastEvent}',chosen->'text');
   end if;
   h.state:=jsonb_set(h.state,'{nextMischiefAt}',to_jsonb(millis+60000+(random()*60000)::integer));
  end if;
  h.active_at:=now();
 end if;
 if h.state is distinct from previous then h.revision:=h.revision+1; end if;
 update private.home_state set state=h.state,revision=h.revision,active_at=h.active_at,updated_at=case when h.state is distinct from previous then now() else updated_at end where id;
 return jsonb_build_object('revision',h.revision,'state',h.state);
end$$;
