import DateTimePicker from '@react-native-community/datetimepicker';
import {
  zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Controller,
  useForm } from 'react-hook-form';
import { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { z } from 'zod';

import { AdminOnly } from '@/components/AdminOnly';
import { OptionModal } from '@/components/OptionModal';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { createTournament } from '@/services/tournaments.service';

const schema = z
  .object({
    title: z.string().min(1, 'Baslik gerekli'),
    description: z.string().optional(),
    city: z.string().optional(),
    fishing_type: z.string().optional(),
    scoring_type: z.enum(['length', 'weight', 'count']),
    max_participants: z.string().optional(),
    prize_description: z.string().optional(),
  })
  .transform((value) => value);

type FormValues = z.infer<typeof schema>;

const SCORING_OPTIONS = ['length', 'weight', 'count'] as const;

const NewTournamentScreen = (): JSX.Element => {
  const router = useRouter();
  const isAdmin = useAdminGuard();
  const [startsAt, setStartsAt] = useState<Date>(new Date(Date.now() + 86400000));
  const [endsAt, setEndsAt] = useState<Date>(new Date(Date.now() + 3 * 86400000));
  const [scoringModalVisible, setScoringModalVisible] = useState(false);
  const mutation = useMutation({
    mutationFn: createTournament,
    onSuccess: () => router.back(),
  });
  const { control, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      city: '',
      fishing_type: '',
      scoring_type: 'length',
      max_participants: '',
      prize_description: '',
    },
    resolver: zodResolver(schema),
  });
  const scoringType = watch('scoring_type');

  if (!isAdmin) {
    return <ScreenPlaceholder title="Bu sayfa sadece adminler için" />;
  }

  return (
    <AdminOnly>
      <ScrollView
        className="flex-1 bg-main"
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
      >
        <Text className="text-2xl font-semibold text-ink">Yeni turnuva</Text>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <TextInput
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
              onChangeText={field.onChange}
              placeholder="Başlık"
              placeholderTextColor="#8A958D"
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextInput
              className="min-h-[96px] rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
              multiline
              onChangeText={field.onChange}
              placeholder="Açıklama"
              placeholderTextColor="#8A958D"
              value={field.value ?? ''}
            />
          )}
        />
        <Controller
          control={control}
          name="city"
          render={({ field }) => (
            <TextInput
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
              onChangeText={field.onChange}
              placeholder="Şehir"
              placeholderTextColor="#8A958D"
              value={field.value ?? ''}
            />
          )}
        />
        <Controller
          control={control}
          name="fishing_type"
          render={({ field }) => (
            <TextInput
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
              onChangeText={field.onChange}
              placeholder="Av tarzı"
              placeholderTextColor="#8A958D"
              value={field.value ?? ''}
            />
          )}
        />
        <TouchableOpacity activeOpacity={0.8} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4" onPress={() => setScoringModalVisible(true)}>
          <Text className="text-base text-ink">{scoringType}</Text>
        </TouchableOpacity>
        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
          <DateTimePicker mode="datetime" onChange={(_event, date) => date && setStartsAt(date)} value={startsAt} />
        </View>
        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
          <DateTimePicker mode="datetime" onChange={(_event, date) => date && setEndsAt(date)} value={endsAt} />
        </View>
        <Controller
          control={control}
          name="max_participants"
          render={({ field }) => (
            <TextInput
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
              keyboardType="numeric"
              onChangeText={field.onChange}
              placeholder="Maksimum katılımcı"
              placeholderTextColor="#8A958D"
              value={field.value ?? ''}
            />
          )}
        />
        <Controller
          control={control}
          name="prize_description"
          render={({ field }) => (
            <TextInput
              className="min-h-[96px] rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
              multiline
              onChangeText={field.onChange}
              placeholder="Ödül açıklaması"
              placeholderTextColor="#8A958D"
              value={field.value ?? ''}
            />
          )}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          className="items-center rounded-2xl bg-coral px-4 py-4"
          onPress={handleSubmit((values) =>
            void mutation.mutateAsync({
              title: values.title,
              description: values.description || null,
              city: values.city || null,
              fishing_type: values.fishing_type || null,
              scoring_type: values.scoring_type,
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              max_participants: values.max_participants ? Number(values.max_participants) : null,
              prize_description: values.prize_description || null,
            }),
          )}
        >
          <Text className="text-base font-semibold text-white">Turnuva oluştur</Text>
        </TouchableOpacity>
        <OptionModal
          onClose={() => setScoringModalVisible(false)}
          onSelect={(value) => setValue('scoring_type', value as FormValues['scoring_type'])}
          options={SCORING_OPTIONS}
          selectedValue={scoringType}
          title="Skorlama"
          visible={scoringModalVisible}
        />
      </ScrollView>
    </AdminOnly>
  );
};

export default NewTournamentScreen;
