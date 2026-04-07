create or replace view public.profile_stats
with (security_invoker = true) as
select
  p.id as user_id,
  p.catch_count,
  p.total_xp,
  p.level,
  coalesce(max(c.length_cm), 0) as biggest_catch_cm,
  coalesce(max(c.weight_g), 0) as biggest_catch_g,
  count(distinct coalesce(c.species_id::text, c.species_custom)) filter (where c.id is not null) as unique_species_count,
  count(c.id) filter (where c.is_catch_release = true) as release_count,
  count(c.id) filter (where c.created_at >= now() - interval '30 days') as catches_last_30_days
from public.profiles p
left join public.catches c on c.user_id = p.id and c.is_public = true
group by p.id, p.catch_count, p.total_xp, p.level;

grant select on public.profile_stats to authenticated;

create or replace function public.get_top_species(p_user_id uuid, p_limit int default 3)
returns table(species_name text, catch_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(fs.name_tr, c.species_custom, 'Bilinmeyen') as species_name,
    count(*) as catch_count
  from public.catches c
  left join public.fish_species fs on fs.id = c.species_id
  where c.user_id = p_user_id and c.is_public = true
  group by coalesce(fs.name_tr, c.species_custom, 'Bilinmeyen')
  order by count(*) desc
  limit p_limit;
$$;

grant execute on function public.get_top_species(uuid, int) to authenticated;
