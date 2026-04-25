'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { emitEvent } from '@/lib/n8n'

const invoiceSchema = z.object({
  client_id: z.string().uuid(),
  description: z.string().min(2),
  subtotal: z.coerce.number().nonnegative(),
  igic_pct: z.coerce.number().min(0).max(100).default(7),
  irpf_pct: z.coerce.number().min(0).max(100).default(0),
  due_in_days: z.coerce.number().int().nonnegative().default(15),
  emit: z.union([z.literal('on'), z.literal(''), z.boolean()]).optional().transform(v => v === 'on' || v === true),
})

export async function createInvoice(formData: FormData) {
  const parsed = invoiceSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()

  const igic_amount = +(parsed.subtotal * parsed.igic_pct / 100).toFixed(2)
  const irpf_amount = +(parsed.subtotal * parsed.irpf_pct / 100).toFixed(2)
  const total = +(parsed.subtotal + igic_amount - irpf_amount).toFixed(2)

  const today = new Date()
  const due = new Date(today); due.setDate(today.getDate() + parsed.due_in_days)

  let number: string | null = null
  if (parsed.emit) {
    const { data: n } = await sb.rpc('fn_next_invoice_number' as never, { p_year: today.getFullYear() } as never)
    number = String(n)
  }

  const { data: inv, error } = await sb.from('invoices').insert({
    number,
    client_id: parsed.client_id,
    status: parsed.emit ? 'emitida' : 'borrador',
    issue_date: parsed.emit ? today.toISOString().slice(0, 10) : null,
    due_date: parsed.emit ? due.toISOString().slice(0, 10) : null,
    subtotal: parsed.subtotal,
    igic_pct: parsed.igic_pct,
    igic_amount,
    irpf_pct: parsed.irpf_pct,
    irpf_amount,
    total,
    notes: parsed.description,
  }).select('id').single()

  if (error || !inv) return { ok: false, error: error?.message ?? 'Insert falló' }

  await sb.from('invoice_lines').insert({
    invoice_id: inv.id, description: parsed.description, qty: 1, unit_price: parsed.subtotal,
  })

  if (parsed.emit) await emitEvent('invoice.created', { invoice_id: inv.id, number, total })
  revalidatePath('/pagos')
  return { ok: true, id: inv.id }
}

export async function setInvoiceStatus(id: string, status: 'borrador' | 'emitida' | 'enviada' | 'pagada' | 'vencida' | 'anulada') {
  const sb = await getSupabaseServer()
  const patch: Record<string, unknown> = { status }
  if (status === 'pagada') patch.paid_at = new Date().toISOString().slice(0, 10)
  if (status === 'emitida') {
    // Si no tiene número, asignar uno
    const { data: cur } = await sb.from('invoices').select('number').eq('id', id).single()
    if (cur && !(cur as { number: string | null }).number) {
      const { data: n } = await sb.rpc('fn_next_invoice_number' as never, { p_year: new Date().getFullYear() } as never)
      patch.number = String(n)
      patch.issue_date = new Date().toISOString().slice(0, 10)
    }
  }
  const { error } = await sb.from('invoices').update(patch).eq('id', id)
  if (error) return { ok: false, error: error.message }
  if (status === 'pagada') await emitEvent('invoice.paid', { invoice_id: id })
  revalidatePath('/pagos')
  return { ok: true }
}

export async function archiveInvoice(id: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/pagos')
  return { ok: true }
}

const subSchema = z.object({
  client_id: z.string().uuid(),
  service: z.enum(['software_custom', 'chatbot', 'web', 'social_media_management']),
  amount_monthly: z.coerce.number().positive(),
  igic_pct: z.coerce.number().min(0).max(100).default(7),
  irpf_pct: z.coerce.number().min(0).max(100).default(0),
  starts_on: z.string().min(1),
  description: z.string().optional().nullable(),
})

export async function createSubscription(formData: FormData) {
  const parsed = subSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('subscriptions').insert({ ...parsed, status: 'activa' })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/pagos')
  return { ok: true }
}

export async function setSubscriptionStatus(id: string, status: 'activa' | 'pausada' | 'cancelada') {
  const sb = await getSupabaseServer()
  const patch: Record<string, unknown> = { status }
  if (status === 'cancelada') patch.ends_on = new Date().toISOString().slice(0, 10)
  const { error } = await sb.from('subscriptions').update(patch).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/pagos')
  return { ok: true }
}
