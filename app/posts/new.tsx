import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { POST_TYPE_OPTIONS } from '@/lib/posts';
import { SPORT_THEME } from '@/lib/sport-theme';
import { moderateImage } from '@/services/moderation.service';
import { createPost, uploadPostImage } from '@/services/posts.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PostInsert, PostType } from '@/types/app.types';

const postSchema = z.object({
  title: z.string().trim().min(4, 'Başlık çok kısa.').max(120, 'Başlık 120 karakteri geçemez.'),
  type: z.enum(['tip', 'story', 'gear_review', 'spot_guide']),
  body: z.string().trim().min(20, 'Yazı en az 20 karakter olmalı.').max(5000, 'Yazı 5000 karakteri geçemez.'),
  coverImageUri: z.string().optional(),
  images: z.array(z.string()).max(5, 'En fazla 5 ek görsel yükleyebilirsin.'),
});

type PostFormValues = z.infer<typeof postSchema>;
const POSTS_ROUTE = '/posts' as Href;

const PostsNewScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const {
    control,
    handleSubmit,
    formState,
    setValue,
    watch,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      type: 'tip',
      body: '',
      coverImageUri: undefined,
      images: [],
    },
  });
  const coverImageUri = watch('coverImageUri');
  const images = watch('images');
  const selectedType = watch('type');

  const pickImage = async (): Promise<string | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: 'images',
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    return result.assets[0].uri;
  };

  const handlePickCover = async (): Promise<void> => {
    const uri = await pickImage();

    if (uri) {
      setValue('coverImageUri', uri, { shouldDirty: true, shouldValidate: true });
    }
  };

  const handleAddGalleryImage = async (): Promise<void> => {
    if (images.length >= 5) {
      return;
    }

    const uri = await pickImage();

    if (uri) {
      setValue('images', [...images, uri], { shouldDirty: true, shouldValidate: true });
    }
  };

  const onSubmit = async (values: PostFormValues): Promise<void> => {
    if (!profile?.id) {
      Alert.alert('Uyarı', 'Yazı paylaşmak için tekrar giriş yap.');
      return;
    }

    try {
      let coverImageUrl: string | null = null;

      if (values.coverImageUri) {
        const coverModeration = await moderateImage(values.coverImageUri);

        if (!coverModeration.safe) {
          Alert.alert(
            'Uygunsuz İçerik',
            'Yüklediğiniz fotoğraf uygunsuz içerik barındırıyor ve paylaşılamaz.',
            [{ text: 'Tamam' }],
          );
          return;
        }

        coverImageUrl = await uploadPostImage(values.coverImageUri, profile.id);
      }

      for (const imageUri of values.images) {
        const moderationResult = await moderateImage(imageUri);

        if (!moderationResult.safe) {
          Alert.alert(
            'Uygunsuz İçerik',
            'Yüklediğiniz fotoğraf uygunsuz içerik barındırıyor ve paylaşılamaz.',
            [{ text: 'Tamam' }],
          );
          return;
        }
      }

      const imageUrls = await Promise.all(
        values.images.map((uri) => uploadPostImage(uri, profile.id)),
      );

      const payload: PostInsert = {
        user_id: profile.id,
        title: values.title.trim(),
        type: values.type,
        body: values.body.trim(),
        cover_image_url: coverImageUrl,
        images: imageUrls,
        is_published: true,
      };

      await createPost(payload);
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.replace(POSTS_ROUTE);
    } catch (error) {
      Alert.alert(
        'Yazı kaydedilemedi',
        error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.',
      );
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) }]}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Yeni Yazı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <View style={styles.section}>
            <Text style={styles.label}>Başlık</Text>
            <TextInput
              onChangeText={field.onChange}
              placeholder="Kısa ve net bir başlık yaz"
              placeholderTextColor="rgba(240,247,249,0.45)"
              style={styles.titleInput}
              value={field.value}
            />
            <Text style={styles.counter}>{field.value.length} / 120</Text>
          </View>
        )}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Yazı Türü</Text>
        <View style={styles.typeRow}>
          {POST_TYPE_OPTIONS.filter((item) => item.value !== 'all').map((item) => {
            const active = item.value === selectedType;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                key={item.value}
                onPress={() => setValue('type', item.value as PostType, { shouldDirty: true })}
                style={[styles.typePill, active ? styles.typePillActive : null]}
              >
                <Text style={[styles.typePillText, active ? styles.typePillTextActive : null]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Kapak Görseli</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={() => void handlePickCover()} style={styles.imagePicker}>
          {coverImageUri ? (
            <Image contentFit="cover" source={{ uri: coverImageUri }} style={styles.imagePreview} />
          ) : (
            <Text style={styles.imagePickerText}>Kapak görseli seç</Text>
          )}
        </TouchableOpacity>
      </View>

      <Controller
        control={control}
        name="body"
        render={({ field }) => (
          <View style={styles.section}>
            <Text style={styles.label}>İçerik</Text>
            <TextInput
              multiline
              onChangeText={field.onChange}
              placeholder="Taktik, deneyim ya da spot notlarını yaz..."
              placeholderTextColor="rgba(240,247,249,0.45)"
              style={styles.bodyInput}
              textAlignVertical="top"
              value={field.value}
            />
            <Text style={styles.counter}>{field.value.length} / 5000</Text>
          </View>
        )}
      />

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.label}>Ek Görseller</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => void handleAddGalleryImage()} style={styles.addImageButton}>
            <Text style={styles.addImageButtonText}>Ekle</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.galleryRow}>
            {images.map((uri) => (
              <Image contentFit="cover" key={uri} source={{ uri }} style={styles.galleryImage} />
            ))}
            {images.length < 5 ? (
              <TouchableOpacity activeOpacity={0.8} onPress={() => void handleAddGalleryImage()} style={styles.galleryAddTile}>
                <Text style={styles.galleryAddText}>+ Görsel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </View>

      {Object.values(formState.errors).map((error, index) => (
        <Text key={`${error.message}-${index}`} style={styles.errorText}>
          {error.message}
        </Text>
      ))}

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={formState.isSubmitting}
        onPress={() => void handleSubmit(onSubmit)()}
        style={[styles.publishButton, formState.isSubmitting ? styles.publishButtonDisabled : null]}
      >
        <Text style={styles.publishButtonText}>
          {formState.isSubmitting ? 'Paylaşılıyor...' : 'Yayınla'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: SPORT_THEME.bg,
    flex: 1,
  },
  content: {
    gap: 18,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerButton: {
    paddingVertical: 8,
    width: 48,
  },
  headerButtonText: {
    color: SPORT_THEME.active,
    fontSize: 15,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 48,
  },
  title: {
    color: SPORT_THEME.text,
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  label: {
    color: SPORT_THEME.text,
    fontSize: 15,
    fontWeight: '600',
  },
  titleInput: {
    backgroundColor: SPORT_THEME.surface,
    borderColor: SPORT_THEME.border,
    borderRadius: 20,
    borderWidth: 1,
    color: SPORT_THEME.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  counter: {
    color: SPORT_THEME.textMuted,
    fontSize: 12,
    textAlign: 'right',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    backgroundColor: SPORT_THEME.surface,
    borderColor: SPORT_THEME.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typePillActive: {
    backgroundColor: SPORT_THEME.active,
    borderColor: SPORT_THEME.active,
  },
  typePillText: {
    color: SPORT_THEME.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  typePillTextActive: {
    color: SPORT_THEME.bg,
  },
  imagePicker: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: SPORT_THEME.surface,
    borderColor: SPORT_THEME.border,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePickerText: {
    color: SPORT_THEME.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  imagePreview: {
    height: '100%',
    width: '100%',
  },
  bodyInput: {
    backgroundColor: SPORT_THEME.surface,
    borderColor: SPORT_THEME.border,
    borderRadius: 24,
    borderWidth: 1,
    color: SPORT_THEME.text,
    fontSize: 16,
    minHeight: 220,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addImageButton: {
    backgroundColor: 'rgba(212,255,0,0.10)',
    borderColor: 'rgba(212,255,0,0.24)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addImageButtonText: {
    color: SPORT_THEME.active,
    fontSize: 12,
    fontWeight: '700',
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  galleryImage: {
    backgroundColor: SPORT_THEME.surfaceAlt,
    borderRadius: 18,
    height: 96,
    width: 96,
  },
  galleryAddTile: {
    alignItems: 'center',
    backgroundColor: SPORT_THEME.surface,
    borderColor: SPORT_THEME.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  galleryAddText: {
    color: SPORT_THEME.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: SPORT_THEME.warning,
    fontSize: 13,
  },
  publishButton: {
    alignItems: 'center',
    backgroundColor: SPORT_THEME.warning,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 56,
  },
  publishButtonDisabled: {
    opacity: 0.65,
  },
  publishButtonText: {
    color: SPORT_THEME.text,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PostsNewScreen;
