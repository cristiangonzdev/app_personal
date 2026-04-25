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
