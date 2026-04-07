insert into public.badge_definitions (slug, name_tr, description_tr, xp_reward, category)
values ('gear_legend', 'Gear Master', 'En az 5 ekipmanın var ve hepsi Efsane seviyede', 150, 'gear')
on conflict (slug) do update set
  name_tr = excluded.name_tr,
  description_tr = excluded.description_tr,
  xp_reward = excluded.xp_reward,
  category = excluded.category;
