'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const clientSchema = z.object({
  legal_name: z.string().min(2, 'Razón social mínimo 2 caracteres'),
  commercial_name: z.string().optional().nullable(),
  client_type: z.enum(['lead', 'one_shot', 'recurrente']).default('lead'),
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
  const { error } = await sb.from('clients').insert(parsed)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/clientes')
  return { ok: true }
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

// ── Quick actions desde la ficha del cliente ─────────────────────────

const quickInvoiceSchema = z.object({
  client_id: z.string().uuid(),
  description: z.string().min(2),
  subtotal: z.coerce.number().nonnegative(),
  igic_pct: z.coerce.number().min(0).max(100).default(7),
  due_in_days: z.coerce.number().int().nonnegative().default(15),
  emit: z.union([z.literal('on'), z.literal(''), z.boolean()]).optional().transform(v => v === 'on' || v === true),
})

export async function quickInvoice(formData: FormData) {
  const parsed = quickInvoiceSchema.parse(Object.fromEntries(formData))
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

  revalidatePath(`/clientes/${parsed.client_id}`)
  revalidatePath('/pagos')
  return { ok: true }
}

const quickSubSchema = z.object({
  client_id: z.string().uuid(),
  service: z.enum(['software_custom', 'chatbot', 'web', 'social_media_management']),
  amount_monthly: z.coerce.number().positive(),
  starts_on: z.string().min(1),
  description: z.string().optional().nullable(),
})

export async function quickSubscription(formData: FormData) {
  const parsed = quickSubSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('subscriptions').insert({ ...parsed, status: 'activa' })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/clientes/${parsed.client_id}`)
  revalidatePath('/pagos')
  return { ok: true }
}

const quickProjectSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(2),
  kind: z.enum(['software_custom', 'chatbot', 'web', 'social_media_management']),
  starts_on: z.string().optional().nullable().transform(v => v || null),
})

export async function quickProject(formData: FormData) {
  const parsed = quickProjectSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { data, error } = await sb.from('projects').insert({ ...parsed, status: 'planificado' }).select('id').single()
  if (error) return { ok: false, error: error.message }

  const { data: tpl } = await sb.from('project_templates').select('task_titles').eq('kind', parsed.kind).maybeSingle()
  if (tpl && Array.isArray((tpl as { task_titles: string[] }).task_titles)) {
    const titles = (tpl as { task_titles: string[] }).task_titles
    await sb.from('tasks').insert(titles.map(t => ({ project_id: data.id, title: t })))
  }

  revalidatePath(`/clientes/${parsed.client_id}`)
  revalidatePath('/proyectos')
  return { ok: true }
}
