import {
  zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { Controller,
  useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { z } from 'zod';

import { OptionModal } from '@/components/OptionModal';
import {
  createWeeklyChallenge,
  finalizeWeeklyChallenge,
  getCurrentWeeklyChallengeAdmin,
  getWeeklyChallengeLeaderboard,
} from '@/services/admin.service';

const schema = z.object({
  title_tr: z.string().min(1, 'Başlık gerekli'),
  description_tr: z.string().min(1, 'Açıklama gerekli'),
  challenge_type: z.string().min(1, 'Tür seç'),
  target_species_id: z.string().optional(),
  min_length_cm: z.string().optional(),
  xp_reward: z.string().min(1, 'XP gerekli'),
  badge_slug: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const CHALLENGE_TYPES = ['biggest_fish', 'most_catches', 'species_hunt', 'catch_release'];

const WeeklyChallengeAdminScreen = (): JSX.Element => {
  const router = useRouter();
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(new Date(Date.now() + 7 * 86400000));
  const currentQuery = useQuery({ queryKey: ['admin-current-weekly-challenge'], queryFn: getCurrentWeeklyChallengeAdmin });
  const leaderboardQuery = useQuery({ queryKey: ['admin-current-weekly-leaderboard', currentQuery.data?.id], queryFn: () => getWeeklyChallengeLeaderboard(currentQuery.data?.id ?? ''), enabled: Boolean(currentQuery.data?.id) });
  const { control, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: { title_tr: '', description_tr: '', challenge_type: '', xp_reward: '200', badge_slug: '' },
    resolver: zodResolver(schema),
  });
  const challengeType = watch('challenge_type');

  const onSubmit = async (values: FormValues): Promise<void> => {
    const endsAt = new Date(weekStart);
    endsAt.setDate(endsAt.getDate() + 6);
    endsAt.setHours(20, 59, 59, 0);
    await createWeeklyChallenge({
      week_start: weekStart.toISOString().slice(0, 10),
      title_tr: values.title_tr,
      description_tr: values.description_tr,
      challenge_type: values.challenge_type,
      target_species_id: values.target_species_id ? Number(values.target_species_id) : null,
      min_length_cm: values.min_length_cm ? Number(values.min_length_cm) : null,
      xp_reward: Number(values.xp_reward),
      badge_slug: values.badge_slug || null,
      ends_at: endsAt.toISOString(),
    });
    router.back();
  };

  return (
    <ScrollView
      className="flex-1 bg-main"
      contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
    >
      <Text className="text-2xl font-semibold text-ink">Haftalık challenge</Text>
      {currentQuery.data ? (
        <View className="gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5">
          <Text className="text-lg font-semibold text-ink">Aktif challenge</Text>
          <Text className="text-base font-semibold text-sea">{currentQuery.data.title_tr}</Text>
          {(leaderboardQuery.data ?? []).slice(0, 10).map((entry) => (
            <View className="flex-row items-center justify-between rounded-2xl bg-white/5 px-4 py-3" key={entry.id}>
              <Text className="text-sm text-ink">#{entry.rank} @{entry.profiles?.username ?? 'oyuncu'}</Text>
              <Text className="text-sm font-semibold text-sea">{entry.value ?? 0}</Text>
            </View>
          ))}
          <TouchableOpacity
            activeOpacity={0.8}
            className="items-center rounded-2xl bg-coral px-4 py-4"
            onPress={() => currentQuery.data ? void finalizeWeeklyChallenge(currentQuery.data.id) : undefined}
          >
            <Text className="text-base font-semibold text-white">Haftayı Kapat & Ödülleri Dağıt</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View className="gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5">
        <Text className="text-lg font-semibold text-ink">Yeni challenge oluştur</Text>
        <Controller control={control} name="title_tr" render={({ field }) => <TextInput className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" onChangeText={field.onChange} placeholder="Başlık" placeholderTextColor="#8A958D" value={field.value} />} />
        <Controller control={control} name="description_tr" render={({ field }) => <TextInput className="min-h-[96px] rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" multiline onChangeText={field.onChange} placeholder="Açıklama" placeholderTextColor="#8A958D" value={field.value} />} />
        <TouchableOpacity activeOpacity={0.8} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4" onPress={() => setTypeModalVisible(true)}><Text className={challengeType ? 'text-base text-ink' : 'text-base text-white/45'}>{challengeType || 'Challenge tipi seç'}</Text></TouchableOpacity>
        {(challengeType === 'species_hunt' || challengeType === 'biggest_fish') ? <Controller control={control} name="target_species_id" render={({ field }) => <TextInput className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" keyboardType="numeric" onChangeText={field.onChange} placeholder="Tür ID" placeholderTextColor="#8A958D" value={field.value} />} /> : null}
        {challengeType === 'biggest_fish' ? <Controller control={control} name="min_length_cm" render={({ field }) => <TextInput className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" keyboardType="numeric" onChangeText={field.onChange} placeholder="Min cm" placeholderTextColor="#8A958D" value={field.value} />} /> : null}
        <Controller control={control} name="xp_reward" render={({ field }) => <TextInput className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" keyboardType="numeric" onChangeText={field.onChange} placeholder="XP ödülü" placeholderTextColor="#8A958D" value={field.value} />} />
        <Controller control={control} name="badge_slug" render={({ field }) => <TextInput className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" onChangeText={field.onChange} placeholder="Badge slug (opsiyonel)" placeholderTextColor="#8A958D" value={field.value} />} />
        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4"><DateTimePicker mode="date" onChange={(_event, date) => date && setWeekStart(date)} value={weekStart} /></View>
        <TouchableOpacity
          activeOpacity={0.8}
          className="items-center rounded-2xl bg-sea px-4 py-4"
          onPress={handleSubmit((values) => void onSubmit(values))}
        >
          <Text className="text-base font-semibold text-white">Oluştur</Text>
        </TouchableOpacity>
      </View>
      <OptionModal onClose={() => setTypeModalVisible(false)} onSelect={(value) => setValue('challenge_type', value)} options={CHALLENGE_TYPES} selectedValue={challengeType} title="Challenge tipi" visible={typeModalVisible} />
    </ScrollView>
  );
};

export default WeeklyChallengeAdminScreen;
