-- ============================================================
-- NUSADHUA DATABASE
-- Jalankan di Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.serials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  cover_url text,
  synopsis text,
  status text,
  studio text,
  source_url text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  serial_id uuid not null references public.serials(id) on delete cascade,
  episode_number integer not null,
  title text not null,
  episode_url text,
  iframe_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(serial_id, episode_number)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  exp integer not null default 0,
  rank_level integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  serial_id uuid not null references public.serials(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, serial_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.watch_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  progress_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id, episode_id)
);

create index if not exists episodes_serial_id_idx on public.episodes(serial_id);
create index if not exists comments_episode_id_idx on public.comments(episode_id);
create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);

-- ------------------------------------------------------------
-- PROFILE AUTO-CREATE
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- EXP COMMENT
-- ------------------------------------------------------------

create or replace function public.award_comment_exp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    exp = exp + 10,
    rank_level = greatest(1, floor((exp + 10) / 100) + 1)
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists on_comment_award_exp on public.comments;

create trigger on_comment_award_exp
after insert on public.comments
for each row execute procedure public.award_comment_exp();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.serials enable row level security;
alter table public.episodes enable row level security;
alter table public.profiles enable row level security;
alter table public.bookmarks enable row level security;
alter table public.comments enable row level security;
alter table public.watch_history enable row level security;

drop policy if exists "public read serials" on public.serials;
create policy "public read serials"
on public.serials for select
to anon, authenticated
using (true);

drop policy if exists "public read episodes" on public.episodes;
create policy "public read episodes"
on public.episodes for select
to anon, authenticated
using (true);

drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "users manage own bookmarks" on public.bookmarks;
create policy "users manage own bookmarks"
on public.bookmarks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "public read comments" on public.comments;
create policy "public read comments"
on public.comments for select
to anon, authenticated
using (true);

drop policy if exists "users insert own comments" on public.comments;
create policy "users insert own comments"
on public.comments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users manage own history" on public.watch_history;
create policy "users manage own history"
on public.watch_history for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Scraper credentials must NEVER be exposed to the browser.
-- For production, write scraper data with a server-side secret
-- or a controlled ingestion endpoint, not with the public key.
