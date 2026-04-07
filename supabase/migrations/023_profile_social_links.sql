alter table public.profiles
  add column if not exists instagram_url text check (instagram_url is null or length(instagram_url) <= 255),
  add column if not exists x_url text check (x_url is null or length(x_url) <= 255),
  add column if not exists youtube_url text check (youtube_url is null or length(youtube_url) <= 255),
  add column if not exists tiktok_url text check (tiktok_url is null or length(tiktok_url) <= 255),
  add column if not exists website_url text check (website_url is null or length(website_url) <= 255);
