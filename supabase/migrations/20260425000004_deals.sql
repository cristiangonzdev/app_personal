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

create policy deals_select on public.deals for select to authenticated using (deleted_at is null);
create policy deals_insert on public.deals for insert to authenticated with check (true);
create policy deals_update on public.deals for update to authenticated using (true) with check (true);
create policy deals_delete on public.deals for delete to authenticated using (false);

create policy deal_notes_select on public.deal_notes for select to authenticated using (true);
create policy deal_notes_insert on public.deal_notes for insert to authenticated with check (true);
create policy deal_notes_update on public.deal_notes for update to authenticated using (true) with check (true);
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
