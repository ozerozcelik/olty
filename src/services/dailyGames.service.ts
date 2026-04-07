import { XP_REWARDS } from '@/lib/constants';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { awardXP } from '@/services/gamification.service';
import type {
  DailyFishAnswerRow,
  DailyFishChallengeResult,
  DailyFishChallengeRow,
  DailyQuestionAnswerRow,
  DailyQuestionResult,
  DailyQuestionRow,
} from '@/types/app.types';
import { getTurkeyDateString } from '@/utils/date';

const getCurrentUserId = async (): Promise<string> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  return userId;
};

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const awardGameXp = async (
  userId: string,
  amount: number,
  reason: 'daily_game' | 'fish_id',
  refId: string,
): Promise<void> => {
  await awardXP({ userId, amount, reason, refId });
};

export const getTodayQuestion = async (): Promise<DailyQuestionRow | null> => {
  const today = getTurkeyDateString();
  const { data, error } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getUserQuestionAnswer = async (
  questionId: string,
): Promise<DailyQuestionAnswerRow | null> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('daily_question_answers')
    .select('*')
    .eq('question_id', questionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const answerQuestion = async (
  questionId: string,
  chosenIndex: number,
): Promise<DailyQuestionResult> => {
  const userId = await getCurrentUserId();
  const [question, existingAnswer] = await Promise.all([
    supabase.from('daily_questions').select('*').eq('id', questionId).single(),
    getUserQuestionAnswer(questionId),
  ]);

  if (question.error) {
    throw new Error(question.error.message);
  }

  if (existingAnswer) {
    return {
      alreadyAnswered: true,
      chosenIndex: existingAnswer.chosen_index,
      isCorrect: existingAnswer.is_correct,
      xpEarned: existingAnswer.xp_earned,
    };
  }

  const isCorrect =
    question.data.correct_index === null ? null : question.data.correct_index === chosenIndex;
  const xpEarned =
    XP_REWARDS.DAILY_GAME_PARTICIPATE +
    (isCorrect ? XP_REWARDS.DAILY_GAME_CORRECT : 0);
  const answerPayload = {
    user_id: userId,
    question_id: questionId,
    chosen_index: chosenIndex,
    is_correct: isCorrect,
    xp_earned:
      question.data.correct_index === null
        ? XP_REWARDS.DAILY_GAME_PARTICIPATE
        : xpEarned,
  };
  const { error } = await supabase.from('daily_question_answers').insert(answerPayload);

  if (error) {
    throw new Error(error.message);
  }

  await awardGameXp(userId, XP_REWARDS.DAILY_GAME_PARTICIPATE, 'daily_game', questionId);

  if (isCorrect) {
    await awardGameXp(userId, XP_REWARDS.DAILY_GAME_CORRECT, 'daily_game', questionId);
  }

  track('daily_question_answered', {
    is_correct: isCorrect === null ? false : isCorrect,
  });

  return {
    alreadyAnswered: false,
    chosenIndex,
    isCorrect,
    xpEarned:
      question.data.correct_index === null
        ? XP_REWARDS.DAILY_GAME_PARTICIPATE
        : xpEarned,
  };
};

export const checkRevealedResults = async (): Promise<void> => {
  const question = await getTodayQuestion();

  if (!question || question.correct_index === null) {
    return;
  }

  const userId = await getCurrentUserId();
  const answer = await getUserQuestionAnswer(question.id);

  if (!answer || answer.is_correct !== null) {
    return;
  }

  const isCorrect = answer.chosen_index === question.correct_index;
  const xpEarned = XP_REWARDS.DAILY_GAME_PARTICIPATE + (isCorrect ? XP_REWARDS.DAILY_GAME_CORRECT : 0);
  const { error } = await supabase
    .from('daily_question_answers')
    .update({
      is_correct: isCorrect,
      xp_earned: xpEarned,
    })
    .eq('id', answer.id);

  if (error) {
    throw new Error(error.message);
  }

  if (isCorrect) {
    await awardGameXp(userId, XP_REWARDS.DAILY_GAME_CORRECT, 'daily_game', question.id);
  }
};

export const getTodayFishChallenge = async (): Promise<DailyFishChallengeRow | null> => {
  const today = getTurkeyDateString();
  const { data, error } = await supabase
    .from('daily_fish_challenges')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getUserFishAnswer = async (
  challengeId: string,
): Promise<DailyFishAnswerRow | null> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('daily_fish_answers')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const answerFishChallenge = async (
  challengeId: string,
  chosenOption: string,
): Promise<DailyFishChallengeResult> => {
  const userId = await getCurrentUserId();
  const [challengeResponse, existingAnswer] = await Promise.all([
    supabase.from('daily_fish_challenges').select('*').eq('id', challengeId).single(),
    getUserFishAnswer(challengeId),
  ]);

  if (challengeResponse.error) {
    throw new Error(challengeResponse.error.message);
  }

  if (existingAnswer) {
    return {
      alreadyAnswered: true,
      isCorrect: existingAnswer.is_correct,
      correctOption: challengeResponse.data.correct_species_name,
      funFact: challengeResponse.data.fun_fact_tr,
      xpEarned: existingAnswer.xp_earned,
    };
  }

  const isCorrect = challengeResponse.data.correct_species_name === chosenOption;
  const xpEarned = XP_REWARDS.DAILY_GAME_PARTICIPATE + (isCorrect ? XP_REWARDS.DAILY_GAME_CORRECT : 0);
  const { error } = await supabase.from('daily_fish_answers').insert({
    user_id: userId,
    challenge_id: challengeId,
    chosen_option: chosenOption,
    is_correct: isCorrect,
    xp_earned: xpEarned,
  });

  if (error) {
    throw new Error(error.message);
  }

  await awardGameXp(userId, XP_REWARDS.DAILY_GAME_PARTICIPATE, 'fish_id', challengeId);

  if (isCorrect) {
    await awardGameXp(userId, XP_REWARDS.DAILY_GAME_CORRECT, 'fish_id', challengeId);
  }

  track('fish_id_answered', { is_correct: isCorrect });

  return {
    alreadyAnswered: false,
    isCorrect,
    correctOption: challengeResponse.data.correct_species_name,
    funFact: challengeResponse.data.fun_fact_tr,
    xpEarned,
  };
};

export const getQuestionOptions = (question: DailyQuestionRow): string[] => {
  return parseStringArray(question.options);
};

export const getFishChallengeOptions = (challenge: DailyFishChallengeRow): string[] => {
  return parseStringArray(challenge.options);
};

export { getDailyGameStreak, getDailyStats } from '@/services/dailyGameStats.service';
