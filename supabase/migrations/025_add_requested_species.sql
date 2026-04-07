update public.fish_species
set name_tr = 'Sargos'
where name_tr = 'Sargoz';

update public.fish_species
set name_tr = 'Lipsos'
where name_tr = 'Lipsoz';

update public.fish_species
set name_tr = 'Lagos'
where name_tr = 'Lahoz';

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
  ('Çinekop', 'Young Bluefish', 'Pomatomus saltatrix', 'deniz', 'Lüfer ailesinin hızlı ve saldırgan genç boy dönemidir.', 'Boğaz geçişleri, kıyı akıntıları ve yem balığı yoğun hatlar.', 'Sonbahar.', 'Küçük rapala, kaşık ve ince takım.', true),
  ('Sarıkanat', 'Juvenile Bluefish', 'Pomatomus saltatrix', 'deniz', 'Lüfer grubunun kıyıdan çok aranan sportif boylarından biridir.', 'Akıntılı kıyılar, boğaz hattı ve yem balığı geçişleri.', 'Sonbahar.', 'Küçük minnow, kaşık ve canlı yem.', true),
  ('Kofana', 'Large Bluefish', 'Pomatomus saltatrix', 'deniz', 'Lüferin iri ve çok güçlü boyudur.', 'Boğaz, açık kıyı geçişleri ve yoğun yem sürüleri.', 'Geç sonbahar ve kış başı.', 'Canlı yem, büyük rapala ve sağlam takımlar.', true),
  ('Torik', 'Large Bonito', 'Sarda sarda', 'göç', 'Palamut grubunun iri boy formudur.', 'Açık su geçişleri, boğaz hattı ve göç yolları.', 'Sonbahar.', 'Çapari, çekili takım ve metal yemler.', true),
  ('Hamsi', 'Anchovy', 'Engraulis encrasicolus', 'göç', 'Karadeniz ve Marmara avcılığında çok bilinen küçük sürü balığıdır.', 'Orta su kolonları, kıyı sürüleri ve açık su geçişleri.', 'Sonbahar ve kış.', 'Çapari ve küçük tüy takımları.', true),
  ('Kıraça', 'Young Horse Mackerel', 'Trachurus mediterraneus', 'deniz', 'İstavritin küçük boy dönemi olarak bilinir.', 'Liman çevresi, ışıklı bölgeler ve kıyı sürüleri.', 'Yıl boyu.', 'Küçük çapari ve hafif takımlar.', true),
  ('Sübye', 'Cuttlefish', 'Sepia officinalis', 'deniz', 'Sepya grubunun kıyıdan çok avlanan kafadanbacaklısıdır.', 'Kumluk koylar, çayırlar ve kıyı meraları.', 'İlkbahar ve sonbahar.', 'Egi, sahte karides ve gece avcılığı.', true),
  ('Kalamar', 'Squid', 'Loligo vulgaris', 'deniz', 'Gece ve alacakaranlıkta aktifleşen popüler bir av türüdür.', 'Limanlar, ışık alan bölgeler ve taşlık koylar.', 'Sonbahar, kış ve ilkbahar.', 'Egi ve ışık çevresi avı.', true),
  ('Ahtapot', 'Common Octopus', 'Octopus vulgaris', 'deniz', 'Taş dipte saklanan güçlü ve zeki bir kafadanbacaklıdır.', 'Kayalık kıyılar, mendirek dipleri ve kovuklu alanlar.', 'Yıl boyu.', 'Sahte ahtapot yemi, yengeç ve dip avı.', true),
  ('Karides', 'Shrimp', 'Palaemon serratus', 'deniz', 'Kıyı ekosisteminde hem yem hem hedef tür olarak bilinen kabukludur.', 'Taşlık kıyılar, çayırlar ve gece ışık alan bölgeler.', 'İlkbahar ve yaz geceleri.', 'Kepçe, ışık ve küçük tuzaklar.', true),
  ('Gümüş', 'Sand Smelt', 'Atherina boyeri', 'deniz', 'Yüzeye yakın gezen küçük sürü balığıdır.', 'Liman içleri, kıyı çizgisi ve sakin koylar.', 'Yaz ve sonbahar.', 'Çıplak iğne, ekmek ve mini çapari.', true),
  ('Sardalya', 'Sardine', 'Sardina pilchardus', 'göç', 'Sürü halinde gezen yağlı yapılı pelajik kıyı balığıdır.', 'Kıyı sürüleri, liman dışları ve açık su geçişleri.', 'Sonbahar ve kış.', 'Çapari ve küçük tüy takımları.', true)
on conflict (name_tr) do update set
  name_en = excluded.name_en,
  name_scientific = excluded.name_scientific,
  category = excluded.category,
  description_tr = excluded.description_tr,
  habitat_tr = excluded.habitat_tr,
  best_season_tr = excluded.best_season_tr,
  bait_tr = excluded.bait_tr,
  is_active = excluded.is_active;
