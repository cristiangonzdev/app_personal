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
create trigger tg_templates_updated before update on public.message_templates
  for each row execute function public.fn_set_updated_at();

alter table public.communications enable row level security;
alter table public.message_templates enable row level security;

create policy comms_select on public.communications for select to authenticated using (true);
create policy comms_insert on public.communications for insert to authenticated with check (true);
create policy comms_update on public.communications for update to authenticated using (true) with check (true);
create policy comms_delete on public.communications for delete to authenticated using (false);

create policy tpl_select on public.message_templates for select to authenticated using (true);
create policy tpl_insert on public.message_templates for insert to authenticated with check (true);
create policy tpl_update on public.message_templates for update to authenticated using (true) with check (true);
create policy tpl_delete on public.message_templates for delete to authenticated using (true);
