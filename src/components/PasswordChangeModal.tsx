import { BlurView } from '@react-native-community/blur';
import {
  zodResolver } from '@hookform/resolvers/zod';
import { Controller,
  useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { z } from 'zod';

import { AuthTextField } from '@/components/AuthTextField';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'En az 8 karakter'),
    confirmPassword: z.string().min(8, 'En az 8 karakter'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface PasswordChangeModalProps {
  visible: boolean;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export const PasswordChangeModal = ({
  visible,
  loading,
  error,
  onClose,
  onSubmit,
}: PasswordChangeModalProps): JSX.Element => {
  const { control, handleSubmit, reset, formState } = useForm<PasswordFormValues>({
    defaultValues: { password: '', confirmPassword: '' },
    resolver: zodResolver(passwordSchema),
  });

  const handleClose = (): void => {
    reset();
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/40">
        <View style={styles.sheet}>
          {Platform.OS === 'ios' ? (
            <BlurView
              blurAmount={30}
              blurType="dark"
              reducedTransparencyFallbackColor="#0B1622"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={styles.sheetContent}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-semibold text-ink">Şifremi Değiştir</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={handleClose}>
                <Text className="text-sm font-semibold text-sea">Kapat</Text>
              </TouchableOpacity>
            </View>

            <View className="gap-4">
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <AuthTextField
                    autoCapitalize="none"
                    error={fieldState.error?.message}
                    label="Yeni şifre"
                    onChangeText={field.onChange}
                    placeholder="Yeni şifren"
                    secureTextEntry
                    value={field.value}
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <AuthTextField
                    autoCapitalize="none"
                    error={fieldState.error?.message}
                    label="Yeni şifre tekrar"
                    onChangeText={field.onChange}
                    placeholder="Yeni şifreni tekrar yaz"
                    secureTextEntry
                    value={field.value}
                  />
                )}
              />
              {error ? <Text className="text-sm text-[#A6422B]">{error}</Text> : null}
              <TouchableOpacity
                activeOpacity={0.8}
                className="items-center rounded-2xl bg-coral px-4 py-4"
                disabled={loading || formState.isSubmitting}
                onPress={handleSubmit((values) => {
                  void (async () => {
                    try {
                      await onSubmit(values.password);
                      reset();
                    } catch {
                      // Error is handled by parent via error prop
                    }
                  })();
                })}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">Şifreyi Güncelle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#0B1622',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
});
