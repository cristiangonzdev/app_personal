-- ─────────────────────────────────────────────
-- 00003 — Clientes y contactos (módulo 2)
-- ─────────────────────────────────────────────

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  commercial_name text,
  client_type client_type not null default 'lead',
  fiscal_id text,                      -- CIF/NIF
  igic boolean not null default true,  -- Canarias por defecto
  fiscal_address text,
  city text,
  province text default 'Las Palmas',
  postal_code text,
  country text not null default 'ES',
  sector text,                          -- real_estate, automoción, hostelería, turismo, …
  ticket_avg numeric(12,2),
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}',
  notes text,
  owner_id uuid references public.users_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_clients_owner on public.clients(owner_id);
create index if not exists idx_clients_type on public.clients(client_type);
create index if not exists idx_clients_tags_gin on public.clients using gin (tags);
create index if not exists idx_clients_custom_gin on public.clients using gin (custom_fields jsonb_path_ops);
create index if not exists idx_clients_alive on public.clients(deleted_at) where deleted_at is null;
create trigger tg_clients_updated before update on public.clients
  for each row execute function public.fn_set_updated_at();

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  role text,
  email text,
  phone text,                  -- E.164
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_contacts_client on public.contacts(client_id);
create index if not exists idx_contacts_phone on public.contacts(phone) where phone is not null;
create index if not exists idx_contacts_email on public.contacts(email) where email is not null;
create trigger tg_contacts_updated before update on public.contacts
  for each row execute function public.fn_set_updated_at();

alter table public.clients enable row level security;
alter table public.contacts enable row level security;

-- v1 single-user: authenticated tiene acceso total a filas no borradas
create policy clients_select on public.clients for select to authenticated
  using (deleted_at is null);
comment on policy clients_select on public.clients is 'authenticated lee todos los clientes vivos.';
create policy clients_insert on public.clients for insert to authenticated
  with check (true);
comment on policy clients_insert on public.clients is 'authenticated crea clientes.';
create policy clients_update on public.clients for update to authenticated
  using (true) with check (true);
comment on policy clients_update on public.clients is 'authenticated edita clientes (incluye soft-delete).';
create policy clients_delete on public.clients for delete to authenticated
  using (false);
comment on policy clients_delete on public.clients is 'Hard-delete prohibido en v1, usar soft-delete via update.';

create policy contacts_select on public.contacts for select to authenticated using (deleted_at is null);
create policy contacts_insert on public.contacts for insert to authenticated with check (true);
create policy contacts_update on public.contacts for update to authenticated using (true) with check (true);
create policy contacts_delete on public.contacts for delete to authenticated using (false);
