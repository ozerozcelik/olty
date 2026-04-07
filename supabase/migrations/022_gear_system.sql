create table if not exists public.gear_categories (
  id serial primary key,
  slug text unique not null,
  name_tr text not null,
  icon text not null
);

insert into public.gear_categories (slug, name_tr, icon) values
  ('rod', 'Olta Kamisi', '🎣'),
  ('reel', 'Makine', '⚙️'),
  ('line', 'Misina', '〰️'),
  ('lure', 'Yem/Suni Yem', '🪱'),
  ('hook', 'Igne', '🪝'),
  ('accessories', 'Aksesuar', '🧰')
on conflict (slug) do nothing;

alter table public.gear_categories enable row level security;

drop policy if exists "gear_categories_select" on public.gear_categories;
create policy "gear_categories_select" on public.gear_categories
  for select using (true);

alter table public.gear_items
  add column if not exists name text,
  add column if not exists category_slug text references public.gear_categories(slug),
  add column if not exists purchase_date date,
  add column if not exists purchase_price numeric,
  add column if not exists is_favorite boolean not null default false;

update public.gear_items
set category_slug = case category
  when 'olta' then 'rod'
  when 'makara' then 'reel'
  when 'misina' then 'line'
  when 'yem' then 'lure'
  else 'accessories'
end
where category_slug is null;

update public.gear_items
set name = coalesce(nullif(trim(concat_ws(' ', brand, model)), ''), 'Ekipman')
where name is null;

alter table public.gear_items
  alter column category_slug set not null,
  alter column name set not null;

create index if not exists gear_items_category_slug_idx
  on public.gear_items(category_slug);
