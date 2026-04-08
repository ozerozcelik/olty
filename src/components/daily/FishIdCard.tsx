import {
  useMutation,
  useQuery } from '@tanstack/react-query';
import { useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import { Animated,
  Image,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { GlassView } from '@/components/GlassView';
import {
  answerFishChallenge,
  getFishChallengeOptions,
  getTodayFishChallenge,
  getUserFishAnswer,
} from '@/services/dailyGames.service';

interface FishAnswerState {
  chosenOption: string;
  isCorrect: boolean;
  xpEarned: number;
}

export const FishIdCard = (): JSX.Element | null => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<FishAnswerState | null>(null);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const challengeQuery = useQuery({
    queryKey: ['daily-fish-challenge'],
    queryFn: getTodayFishChallenge,
  });
  const answerQuery = useQuery({
    queryKey: ['daily-fish-answer', challengeQuery.data?.id],
    queryFn: () => getUserFishAnswer(challengeQuery.data?.id ?? ''),
    enabled: Boolean(challengeQuery.data?.id),
  });
  const answerMutation = useMutation({
    mutationFn: ({ challengeId, chosenOption }: { challengeId: string; chosenOption: string }) =>
      answerFishChallenge(challengeId, chosenOption),
  });

  const challenge = challengeQuery.data;
  const answer = answerQuery.data;
  const options = challenge ? getFishChallengeOptions(challenge) : [];
  const resolvedAnswer = useMemo(() => (answerState ?? (answer
    ? {
        chosenOption: answer.chosen_option,
        isCorrect: answer.is_correct,
        xpEarned: answer.xp_earned,
      }
    : null)), [answer, answerState]);

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: resolvedAnswer ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity, resolvedAnswer]);

  if (!challenge && !challengeQuery.isLoading) {
    return null;
  }

  if (challengeQuery.isLoading || !challenge) {
    return (
      <GlassView borderRadius={28} intensity={18} style={{ marginBottom: 16, paddingHorizontal: 16, paddingVertical: 20 }}>
        <View className="h-5 w-32 rounded-full bg-white/10" />
        <View className="mt-4 h-56 w-full rounded-[24px] bg-white/5" />
      </GlassView>
    );
  }

  return (
    <GlassView borderRadius={28} intensity={18} style={{ marginBottom: 16, paddingHorizontal: 16, paddingVertical: 20 }}>
      <Text className="text-lg font-semibold text-[#F0F7F9]">🐟 Balık Kimdir?</Text>
      <View className="mt-4 overflow-hidden rounded-[24px] bg-[#0F2C35]">
        <Image resizeMode="cover" source={{ uri: challenge.photo_url }} style={{ width: '100%', height: 224 }} />
        <Animated.View
          className="absolute inset-0 items-center justify-center bg-black/35"
          pointerEvents="none"
          style={{ opacity: overlayOpacity }}
        >
          <Text className="text-6xl font-semibold text-white">?</Text>
        </Animated.View>
      </View>
      {resolvedAnswer ? (
        <View className="mt-4 gap-3">
          <View className="flex-row flex-wrap gap-3">
            {options.map((option) => {
              const isChosen = resolvedAnswer.chosenOption === option;
              const isCorrectOption = challenge.correct_species_name === option;
              const className = isCorrectOption
                ? 'border-[#4CAF7D] bg-[rgba(76,175,125,0.20)]'
                : isChosen
                  ? 'border-[#EF6B6B] bg-[rgba(239,107,107,0.20)]'
                  : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)]';
              const textClassName = isCorrectOption
                ? 'text-[#4CAF7D]'
                : isChosen
                  ? 'text-[#EF6B6B]'
                  : 'text-[#F0F7F9]';

              return (
                <View className={`w-[48%] rounded-2xl border px-4 py-3 ${className}`} key={`${challenge.id}-${option}`}>
                  <Text className={`text-sm font-medium ${textClassName}`}>
                    {isCorrectOption ? '✓ ' : ''}
                    {!resolvedAnswer.isCorrect && isChosen ? '✗ ' : ''}
                    {option}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text className="text-lg font-semibold text-[#7DE29A]">✓ {challenge.correct_species_name}</Text>
          {challenge.fun_fact_tr ? (
            <Text className="text-sm italic text-white/70">{challenge.fun_fact_tr}</Text>
          ) : null}
          <View className="self-start rounded-full bg-[#43A047]/15 px-3 py-1.5">
            <Text className="text-sm font-semibold text-[#7DE29A]">
              {resolvedAnswer.isCorrect ? '+25 XP' : '+10 XP katılım'}
            </Text>
          </View>
          <Text className="text-sm text-white/45">Yarın yeni bir balık seni bekliyor 🎣</Text>
        </View>
      ) : (
        <View className="mt-4 gap-3">
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {options.map((option) => {
              const isSelected = selectedOption === option;

              return (
                <TouchableOpacity activeOpacity={0.8}
                  className={`w-[48%] rounded-2xl border px-4 py-3 ${isSelected ? 'border-[#D4FF00] bg-[rgba(212,255,0,0.16)]' : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)]'}`}
                  key={`${challenge.id}-option-${option}`}
                  onPress={() => setSelectedOption(option)}
                >
                  <Text className={`text-sm ${isSelected ? 'font-semibold text-[#D4FF00]' : 'text-[#FFFFFF]'}`}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedOption ? (
            <TouchableOpacity
              activeOpacity={0.8}
              className="items-center rounded-2xl bg-coral px-4 py-3"
              disabled={answerMutation.isPending}
              onPress={() => {
                void (async () => {
                  const result = await answerMutation.mutateAsync({
                    challengeId: challenge.id,
                    chosenOption: selectedOption,
                  });
                  setAnswerState({
                    chosenOption: selectedOption,
                    isCorrect: result.isCorrect,
                    xpEarned: result.xpEarned,
                  });
                })();
              }}
            >
              <Text className="text-base font-semibold text-white">Cevapla</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </GlassView>
  );
};
