-- BNDS 运动圈 · Supabase 建表脚本
-- 在 Supabase Dashboard → SQL Editor 中粘贴运行

-- 用户资料
create table if not exists public.bnds_profiles (
  user_id text primary key,
  name text not null,
  grade text default '',
  weight float8 default 0,
  updated_at timestamptz default now()
);

-- 打卡记录
create table if not exists public.bnds_checkins (
  id text primary key,
  user_id text not null,
  sport_id text not null,
  sport_name text not null,
  met float8 not null,
  minutes int4 not null,
  calories int4 not null,
  weight float8 not null,
  date text not null,
  note text default '',
  created_at timestamptz default now()
);

create index if not exists bnds_checkins_user_id_idx on public.bnds_checkins (user_id);
create index if not exists bnds_checkins_created_at_idx on public.bnds_checkins (created_at desc);

-- 动态
create table if not exists public.bnds_feeds (
  id text primary key,
  user_id text not null,
  author_name text not null,
  author_grade text default '',
  text text not null,
  sport_name text,
  minutes int4,
  calories int4,
  checkin_id text,
  likes_count int4 default 0,
  created_at timestamptz default now()
);

create index if not exists bnds_feeds_created_at_idx on public.bnds_feeds (created_at desc);

-- 点赞
create table if not exists public.bnds_likes (
  user_id text not null,
  feed_id text not null references public.bnds_feeds (id) on delete cascade,
  primary key (user_id, feed_id)
);

-- 行级安全（内测阶段：允许匿名读写；正式上线应改为登录 + 严格策略）
alter table public.bnds_profiles enable row level security;
alter table public.bnds_checkins enable row level security;
alter table public.bnds_feeds enable row level security;
alter table public.bnds_likes enable row level security;

drop policy if exists "bnds_profiles_anon" on public.bnds_profiles;
create policy "bnds_profiles_anon" on public.bnds_profiles
  for all using (true) with check (true);

drop policy if exists "bnds_checkins_anon" on public.bnds_checkins;
create policy "bnds_checkins_anon" on public.bnds_checkins
  for all using (true) with check (true);

drop policy if exists "bnds_feeds_anon" on public.bnds_feeds;
create policy "bnds_feeds_anon" on public.bnds_feeds
  for all using (true) with check (true);

drop policy if exists "bnds_likes_anon" on public.bnds_likes;
create policy "bnds_likes_anon" on public.bnds_likes
  for all using (true) with check (true);

-- 约练搭子
create table if not exists public.bnds_buddy_posts (
  id text primary key,
  user_id text not null,
  author_name text not null,
  author_grade text default '',
  sport_name text not null,
  time_text text not null,
  place text default '',
  slots int4 not null default 2,
  message text default '',
  status text not null default 'open',
  join_count int4 default 0,
  created_at timestamptz default now()
);

create index if not exists bnds_buddy_posts_created_at_idx on public.bnds_buddy_posts (created_at desc);
create index if not exists bnds_buddy_posts_status_idx on public.bnds_buddy_posts (status);

create table if not exists public.bnds_buddy_joins (
  user_id text not null,
  post_id text not null references public.bnds_buddy_posts (id) on delete cascade,
  joiner_name text not null,
  joiner_grade text default '',
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

alter table public.bnds_buddy_posts enable row level security;
alter table public.bnds_buddy_joins enable row level security;

drop policy if exists "bnds_buddy_posts_anon" on public.bnds_buddy_posts;
create policy "bnds_buddy_posts_anon" on public.bnds_buddy_posts
  for all using (true) with check (true);

drop policy if exists "bnds_buddy_joins_anon" on public.bnds_buddy_joins;
create policy "bnds_buddy_joins_anon" on public.bnds_buddy_joins
  for all using (true) with check (true);
