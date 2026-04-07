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
  ('Züber', 'Leerfish', 'Lichia amia', 'göç', 'Kıyıdan da hedeflenen güçlü ve hızlı pelajik avcı türdür.', 'Kıyı kırılmaları, akıntılı koy girişleri ve açık su geçişleri.', 'Yaz sonu ve sonbahar.', 'Canlı yem, minnow, metal jig ve yüzey yemleri.', true),
  ('Plaka Gridası', 'Golden Grouper', 'Epinephelus costae', 'deniz', 'Grida grubunda iri ve dipte güçlü mücadele veren kıymetli bir türdür.', 'Taşlık derin dipler, resif çevreleri ve kovuklu alanlar.', 'Yaz ve sonbahar.', 'Canlı yem, kalamar ve ağır dip takımı.', true),
  ('Fare Balığı', 'Picarel', 'Spicara smaris', 'deniz', 'Sürüler halinde gezen küçük ama yaygın kıyı türlerinden biridir.', 'Kumluk-mera karışık kıyılar ve orta su kolonları.', 'İlkbahar ve yaz.', 'Küçük çapari, kurt ve hafif takımlar.', true),
  ('Liça', 'Leerfish', 'Lichia amia', 'göç', 'Akya ailesinden çok güçlü ve hızlı bir kıyı avcısıdır.', 'Kıyı akıntıları, mendirek dışları ve açık su geçişleri.', 'Yaz ve sonbahar.', 'Canlı yem, minnow ve shore jig.', true),
  ('Domuz Balığı', 'White Seabream', 'Diplodus sargus', 'deniz', 'Kayalık kıyılarda sert vuruşlarıyla bilinen sparid türlerinden biridir.', 'Kayalık meralar, mendirek dipleri ve köpüklü kıyılar.', 'İlkbahar ve sonbahar.', 'Karides, mamun, yengeç ve dip takımı.', true),
  ('Aslan Balığı', 'Lionfish', 'Pterois miles', 'deniz', 'Dikenli yüzgeçleriyle tanınan istilacı ve avcı bir resif balığıdır.', 'Kayalık kıyılar, resifler ve sıcak sular.', 'Yaz ve sonbahar.', 'Silikon, küçük jig ve zıpkın avı.', true),
  ('Gargur', 'Parrotfish', 'Sparisoma cretense', 'deniz', 'Renkli yapısıyla bilinen ve kayalık meralarda yaşayan karakteristik bir türdür.', 'Kayalık kıyılar, çayırlar ve resif alanları.', 'Yaz dönemi.', 'Hamur, yosunlu yemler ve hafif takımlar.', true),
  ('Balon Balığı', 'Pufferfish', 'Lagocephalus sceleratus', 'deniz', 'İstilacı yapısıyla bilinen, güçlü dişli ve dikkat gerektiren türdür.', 'Kıyı çayırları, kumluk koylar ve sıcak sular.', 'Yaz ve sonbahar.', 'Silikon, metal ve yemli takım.', true),
  ('Yazılı', 'Painted Comber', 'Serranus scriba', 'deniz', 'Benekli görünümüyle ayırt edilen küçük ama agresif bir dip avcısıdır.', 'Kayalık dipler, çayırlar ve kıyı meraları.', 'Yaz dönemi.', 'Karides, silikon ve hafif dip takımı.', true),
  ('Baraküda', 'Barracuda', 'Sphyraena sphyraena', 'deniz', 'Uzun gövdeli, hızlı ve saldırgan yapısıyla bilinen pelajik avcıdır.', 'Açık kıyılar, yem balığı sürüleri ve akıntılı hatlar.', 'Yaz sonu ve sonbahar.', 'Minnow, needle, metal jig ve yüzey yemleri.', true),
  ('Lokum Balığı', 'Parrotfish', 'Sparisoma cretense', 'deniz', 'Bazı bölgelerde gargur olarak da anılan renkli kıyı türüdür.', 'Kayalık kıyılar, algli bölgeler ve çayırlar.', 'Yaz dönemi.', 'Hamur, küçük yemler ve hafif takım.', true),
  ('Deve Balığı', 'Stargazer', 'Uranoscopus scaber', 'deniz', 'Dipte gömülerek pusu kuran ilginç görünümlü bir avcı türdür.', 'Kumlu ve çamurlu dipler, kıyı şevleri.', 'İlkbahar ve yaz.', 'Dip takımı, karides ve küçük canlı yem.', true),
  ('Ceylan Balığı', 'Amberjack', 'Seriola dumerili', 'göç', 'Açık suda çok güçlü mücadele veren iri pelajik avcıdır.', 'Açık deniz resifleri, batıklar ve derin su yapıları.', 'Yaz ve sonbahar.', 'Canlı yem, jigging ve trolling.', true),
  ('İbikli', 'Comber', 'Serranus cabrilla', 'deniz', 'Dipte yaşayan ve taşlık alanlarda sık karşılaşılan küçük avcı türdür.', 'Kayalık dipler, iskele çevreleri ve resif alanları.', 'Yıl boyu.', 'Karides, küçük silikon ve dip takımı.', true)
on conflict (name_tr) do update set
  name_en = excluded.name_en,
  name_scientific = excluded.name_scientific,
  category = excluded.category,
  description_tr = excluded.description_tr,
  habitat_tr = excluded.habitat_tr,
  best_season_tr = excluded.best_season_tr,
  bait_tr = excluded.bait_tr,
  is_active = excluded.is_active;
