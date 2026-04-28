'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { emitEvent } from '@/lib/n8n'

// ── Cliente CRUD ────────────────────────────────────────────────────────

const clientSchema = z.object({
  legal_name: z.string().min(2, 'Razón social mínimo 2 caracteres'),
  commercial_name: z.string().optional().nullable(),
  client_type: z.enum(['lead', 'one_shot', 'recurrente']).default('one_shot'),
  fiscal_id: z.string().optional().nullable(),
  igic: z.union([z.literal('on'), z.literal(''), z.boolean()]).optional().transform(v => v === 'on' || v === true),
  fiscal_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().default('ES'),
  sector: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createClient(formData: FormData) {
  const parsed = clientSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { data, error } = await sb.from('clients').insert(parsed).select('id').single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/clientes')
  return { ok: true, id: data.id as string }
}

export async function updateClient(id: string, formData: FormData) {
  const parsed = clientSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('clients').update(parsed).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

export async function archiveClient(id: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/clientes')
  return { ok: true }
}

// ── Contactos ───────────────────────────────────────────────────────────

const contactSchema = z.object({
  client_id: z.string().uuid(),
  full_name: z.string().min(2),
  role: z.string().optional().nullable(),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().optional().nullable(),
  is_primary: z.union([z.literal('on'), z.literal(''), z.boolean()]).optional().transform(v => v === 'on' || v === true),
})

export async function createContact(formData: FormData) {
  const parsed = contactSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('contacts').insert(parsed)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/clientes/${parsed.client_id}`)
  return { ok: true }
}

export async function deleteContact(id: string, clientId: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('contacts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { ok: true }
}

// ── Facturas ────────────────────────────────────────────────────────────

const invoiceSchema = z.object({
  client_id: z.string().uuid(),
  description: z.string().min(2),
  subtotal: z.coerce.number().nonnegative(),
  igic_pct: z.coerce.number().min(0).max(100).default(7),
  due_in_days: z.coerce.number().int().nonnegative().default(15),
  emit: z.union([z.literal('on'), z.literal(''), z.boolean()]).optional().transform(v => v === 'on' || v === true),
})

export async function createInvoice(formData: FormData) {
  const parsed = invoiceSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()

  const igic_amount = +(parsed.subtotal * parsed.igic_pct / 100).toFixed(2)
  const total = +(parsed.subtotal + igic_amount).toFixed(2)
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
    total,
    notes: parsed.description,
  }).select('id').single()
  if (error || !inv) return { ok: false, error: error?.message ?? 'Insert falló' }

  await sb.from('invoice_lines').insert({
    invoice_id: inv.id, description: parsed.description, qty: 1, unit_price: parsed.subtotal,
  })

  if (parsed.emit) await emitEvent('invoice.created', { invoice_id: inv.id, number, total })
  revalidatePath(`/clientes/${parsed.client_id}`)
  revalidatePath('/clientes')
  revalidatePath('/')
  return { ok: true }
}

export async function setInvoiceStatus(
  id: string,
  status: 'borrador' | 'emitida' | 'enviada' | 'pagada' | 'vencida' | 'anulada',
  clientId: string,
) {
  const sb = await getSupabaseServer()
  const patch: Record<string, unknown> = { status }
  if (status === 'pagada') patch.paid_at = new Date().toISOString().slice(0, 10)
  if (status === 'emitida') {
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
  revalidatePath(`/clientes/${clientId}`)
  revalidatePath('/clientes')
  revalidatePath('/')
  return { ok: true }
}

export async function archiveInvoice(id: string, clientId: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { ok: true }
}

// ── Suscripciones ───────────────────────────────────────────────────────

const subSchema = z.object({
  client_id: z.string().uuid(),
  service: z.enum(['software_custom', 'chatbot', 'web', 'social_media_management']),
  amount_monthly: z.coerce.number().positive(),
  starts_on: z.string().min(1),
  description: z.string().optional().nullable(),
})

export async function createSubscription(formData: FormData) {
  const parsed = subSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('subscriptions').insert({ ...parsed, status: 'activa', igic_pct: 7 })
  if (error) return { ok: false, error: error.message }
  // si el cliente estaba marcado como lead/one_shot, lo promovemos a recurrente
  await sb.from('clients').update({ client_type: 'recurrente' }).eq('id', parsed.client_id)
  revalidatePath(`/clientes/${parsed.client_id}`)
  revalidatePath('/clientes')
  revalidatePath('/')
  return { ok: true }
}

export async function setSubscriptionStatus(id: string, status: 'activa' | 'pausada' | 'cancelada', clientId: string) {
  const sb = await getSupabaseServer()
  const patch: Record<string, unknown> = { status }
  if (status === 'cancelada') patch.ends_on = new Date().toISOString().slice(0, 10)
  const { error } = await sb.from('subscriptions').update(patch).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  revalidatePath('/clientes')
  revalidatePath('/')
  return { ok: true }
}
