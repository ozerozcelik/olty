// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('APP_SERVICE_ROLE_KEY')
  ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  ?? '';
const cronSharedSecret = Deno.env.get('CRON_SHARED_SECRET') ?? '';

const getSupabaseClient = () => createClient(supabaseUrl, serviceRoleKey);

const getRequestSecret = (request: Request): string => {
  const authorization = request.headers.get('Authorization') ?? '';

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return request.headers.get('x-cron-secret')
    ?? request.headers.get('apikey')
    ?? '';
};

const isAuthorizedServiceRequest = (request: Request): boolean => {
  const requestSecret = getRequestSecret(request);
  return Boolean(cronSharedSecret) && requestSecret === cronSharedSecret;
};

const getTurkeyDateString = (value = new Date()): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
};

const getTurkeyDayOfYear = (): number => {
  const today = new Date(`${getTurkeyDateString()}T00:00:00.000Z`);
  const yearStart = new Date(`${today.getUTCFullYear()}-01-01T00:00:00.000Z`);
  return Math.floor((today.getTime() - yearStart.getTime()) / 86400000);
};

const shuffle = <T>(items: T[]): T[] => {
  const clonedItems = [...items];
  for (let index = clonedItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clonedItems[index], clonedItems[swapIndex]] = [clonedItems[swapIndex], clonedItems[index]];
  }
  return clonedItems;
};

const getRevealAt = (): string => {
  const date = new Date(`${getTurkeyDateString()}T17:00:00.000Z`);
  return date.toISOString();
};

const generateSpeciesCountQuestion = async (supabase: ReturnType<typeof createClient>) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase
    .from('catches')
    .select('species_id, fish_species(name_tr)')
    .gte('created_at', thirtyDaysAgo)
    .not('species_id', 'is', null);
  const speciesNames = shuffle(
    Array.from(
      new Set(
        (data ?? [])
          .map((item) => item.fish_species?.name_tr)
          .filter((item): item is string => Boolean(item)),
      ),
    ),
  ).slice(0, 5);

  return {
    question_tr: 'Bugün en çok hangi tür paylaşılacak?',
    options: speciesNames,
    question_type: 'species_count',
    source_note: 'Son 30 günün popüler türleri',
  };
};

const generateTimeOfDayQuestion = async () => ({
  question_tr: 'Bugün sabah mı akşam mı daha verimli?',
  options: ['Sabah', 'Akşam', 'İkisi eşit', 'Gece'],
  question_type: 'time_of_day',
  source_note: 'Gün sonu catch saatlerine göre hesaplanır',
});

const generateActivityQuestion = async () => ({
  question_tr: 'Bugün şehirlerde balık tutulacak mı?',
  options: ['Evet', 'Hayır', 'Sadece kıyıda', 'Akşama doğru'],
  question_type: 'activity',
  source_note: 'Günlük hava skoruna göre belirlenir',
});

const generateBaitQuestion = async (supabase: ReturnType<typeof createClient>) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase
    .from('catches')
    .select('notes')
    .gte('created_at', thirtyDaysAgo);
  const baitPool = ['Silikon', 'Kaşık', 'Canlı Yem', 'Jig', 'Hamur'];
  const options = shuffle(baitPool).slice(0, 5);

  return {
    question_tr: 'Bugün hangi yem tipi öne çıkacak?',
    options,
    question_type: 'bait_type',
    source_note: `Son 30 gün notları: ${(data ?? []).length} kayıt`,
  };
};

const generateDailyQuestion = async (supabase: ReturnType<typeof createClient>) => {
  const today = getTurkeyDateString();
  const questionTypeIndex = getTurkeyDayOfYear() % 4;
  const generator = [
    generateSpeciesCountQuestion,
    generateTimeOfDayQuestion,
    generateActivityQuestion,
    generateBaitQuestion,
  ][questionTypeIndex];
  const payload = await generator(supabase);

  await supabase.from('daily_questions').upsert({
    date: today,
    question_tr: payload.question_tr,
    options: payload.options,
    correct_index: null,
    question_type: payload.question_type,
    reveal_at: getRevealAt(),
    source_note: payload.source_note,
  }, { onConflict: 'date' });
};

const generateDailyFishChallenge = async (supabase: ReturnType<typeof createClient>) => {
  const today = getTurkeyDateString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = getTurkeyDateString(new Date(Date.now() - 30 * 86400000));
  const { data: recentChallenges } = await supabase
    .from('daily_fish_challenges')
    .select('catch_id')
    .gte('date', thirtyDaysAgo);
  const excludedCatchIds = (recentChallenges ?? [])
    .map((item) => item.catch_id)
    .filter((item): item is string => Boolean(item));
  let catchQuery = supabase
    .from('catches')
    .select('id, photo_url, species_id, fish_species(name_tr, name_scientific)')
    .not('photo_url', 'is', null)
    .not('species_id', 'is', null)
    .gte('created_at', sevenDaysAgo)
    .limit(50);

  if (excludedCatchIds.length) {
    catchQuery = catchQuery.not('id', 'in', `(${excludedCatchIds.join(',')})`);
  }

  const { data: catches } = await catchQuery;
  let selectedCatch = shuffle(catches ?? [])[0];

  if (!selectedCatch) {
    let fallbackQuery = supabase
      .from('catches')
      .select('id, photo_url, species_id, fish_species(name_tr, name_scientific)')
      .not('photo_url', 'is', null)
      .not('species_id', 'is', null)
      .limit(100);

    if (excludedCatchIds.length) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${excludedCatchIds.join(',')})`);
    }

    const { data: fallbackCatches } = await fallbackQuery;
    selectedCatch = shuffle(fallbackCatches ?? [])[0];
  }

  if (!selectedCatch?.photo_url || !selectedCatch.species_id || !selectedCatch.fish_species?.name_tr) {
    return;
  }

  const { data: species } = await supabase
    .from('fish_species')
    .select('name_tr')
    .neq('id', selectedCatch.species_id)
    .limit(20);
  const decoys = shuffle(
    (species ?? []).map((item) => item.name_tr).filter((item): item is string => Boolean(item)),
  ).slice(0, 3);
  const options = shuffle([selectedCatch.fish_species.name_tr, ...decoys]);

  await supabase.from('daily_fish_challenges').upsert({
    date: today,
    catch_id: selectedCatch.id,
    photo_url: selectedCatch.photo_url,
    correct_species_id: selectedCatch.species_id,
    correct_species_name: selectedCatch.fish_species.name_tr,
    options,
    fun_fact_tr: selectedCatch.fish_species.name_scientific
      ? `${selectedCatch.fish_species.name_tr} türünün bilimsel adı ${selectedCatch.fish_species.name_scientific}.`
      : null,
  }, { onConflict: 'date' });
};

const revealDailyQuestion = async (supabase: ReturnType<typeof createClient>) => {
  const today = getTurkeyDateString();
  const { data: question } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  if (!question || question.correct_index !== null) {
    return;
  }

  const options = Array.isArray(question.options)
    ? question.options.filter((item): item is string => typeof item === 'string')
    : [];
  const correctIndex = options.length ? 0 : null;

  await supabase
    .from('daily_questions')
    .update({ correct_index: correctIndex })
    .eq('id', question.id);

  if (correctIndex === null) {
    return;
  }

  const { data: answers } = await supabase
    .from('daily_question_answers')
    .select('*')
    .eq('question_id', question.id)
    .is('is_correct', null);

  for (const answer of answers ?? []) {
    const isCorrect = answer.chosen_index === correctIndex;
    await supabase
      .from('daily_question_answers')
      .update({
        is_correct: isCorrect,
        xp_earned: isCorrect ? answer.xp_earned + 25 : answer.xp_earned,
      })
      .eq('id', answer.id);

    if (isCorrect) {
      await supabase.rpc('increment_xp', {
        p_user_id: answer.user_id,
        p_amount: 25,
      });
      await supabase.from('xp_transactions').insert({
        user_id: answer.user_id,
        amount: 25,
        reason: 'daily_game',
        ref_id: question.id,
      });
    }
  }
};

Deno.serve(async (request) => {
  if (!supabaseUrl || !serviceRoleKey || !cronSharedSecret) {
    return new Response(JSON.stringify({ error: 'Function is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isAuthorizedServiceRequest(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pathname = new URL(request.url).pathname;
  const supabase = getSupabaseClient();

  if (pathname.endsWith('/reveal')) {
    await revealDailyQuestion(supabase);
    return new Response(JSON.stringify({ ok: true, mode: 'reveal' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await generateDailyQuestion(supabase);
  await generateDailyFishChallenge(supabase);

  return new Response(JSON.stringify({ ok: true, mode: 'generate' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
