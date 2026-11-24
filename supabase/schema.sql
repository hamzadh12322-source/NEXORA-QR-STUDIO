-- Run this script in Supabase Dashboard > SQL Editor > New query.
create table if not exists public.qr_users (
  telegram_id text primary key,
  username text,
  first_name text,
  language text not null default 'ar' check (language in ('ar','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_sessions (
  telegram_id text primary key references public.qr_users(telegram_id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.qr_users(telegram_id) on delete cascade,
  content text not null,
  color text not null default 'black',
  format text not null default 'png',
  created_at timestamptz not null default now()
);

create table if not exists public.qr_redirects (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.qr_users(telegram_id) on delete cascade,
  destination_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.qr_scans (
  id bigint generated always as identity primary key,
  redirect_id uuid not null references public.qr_redirects(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  user_agent text,
  ip_hash text
);

-- This starter uses the service-role key only in serverless functions.
-- Keep RLS enabled so no public client can read/write these tables.
alter table public.qr_users enable row level security;
alter table public.qr_sessions enable row level security;
alter table public.qr_codes enable row level security;
alter table public.qr_redirects enable row level security;
alter table public.qr_scans enable row level security;
