-- The couple's calendar is in Minsk; UTC is still yesterday after local midnight.
alter policy own_insert on public.memories with check (
 private.member() and author=(select auth.uid())
 and (meeting_id is null or exists(select 1 from public.meetings where id=memories.meeting_id and status='completed'))
 and (memory_date is null or memory_date <= (now() at time zone 'Europe/Minsk')::date)
 and (photo is null or photo like author::text||'/%')
);
