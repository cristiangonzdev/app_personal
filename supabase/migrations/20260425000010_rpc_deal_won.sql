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
