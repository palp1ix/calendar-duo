-- Run against a disposable database after migrations. All mutations roll back.
begin;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','me@ustime.invalid'),('22222222-2222-4222-8222-222222222222','her@ustime.invalid');
insert into public.profiles(id,slot,name) values('11111111-1111-4111-8111-111111111111',1,'Первый'),('22222222-2222-4222-8222-222222222222',2,'Второй');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
select public.story_action('start','33333333-3333-4333-8333-333333333333');
select public.story_action('start','33333333-3333-4333-8333-333333333333');
do $$begin
 begin perform public.story_action('accept','33333333-3333-4333-8333-333333333333');raise exception 'Self-confirmation allowed';
 exception when others then if sqlerrm<>'Подтвердить должен второй человек' then raise;end if;end;
 begin perform public.story_action('start','44444444-4444-4444-8444-444444444444');raise exception 'Duplicate active request allowed';
 exception when others then if sqlerrm<>'Встреча уже начата или ждёт подтверждения' then raise;end if;end;
end$$;
select public.story_action('letter','55555555-5555-4555-8555-555555555555','{"body":"Привет, любимый человек"}');
select public.story_action('letter','55555555-5555-4555-8555-555555555555','{"body":"Привет, любимый человек"}');
do $$begin
 begin perform public.story_action('open','55555555-5555-4555-8555-555555555555');raise exception 'Author opened own letter';
 exception when others then if sqlerrm<>'Открыть записку может только получатель' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select public.story_action('accept','33333333-3333-4333-8333-333333333333');
select public.story_action('accept','33333333-3333-4333-8333-333333333333');
select public.story_action('open','55555555-5555-4555-8555-555555555555');
select public.story_action('stop','33333333-3333-4333-8333-333333333333');
select public.story_action('stop','33333333-3333-4333-8333-333333333333');
reset role;
do $$begin
 if (select count(*) from private.together_sessions)<>1 then raise exception 'Duplicate session';end if;
 if (select count(*) from private.love_letters)<>1 then raise exception 'Duplicate letter';end if;
 if (select opened_at is null from private.love_letters limit 1) then raise exception 'Letter not opened';end if;
end$$;
-- Live time counts immediately; overlapping completed meetings cannot double it.
update private.together_sessions set started_at=now()-interval '3 hours',ends_at=now()+interval '9 hours';
insert into public.meetings(id,proposer,start_at,end_at,status,place) values('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111',now()-interval '1 hour',now(),'completed','STORY TEST');
do $$begin
 if abs(private.shared_minutes()-180)>0.01 then raise exception 'Interval union failed: %',private.shared_minutes();end if;
 if abs(private.shared_minutes(now()-interval '30 minutes')-30)>0.01 then raise exception 'Plant baseline failed';end if;
end$$;
set local role authenticated;
select public.story_action('since',null,jsonb_build_object('since',(current_date-100)::text));
select public.get_home('living');
select public.change_home('77777777-7777-4777-8777-777777777777','{"kind":"plant","location":"greenhouse","species":"mint","name":"Мята"}');
reset role;
update private.home_state set state=jsonb_set(state,'{plants,0,plantedAt}',to_jsonb((extract(epoch from now()-interval '90 minutes')*1000)::bigint));
set local role authenticated;
do $$declare h jsonb;begin
 h:=public.get_home('greenhouse');
 if (h#>>'{state,progressUnits}')::int<7 then raise exception 'Calendar progress failed';end if;
 if (h#>>'{state,plants,0,growth}')::numeric<0.33 then raise exception 'Live plant growth failed';end if;
end$$;
-- Changing the date must never take away an earned room.
select public.story_action('since',null,jsonb_build_object('since',current_date::text));
do $$declare h jsonb;begin h:=public.get_home('living');if (h#>>'{state,progressUnits}')::int<7 then raise exception 'Lost earned opening';end if;end$$;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',true);
do $$begin
 begin perform public.story_action();raise exception 'Nonmember read story';exception when others then if sqlerrm<>'Access denied' then raise;end if;end;
end$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.story_action(text,uuid,jsonb)','execute') then raise exception 'Anonymous RPC access';end if;
 if has_table_privilege('authenticated','private.together_sessions','update') then raise exception 'Direct session write access';end if;
 if has_table_privilege('authenticated','private.love_letters','select') then raise exception 'Direct letter access';end if;
end$$;
rollback;
