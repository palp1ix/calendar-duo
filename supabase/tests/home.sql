-- Run as admin against an isolated/test database; all fixtures roll back.
begin;
create function pg_temp.assert(ok boolean,msg text) returns void language plpgsql as $$begin if not coalesce(ok,false) then raise exception 'assert: %',msg;end if;end$$;
alter table public.meetings disable trigger meeting_notify;
update public.meetings set status='cancelled';
delete from private.home_operations; delete from private.home_state;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=1),true);
select public.get_home('living');
select pg_temp.assert((public.get_home(null)#>>'{state,mischief}')::integer=0,'new shared home');
do $$begin
 begin perform public.change_home(gen_random_uuid(),'{"kind":"plant","location":"greenhouse","species":"cactus","name":"Рано"}');raise exception 'unlocked';exception when raise_exception then if sqlerrm not like '%закрыта%' then raise;end if;end;
end$$;
insert into public.meetings(proposer,start_at,end_at,place,status) select id,now()-interval '2 days',now()-interval '1 day','HOME TEST','completed' from public.profiles where slot=1;
insert into public.meetings(proposer,start_at,end_at,place,status) select id,now()-interval '2 days',now()-interval '1 day','HOME TEST','completed' from public.profiles where slot=1;
insert into public.meetings(proposer,start_at,end_at,place,status) select id,now()-interval '2 days',now()-interval '1 day','HOME TEST','completed' from public.profiles where slot=1;
select pg_temp.assert(jsonb_array_length(public.get_home(null)#>'{state,completedMeetings}')=3,'authoritative completed meetings');
select public.change_home('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"kind":"plant","location":"greenhouse","species":"cactus","name":"Колючий граф"}');
select public.change_home('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"kind":"plant","location":"greenhouse","species":"cactus","name":"Колючий граф"}');
select pg_temp.assert(jsonb_array_length(public.get_home(null)#>'{state,plants}')=1,'lost response retry does not duplicate a plant');
select pg_temp.assert((public.get_home(null)#>>'{state,plants,0,growth}')::numeric=0,'old meetings do not grow a new plant');
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=2),true);
select pg_temp.assert(public.get_home(null)#>>'{state,plants,0,name}'='Колючий граф','partner sees named plant');
select public.change_home('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"kind":"place","location":"living","target":"candles","placed":true}');
select public.change_home('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"kind":"place","location":"living","target":"candles","placed":true}');
select pg_temp.assert(jsonb_array_length(public.get_home(null)#>'{state,items,living}')=1,'decoration retry is a set, not a toggle');
insert into public.meetings(proposer,start_at,end_at,place,status) select id,now()-interval '2 days',now()-interval '1 day','HOME TEST growth','completed' from public.profiles where slot=1;
select pg_temp.assert((public.get_home(null)#>>'{state,plants,0,growth}')::numeric=.25,'one new meeting grows cactus by one step');
update private.home_state set active_at=now(),state=jsonb_set(state,'{nextMischiefAt}','0');
select public.get_home('living'); select public.get_home('living');
select pg_temp.assert((public.get_home(null)#>>'{state,mischief}')::integer=1,'two active sessions produce only one cat event');
create temporary table damage_test as select public.get_home(null)#>>'{state,damage,0,id}' as id;
select public.change_home(gen_random_uuid(),jsonb_build_object('kind','repair','location','living','target',(select id from damage_test)));
select pg_temp.assert(jsonb_array_length(public.get_home(null)#>'{state,damage}')=0,'repair is shared');
-- An old repair must not erase a newly generated damage with a different ID.
update private.home_state set active_at=now(),state=jsonb_set(state,'{nextMischiefAt}','0');
select public.get_home('living');
select public.change_home(gen_random_uuid(),jsonb_build_object('kind','repair','location','living','target',(select id from damage_test)));
select pg_temp.assert(jsonb_array_length(public.get_home(null)#>'{state,damage}')=1,'stale repair does not remove a later damage');
update private.home_state set active_at=now()-interval '1 day',state=jsonb_set(state,'{nextMischiefAt}','0');
select public.get_home('living');
select pg_temp.assert((public.get_home(null)#>>'{state,mischief}')::integer=2,'absence does not accumulate cat damage');
do $$begin
 begin perform public.change_home(gen_random_uuid(),'{"kind":"plant","location":"living","species":"cactus","name":"Не здесь"}');raise exception 'allowed living';exception when raise_exception then if sqlerrm not like '%оранжерее%' then raise;end if;end;
 begin perform public.change_home(gen_random_uuid(),'{"kind":"place","location":"living","target":"garland","placed":true}');raise exception 'unlocked decoration';exception when raise_exception then if sqlerrm not like '%закрыто%' then raise;end if;end;
end$$;
-- Legacy import adds named individuals without replacing the shared snapshot.
select public.change_home('dddddddd-dddd-4ddd-8ddd-dddddddddddd','{"kind":"import","plants":[{"id":"legacy-fern","species":"fern","name":"Старый друг","baseline":[]}],"items":{"living":["books"],"bedroom":[],"greenhouse":[]}}');
select pg_temp.assert(jsonb_array_length(public.get_home(null)#>'{state,plants}')=2,'legacy plant added alongside the shared plant');
select pg_temp.assert(jsonb_array_length(public.get_home(null)#>'{state,damage}')=1,'legacy import does not replace damage or repair state');
select public.change_home(gen_random_uuid(),'{"kind":"place","location":"living","target":"books","placed":false}');
select public.change_home(gen_random_uuid(),'{"kind":"import","plants":[{"id":"legacy-fern","species":"fern","name":"Старый друг","baseline":[]}],"items":{"living":["books"],"bedroom":[],"greenhouse":[]}}');
select pg_temp.assert(jsonb_array_length(public.get_home(null)#>'{state,plants}')=2,'legacy retry deduplicates by plant ID');
select pg_temp.assert(not(public.get_home(null)#>'{state,items,living}') @> '["books"]'::jsonb,'repeated import does not restore removed decoration');
select pg_temp.assert(not has_table_privilege('authenticated','private.home_state','update'),'no direct snapshot writes');
select pg_temp.assert(not has_function_privilege('anon','public.change_home(uuid,jsonb)','execute'),'anonymous cannot mutate');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
do $$begin begin perform public.get_home(null);raise exception 'outsider allowed';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end;end$$;
select 'PASS: shared plants, authoritative growth, retry dedupe, shared decor, cat lease, safe repair, absence and authorization' as result;
rollback;
