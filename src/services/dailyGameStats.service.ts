import { supabase } from '@/lib/supabase';
import { getTurkeyDateString } from '@/utils/date';

export interface DailyGameStats {
  totalQuestionsAnswered: number;
  totalQuestionsCorrect: number;
  totalFishAnswered: number;
  totalFishCorrect: number;
}

const buildConsecutiveStreak = (dates: string[]): number => {
  const uniqueDates = Array.from(new Set(dates)).sort((left, right) => right.localeCompare(left));
  const today = getTurkeyDateString();

  if (uniqueDates[0] !== today) {
    return 0;
  }

  let streak = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(`${uniqueDates[index - 1]}T00:00:00.000Z`);
    const current = new Date(`${uniqueDates[index]}T00:00:00.000Z`);
    const diffInDays = Math.round((previous.getTime() - current.getTime()) / 86400000);

    if (diffInDays !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
};

export const getDailyGameStreak = async (userId: string): Promise<number> => {
  const [questionAnswers, fishAnswers] = await Promise.all([
    supabase
      .from('daily_question_answers')
      .select('answered_at')
      .eq('user_id', userId),
    supabase
      .from('daily_fish_answers')
      .select('answered_at')
      .eq('user_id', userId),
  ]);

  if (questionAnswers.error) {
    throw new Error(questionAnswers.error.message);
  }

  if (fishAnswers.error) {
    throw new Error(fishAnswers.error.message);
  }

  const dates = [
    ...(questionAnswers.data ?? []).map((item) => getTurkeyDateString(new Date(item.answered_at))),
    ...(fishAnswers.data ?? []).map((item) => getTurkeyDateString(new Date(item.answered_at))),
  ];

  return buildConsecutiveStreak(dates);
};

export const getDailyStats = async (userId: string): Promise<DailyGameStats> => {
  const [questionAnswers, fishAnswers] = await Promise.all([
    supabase
      .from('daily_question_answers')
      .select('is_correct')
      .eq('user_id', userId),
    supabase
      .from('daily_fish_answers')
      .select('is_correct')
      .eq('user_id', userId),
  ]);

  if (questionAnswers.error) {
    throw new Error(questionAnswers.error.message);
  }

  if (fishAnswers.error) {
    throw new Error(fishAnswers.error.message);
  }

  return {
    totalQuestionsAnswered: questionAnswers.data?.length ?? 0,
    totalQuestionsCorrect:
      questionAnswers.data?.filter((item) => item.is_correct === true).length ?? 0,
    totalFishAnswered: fishAnswers.data?.length ?? 0,
    totalFishCorrect:
      fishAnswers.data?.filter((item) => item.is_correct === true).length ?? 0,
  };
};
