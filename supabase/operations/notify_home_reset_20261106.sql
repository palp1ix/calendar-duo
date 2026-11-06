-- Send the release announcement through the existing notification/push queue.
-- Stable per-recipient IDs make retrying safe: no duplicate announcements.
begin;
do $$begin
 if not exists(select 1 from private.home_state where state->>'resetId'='house-rebuild-20261106') then
  raise exception 'Announce only after the home reset is complete';
 end if;
end $$;
insert into public.notifications(id,recipient,body)
select md5('ustime-house-rebuild-20261106:'||id::text)::uuid,id,
 'Ваш дом разграбили — всё сначала! Это обновление игры: стройте новый дом вместе. Встречи, воспоминания и записки сохранены.'
from public.profiles where slot in (1,2)
on conflict (id) do nothing;
select count(*) as notifications,count(distinct recipient) as recipients
from public.notifications n where n.id=md5('ustime-house-rebuild-20261106:'||n.recipient::text)::uuid;
commit;
