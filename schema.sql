-- Run once in Supabase > SQL Editor. All user-owned data is protected by RLS.
create table if not exists public.form_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.form_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('meal','workout','checkin','chat')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists form_records_user_kind_idx on public.form_records(user_id,kind,created_at desc);
alter table public.form_profiles enable row level security;
alter table public.form_records enable row level security;
drop policy if exists "profile owner" on public.form_profiles;
create policy "profile owner" on public.form_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "record owner" on public.form_records;
create policy "record owner" on public.form_records for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
