-- Rollback-only checks: preserve real furniture, plants, progress and operations.
begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=1),true);
select public.get_home(null);
update private.home_state set state=jsonb_set(jsonb_set(state,'{progressUnits}','12'),'{plants}','[]');
do $$
declare target text; species text; op uuid; snapshot jsonb;
begin
 foreach target in array array['television','playstation','burger-machine','king-bed'] loop
  op:=gen_random_uuid();
  snapshot:=public.change_home(op,jsonb_build_object('kind','place','location',case when target='king-bed' then 'bedroom' else 'living' end,'target',target,'placed',true));
  if not (snapshot#>array['state','items',case when target='king-bed' then 'bedroom' else 'living' end]) @> jsonb_build_array(target) then raise exception 'New furniture missing: %',target; end if;
  perform public.change_home(op,jsonb_build_object('kind','place','location',case when target='king-bed' then 'bedroom' else 'living' end,'target',target,'placed',true));
 end loop;
 foreach species in array array['sakura','lemon-tree','japanese-maple'] loop
  snapshot:=public.change_home(gen_random_uuid(),jsonb_build_object('kind','plant','location','greenhouse','species',species,'name','Проверочное дерево'));
  if not (snapshot#>'{state,plants}') @> jsonb_build_array(jsonb_build_object('species',species)) then raise exception 'Tree missing: %',species;end if;
 end loop;
 begin perform public.change_home(gen_random_uuid(),'{"kind":"place","location":"living","target":"king-bed","placed":true}');raise exception 'wrong room accepted';exception when raise_exception then if sqlerrm<>'Этот предмет предназначен для другой комнаты' then raise;end if;end;
 begin perform public.change_home(gen_random_uuid(),'{"kind":"plant","location":"living","species":"sakura","name":"Дерево"}');raise exception 'indoor tree accepted';exception when raise_exception then if sqlerrm='indoor tree accepted' then raise;end if;end;
 if has_function_privilege('anon','public.change_home(uuid,jsonb)','execute') then raise exception 'anonymous write allowed';end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where slot=2),true);
do $$begin if jsonb_array_length(public.get_home(null)#>'{state,plants}')<>3 then raise exception 'partner cannot see trees';end if;end$$;
rollback;
