// Edge Function: emite facturas mensuales recurrentes el día 1 de cada mes.
// Programar con pg_cron o Supabase Scheduled Triggers.
// deno run --allow-net --allow-env

// @ts-expect-error Deno runtime types
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-expect-error Deno-only ESM
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: { env: { get(name: string): string | undefined } }

serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const today = new Date()
  const year = today.getFullYear()
  const period = today.toISOString().slice(0, 10)

  const { data: subs, error } = await sb
    .from('subscriptions')
    .select('id, client_id, service, amount_monthly, igic_pct, irpf_pct, description')
    .eq('status', 'activa')
    .lte('starts_on', period)

  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })

  const created: string[] = []
  for (const s of subs ?? []) {
    const subtotal = Number(s.amount_monthly)
    const igic = +(subtotal * Number(s.igic_pct) / 100).toFixed(2)
    const irpf = +(subtotal * Number(s.irpf_pct) / 100).toFixed(2)
    const total = +(subtotal + igic - irpf).toFixed(2)

    const { data: numberRes } = await sb.rpc('fn_next_invoice_number', { p_year: year })
    const number = String(numberRes)

    const due = new Date(today); due.setDate(today.getDate() + 15)

    const { data: inv } = await sb.from('invoices').insert({
      number,
      client_id: s.client_id,
      subscription_id: s.id,
      status: 'emitida',
      issue_date: period,
      due_date: due.toISOString().slice(0, 10),
      subtotal, igic_pct: s.igic_pct, igic_amount: igic,
      irpf_pct: s.irpf_pct, irpf_amount: irpf, total,
      notes: s.description ?? `Mensualidad ${period.slice(0, 7)}`,
    }).select('id').single()

    if (inv?.id) {
      await sb.from('invoice_lines').insert({
        invoice_id: inv.id,
        description: `${s.description ?? s.service} · ${period.slice(0, 7)}`,
        qty: 1, unit_price: subtotal,
      })
      created.push(number)

      // Disparar webhook n8n para envío email/whatsapp recordatorio
      const base = Deno.env.get('N8N_WEBHOOK_BASE')
      if (base) {
        await fetch(`${base}/invoice-created`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ invoice_id: inv.id, client_id: s.client_id, number, total }),
        }).catch(() => {})
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, created }), {
    headers: { 'content-type': 'application/json' },
  })
})
