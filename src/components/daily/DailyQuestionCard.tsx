import {
  useMutation,
  useQuery } from '@tanstack/react-query';
import { useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import { Animated,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { ConfettiBurst } from '@/components/daily/ConfettiBurst';
import { GlassView } from '@/components/GlassView';
import {
  answerQuestion,
  checkRevealedResults,
  getQuestionOptions,
  getTodayQuestion,
  getUserQuestionAnswer,
} from '@/services/dailyGames.service';

interface QuestionAnswerState {
  chosenIndex: number;
  isCorrect: boolean | null;
  xpEarned: number;
}

const formatCountdown = (targetDate: string): string => {
  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

export const DailyQuestionCard = (): JSX.Element | null => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('00:00:00');
  const [answerState, setAnswerState] = useState<QuestionAnswerState | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const questionQuery = useQuery({
    queryKey: ['daily-question'],
    queryFn: getTodayQuestion,
  });
  const answerQuery = useQuery({
    queryKey: ['daily-question-answer', questionQuery.data?.id],
    queryFn: () => getUserQuestionAnswer(questionQuery.data?.id ?? ''),
    enabled: Boolean(questionQuery.data?.id),
  });
  const answerMutation = useMutation({
    mutationFn: ({ questionId, chosenIndex }: { questionId: string; chosenIndex: number }) =>
      answerQuestion(questionId, chosenIndex),
  });
  const cardHeight = useRef(new Animated.Value(180)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const chipTranslateX = useRef(new Animated.Value(40)).current;
  const chipOpacity = useRef(new Animated.Value(0)).current;

  const question = questionQuery.data;
  const answer = answerQuery.data;
  const options = useMemo(() => (question ? getQuestionOptions(question) : []), [question]);
  const resolvedAnswer = useMemo(() => (answerState ?? (answer
    ? {
        chosenIndex: answer.chosen_index,
        isCorrect: answer.is_correct,
        xpEarned: answer.xp_earned,
      }
    : null)), [answer, answerState]);

  useEffect(() => {
    if (!question) {
      return;
    }

    setCountdown(formatCountdown(question.reveal_at));
    const interval = setInterval(() => {
      setCountdown(formatCountdown(question.reveal_at));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [question]);

  useEffect(() => {
    const resolvedAnswer = answerState ?? (answer
      ? {
          chosenIndex: answer.chosen_index,
          isCorrect: answer.is_correct,
          xpEarned: answer.xp_earned,
        }
      : null);
    const expanded = !resolvedAnswer && question;

    Animated.timing(cardHeight, {
      toValue: expanded ? 280 : 180,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [answer, answerState, cardHeight, question]);

  useEffect(() => {
    const waitingAnswer = answerState
      ? answerState.isCorrect === null
      : answer
        ? answer.is_correct === null
        : false;

    if (!question || !waitingAnswer) {
      return;
    }

    const interval = setInterval(() => {
      const revealThreshold = new Date(question.reveal_at).getTime() - 5 * 60 * 1000;

      if (Date.now() >= revealThreshold) {
        void (async () => {
          await checkRevealedResults();
          await answerQuery.refetch();
        })();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [answer, answerQuery, answerState, question]);

  useEffect(() => {
    if (resolvedAnswer?.isCorrect) {
      setShowConfetti(true);
      setPulseIndex(resolvedAnswer.chosenIndex);
      buttonScale.setValue(1);
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      chipTranslateX.setValue(40);
      chipOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(chipTranslateX, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(chipOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      const timeout = setTimeout(() => setShowConfetti(false), 1200);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [buttonScale, chipOpacity, chipTranslateX, resolvedAnswer]);

  if (!question && !questionQuery.isLoading) {
    return null;
  }

  if (questionQuery.isLoading || !question) {
    return (
      <GlassView borderRadius={28} intensity={18} style={{ marginBottom: 16, paddingHorizontal: 16, paddingVertical: 20 }}>
        <View className="h-5 w-36 rounded-full bg-white/10" />
        <View className="mt-4 h-6 w-full rounded-full bg-white/5" />
        <View className="mt-3 h-10 w-full rounded-2xl bg-white/5" />
      </GlassView>
    );
  }
  const isCountdownWarning = (() => {
    const diff = Math.max(0, new Date(question.reveal_at).getTime() - Date.now());
    return diff <= 3600000;
  })();

  return (
    <Animated.View style={{ marginBottom: 16, height: cardHeight }}>
      <GlassView borderRadius={28} intensity={18} style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 20 }}>
      <ConfettiBurst visible={showConfetti} />
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-lg font-semibold text-[#FFFFFF]">🎯 Günün Tahmini</Text>
        <Text className={`text-sm font-medium ${isCountdownWarning ? 'text-[#FBBF24]' : 'text-sea'}`}>{countdown}</Text>
      </View>
      <Text className="mt-4 text-xl font-semibold text-[#F0F7F9]">{question.question_tr}</Text>

      {!resolvedAnswer ? (
        <View className="mt-4 gap-3">
          {options.map((option, index) => {
            const isSelected = selectedIndex === index;

            return (
              <TouchableOpacity activeOpacity={0.8}
                className={`rounded-2xl border px-4 py-3 ${isSelected ? 'border-[#D4FF00] bg-[rgba(212,255,0,0.16)]' : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)]'}`}
                key={`${question.id}-${option}`}
                onPress={() => setSelectedIndex(index)}
              >
                <Text className={`text-base ${isSelected ? 'font-semibold text-[#D4FF00]' : 'text-[#FFFFFF]'}`}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
          {selectedIndex !== null ? (
            <TouchableOpacity
              activeOpacity={0.8}
              className="items-center rounded-2xl bg-coral px-4 py-3"
              disabled={answerMutation.isPending}
              onPress={() => {
                void (async () => {
                  const result = await answerMutation.mutateAsync({
                    questionId: question.id,
                    chosenIndex: selectedIndex,
                  });
                  setAnswerState({
                    chosenIndex: result.chosenIndex,
                    isCorrect: result.isCorrect,
                    xpEarned: result.xpEarned,
                  });
                })();
              }}
            >
              <Text className="text-base font-semibold text-white">Tahminimi Onayla</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View className="mt-4 gap-3">
          {options.map((option, index) => {
            const isChosen = resolvedAnswer.chosenIndex === index;
            const isCorrectOption = question.correct_index === index;
            const className = resolvedAnswer.isCorrect === null
              ? isChosen
                ? 'border-[#D4FF00] bg-[rgba(212,255,0,0.16)]'
                : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)]'
              : isCorrectOption
                ? 'border-[#4CAF7D] bg-[rgba(76,175,125,0.20)]'
                : isChosen
                  ? 'border-[#EF6B6B] bg-[rgba(239,107,107,0.20)]'
                  : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)]';
            const textClassName = resolvedAnswer.isCorrect === null
              ? isChosen
                ? 'text-[#D4FF00]'
                : 'text-[#FFFFFF]'
              : isCorrectOption
                ? 'text-[#4CAF7D]'
                : isChosen
                  ? 'text-[#EF6B6B]'
                  : 'text-[#F0F7F9]';

            return (
              <Animated.View className={`rounded-2xl border px-4 py-3 ${className}`} key={`${question.id}-resolved-${option}`} style={pulseIndex === index ? { transform: [{ scale: buttonScale }] } : undefined}>
                <Text className={`text-base ${textClassName}`}>
                  {resolvedAnswer.isCorrect === true && isChosen ? '✓ ' : ''}
                  {resolvedAnswer.isCorrect === false && isChosen ? '✗ ' : ''}
                  {resolvedAnswer.isCorrect === false && isCorrectOption ? '✓ ' : ''}
                  {option}
                </Text>
              </Animated.View>
            );
          })}
          {resolvedAnswer.isCorrect === null ? (
            <>
              <Text className="text-sm font-medium text-white/45">⏳ Cevap 20:00&apos;de aciklanacak</Text>
              <View className="self-start rounded-full bg-[#43A047]/15 px-3 py-1.5">
                <Text className="text-sm font-semibold text-[#86EFAC]">+10 XP katılım puanı kazandın!</Text>
              </View>
            </>
          ) : resolvedAnswer.isCorrect ? (
            <>
              <Animated.View className="self-start rounded-full bg-[#43A047]/15 px-3 py-1.5" style={{ opacity: chipOpacity, transform: [{ translateX: chipTranslateX }] }}>
                <Text className="text-sm font-semibold text-[#86EFAC]">+25 XP bonus!</Text>
              </Animated.View>
              <Text className="text-sm text-[#7DE29A]">Doğru tahmin! Harika bir balıkçı içgüdüsün var. 🎣</Text>
            </>
          ) : (
            <>
              <View className="self-start rounded-full bg-sea/10 px-3 py-1.5">
                <Text className="text-sm font-semibold text-sea">+10 XP katılım puanı</Text>
              </View>
              <Text className="text-sm text-white/45">Yarın daha iyi şanslar!</Text>
            </>
          )}
        </View>
      )}
      </GlassView>
    </Animated.View>
  );
};
