create or replace function finalize_weekly_challenge(challenge_id uuid)
returns void language plpgsql security definer as $$
declare
  challenge_record public.weekly_challenges%rowtype;
  entry_record record;
begin
  select * into challenge_record
  from public.weekly_challenges
  where id = challenge_id;

  if challenge_record.id is null then
    return;
  end if;

  for entry_record in
    select id, user_id, value,
      rank() over (order by value desc nulls last, completed_at asc) as calculated_rank
    from public.weekly_challenge_entries
    where weekly_challenge_entries.challenge_id = finalize_weekly_challenge.challenge_id
  loop
    update public.weekly_challenge_entries
    set rank = entry_record.calculated_rank,
        xp_earned = case
          when entry_record.calculated_rank <= 3 then challenge_record.xp_reward * 2
          else challenge_record.xp_reward
        end
    where id = entry_record.id;

    perform public.increment_xp(
      entry_record.user_id,
      case
        when entry_record.calculated_rank <= 3 then challenge_record.xp_reward * 2
        else challenge_record.xp_reward
      end
    );

    insert into public.xp_transactions (user_id, amount, reason, ref_id)
    values (
      entry_record.user_id,
      case
        when entry_record.calculated_rank <= 3 then challenge_record.xp_reward * 2
        else challenge_record.xp_reward
      end,
      'weekly_challenge',
      challenge_record.id
    );

    if challenge_record.badge_slug is not null then
      insert into public.user_badges (user_id, badge_id)
      select entry_record.user_id, bd.id
      from public.badge_definitions bd
      where bd.slug = challenge_record.badge_slug
      on conflict do nothing;
    end if;
  end loop;
end;
$$;
