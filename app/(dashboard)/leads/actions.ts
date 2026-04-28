'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { emitEvent } from '@/lib/n8n'
import { revalidatePath } from 'next/cache'

const stageSchema = z.enum(['lead', 'cualificado', 'propuesta', 'negociacion', 'ganado', 'perdido'])
const serviceSchema = z.enum(['software_custom', 'chatbot', 'web', 'social_media_management'])

const leadSchema = z.object({
  title: z.string().min(2),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().or(z.literal('')).optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  setup_amount: z.coerce.number().nonnegative().default(0),
  recurring_amount: z.coerce.number().nonnegative().default(0),
  probability: z.coerce.number().min(0).max(100).default(20),
  stage: stageSchema.default('lead'),
  source: z.enum(['linkedin', 'referido', 'cold_outreach', 'inbound_web', 'otro']).default('inbound_web'),
  services: z.array(serviceSchema).default([]),
  expected_close: z.string().optional().nullable().transform(v => v || null),
  notes: z.string().optional().nullable(),
})

function parseLead(fd: FormData) {
  const raw = Object.fromEntries(fd) as Record<string, string>
  const services = fd.getAll('services').filter(Boolean) as string[]
  return leadSchema.parse({ ...raw, services })
}

export async function createLead(fd: FormData) {
  const parsed = parseLead(fd)
  const sb = await getSupabaseServer()
  const { data, error } = await sb
    .from('deals')
    .insert({
      title: parsed.title,
      services: parsed.services,
      setup_amount: parsed.setup_amount,
      recurring_amount: parsed.recurring_amount,
      probability: parsed.probability,
      stage: parsed.stage,
      source: parsed.source,
      expected_close: parsed.expected_close,
      notes: [
        parsed.notes,
        parsed.contact_name && `Contacto: ${parsed.contact_name}`,
        parsed.contact_email && `Email: ${parsed.contact_email}`,
        parsed.contact_phone && `Tel: ${parsed.contact_phone}`,
      ].filter(Boolean).join('\n') || null,
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  await emitEvent('deal.created', { deal_id: data.id })
  revalidatePath('/leads')
  revalidatePath('/')
  return { ok: true, id: data.id as string }
}

export async function updateLead(id: string, fd: FormData) {
  const parsed = parseLead(fd)
  const sb = await getSupabaseServer()
  const { error } = await sb
    .from('deals')
    .update({
      title: parsed.title,
      services: parsed.services,
      setup_amount: parsed.setup_amount,
      recurring_amount: parsed.recurring_amount,
      probability: parsed.probability,
      stage: parsed.stage,
      source: parsed.source,
      expected_close: parsed.expected_close,
      notes: parsed.notes,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/leads')
  return { ok: true }
}

export async function moveLeadStage(id: string, stage: string) {
  const next = stageSchema.parse(stage)
  const sb = await getSupabaseServer()

  if (next === 'ganado') {
    const { data, error } = await sb.rpc('fn_deal_won' as never, { p_deal_id: id } as never)
    if (error) return { ok: false, error: error.message }
    await emitEvent('deal.won', { deal_id: id, client_id: data })
    revalidatePath('/leads')
    revalidatePath('/clientes')
    revalidatePath('/')
    return { ok: true, client_id: data as string }
  }

  const { error } = await sb
    .from('deals')
    .update({ stage: next, last_activity_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  await emitEvent('deal.stage_changed', { deal_id: id, stage: next })
  revalidatePath('/leads')
  revalidatePath('/')
  return { ok: true }
}

export async function archiveLead(id: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/leads')
  return { ok: true }
}
