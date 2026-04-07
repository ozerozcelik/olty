import * as ImagePicker from 'expo-image-picker';
import {
  useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { getRecentPhotoCatches, getTodayFishChallengeAdmin, upsertFishChallenge } from '@/services/admin.service';

const FishChallengeAdminScreen = (): JSX.Element => {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [catchId, setCatchId] = useState<string | null>(null);
  const [correctSpeciesName, setCorrectSpeciesName] = useState<string>('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [funFact, setFunFact] = useState<string>('');
  const existingQuery = useQuery({ queryKey: ['admin-fish-challenge-today'], queryFn: getTodayFishChallengeAdmin });
  const catchesQuery = useQuery({ queryKey: ['admin-fish-catches'], queryFn: getRecentPhotoCatches });

  const existing = existingQuery.data;
  const currentPhotoUrl = photoUrl || existing?.photo_url || '';

  const pickPhoto = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: 'images',
      quality: 1,
    });
    if (!result.canceled) {
      setPhotoUrl(result.assets[0]?.uri ?? '');
      setCatchId(null);
    }
  };

  const save = async (): Promise<void> => {
    await upsertFishChallenge({
      catch_id: catchId ?? existing?.catch_id ?? null,
      photo_url: currentPhotoUrl,
      correct_species_id: existing?.correct_species_id ?? null,
      correct_species_name: correctSpeciesName || existing?.correct_species_name || '',
      options: options.map((item, index) => index === 0 && !item ? correctSpeciesName : item),
      fun_fact_tr: funFact || existing?.fun_fact_tr || null,
    });
    router.back();
  };

  return (
    <ScrollView
      className="flex-1 bg-sand"
      contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
    >
      <Text className="text-2xl font-semibold text-ink">Balık challenge</Text>
      <TouchableOpacity activeOpacity={0.8} className="rounded-[24px] border border-white/10 bg-white/10 p-4" onPress={() => void pickPhoto()}>
        {currentPhotoUrl ? (
          <Image
            resizeMode="cover"
            source={{ uri: currentPhotoUrl }}
            style={{ width: '100%', height: 224, borderRadius: 20 }}
          />
        ) : <Text className="text-base text-sea">Yeni fotoğraf seç</Text>}
      </TouchableOpacity>
      <Text className="text-sm font-medium text-ink">Son yakalanan fotoğraflar</Text>
      <View className="flex-row flex-wrap gap-3">
        {(catchesQuery.data ?? []).map((item) => (
          <TouchableOpacity activeOpacity={0.8} key={item.id} onPress={() => { setCatchId(item.id); setPhotoUrl(item.photo_url); }}>
            <Image resizeMode="cover" source={{ uri: item.photo_url }} style={{ width: 80, height: 80, borderRadius: 16 }} />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" onChangeText={setCorrectSpeciesName} placeholder="Doğru tür adı" placeholderTextColor="#8A958D" value={correctSpeciesName || existing?.correct_species_name || ''} />
      {options.map((option, index) => (
        <TextInput key={`fish-option-${index}`} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" onChangeText={(value) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} placeholder={`Seçenek ${index + 1}`} placeholderTextColor="#8A958D" value={option || (Array.isArray(existing?.options) ? String(existing?.options[index] ?? '') : '')} />
      ))}
      <TextInput className="min-h-[96px] rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-ink" multiline onChangeText={setFunFact} placeholder="Eğlenceli bilgi" placeholderTextColor="#8A958D" value={funFact || existing?.fun_fact_tr || ''} />
      <TouchableOpacity
        activeOpacity={0.8}
        className="items-center rounded-2xl bg-coral px-4 py-4"
        onPress={() => void save()}
      >
        <Text className="text-base font-semibold text-white">Kaydet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default FishChallengeAdminScreen;
