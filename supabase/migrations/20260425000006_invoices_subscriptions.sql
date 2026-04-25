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

create policy subs_select on public.subscriptions for select to authenticated using (true);
create policy subs_insert on public.subscriptions for insert to authenticated with check (true);
create policy subs_update on public.subscriptions for update to authenticated using (true) with check (true);
create policy subs_delete on public.subscriptions for delete to authenticated using (false);

create policy inv_select on public.invoices for select to authenticated using (deleted_at is null);
create policy inv_insert on public.invoices for insert to authenticated with check (true);
create policy inv_update on public.invoices for update to authenticated using (true) with check (true);
create policy inv_delete on public.invoices for delete to authenticated using (false);

create policy inv_lines_select on public.invoice_lines for select to authenticated using (true);
create policy inv_lines_insert on public.invoice_lines for insert to authenticated with check (true);
create policy inv_lines_update on public.invoice_lines for update to authenticated using (true) with check (true);
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
