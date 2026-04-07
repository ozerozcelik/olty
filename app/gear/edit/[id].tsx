import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Alert } from 'react-native';

import { GearForm, type GearFormValues } from '@/components/GearForm';
import { getGearItemById, updateGearItem, uploadGearPhoto } from '@/services/gear.service';
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

const GearEditScreen = (): JSX.Element => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const gearQuery = useQuery({
    queryKey: ['gear-edit', id],
    queryFn: () => getGearItemById(id),
    enabled: Boolean(id),
  });
  const item = gearQuery.data;

  if (!item) {
    return <></>;
  }

  const handleSubmit = async (values: GearFormValues): Promise<void> => {
    if (!profile?.id) {
      return;
    }

    try {
      let photoUrl = item.photo_url;

      if (values.photoUri && values.photoUri !== item.photo_url) {
        photoUrl = await uploadGearPhoto(values.photoUri, profile.id);
      }

      await updateGearItem(item.id, {
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
      });

      router.replace(`/gear/${item.id}` as Href);
    } catch (error) {
      Alert.alert(
        'Uyarı',
        error instanceof Error ? error.message : 'Ekipman güncellenemedi.',
      );
    }
  };

  return (
    <GearForm
      initialValues={{
        categorySlug: item.category_slug,
        name: item.name,
        brand: item.brand ?? '',
        model: item.model ?? '',
        tier: item.tier,
        purchaseDate: item.purchase_date ?? '',
        purchasePrice: item.purchase_price !== null ? item.purchase_price.toString() : '',
        notes: item.notes ?? '',
        photoUri: item.photo_url,
      }}
      onSubmit={handleSubmit}
      submitLabel="Degisiklikleri kaydet"
      title="Ekipmani Duzenle"
    />
  );
};

export default GearEditScreen;
