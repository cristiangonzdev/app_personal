-- ─────────────────────────────────────────────
-- 00002 — Perfiles que extienden auth.users
-- ─────────────────────────────────────────────

create table if not exists public.users_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role role_enum not null default 'owner',
  default_currency text not null default 'EUR',
  timezone text not null default 'Atlantic/Canary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists tg_users_profiles_updated on public.users_profiles;
create trigger tg_users_profiles_updated before update on public.users_profiles
  for each row execute function public.fn_set_updated_at();

alter table public.users_profiles enable row level security;

create policy "profile_select_self" on public.users_profiles for select
  to authenticated using (auth.uid() = id);
comment on policy "profile_select_self" on public.users_profiles is 'Cada usuario ve su propio perfil.';

create policy "profile_update_self" on public.users_profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);
comment on policy "profile_update_self" on public.users_profiles is 'Cada usuario actualiza su propio perfil.';

-- Auto-crear perfil al alta de auth.users
create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end; $$;

drop trigger if exists tg_on_auth_user_created on auth.users;
create trigger tg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();
