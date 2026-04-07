insert into public.badge_definitions (slug, name_tr, description_tr, xp_reward, category) values
('first_catch',       'İlk Av',            'İlk balığını yakala',                    50,  'milestone'),
('ten_catches',       'Çaylak Balıkçı',    '10 av kaydı oluştur',                    75,  'milestone'),
('fifty_catches',     'Deneyimli',         '50 av kaydı oluştur',                    150, 'milestone'),
('hundred_catches',   'Usta Elleri',       '100 av kaydı oluştur',                   300, 'milestone'),
('streak_3',          '3 Günlük Seri',     '3 gün üst üste av kaydı',                30,  'streak'),
('streak_7',          'Haftalık Avcı',     '7 gün üst üste av kaydı',                80,  'streak'),
('streak_30',         'Aylık Efendi',      '30 gün üst üste av kaydı',               250, 'streak'),
('first_bass',        'Levrek Avcısı',     'İlk levreği yakala',                     40,  'species'),
('five_species',      'Meraklı Balıkçı',   '5 farklı tür yakala',                    100, 'species'),
('ten_species',       'Tür Koleksiyoncusu','10 farklı tür yakala',                   200, 'species'),
('first_release',     'Serbest Bırakıcı',  'İlk C&R avını yap',                      60,  'eco'),
('ten_releases',      'Doğa Dostu',        '10 C&R avı yap',                         120, 'eco'),
('eco_warrior',       'Çevre Savaşçısı',   '50 C&R avı yap',                         300, 'eco'),
('first_follower',    'Fark Edildin',      'İlk takipçini kazan',                    20,  'social'),
('popular',           'Popüler',           '100 takipçiye ulaş',                     100, 'social')
on conflict (slug) do update set
  name_tr = excluded.name_tr,
  description_tr = excluded.description_tr,
  xp_reward = excluded.xp_reward,
  category = excluded.category;

insert into public.fish_species (name_tr, name_en, category, is_active) values
('Levrek', 'Sea Bass', 'deniz', true),
('Sazan', 'Carp', 'tatlı_su', true),
('Alabalık', 'Trout', 'tatlı_su', true),
('Kefal', 'Mullet', 'deniz', true),
('Çipura', 'Sea Bream', 'deniz', true),
('Lüfer', 'Bluefish', 'deniz', true),
('Palamut', 'Bonito', 'göç', true),
('Turna', 'Pike', 'tatlı_su', true),
('Yayın', 'Wels Catfish', 'tatlı_su', true),
('İstavrit', 'Horse Mackerel', 'deniz', true)
on conflict do nothing;
