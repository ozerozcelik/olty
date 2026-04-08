import {
  Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect,
  useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { SafeAreaView } from 'react-native-safe-area-context';

import { identifyFish } from '@/services/fishId.service';
import type { FishIdResult } from '@/types/app.types';

interface FishIdActionCardProps {
  onCameraPress: () => void;
  onGalleryPress: () => void;
}

const FishIdActionCard = ({
  onCameraPress,
  onGalleryPress,
}: FishIdActionCardProps): JSX.Element => {
  return (
    <View className="rounded-[32px] border border-white/10 bg-white/10 px-6 py-8">
      <View className="items-center justify-center rounded-[28px] bg-white/5 px-6 py-12">
        <Text className="text-6xl">🐟</Text>
        <Text className="mt-4 text-center text-2xl font-semibold text-ink">
          Balığı AI ile tanımla
        </Text>
        <Text className="mt-3 text-center text-base leading-7 text-white/70">
          Fotoğraf çek veya galeriden seç. iNaturalist görseli analiz edip türü tahmin etsin.
        </Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        className="mt-6 rounded-2xl bg-coral px-4 py-4"
        onPress={onCameraPress}
      >
        <Text className="text-center text-base font-semibold text-white">
          Fotoğraf Çek
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        className="mt-3 rounded-2xl bg-sea px-4 py-4"
        onPress={onGalleryPress}
      >
        <Text className="text-center text-base font-semibold text-white">
          Galeriden Seç
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface FishIdAnalyzingCardProps {
  dots: string;
  imageUri: string;
}

const FishIdAnalyzingCard = ({
  dots,
  imageUri,
}: FishIdAnalyzingCardProps): JSX.Element => {
  return (
    <View className="overflow-hidden rounded-[32px] border border-white/10 bg-white/10">
      <Image contentFit="cover" source={{ uri: imageUri }} style={{ height: 320, width: '100%' }} />
      <View className="absolute inset-0 items-center justify-center bg-black/45 px-6" pointerEvents="none">
        <View className="rounded-[28px] border border-white/10 bg-[rgba(10,32,40,0.92)] px-6 py-5">
          <Text className="text-center text-xl font-semibold text-ink">
            Balık Tanınıyor{dots}
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-white/70">
            Türü, güven skorunu ve kısa bilgileri hazırlıyoruz.
          </Text>
        </View>
      </View>
    </View>
  );
};

interface FishIdResultCardProps {
  imageUri: string;
  onRetryPress: () => void;
  onUsePress: () => void;
  result: FishIdResult;
}

const FishIdResultCard = ({
  imageUri,
  onRetryPress,
  onUsePress,
  result,
}: FishIdResultCardProps): JSX.Element => {
  const confidence = Math.max(0, Math.min(100, Math.round(result.confidence)));
  const confidenceClassName =
    confidence > 70
      ? 'bg-[#2F8B57]'
      : confidence >= 40
        ? 'bg-[#D9A441]'
        : 'bg-[#D75B49]';
  const edibleClassName = result.isEdible
    ? 'border-[#2F8B57] bg-[#E5F4EA] text-[#1F6A40]'
    : 'border-[#D75B49] bg-[#F8E3DF] text-[#A33D30]';

  return (
    <View className="gap-4">
      <Image
        contentFit="cover"
        source={{ uri: imageUri }}
        style={{ height: 280, width: '100%', borderRadius: 28 }}
      />
      <View className="rounded-[28px] border border-white/10 bg-white/10 px-5 py-5">
        {result.speciesName ? (
          <>
            <Text className="text-2xl font-semibold text-ink">
              {result.speciesNameTr ?? 'Tür bulunamadı'}
            </Text>
            <Text className="mt-1 text-sm italic text-white/70">
              {result.speciesName}
            </Text>

            <View className="mt-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-white/70">Güven skoru</Text>
                <Text className="text-sm font-semibold text-ink">{confidence}%</Text>
              </View>
              <View className="mt-2 h-3 rounded-full bg-white/10">
                <View
                  className={`h-3 rounded-full ${confidenceClassName}`}
                  style={{ width: `${confidence}%` }}
                />
              </View>
            </View>

            <View className="mt-5 gap-4">
              <View className="rounded-[22px] bg-white/5 px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                  Açıklama
                </Text>
                <Text className="mt-2 text-sm leading-6 text-ink">
                  {result.description || 'Açıklama bulunamadı.'}
                </Text>
              </View>
              <View className="rounded-[22px] bg-white/5 px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                  Ilginc Bilgi
                </Text>
                <Text className="mt-2 text-sm leading-6 text-ink">
                  {result.funFact || 'Ek bilgi bulunamadı.'}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <View className={`flex-1 rounded-[22px] border px-4 py-4 ${edibleClassName}`}>
                  <Text className="text-xs font-semibold uppercase tracking-[0.8px]">
                    Tüketim
                  </Text>
                  <Text className="mt-2 text-base font-semibold">
                    {result.isEdible ? 'Yenilebilir ✓' : 'Yenmez ✗'}
                  </Text>
                </View>
                <View className="flex-1 rounded-[22px] bg-white/5 px-4 py-4">
                  <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                    Ortalama Boy
                  </Text>
                  <Text className="mt-2 text-base font-semibold text-ink">
                    {result.averageSize || 'Bilinmiyor'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              className="mt-5 rounded-2xl bg-coral px-4 py-4"
              onPress={onUsePress}
            >
              <Text className="text-center text-base font-semibold text-white">
                Av Kaydina Ekle
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="rounded-[24px] border border-[#EF6B6B]/40 bg-[#EF6B6B]/15 px-4 py-5">
            <Text className="text-lg font-semibold text-[#A33D30]">
              Fotoğrafta balık tespit edilemedi
            </Text>
            <Text className="mt-2 text-sm leading-6 text-white/70">
              Daha net bir kare cekip baligi merkeze alarak tekrar deneyin.
            </Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          className="mt-3 rounded-2xl bg-sea px-4 py-4"
          onPress={onRetryPress}
        >
          <Text className="text-center text-base font-semibold text-white">
            Tekrar Dene
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FishIdScreen = (): JSX.Element => {
  const router = useRouter();
  const [dots, setDots] = useState<string>('.');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<FishIdResult | null>(null);

  useEffect(() => {
    if (!isAnalyzing) {
      return;
    }

    const interval = setInterval(() => {
      setDots((current) => (current.length >= 3 ? '.' : `${current}.`));
    }, 450);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const analyzeImage = async (uri: string): Promise<void> => {
    setImageUri(uri);
    setResult(null);
    setIsAnalyzing(true);

    try {
      const nextResult = await identifyFish(uri);
      setResult(nextResult);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Balık tanıma başarısız oldu.';
      Alert.alert('AI tanima hatasi', message);
      setImageUri(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePickFromGallery = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeriden fotoğraf seçmek için izin vermelisin.');
      return;
    }

    const selection = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: 'images',
      quality: 0.8,
    });

    if (!selection.canceled && selection.assets[0]?.uri) {
      await analyzeImage(selection.assets[0].uri);
    }
  };

  const handleTakePhoto = async (): Promise<void> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('İzin gerekli', 'Kamera ile fotoğraf çekmek için izin vermelisin.');
      return;
    }

    const capture = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      mediaTypes: 'images',
      quality: 0.8,
    });

    if (!capture.canceled && capture.assets[0]?.uri) {
      await analyzeImage(capture.assets[0].uri);
    }
  };

  const handleRetry = (): void => {
    setImageUri(null);
    setResult(null);
    setIsAnalyzing(false);
    setDots('.');
  };

  const handleUseResult = (): void => {
    if (!imageUri || !result?.speciesName) {
      return;
    }

    router.push({
      pathname: '/catch/new',
      params: {
        photoUri: imageUri,
        speciesName: result.speciesName,
        speciesNameTr: result.speciesNameTr ?? '',
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-main">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20, paddingTop: 16 }}
      >
        <View className="mb-6 flex-row items-center justify-between">
          <TouchableOpacity activeOpacity={0.8} className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10" onPress={() => router.back()}>
            <Ionicons color="#F0F7F9" name="chevron-back" size={22} />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-ink">AI Balık Tanıma</Text>
          <View className="h-11 w-11" />
        </View>

        {isAnalyzing && imageUri ? (
          <FishIdAnalyzingCard dots={dots} imageUri={imageUri} />
        ) : result && imageUri ? (
          <FishIdResultCard
            imageUri={imageUri}
            onRetryPress={handleRetry}
            onUsePress={handleUseResult}
            result={result}
          />
        ) : (
          <FishIdActionCard
            onCameraPress={() => void handleTakePhoto()}
            onGalleryPress={() => void handlePickFromGallery()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FishIdScreen;
