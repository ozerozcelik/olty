insert into public.fish_species (
  name_tr,
  name_en,
  name_scientific,
  category,
  description_tr,
  habitat_tr,
  best_season_tr,
  bait_tr,
  is_active
)
values
  (
    'Tral Balığı',
    'Atlantic Stargazer',
    'Uranoscopus scaber',
    'deniz',
    'Kuma ve çamura gömülerek pusu kuran dip avcısı bir türdür.',
    'Kumlu-çamurlu dipler, sığ koylar ve açık kıyı meraları.',
    'İlkbahar sonu ve yaz.',
    'Karides, küçük dip yemleri ve sürütme takımları.',
    true
  )
on conflict (name_tr) do update set
  name_en = excluded.name_en,
  name_scientific = excluded.name_scientific,
  category = excluded.category,
  description_tr = excluded.description_tr,
  habitat_tr = excluded.habitat_tr,
  best_season_tr = excluded.best_season_tr,
  bait_tr = excluded.bait_tr,
  is_active = excluded.is_active;
