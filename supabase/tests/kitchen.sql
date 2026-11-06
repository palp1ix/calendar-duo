-- Transactional project checks. No relationship data or meetings are changed.
begin;
create function pg_temp.assert_kitchen(ok boolean,msg text) returns void language plpgsql as $$begin if not coalesce(ok,false) then raise exception 'assert: %',msg;end if;end$$;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=1),true);
select public.get_home(null);
-- A fresh project fixture, keeping all other home content intact. Everything rolls back.
update private.home_state set state=jsonb_set(state,'{kitchen}','{"stage":0,"style":"sage"}');
select public.change_home('a3f24551-1dda-4fba-95e5-21abaf4a1011','{"kind":"build","stage":1,"style":"clay"}');
select public.change_home('a3f24551-1dda-4fba-95e5-21abaf4a1011','{"kind":"build","stage":1,"style":"clay"}');
select pg_temp.assert_kitchen((public.get_home(null)#>>'{state,kitchen,stage}')::integer=1,'retry never advances twice');
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=2),true);
select pg_temp.assert_kitchen(public.get_home(null)#>>'{state,kitchen,style}'='clay','partner sees chosen style');
do $$begin
 begin perform public.change_home(gen_random_uuid(),'{"kind":"build","stage":3,"style":"clay"}');raise exception 'stage skipped';exception when raise_exception then if sqlerrm not like '%изменился%' then raise;end if;end;
 begin perform public.change_home(gen_random_uuid(),'{"kind":"build","stage":2,"style":"sage"}');raise exception 'style replaced';exception when raise_exception then if sqlerrm not like '%выбран%' then raise;end if;end;
 begin perform public.change_home(gen_random_uuid(),'{"kind":"build","stage":1.5,"style":"clay"}');raise exception 'fraction accepted';exception when raise_exception then if sqlerrm<>'Invalid building stage' then raise;end if;end;
end$$;
update private.home_state set state=jsonb_set(state,'{progressUnits}','2');
select public.change_home(gen_random_uuid(),'{"kind":"build","stage":2,"style":"clay"}');
select public.change_home(gen_random_uuid(),'{"kind":"build","stage":3,"style":"clay"}');
select pg_temp.assert_kitchen((public.get_home(null)#>>'{state,kitchen,stage}')::integer=3,'project completes');
select pg_temp.assert_kitchen(not has_function_privilege('anon','public.change_home(uuid,jsonb)','execute'),'anonymous cannot build');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
do $$begin begin perform public.change_home(gen_random_uuid(),'{"kind":"build","stage":1,"style":"clay"}');raise exception 'outsider allowed';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end;end$$;
rollback;
