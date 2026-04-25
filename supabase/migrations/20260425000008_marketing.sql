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

create policy camp_select on public.campaigns for select to authenticated using (true);
create policy camp_insert on public.campaigns for insert to authenticated with check (true);
create policy camp_update on public.campaigns for update to authenticated using (true) with check (true);
create policy camp_delete on public.campaigns for delete to authenticated using (true);

create policy contents_select on public.contents for select to authenticated using (true);
create policy contents_insert on public.contents for insert to authenticated with check (true);
create policy contents_update on public.contents for update to authenticated using (true) with check (true);
create policy contents_delete on public.contents for delete to authenticated using (true);

create policy hooks_select on public.hooks_bank for select to authenticated using (true);
create policy hooks_insert on public.hooks_bank for insert to authenticated with check (true);
create policy hooks_update on public.hooks_bank for update to authenticated using (true) with check (true);
create policy hooks_delete on public.hooks_bank for delete to authenticated using (true);
