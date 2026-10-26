-- Personal appearances, kept on the two permanent profiles across devices.
alter table public.profiles drop constraint profiles_hairstyle_check;
alter table public.profiles add constraint profiles_hairstyle_check check (hairstyle in ('short','bob','long'));
update public.profiles set hair='#000000',hairstyle='short' where slot=1;
update public.profiles set hair='#f2d784',hairstyle='bob' where slot=2;
