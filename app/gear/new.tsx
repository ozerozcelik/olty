import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { GearForm, type GearFormValues } from '@/components/GearForm';
import { createGearItem, uploadGearPhoto } from '@/services/gear.service';
import { moderateImage } from '@/services/moderation.service';
import { useAuthStore } from '@/stores/useAuthStore';

const parsePrice = (value: string | undefined): number | null => {
  const normalizedValue = value?.trim().replace(',', '.');

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const parsePurchaseDate = (value: string | undefined): string | null => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/u);

  if (!match) {
    throw new Error('Alış tarihi YYYY-AA-GG formatında olmalı.');
  }

  const parsedDate = new Date(`${normalizedValue}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Geçerli bir alış tarihi gir.');
  }

  return normalizedValue;
};

const GearNewScreen = (): JSX.Element => {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);

  const handleSubmit = async (values: GearFormValues): Promise<void> => {
    if (!profile?.id) {
      return;
    }

    try {
      let photoUrl: string | null = null;

      if (values.photoUri) {
        const moderationResult = await moderateImage(values.photoUri);

        if (!moderationResult.safe) {
          Alert.alert(
            'Uygunsuz İçerik',
            'Yüklediğiniz fotoğraf uygunsuz içerik barındırıyor ve paylaşılamaz.',
            [{ text: 'Tamam' }],
          );
          return;
        }

        photoUrl = await uploadGearPhoto(values.photoUri, profile.id);
      }

      await createGearItem({
        user_id: profile.id,
        category: values.categorySlug,
        category_slug: values.categorySlug,
        name: values.name.trim(),
        brand: values.brand?.trim() || null,
        model: values.model?.trim() || null,
        tier: values.tier,
        photo_url: photoUrl,
        purchase_date: parsePurchaseDate(values.purchaseDate),
        purchase_price: parsePrice(values.purchasePrice),
        notes: values.notes?.trim() || null,
        is_favorite: false,
      });

      router.replace('/gear');
    } catch (error) {
      Alert.alert(
        'Uyarı',
        error instanceof Error ? error.message : 'Ekipman kaydedilemedi.',
      );
    }
  };

  return (
    <GearForm
      onSubmit={handleSubmit}
      submitLabel="Kaydet"
      title="Ekipman Ekle"
    />
  );
};

export default GearNewScreen;
