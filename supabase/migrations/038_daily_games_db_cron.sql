create or replace function public.generate_daily_games_cron()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
  v_question_type_index integer := mod(extract(doy from v_today)::int, 4);
  v_question_tr text;
  v_question_type text;
  v_options jsonb;
  v_source_note text;
  v_reveal_at timestamptz := (v_today::timestamp + time '17:00') at time zone 'Europe/Istanbul';
  v_selected_catch record;
  v_decoys text[];
  v_challenge_options text[];
begin
  if v_question_type_index = 0 then
    select
      coalesce(jsonb_agg(name_tr order by rnd), '[]'::jsonb),
      'Bugün en çok hangi tür paylaşılacak?',
      'species_count',
      'Son 30 günün popüler türleri'
    into v_options, v_question_tr, v_question_type, v_source_note
    from (
      select distinct fs.name_tr, random() as rnd
      from public.catches c
      join public.fish_species fs on fs.id = c.species_id
      where c.created_at >= now() - interval '30 days'
        and c.species_id is not null
      order by rnd
      limit 5
    ) species_options;
  elsif v_question_type_index = 1 then
    v_question_tr := 'Bugün sabah mı akşam mı daha verimli?';
    v_question_type := 'time_of_day';
    v_options := '["Sabah","Akşam","İkisi eşit","Gece"]'::jsonb;
    v_source_note := 'Gün sonu catch saatlerine göre hesaplanır';
  elsif v_question_type_index = 2 then
    v_question_tr := 'Bugün şehirlerde balık tutulacak mı?';
    v_question_type := 'activity';
    v_options := '["Evet","Hayır","Sadece kıyıda","Akşama doğru"]'::jsonb;
    v_source_note := 'Günlük hava skoruna göre belirlenir';
  else
    v_question_tr := 'Bugün hangi yem tipi öne çıkacak?';
    v_question_type := 'bait_type';
    v_options := '["Silikon","Kaşık","Canlı Yem","Jig","Hamur"]'::jsonb;
    select format('Son 30 gün notları: %s kayıt', count(*))
      into v_source_note
    from public.catches
    where created_at >= now() - interval '30 days';
  end if;

  insert into public.daily_questions (
    date, question_tr, options, correct_index, question_type, reveal_at, source_note
  )
  values (
    v_today, v_question_tr, coalesce(v_options, '[]'::jsonb), null, v_question_type, v_reveal_at, v_source_note
  )
  on conflict (date) do update set
    question_tr = excluded.question_tr,
    options = excluded.options,
    correct_index = excluded.correct_index,
    question_type = excluded.question_type,
    reveal_at = excluded.reveal_at,
    source_note = excluded.source_note;

  with recent_excluded as (
    select catch_id
    from public.daily_fish_challenges
    where date >= v_today - 30
      and catch_id is not null
  ), candidate_catches as (
    select
      c.id,
      c.photo_url,
      c.species_id,
      fs.name_tr,
      fs.name_scientific,
      case when c.created_at >= now() - interval '7 days' then 1 else 0 end as recent_score
    from public.catches c
    join public.fish_species fs on fs.id = c.species_id
    where c.photo_url is not null
      and c.species_id is not null
      and not exists (
        select 1
        from recent_excluded re
        where re.catch_id = c.id
      )
  )
  select *
    into v_selected_catch
  from candidate_catches
  order by recent_score desc, random()
  limit 1;

  if v_selected_catch.id is null then
    return;
  end if;

  select array_agg(name_tr)
    into v_decoys
  from (
    select fs.name_tr
    from public.fish_species fs
    where fs.id <> v_selected_catch.species_id
    order by random()
    limit 3
  ) decoys;

  select array_agg(option_text order by random())
    into v_challenge_options
  from unnest(array_prepend(
    v_selected_catch.name_tr,
    coalesce(v_decoys, '{}'::text[])
  )) as option_text;

  insert into public.daily_fish_challenges (
    date,
    catch_id,
    photo_url,
    correct_species_id,
    correct_species_name,
    options,
    fun_fact_tr
  )
  values (
    v_today,
    v_selected_catch.id,
    v_selected_catch.photo_url,
    v_selected_catch.species_id,
    v_selected_catch.name_tr,
    to_jsonb(coalesce(v_challenge_options, array[v_selected_catch.name_tr])),
    case
      when v_selected_catch.name_scientific is not null
        then format('%s türünün bilimsel adı %s.', v_selected_catch.name_tr, v_selected_catch.name_scientific)
      else null
    end
  )
  on conflict (date) do update set
    catch_id = excluded.catch_id,
    photo_url = excluded.photo_url,
    correct_species_id = excluded.correct_species_id,
    correct_species_name = excluded.correct_species_name,
    options = excluded.options,
    fun_fact_tr = excluded.fun_fact_tr;
end;
$fn$;

create or replace function public.reveal_daily_question_cron()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
  v_question record;
  v_correct_index smallint;
  v_answer record;
begin
  select *
    into v_question
  from public.daily_questions
  where date = v_today
  limit 1;

  if v_question.id is null or v_question.correct_index is not null then
    return;
  end if;

  if jsonb_typeof(v_question.options) = 'array' and jsonb_array_length(v_question.options) > 0 then
    v_correct_index := 0;
  else
    v_correct_index := null;
  end if;

  update public.daily_questions
  set correct_index = v_correct_index
  where id = v_question.id;

  if v_correct_index is null then
    return;
  end if;

  for v_answer in
    select *
    from public.daily_question_answers
    where question_id = v_question.id
      and is_correct is null
  loop
    update public.daily_question_answers
    set
      is_correct = (chosen_index = v_correct_index),
      xp_earned = case
        when chosen_index = v_correct_index then xp_earned + 25
        else xp_earned
      end
    where id = v_answer.id;

    if v_answer.chosen_index = v_correct_index then
      perform public.increment_xp(v_answer.user_id, 25);

      insert into public.xp_transactions (user_id, amount, reason, ref_id)
      values (v_answer.user_id, 25, 'daily_game', v_question.id);
    end if;
  end loop;
end;
$fn$;

select cron.unschedule(jobid)
from cron.job
where jobname in ('generate-daily-games', 'reveal-daily-question');

select cron.schedule('generate-daily-games', '0 3 * * *', $$select public.generate_daily_games_cron();$$);
select cron.schedule('reveal-daily-question', '0 17 * * *', $$select public.reveal_daily_question_cron();$$);
