import {
  zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Controller,
  useForm } from 'react-hook-form';
import { useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { z } from 'zod';

import { OptionModal } from '@/components/OptionModal';
import { GEAR_CATEGORIES, GEAR_TIERS } from '@/lib/constants';

const gearSchema = z.object({
  categorySlug: z.string().min(1, 'Kategori seç'),
  name: z.string().min(1, 'Ekipman adi gir').max(100, 'En fazla 100 karakter'),
  brand: z.string().max(80, 'En fazla 80 karakter').optional(),
  model: z.string().max(80, 'En fazla 80 karakter').optional(),
  tier: z.number().min(1).max(4),
  purchaseDate: z.string().max(10, 'Tarih en fazla 10 karakter').optional(),
  purchasePrice: z.string().max(20, 'Fiyat en fazla 20 karakter').optional(),
  notes: z.string().max(400, 'En fazla 400 karakter').optional(),
});

export type GearFormValues = z.infer<typeof gearSchema> & {
  photoUri?: string | null;
};

interface GearFormProps {
  initialValues?: Partial<GearFormValues>;
  submitLabel: string;
  title: string;
  onSubmit: (values: GearFormValues) => Promise<void>;
}

export const GearForm = ({
  initialValues,
  submitLabel,
  title,
  onSubmit,
}: GearFormProps): JSX.Element => {
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(initialValues?.photoUri ?? null);
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false);
  const { control, formState, handleSubmit, setValue, watch } = useForm<GearFormValues>({
    defaultValues: {
      categorySlug: initialValues?.categorySlug ?? '',
      name: initialValues?.name ?? '',
      brand: initialValues?.brand ?? '',
      model: initialValues?.model ?? '',
      tier: initialValues?.tier ?? 1,
      purchaseDate: initialValues?.purchaseDate ?? '',
      purchasePrice: initialValues?.purchasePrice ?? '',
      notes: initialValues?.notes ?? '',
      photoUri: initialValues?.photoUri ?? null,
    },
    resolver: zodResolver(gearSchema),
  });

  const categorySlug = watch('categorySlug');
  const tier = watch('tier');

  const pickPhoto = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: 'images',
      quality: 1,
    });

    if (!result.canceled) {
      const nextUri = result.assets[0]?.uri ?? null;
      setPhotoUri(nextUri);
      setValue('photoUri', nextUri, { shouldDirty: true });
    }
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-main"
        contentContainerStyle={{ gap: 18, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10"
            onPress={() => router.back()}
          >
            <Ionicons color="#F0F7F9" name="arrow-back" size={20} />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold text-ink">{title}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          className="items-center rounded-[28px] border border-dashed border-white/20 bg-white/10 p-4"
          onPress={() => void pickPhoto()}
        >
          {photoUri ? (
            <Image
              resizeMode="cover"
              source={{ uri: photoUri }}
              style={{ width: '100%', height: 220, borderRadius: 24 }}
            />
          ) : (
            <View className="items-center gap-2 py-6">
              <Ionicons color="#2F6F7E" name="camera-outline" size={28} />
              <Text className="text-base font-medium text-sea">Fotoğraf seç</Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="gap-2">
          <Text className="text-sm font-medium text-ink">Kategori</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4"
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text className={categorySlug ? 'text-base text-ink' : 'text-base text-white/45'}>
              {GEAR_CATEGORIES.find((item) => item.value === categorySlug)?.label ?? 'Kategori seç'}
            </Text>
          </TouchableOpacity>
          {formState.errors.categorySlug?.message ? (
            <Text className="text-sm text-[#A6422B]">{formState.errors.categorySlug.message}</Text>
          ) : null}
        </View>

        {[
          {
            name: 'name' as const,
            label: 'Ekipman adi',
            placeholder: 'Orn. Kiyi spin seti',
          },
          {
            name: 'brand' as const,
            label: 'Marka',
            placeholder: 'Orn. Shimano',
          },
          {
            name: 'model' as const,
            label: 'Model',
            placeholder: 'Orn. BeastMaster',
          },
          {
            name: 'purchaseDate' as const,
            label: 'Alis tarihi',
            placeholder: 'YYYY-AA-GG',
          },
          {
            name: 'purchasePrice' as const,
            label: 'Alis fiyati',
            placeholder: 'Orn. 2500',
          },
        ].map((fieldConfig) => (
          <Controller
            key={fieldConfig.name}
            control={control}
            name={fieldConfig.name}
            render={({ field, fieldState }) => (
              <View className="gap-2">
                <Text className="text-sm font-medium text-ink">{fieldConfig.label}</Text>
                <TextInput
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
                  keyboardType={fieldConfig.name === 'purchasePrice' ? 'decimal-pad' : 'default'}
                  onChangeText={field.onChange}
                  placeholder={fieldConfig.placeholder}
                  placeholderTextColor="#8A958D"
                  value={field.value ?? ''}
                />
                {fieldState.error?.message ? (
                  <Text className="text-sm text-[#A6422B]">{fieldState.error.message}</Text>
                ) : null}
              </View>
            )}
          />
        ))}

        <View className="gap-2">
          <Text className="text-sm font-medium text-ink">Seviye</Text>
          <View className="flex-row flex-wrap gap-2">
            {Object.entries(GEAR_TIERS).map(([key, value]) => {
              const isSelected = tier === Number(key);

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={key}
                  className={`rounded-full px-4 py-3 ${isSelected ? 'bg-sea' : 'border border-white/10 bg-white/10'}`}
                  onPress={() => setValue('tier', Number(key), { shouldDirty: true })}
                >
                  <Text className={isSelected ? 'font-semibold text-sand' : 'text-ink'}>
                    {value.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <View className="gap-2">
              <Text className="text-sm font-medium text-ink">Notlar</Text>
              <TextInput
                className="min-h-[104px] rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
                multiline
                onChangeText={field.onChange}
                placeholder="Ekipmanla ilgili notlarini ekle"
                placeholderTextColor="#8A958D"
                textAlignVertical="top"
                value={field.value ?? ''}
              />
              {fieldState.error?.message ? (
                <Text className="text-sm text-[#A6422B]">{fieldState.error.message}</Text>
              ) : null}
            </View>
          )}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          className="items-center rounded-2xl bg-coral px-4 py-4"
          disabled={formState.isSubmitting}
          onPress={handleSubmit((values) => {
            void (async () => {
              try {
                await onSubmit({ ...values, photoUri });
              } catch {
                // Error is handled by parent component
              }
            })();
          })}
        >
          <Text className="text-base font-semibold text-white">{submitLabel}</Text>
        </TouchableOpacity>
      </ScrollView>

      <OptionModal
        onClose={() => setCategoryModalVisible(false)}
        onSelect={(label) => {
          const category = GEAR_CATEGORIES.find((item) => item.label === label);

          if (!category) {
            return;
          }

          setValue('categorySlug', category.value, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        options={GEAR_CATEGORIES.map((item) => item.label)}
        selectedValue={GEAR_CATEGORIES.find((item) => item.value === categorySlug)?.label}
        title="Kategori seç"
        visible={categoryModalVisible}
      />
    </>
  );
};
