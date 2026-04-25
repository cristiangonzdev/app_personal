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
create policy whe_select on public.webhook_events for select to authenticated using (true);
create policy whe_insert on public.webhook_events for insert to authenticated with check (false);
create policy whe_update on public.webhook_events for update to authenticated using (false);
create policy whe_delete on public.webhook_events for delete to authenticated using (false);

create policy auto_select on public.automations_log for select to authenticated using (true);
create policy auto_insert on public.automations_log for insert to authenticated with check (true);
create policy auto_update on public.automations_log for update to authenticated using (true) with check (true);
create policy auto_delete on public.automations_log for delete to authenticated using (false);
