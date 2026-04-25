-- ─────────────────────────────────────────────
-- CRM Logika — bundle de TODAS las migrations + seed
-- Generado: 2026-04-25T10:29:05Z
-- Pega este archivo en Supabase Dashboard > SQL Editor > Run.
-- Idempotente: drop-if-exists antes de triggers y policies.
-- ─────────────────────────────────────────────


-- ╔═══ migrations/20260425000001_init_extensions_and_helpers.sql ═══╗
-- ─────────────────────────────────────────────
-- 00001 — Extensiones, enums, helpers globales
-- ─────────────────────────────────────────────

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Trigger genérico de updated_at
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Enums core
do $$ begin
  create type role_enum as enum ('owner','member','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type service_kind as enum ('software_custom','chatbot','web','social_media_management');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_stage as enum ('lead','cualificado','propuesta','negociacion','ganado','perdido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_source as enum ('linkedin','referido','cold_outreach','inbound_web','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type client_type as enum ('lead','one_shot','recurrente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('planificado','en_curso','pausado','entregado','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo','doing','blocked','done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('borrador','emitida','enviada','pagada','vencida','anulada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('activa','pausada','cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comm_channel as enum ('whatsapp','email','vapi','sms','manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comm_direction as enum ('in','out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('idea','guion','grabado','editado','publicado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_kind as enum ('reel','post','story','blog','email','short');
exception when duplicate_object then null; end $$;


-- ╔═══ migrations/20260425000002_users_profiles.sql ═══╗
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

drop policy if exists profile_select_self on public.users_profiles;
create policy profile_select_self on public.users_profiles for select
  to authenticated using (auth.uid() = id);
comment on policy profile_select_self on public.users_profiles is 'Cada usuario ve su propio perfil.';

drop policy if exists profile_update_self on public.users_profiles;
create policy profile_update_self on public.users_profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);
comment on policy profile_update_self on public.users_profiles is 'Cada usuario actualiza su propio perfil.';

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


-- ╔═══ migrations/20260425000003_clients_contacts.sql ═══╗
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
drop trigger if exists tg_clients_updated on public.clients;
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
drop trigger if exists tg_contacts_updated on public.contacts;
create trigger tg_contacts_updated before update on public.contacts
  for each row execute function public.fn_set_updated_at();

alter table public.clients enable row level security;
alter table public.contacts enable row level security;

-- v1 single-user: authenticated tiene acceso total a filas no borradas
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated
  using (deleted_at is null);
comment on policy clients_select on public.clients is 'authenticated lee todos los clientes vivos.';
drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients for insert to authenticated
  with check (true);
comment on policy clients_insert on public.clients is 'authenticated crea clientes.';
drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients for update to authenticated
  using (true) with check (true);
comment on policy clients_update on public.clients is 'authenticated edita clientes (incluye soft-delete).';
drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients for delete to authenticated
  using (false);
comment on policy clients_delete on public.clients is 'Hard-delete prohibido en v1, usar soft-delete via update.';

drop policy if exists contacts_select on public.contacts;
create policy contacts_select on public.contacts for select to authenticated using (deleted_at is null);
drop policy if exists contacts_insert on public.contacts;
create policy contacts_insert on public.contacts for insert to authenticated with check (true);
drop policy if exists contacts_update on public.contacts;
create policy contacts_update on public.contacts for update to authenticated using (true) with check (true);
drop policy if exists contacts_delete on public.contacts;
create policy contacts_delete on public.contacts for delete to authenticated using (false);


-- ╔═══ migrations/20260425000004_deals.sql ═══╗
-- ─────────────────────────────────────────────
-- 00004 — Pipeline de ventas (módulo 1)
-- ─────────────────────────────────────────────

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid references public.clients(id) on delete restrict,
  contact_id uuid references public.contacts(id) on delete set null,
  services service_kind[] not null default '{}',
  setup_amount numeric(12,2) not null default 0,
  recurring_amount numeric(12,2) not null default 0,   -- €/mes
  probability int not null default 20 check (probability between 0 and 100),
  expected_close date,
  source deal_source not null default 'inbound_web',
  stage deal_stage not null default 'lead',
  score int check (score between 0 and 100),
  score_reasoning text,
  next_best_action text,
  last_activity_at timestamptz not null default now(),
  owner_id uuid references public.users_profiles(id) on delete set null,
  notes text,
  custom_fields jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_deals_stage on public.deals(stage);
create index if not exists idx_deals_owner on public.deals(owner_id);
create index if not exists idx_deals_client on public.deals(client_id);
create index if not exists idx_deals_close on public.deals(expected_close);
create index if not exists idx_deals_alive on public.deals(deleted_at) where deleted_at is null;
drop trigger if exists tg_deals_updated on public.deals;
create trigger tg_deals_updated before update on public.deals
  for each row execute function public.fn_set_updated_at();

-- Notas/interacciones para alimentar lead scoring
create table if not exists public.deal_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  body text not null,
  author_id uuid references public.users_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_deal_notes_deal on public.deal_notes(deal_id, created_at desc);

alter table public.deals enable row level security;
alter table public.deal_notes enable row level security;

drop policy if exists deals_select on public.deals;
create policy deals_select on public.deals for select to authenticated using (deleted_at is null);
drop policy if exists deals_insert on public.deals;
create policy deals_insert on public.deals for insert to authenticated with check (true);
drop policy if exists deals_update on public.deals;
create policy deals_update on public.deals for update to authenticated using (true) with check (true);
drop policy if exists deals_delete on public.deals;
create policy deals_delete on public.deals for delete to authenticated using (false);

drop policy if exists deal_notes_select on public.deal_notes;
create policy deal_notes_select on public.deal_notes for select to authenticated using (true);
drop policy if exists deal_notes_insert on public.deal_notes;
create policy deal_notes_insert on public.deal_notes for insert to authenticated with check (true);
drop policy if exists deal_notes_update on public.deal_notes;
create policy deal_notes_update on public.deal_notes for update to authenticated using (true) with check (true);
drop policy if exists deal_notes_delete on public.deal_notes;
create policy deal_notes_delete on public.deal_notes for delete to authenticated using (false);

-- View: forecast weighted
create or replace view public.deals_forecast as
select
  date_trunc('month', expected_close) as month,
  sum(setup_amount * probability / 100.0) as weighted_setup,
  sum(recurring_amount * probability / 100.0) as weighted_mrr,
  count(*) filter (where stage not in ('ganado','perdido')) as open_count
from public.deals
where deleted_at is null and expected_close is not null
group by 1
order by 1;


-- ╔═══ migrations/20260425000005_projects_tasks.sql ═══╗
-- ─────────────────────────────────────────────
-- 00005 — Proyectos, tareas, milestones (módulo 3)
-- ─────────────────────────────────────────────

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  deal_id uuid references public.deals(id) on delete set null,
  name text not null,
  kind service_kind not null,
  status project_status not null default 'planificado',
  starts_on date,
  ends_on date,
  hours_estimated numeric(7,2),
  hours_real numeric(7,2) not null default 0,
  owner_id uuid references public.users_profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_alive on public.projects(deleted_at) where deleted_at is null;
drop trigger if exists tg_projects_updated on public.projects;
create trigger tg_projects_updated before update on public.projects
  for each row execute function public.fn_set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  assignee_id uuid references public.users_profiles(id) on delete set null,
  due_on date,
  hours_estimated numeric(6,2),
  hours_real numeric(6,2) not null default 0,
  depends_on uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_assignee on public.tasks(assignee_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due on public.tasks(due_on);
drop trigger if exists tg_tasks_updated on public.tasks;
create trigger tg_tasks_updated before update on public.tasks
  for each row execute function public.fn_set_updated_at();

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  due_on date,
  reached_at timestamptz,
  payment_pct int check (payment_pct between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_milestones_project on public.milestones(project_id);
drop trigger if exists tg_milestones_updated on public.milestones;
create trigger tg_milestones_updated before update on public.milestones
  for each row execute function public.fn_set_updated_at();

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.milestones enable row level security;

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated using (deleted_at is null);
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated with check (true);
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated using (true) with check (true);
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated using (false);

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated using (deleted_at is null);
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated with check (true);
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated using (true) with check (true);
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated using (false);

drop policy if exists milestones_select on public.milestones;
create policy milestones_select on public.milestones for select to authenticated using (true);
drop policy if exists milestones_insert on public.milestones;
create policy milestones_insert on public.milestones for insert to authenticated with check (true);
drop policy if exists milestones_update on public.milestones;
create policy milestones_update on public.milestones for update to authenticated using (true) with check (true);
drop policy if exists milestones_delete on public.milestones;
create policy milestones_delete on public.milestones for delete to authenticated using (false);

-- Plantillas de tareas por tipo de proyecto
create table if not exists public.project_templates (
  kind service_kind primary key,
  task_titles text[] not null
);
insert into public.project_templates(kind, task_titles) values
  ('chatbot',    array['Kickoff','Mapeo de flujos','Prompt engineering','Integración Evolution API','Testing','Go-live','Training cliente'])
  on conflict (kind) do nothing;
insert into public.project_templates(kind, task_titles) values
  ('web',        array['Kickoff','Wireframes','Diseño visual','Maquetación','Conexión datos','SEO básico','Go-live'])
  on conflict (kind) do nothing;
insert into public.project_templates(kind, task_titles) values
  ('software_custom', array['Kickoff','Discovery & specs','Diseño de schema','MVP backend','MVP frontend','QA','Despliegue','Soporte 30 días'])
  on conflict (kind) do nothing;
insert into public.project_templates(kind, task_titles) values
  ('social_media_management', array['Kickoff & accesos','Auditoría','Plan editorial','Producción mes 1','Publicación','Reporte mensual'])
  on conflict (kind) do nothing;


-- ╔═══ migrations/20260425000006_invoices_subscriptions.sql ═══╗
-- ─────────────────────────────────────────────
-- 00006 — Facturación y suscripciones (módulo 4)
-- ─────────────────────────────────────────────

create table if not exists public.invoice_counters (
  year int primary key,
  last_number int not null default 0
);

-- Numeración correlativa anual sin saltos. Usa lock de fila.
create or replace function public.fn_next_invoice_number(p_year int)
returns text language plpgsql as $$
declare v_n int;
begin
  insert into public.invoice_counters(year, last_number) values (p_year, 0)
    on conflict (year) do nothing;
  update public.invoice_counters
    set last_number = last_number + 1
    where year = p_year
    returning last_number into v_n;
  return format('LOG-%s-%s', p_year, lpad(v_n::text, 4, '0'));
end; $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  service service_kind not null,
  amount_monthly numeric(12,2) not null,
  igic_pct numeric(5,2) not null default 7.0,
  irpf_pct numeric(5,2) not null default 0,
  starts_on date not null,
  ends_on date,
  status subscription_status not null default 'activa',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_client on public.subscriptions(client_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
drop trigger if exists tg_subscriptions_updated on public.subscriptions;
create trigger tg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.fn_set_updated_at();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique,                         -- se rellena al emitir
  client_id uuid not null references public.clients(id) on delete restrict,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status invoice_status not null default 'borrador',
  issue_date date,
  due_date date,
  paid_at date,
  subtotal numeric(12,2) not null default 0,
  igic_pct numeric(5,2) not null default 7.0,
  igic_amount numeric(12,2) not null default 0,
  irpf_pct numeric(5,2) not null default 0,
  irpf_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  pdf_path text,                              -- bucket invoices
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_due on public.invoices(due_date);
create index if not exists idx_invoices_client on public.invoices(client_id);
drop trigger if exists tg_invoices_updated on public.invoices;
create trigger tg_invoices_updated before update on public.invoices
  for each row execute function public.fn_set_updated_at();

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  qty numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null,
  amount numeric(12,2) generated always as (qty * unit_price) stored
);
create index if not exists idx_invoice_lines_invoice on public.invoice_lines(invoice_id);

alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions for select to authenticated using (true);
drop policy if exists subs_insert on public.subscriptions;
create policy subs_insert on public.subscriptions for insert to authenticated with check (true);
drop policy if exists subs_update on public.subscriptions;
create policy subs_update on public.subscriptions for update to authenticated using (true) with check (true);
drop policy if exists subs_delete on public.subscriptions;
create policy subs_delete on public.subscriptions for delete to authenticated using (false);

drop policy if exists inv_select on public.invoices;
create policy inv_select on public.invoices for select to authenticated using (deleted_at is null);
drop policy if exists inv_insert on public.invoices;
create policy inv_insert on public.invoices for insert to authenticated with check (true);
drop policy if exists inv_update on public.invoices;
create policy inv_update on public.invoices for update to authenticated using (true) with check (true);
drop policy if exists inv_delete on public.invoices;
create policy inv_delete on public.invoices for delete to authenticated using (false);

drop policy if exists inv_lines_select on public.invoice_lines;
create policy inv_lines_select on public.invoice_lines for select to authenticated using (true);
drop policy if exists inv_lines_insert on public.invoice_lines;
create policy inv_lines_insert on public.invoice_lines for insert to authenticated with check (true);
drop policy if exists inv_lines_update on public.invoice_lines;
create policy inv_lines_update on public.invoice_lines for update to authenticated using (true) with check (true);
drop policy if exists inv_lines_delete on public.invoice_lines;
create policy inv_lines_delete on public.invoice_lines for delete to authenticated using (true);

-- MRR del periodo (suma de subs activas con fecha alta <= period y baja null o > period)
create or replace function public.fn_calculate_mrr(period date default current_date)
returns numeric language sql stable as $$
  select coalesce(sum(amount_monthly), 0)
  from public.subscriptions
  where status = 'activa'
    and starts_on <= period
    and (ends_on is null or ends_on > period);
$$;


-- ╔═══ migrations/20260425000007_communications.sql ═══╗
-- ─────────────────────────────────────────────
-- 00007 — Comunicaciones unificadas (módulo 6)
-- ─────────────────────────────────────────────

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  channel comm_channel not null,
  direction comm_direction not null,
  external_id text,                       -- id mensaje del proveedor
  from_addr text,                         -- número, email
  to_addr text,
  subject text,
  body text,
  sentiment text,                          -- positive | neutral | negative (Claude)
  needs_attention boolean not null default false,
  bot_handled boolean not null default false,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_comms_client on public.communications(client_id, occurred_at desc);
create index if not exists idx_comms_channel on public.communications(channel);
create index if not exists idx_comms_attention on public.communications(needs_attention) where needs_attention;
create unique index if not exists uq_comms_external on public.communications(channel, external_id) where external_id is not null;

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel comm_channel not null,
  body text not null,
  variables text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists tg_templates_updated on public.message_templates;
create trigger tg_templates_updated before update on public.message_templates
  for each row execute function public.fn_set_updated_at();

alter table public.communications enable row level security;
alter table public.message_templates enable row level security;

drop policy if exists comms_select on public.communications;
create policy comms_select on public.communications for select to authenticated using (true);
drop policy if exists comms_insert on public.communications;
create policy comms_insert on public.communications for insert to authenticated with check (true);
drop policy if exists comms_update on public.communications;
create policy comms_update on public.communications for update to authenticated using (true) with check (true);
drop policy if exists comms_delete on public.communications;
create policy comms_delete on public.communications for delete to authenticated using (false);

drop policy if exists tpl_select on public.message_templates;
create policy tpl_select on public.message_templates for select to authenticated using (true);
drop policy if exists tpl_insert on public.message_templates;
create policy tpl_insert on public.message_templates for insert to authenticated with check (true);
drop policy if exists tpl_update on public.message_templates;
create policy tpl_update on public.message_templates for update to authenticated using (true) with check (true);
drop policy if exists tpl_delete on public.message_templates;
create policy tpl_delete on public.message_templates for delete to authenticated using (true);


-- ╔═══ migrations/20260425000008_marketing.sql ═══╗
-- ─────────────────────────────────────────────
-- 00008 — Marketing y contenido (módulo 5)
-- ─────────────────────────────────────────────

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text,                                  -- leads, awareness, ventas
  budget numeric(12,2),
  starts_on date,
  ends_on date,
  utm_source text,
  utm_campaign text,
  promo_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists tg_campaigns_updated on public.campaigns;
create trigger tg_campaigns_updated before update on public.campaigns
  for each row execute function public.fn_set_updated_at();

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  kind content_kind not null,
  platform text not null,                    -- ig, tt, li, yt, blog, email
  account_handle text,                       -- @cgonzalezrom, @logika_labs, …
  pillar text,
  status content_status not null default 'idea',
  asset_url text,                            -- supabase storage o externo
  scheduled_at timestamptz,
  published_at timestamptz,
  needs_editor boolean not null default false,
  editor_brief text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contents_campaign on public.contents(campaign_id);
create index if not exists idx_contents_status on public.contents(status);
create index if not exists idx_contents_scheduled on public.contents(scheduled_at);
drop trigger if exists tg_contents_updated on public.contents;
create trigger tg_contents_updated before update on public.contents
  for each row execute function public.fn_set_updated_at();

-- Banco de hooks/ideas
create table if not exists public.hooks_bank (
  id uuid primary key default gen_random_uuid(),
  phrase text not null,
  angle text,
  cta text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_hooks_tags on public.hooks_bank using gin (tags);

-- Atribución leads → contenido/campaña
alter table public.deals
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists content_id uuid references public.contents(id) on delete set null;
create index if not exists idx_deals_campaign on public.deals(campaign_id);

alter table public.campaigns enable row level security;
alter table public.contents enable row level security;
alter table public.hooks_bank enable row level security;

drop policy if exists camp_select on public.campaigns;
create policy camp_select on public.campaigns for select to authenticated using (true);
drop policy if exists camp_insert on public.campaigns;
create policy camp_insert on public.campaigns for insert to authenticated with check (true);
drop policy if exists camp_update on public.campaigns;
create policy camp_update on public.campaigns for update to authenticated using (true) with check (true);
drop policy if exists camp_delete on public.campaigns;
create policy camp_delete on public.campaigns for delete to authenticated using (true);

drop policy if exists contents_select on public.contents;
create policy contents_select on public.contents for select to authenticated using (true);
drop policy if exists contents_insert on public.contents;
create policy contents_insert on public.contents for insert to authenticated with check (true);
drop policy if exists contents_update on public.contents;
create policy contents_update on public.contents for update to authenticated using (true) with check (true);
drop policy if exists contents_delete on public.contents;
create policy contents_delete on public.contents for delete to authenticated using (true);

drop policy if exists hooks_select on public.hooks_bank;
create policy hooks_select on public.hooks_bank for select to authenticated using (true);
drop policy if exists hooks_insert on public.hooks_bank;
create policy hooks_insert on public.hooks_bank for insert to authenticated with check (true);
drop policy if exists hooks_update on public.hooks_bank;
create policy hooks_update on public.hooks_bank for update to authenticated using (true) with check (true);
drop policy if exists hooks_delete on public.hooks_bank;
create policy hooks_delete on public.hooks_bank for delete to authenticated using (true);


-- ╔═══ migrations/20260425000009_automations_log.sql ═══╗
-- ─────────────────────────────────────────────
-- 00009 — Logs y idempotencia (módulo 8)
-- ─────────────────────────────────────────────

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,                       -- 'n8n.lead', 'evolution.whatsapp', 'vapi'
  request_id text not null,                   -- idempotencia
  payload jsonb not null,
  signature_ok boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_webhook_request on public.webhook_events(source, request_id);
create index if not exists idx_webhook_processed on public.webhook_events(processed_at);

create table if not exists public.automations_log (
  id uuid primary key default gen_random_uuid(),
  event text not null,                        -- 'deal.won', 'invoice.paid', …
  entity_type text not null,
  entity_id uuid,
  delivered_at timestamptz,
  attempts int not null default 0,
  last_error text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_autolog_event on public.automations_log(event);
create index if not exists idx_autolog_pending on public.automations_log(delivered_at) where delivered_at is null;

alter table public.webhook_events enable row level security;
alter table public.automations_log enable row level security;

-- Service role los gestiona; authenticated solo lee
drop policy if exists whe_select on public.webhook_events;
create policy whe_select on public.webhook_events for select to authenticated using (true);
drop policy if exists whe_insert on public.webhook_events;
create policy whe_insert on public.webhook_events for insert to authenticated with check (false);
drop policy if exists whe_update on public.webhook_events;
create policy whe_update on public.webhook_events for update to authenticated using (false);
drop policy if exists whe_delete on public.webhook_events;
create policy whe_delete on public.webhook_events for delete to authenticated using (false);

drop policy if exists auto_select on public.automations_log;
create policy auto_select on public.automations_log for select to authenticated using (true);
drop policy if exists auto_insert on public.automations_log;
create policy auto_insert on public.automations_log for insert to authenticated with check (true);
drop policy if exists auto_update on public.automations_log;
create policy auto_update on public.automations_log for update to authenticated using (true) with check (true);
drop policy if exists auto_delete on public.automations_log;
create policy auto_delete on public.automations_log for delete to authenticated using (false);


-- ╔═══ migrations/20260425000010_rpc_deal_won.sql ═══╗
-- ─────────────────────────────────────────────
-- 00010 — RPC fn_deal_won (atómico)
-- WARN: esta RPC crea/actualiza varias tablas.
-- ─────────────────────────────────────────────

create or replace function public.fn_deal_won(p_deal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal      public.deals%rowtype;
  v_client_id uuid;
  v_project_id uuid;
  v_template  text[];
  v_title     text;
  v_invoice_id uuid;
  v_year      int := extract(year from now())::int;
  v_kind      service_kind;
  v_subtotal  numeric(12,2);
begin
  select * into v_deal from public.deals where id = p_deal_id and deleted_at is null;
  if not found then raise exception 'Deal % no encontrado', p_deal_id; end if;

  if v_deal.stage = 'ganado' then
    raise notice 'Deal % ya estaba ganado', p_deal_id;
    return v_deal.client_id;
  end if;

  -- 1. Cliente
  if v_deal.client_id is null then
    insert into public.clients(legal_name, client_type)
      values (v_deal.title, case when v_deal.recurring_amount > 0 then 'recurrente' else 'one_shot' end)
      returning id into v_client_id;
  else
    v_client_id := v_deal.client_id;
    update public.clients
      set client_type = case when v_deal.recurring_amount > 0 then 'recurrente' else 'one_shot' end
      where id = v_client_id and client_type = 'lead';
  end if;

  -- 2. Proyecto + tareas plantilla por servicio dominante
  v_kind := coalesce(v_deal.services[1], 'software_custom');
  insert into public.projects(client_id, deal_id, name, kind, status, starts_on)
    values (v_client_id, p_deal_id, v_deal.title, v_kind, 'planificado', current_date)
    returning id into v_project_id;

  select task_titles into v_template from public.project_templates where kind = v_kind;
  if v_template is not null then
    foreach v_title in array v_template loop
      insert into public.tasks(project_id, title) values (v_project_id, v_title);
    end loop;
  end if;

  -- 3. Suscripción si recurrente
  if v_deal.recurring_amount > 0 then
    insert into public.subscriptions(client_id, service, amount_monthly, starts_on, description)
      values (v_client_id, v_kind, v_deal.recurring_amount, current_date, v_deal.title);
  end if;

  -- 4. Factura setup si setup_amount > 0
  if v_deal.setup_amount > 0 then
    v_subtotal := v_deal.setup_amount;
    insert into public.invoices(
      number, client_id, project_id, status, issue_date, due_date,
      subtotal, igic_pct, igic_amount, total, notes
    )
    values (
      public.fn_next_invoice_number(v_year),
      v_client_id, v_project_id, 'emitida', current_date, current_date + 15,
      v_subtotal, 7.0, round(v_subtotal * 0.07, 2),
      round(v_subtotal * 1.07, 2),
      'Setup ' || v_deal.title
    )
    returning id into v_invoice_id;

    insert into public.invoice_lines(invoice_id, description, qty, unit_price)
      values (v_invoice_id, 'Setup: ' || v_deal.title, 1, v_subtotal);
  end if;

  -- 5. Cerrar deal
  update public.deals
    set stage = 'ganado',
        client_id = v_client_id,
        last_activity_at = now()
    where id = p_deal_id;

  -- 6. Log evento (n8n lo recoge)
  insert into public.automations_log(event, entity_type, entity_id, payload)
    values ('deal.won', 'deal', p_deal_id, jsonb_build_object(
      'client_id', v_client_id,
      'project_id', v_project_id,
      'invoice_id', v_invoice_id
    ));

  return v_client_id;
end; $$;

revoke all on function public.fn_deal_won(uuid) from public;
grant execute on function public.fn_deal_won(uuid) to authenticated;


-- ╔═══ migrations/20260425000011_storage_buckets.sql ═══╗
-- ─────────────────────────────────────────────
-- 00011 — Storage buckets privados
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('invoices', 'invoices', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('content_assets', 'content_assets', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('client_files', 'client_files', false) on conflict (id) do nothing;

-- Acceso authenticated; el server firma URLs cortas.
drop policy if exists "buckets_authenticated_read" on storage.objects;
create policy "buckets_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id in ('invoices','content_assets','client_files'));

drop policy if exists "buckets_authenticated_write" on storage.objects;
create policy "buckets_authenticated_write" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('invoices','content_assets','client_files'));

drop policy if exists "buckets_authenticated_update" on storage.objects;
create policy "buckets_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('invoices','content_assets','client_files'))
  with check (bucket_id in ('invoices','content_assets','client_files'));


-- ╔═══ migrations/20260425000012_single_user_anon_access.sql ═══╗
-- ─────────────────────────────────────────────
-- 00012 — Modo single-user sin login: anon tiene acceso total.
-- WARN: cualquier persona con el anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
-- puede leer/escribir. Apto solo si la app NO se publica abierta.
-- Si más adelante hay multi-user, BORRAR estas policies y reactivar
-- las de `authenticated`.
-- ─────────────────────────────────────────────

-- Helper: añade SELECT/INSERT/UPDATE para anon en una tabla, idempotente.
do $$
declare
  t text;
  tables text[] := array[
    'clients','contacts','deals','deal_notes',
    'projects','tasks','milestones',
    'subscriptions','invoices','invoice_lines',
    'communications','message_templates',
    'campaigns','contents','hooks_bank',
    'automations_log'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists anon_select on public.%I', t);
    execute format('drop policy if exists anon_insert on public.%I', t);
    execute format('drop policy if exists anon_update on public.%I', t);

    execute format('create policy anon_select on public.%I for select to anon using (true)', t);
    execute format('create policy anon_insert on public.%I for insert to anon with check (true)', t);
    execute format('create policy anon_update on public.%I for update to anon using (true) with check (true)', t);
  end loop;
end $$;

comment on policy anon_select on public.clients is 'Single-user mode: anon read.';
comment on policy anon_insert on public.clients is 'Single-user mode: anon insert.';
comment on policy anon_update on public.clients is 'Single-user mode: anon update (incluye soft-delete).';


-- ╔═══ seed.sql ═══╗
-- ─────────────────────────────────────────────
-- Seed con datos realistas para desarrollo
-- ─────────────────────────────────────────────

-- Clientes
insert into public.clients (id, legal_name, commercial_name, client_type, fiscal_id, igic, sector, ticket_avg, tags) values
  ('11111111-1111-1111-1111-111111111111','Faycan Distribuciones SL','Faycan','recurrente','B-35888888',true,'distribución alimentaria',4200,'{recurrente,canarias}'),
  ('22222222-2222-2222-2222-222222222222','Canarias Glass SLU','Canarias Glass','recurrente','B-35777777',true,'reformas',680,'{recurrente,reformas}'),
  ('33333333-3333-3333-3333-333333333333','Taller Jose Luis','Taller Jose Luis','recurrente','12345678X',true,'automoción',420,'{recurrente,automocion}'),
  ('44444444-4444-4444-4444-444444444444','Inmobiliaria Tropical','Tropical Homes','lead',null,true,'real estate',null,'{lead,real_estate}'),
  ('55555555-5555-5555-5555-555555555555','Hotel Costa Mar','Costa Mar','lead',null,true,'turismo',null,'{lead,turismo}')
on conflict (id) do nothing;

-- Contactos
insert into public.contacts (client_id, full_name, role, email, phone, is_primary) values
  ('11111111-1111-1111-1111-111111111111','Antonio Faycan','CEO','antonio@faycan.es','+34666111111',true),
  ('22222222-2222-2222-2222-222222222222','María Glass','Manager','maria@canariasglass.es','+34666222222',true),
  ('33333333-3333-3333-3333-333333333333','Jose Luis','Owner','joseluis@gmail.com','+34666333333',true),
  ('44444444-4444-4444-4444-444444444444','Lucía Pérez','Directora','lucia@tropical.es','+34666444444',true),
  ('55555555-5555-5555-5555-555555555555','Pedro Costa','Recepción','pedro@costamar.es','+34666555555',true)
on conflict do nothing;

-- Deals (pipeline mezclado)
insert into public.deals (id, title, client_id, services, setup_amount, recurring_amount, probability, expected_close, source, stage, score, score_reasoning, next_best_action) values
  ('aaaaaaaa-0000-0000-0000-000000000001','Chatbot WhatsApp Tropical','44444444-4444-4444-4444-444444444444','{chatbot}',2500,180,40,current_date + 14,'inbound_web','propuesta',72,'Sector activo, contacto rápido, presupuesto medio.','Enviar caso de éxito Faycan'),
  ('aaaaaaaa-0000-0000-0000-000000000002','Web + RRSS Costa Mar','55555555-5555-5555-5555-555555555555','{web,social_media_management}',1800,250,30,current_date + 21,'referido','negociacion',81,'Referido caliente, ticket 2x media. Decisor identificado.','Cerrar reunión presencial esta semana'),
  ('aaaaaaaa-0000-0000-0000-000000000003','Software custom inventario','11111111-1111-1111-1111-111111111111','{software_custom}',6500,300,55,current_date + 35,'inbound_web','cualificado',68,'Cliente activo expandiendo. Necesidad clara.','Discovery técnico'),
  ('aaaaaaaa-0000-0000-0000-000000000004','Chatbot voz Vapi','22222222-2222-2222-2222-222222222222','{chatbot}',3200,220,20,current_date + 60,'cold_outreach','lead',45,'Contactado pero sin respuesta clara aún.','Mensaje seguimiento + caso de uso')
on conflict (id) do nothing;

-- Suscripciones activas (recurrentes existentes)
insert into public.subscriptions (client_id, service, amount_monthly, starts_on, description) values
  ('11111111-1111-1111-1111-111111111111','chatbot',200,current_date - 120,'Mantenimiento chatbot WhatsApp'),
  ('22222222-2222-2222-2222-222222222222','web',180,current_date - 80,'Hosting + mantenimiento web'),
  ('33333333-3333-3333-3333-333333333333','social_media_management',420,current_date - 200,'Gestión Instagram + TikTok')
on conflict do nothing;

-- Proyectos
insert into public.projects (id, client_id, name, kind, status, starts_on) values
  ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Chatbot Faycan v2','chatbot','en_curso',current_date - 30),
  ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Rediseño web Glass','web','planificado',current_date - 5)
on conflict (id) do nothing;

-- Tareas
insert into public.tasks (project_id, title, status, due_on) values
  ('bbbbbbbb-0000-0000-0000-000000000001','Mapeo flujos nuevos','done',current_date - 20),
  ('bbbbbbbb-0000-0000-0000-000000000001','Prompt engineering FAQs','doing',current_date + 3),
  ('bbbbbbbb-0000-0000-0000-000000000001','Testing en sandbox','todo',current_date + 7),
  ('bbbbbbbb-0000-0000-0000-000000000002','Wireframes home','todo',current_date + 5)
on conflict do nothing;

-- Facturas
do $$
declare v_year int := extract(year from now())::int;
begin
  insert into public.invoices (number, client_id, status, issue_date, due_date, subtotal, igic_pct, igic_amount, total, notes)
  values
    (public.fn_next_invoice_number(v_year),'11111111-1111-1111-1111-111111111111','pagada', current_date - 60, current_date - 45, 200, 7.0, 14, 214, 'Mensualidad'),
    (public.fn_next_invoice_number(v_year),'22222222-2222-2222-2222-222222222222','pagada', current_date - 60, current_date - 45, 180, 7.0, 12.6, 192.6, 'Mensualidad'),
    (public.fn_next_invoice_number(v_year),'33333333-3333-3333-3333-333333333333','emitida', current_date - 5, current_date + 10, 420, 7.0, 29.4, 449.4, 'Mensualidad'),
    (public.fn_next_invoice_number(v_year),'11111111-1111-1111-1111-111111111111','vencida', current_date - 35, current_date - 5, 200, 7.0, 14, 214, 'Mensualidad pendiente');
end $$;

-- Comunicaciones
insert into public.communications (client_id, channel, direction, from_addr, body, occurred_at, needs_attention) values
  ('44444444-4444-4444-4444-444444444444','whatsapp','in','+34666444444','Hola, ¿podríais pasarme presupuesto del chatbot?', now() - interval '2 hours', true),
  ('55555555-5555-5555-5555-555555555555','email','in','pedro@costamar.es','Os vimos en LinkedIn, queremos refrescar la web.', now() - interval '6 hours', true),
  ('11111111-1111-1111-1111-111111111111','whatsapp','out',null,'Te paso link de la nueva versión del bot.', now() - interval '1 day', false);

-- Marketing seed
insert into public.campaigns (name, goal, budget, starts_on, utm_campaign) values
  ('Lanzamiento Chatbot Q2','leads',500,current_date - 14,'chatbot-q2'),
  ('Casos de éxito Faycan','awareness',0,current_date - 30,'casos-exito');

insert into public.contents (title, kind, platform, account_handle, status, pillar) values
  ('Reel cómo Faycan automatizó pedidos','reel','instagram','@logika_labs','grabado','automatización'),
  ('Post LinkedIn IGIC vs IVA agencias','post','linkedin','@cgonzalezrom','idea','fiscalidad'),
  ('Short YouTube Vapi en español','short','youtube','@logika_labs','editado','voz IA');

insert into public.hooks_bank (phrase, angle, cta, tags) values
  ('Tu chatbot no necesita ser inteligente, necesita cerrar.','contrarian','Mira el caso','{ventas,chatbot}'),
  ('Lo que un autónomo aprende facturando 80k al año en Canarias.','autoridad','Hilo','{fiscal,autónomo}');
