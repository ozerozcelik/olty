import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';

const Card = ({
  title,
  body,
}: {
  title: string;
  body: string;
}): JSX.Element => (
  <View className="gap-2 rounded-[28px] border border-white/10 bg-white/10 p-5">
    <Text className="text-lg font-semibold text-ink">{title}</Text>
    <Text className="text-sm leading-6 text-white/70">{body}</Text>
  </View>
);

const SupportScreen = (): JSX.Element => {
  return (
    <>
      <Stack.Screen options={{ title: 'Destek', headerShown: true }} />
      <ScrollView
        className="flex-1 bg-main"
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
      >
        <View className="gap-3 rounded-[28px] border border-white/10 bg-white/10 px-5 py-6">
          <Text className="text-2xl font-semibold text-ink">Olty Destek</Text>
          <Text className="text-sm leading-6 text-white/70">
            Hesap, bildirim, av kaydı veya teknik sorunlar için bu sayfadaki yönlendirmeleri
            kullanabilirsin.
          </Text>
        </View>

        <Card
          title="Hesap ve Giriş"
          body="Giriş sorunu yaşıyorsan önce şifre sıfırlama akışını dene. Hesabına ulaşamıyorsan destek talebinde kullanıcı adını ve kullandığın e-posta adresini belirt."
        />
        <Card
          title="Bildirimler"
          body="Bildirimleri Ayarlar ekranından açıp kapatabilirsin. Bildirim gelmiyorsa cihaz izinlerini ve uygulama içi bildirim tercihlerini birlikte kontrol et."
        />
        <Card
          title="Hesap Silme"
          body='Hesap silme talebi uygulama içinde Ayarlar ekranından başlatılır. Bu işlem geri alınamaz ve yasal süreç kapsamında planlanır.'
        />
        <Card
          title="İletişim"
          body="Destek ekibine ulaşmak için support@olty.app adresini kullanabilirsin. Talebinde cihaz modeli, işletim sistemi ve yaşadığın sorunun kısa açıklaması yer alsın."
        />
      </ScrollView>
    </>
  );
};

export default SupportScreen;
