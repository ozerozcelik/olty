import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element => (
  <View className="gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5">
    <Text className="text-lg font-semibold text-ink">{title}</Text>
    {children}
  </View>
);

const PrivacyScreen = (): JSX.Element => {
  return (
    <>
      <Stack.Screen options={{ title: 'Gizlilik Politikası', headerShown: true }} />
      <ScrollView
        className="flex-1 bg-sand"
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
      >
        <View className="gap-3 rounded-[28px] bg-[#16333B] px-5 py-6">
          <Text className="text-2xl font-semibold text-white">Olty Gizlilik Politikası</Text>
          <Text className="text-sm leading-6 text-white/80">
            Son güncelleme: Nisan 2026
          </Text>
          <Text className="text-sm leading-6 text-white/80">
            Olty, balıkçılık topluluğu deneyimini sunabilmek için zorunlu hesap, profil,
            içerik ve teknik verileri işler. Bu politika 6698 sayılı KVKK kapsamında
            hazırlanmıştır.
          </Text>
        </View>

        <Section title="Veri Sorumlusu">
          <Text className="text-sm leading-6 text-white/70">
            Olty uygulaması adına veri sorumlusu: Olty{'\n'}
            İletişim: destek@olty.app
          </Text>
        </Section>

        <Section title="Topladığımız Veriler">
          <Text className="text-sm leading-6 text-white/70">
            • Hesap bilgileri: E-posta adresi, kullanıcı adı, şifreli parola{'\n'}
            • Profil bilgileri: Ad, biyografi, profil fotoğrafı, sosyal medya bağlantıları{'\n'}
            • İçerik verileri: Av kayıtları, fotoğraflar, yorumlar, beğeniler{'\n'}
            • Konum verisi: Sadece av kaydı oluştururken, izninle{'\n'}
            • Cihaz bilgileri: Cihaz türü, işletim sistemi, bildirim token{`'`}ı{'\n'}
            • Kullanım verileri: Uygulama içi etkileşimler (anonimleştirilmiş)
          </Text>
        </Section>

        <Section title="Verilerin İşlenme Amacı">
          <Text className="text-sm leading-6 text-white/70">
            • Hesap oluşturma ve kimlik doğrulama{'\n'}
            • Uygulama içi sosyal etkileşim (paylaşım, beğeni, yorum){'\n'}
            • Av kaydı tutma ve harita üzerinde gösterim{'\n'}
            • Bildirim gönderme (izninle){'\n'}
            • Güvenlik ve dolandırıcılık önleme{'\n'}
            • Hizmet kalitesini iyileştirme
          </Text>
        </Section>

        <Section title="Hukuki Dayanak">
          <Text className="text-sm leading-6 text-white/70">
            Verileriniz KVKK m.5/2-c (sözleşmenin ifası), m.5/2-f (meşru menfaat) ve
            m.5/1 (açık rıza - pazarlama için) kapsamında işlenmektedir.
          </Text>
        </Section>

        <Section title="Konum Verisi">
          <Text className="text-sm leading-6 text-white/70">
            Konum izni yalnızca av kaydı oluştururken istenir. Tam konum veritabanında
            şifreli saklanır. Diğer kullanıcılara konum ±2km yuvarlanarak gösterilir.
            {`"`}Tam konum göster{`"`} ayarını açmadıkça kimse tam konumunu göremez.
          </Text>
        </Section>

        <Section title="Veri Paylaşımı">
          <Text className="text-sm leading-6 text-white/70">
            Verileriniz üçüncü taraflarla satılmaz veya pazarlama amacıyla paylaşılmaz.
            Teknik altyapı için kullandığımız hizmetler:{'\n'}
            • Supabase (veritabanı, EU sunucuları){'\n'}
            • Cloudflare (CDN, görsel depolama){'\n'}
            • PostHog (anonimleştirilmiş analitik, EU sunucuları)
          </Text>
        </Section>

        <Section title="Veri Saklama Süresi">
          <Text className="text-sm leading-6 text-white/70">
            Hesabınız aktif olduğu sürece verileriniz saklanır. Hesap silme talebinde
            verileriniz 30 gün içinde silinir. Yasal zorunluluklar gereği bazı log
            kayıtları 1 yıl saklanabilir.
          </Text>
        </Section>

        <Section title="Haklarınız (KVKK m.11)">
          <Text className="text-sm leading-6 text-white/70">
            • Verilerinizin işlenip işlenmediğini öğrenme{'\n'}
            • İşlenmişse bilgi talep etme{'\n'}
            • Amacına uygun kullanılıp kullanılmadığını öğrenme{'\n'}
            • Düzeltme veya silme talep etme{'\n'}
            • İşlemenin durdurulmasını isteme{'\n'}
            • İtiraz hakkı{'\n\n'}
            Talepleriniz için: destek@olty.app
          </Text>
        </Section>

        <Section title="Çocukların Gizliliği">
          <Text className="text-sm leading-6 text-white/70">
            Olty, 13 yaşın altındaki çocuklara yönelik değildir. 13 yaşından küçük
            olduğunu bildiğimiz kullanıcıların hesapları silinir.
          </Text>
        </Section>

        <Section title="Politika Değişiklikleri">
          <Text className="text-sm leading-6 text-white/70">
            Bu politika güncellenebilir. Önemli değişikliklerde uygulama içi bildirim
            gönderilir.
          </Text>
        </Section>
      </ScrollView>
    </>
  );
};

export default PrivacyScreen;
