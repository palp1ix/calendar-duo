-- Explicit, one-time production operation. Not a schema migration.
-- Only home_state is changed; repeat execution never wipes rebuilt progress.
begin isolation level repeatable read;
do $$
declare
 release_id constant text := 'house-rebuild-20261106';
 old_home private.home_state; protected_before jsonb := '{}'; protected_after jsonb := '{}';
 dataset text; checksum jsonb; did_reset boolean := false;
 millis bigint := (extract(epoch from clock_timestamp())*1000)::bigint;
begin
 foreach dataset in array array['public.meetings','public.memories','private.love_letters','private.couple_story','private.together_sessions','public.schedules','public.schedule_details','public.profiles','storage.objects'] loop
  execute format('select jsonb_build_object(''rows'',count(*),''fingerprint'',md5(coalesce(string_agg(md5(to_jsonb(t)::text),'''' order by to_jsonb(t)::text),''''))) from %s t',dataset) into checksum;
  protected_before := protected_before || jsonb_build_object(dataset,checksum);
 end loop;
 select * into strict old_home from private.home_state where id for update;
 if old_home.state->>'resetId' is distinct from release_id then
  update private.home_state set state=state || jsonb_build_object(
   'location','living','items',jsonb_build_object('living','[]'::jsonb,'bedroom','[]'::jsonb,'greenhouse','[]'::jsonb),
   'plants','[]'::jsonb,'damage','[]'::jsonb,'mischief',0,'kitchen',jsonb_build_object('stage',0,'style','sage'),
   'nextMischiefAt',millis+45000,'resetAt',millis,'resetId',release_id,
   'lastEvent','Ваш дом разграбили — всё сначала! Строим новый дом вместе.'
  ), revision=revision+1, active_at=null, updated_at=now() where id;
  did_reset := true;
 end if;
 foreach dataset in array array['public.meetings','public.memories','private.love_letters','private.couple_story','private.together_sessions','public.schedules','public.schedule_details','public.profiles','storage.objects'] loop
  execute format('select jsonb_build_object(''rows'',count(*),''fingerprint'',md5(coalesce(string_agg(md5(to_jsonb(t)::text),'''' order by to_jsonb(t)::text),''''))) from %s t',dataset) into checksum;
  protected_after := protected_after || jsonb_build_object(dataset,checksum);
 end loop;
 if protected_before<>protected_after then raise exception 'Protected relationship data changed; home reset rolled back';end if;
 perform set_config('ustime.reset_report',jsonb_build_object('reset',did_reset,'backup',to_jsonb(old_home),'protected_unchanged',true,'protected',protected_after)::text,true);
end $$;
select current_setting('ustime.reset_report')::jsonb as report;
commit;
