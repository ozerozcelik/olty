import {
  zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { Controller,
  useFieldArray,
  useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { z } from 'zod';

import { OptionModal } from '@/components/OptionModal';
import { deleteDailyQuestion, getTodayAdminQuestion, upsertDailyQuestion } from '@/services/admin.service';
import { getTurkeyDateString } from '@/utils/date';

const schema = z.object({
  question_tr: z.string().min(1, 'Soru gerekli'),
  question_type: z.string().min(1, 'Tip seç'),
  options: z.array(z.object({ value: z.string().min(1, 'Seçenek boş olamaz') })).min(4).max(5),
  correct_index: z.string().optional(),
  source_note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const QUESTION_TYPES = ['species_count', 'time_of_day', 'activity', 'bait_type'];

const DailyQuestionAdminScreen = (): JSX.Element => {
  const router = useRouter();
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [revealAt, setRevealAt] = useState<Date>(new Date(`${getTurkeyDateString()}T17:00:00.000Z`));
  const questionQuery = useQuery({ queryKey: ['admin-today-question'], queryFn: getTodayAdminQuestion });
  const { control, handleSubmit, setValue, watch } = useForm<FormValues>({
    values: {
      question_tr: questionQuery.data?.question_tr ?? '',
      question_type: questionQuery.data?.question_type ?? '',
      options: (Array.isArray(questionQuery.data?.options) ? questionQuery.data?.options : ['', '', '', '']).map((value) => ({ value: typeof value === 'string' ? value : '' })),
      correct_index: questionQuery.data?.correct_index?.toString() ?? '',
      source_note: questionQuery.data?.source_note ?? '',
    },
    resolver: zodResolver(schema),
  });
  const { fields, append } = useFieldArray({ control, name: 'options' });
  const selectedType = watch('question_type');

  const onSubmit = async (values: FormValues): Promise<void> => {
    await upsertDailyQuestion({
      question_tr: values.question_tr,
      question_type: values.question_type,
      options: values.options.map((item) => item.value),
      correct_index: values.correct_index ? Number(values.correct_index) : null,
      reveal_at: revealAt.toISOString(),
      source_note: values.source_note || null,
    });
    router.back();
  };

  const handleDelete = (): void => {
    if (!questionQuery.data) return;
    const questionDate = questionQuery.data.date;
    Alert.alert('Silinsin mi?', 'Bugünün sorusu silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => void deleteDailyQuestion(questionDate).then(() => router.back()) },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-sand"
      contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
    >
      <Text className="text-2xl font-semibold text-ink">Günün sorusu</Text>
      <Controller control={control} name="question_tr" render={({ field }) => <TextInput className="min-h-[96px] rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" multiline onChangeText={field.onChange} placeholder="Soru metni" placeholderTextColor="#8A958D" value={field.value} />} />
      <TouchableOpacity activeOpacity={0.8} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4" onPress={() => setTypeModalVisible(true)}>
        <Text className={selectedType ? 'text-base text-ink' : 'text-base text-white/45'}>{selectedType || 'Soru tipi seç'}</Text>
      </TouchableOpacity>
      {fields.map((field, index) => (
        <Controller key={field.id} control={control} name={`options.${index}.value`} render={({ field: optionField }) => <TextInput className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" onChangeText={optionField.onChange} placeholder={`Seçenek ${index + 1}`} placeholderTextColor="#8A958D" value={optionField.value} />} />
      ))}
      {fields.length < 5 ? (
        <TouchableOpacity
          activeOpacity={0.8}
          className="self-start rounded-full bg-sea px-4 py-2"
          onPress={() => append({ value: '' })}
        >
          <Text className="font-semibold text-white">Seçenek ekle</Text>
        </TouchableOpacity>
      ) : null}
      <Controller control={control} name="correct_index" render={({ field }) => <TextInput className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" keyboardType="numeric" onChangeText={field.onChange} placeholder="Doğru cevap index'i (0'dan başlar)" placeholderTextColor="#8A958D" value={field.value} />} />
      <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4"><DateTimePicker mode="datetime" onChange={(_event, date) => date && setRevealAt(date)} value={revealAt} /></View>
      <Controller control={control} name="source_note" render={({ field }) => <TextInput className="min-h-[96px] rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" multiline onChangeText={field.onChange} placeholder="İç not" placeholderTextColor="#8A958D" value={field.value} />} />
      <TouchableOpacity
        activeOpacity={0.8}
        className="items-center rounded-2xl bg-coral px-4 py-4"
        onPress={handleSubmit((values) => void onSubmit(values))}
      >
        <Text className="text-base font-semibold text-white">Kaydet</Text>
      </TouchableOpacity>
      {questionQuery.data ? (
        <TouchableOpacity
          activeOpacity={0.8}
          className="items-center rounded-2xl border border-[#A6422B]/40 bg-[#A6422B]/15 px-4 py-4"
          onPress={() => void handleDelete()}
        >
          <Text className="text-base font-semibold text-[#A6422B]">Sil</Text>
        </TouchableOpacity>
      ) : null}
      <OptionModal onClose={() => setTypeModalVisible(false)} onSelect={(value) => setValue('question_type', value)} options={QUESTION_TYPES} selectedValue={selectedType} title="Soru tipi" visible={typeModalVisible} />
    </ScrollView>
  );
};

export default DailyQuestionAdminScreen;
