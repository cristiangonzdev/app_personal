'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { emitEvent } from '@/lib/n8n'
import { revalidatePath } from 'next/cache'

const stageSchema = z.enum(['lead', 'cualificado', 'propuesta', 'negociacion', 'ganado', 'perdido'])

export async function moveDealStage(dealId: string, nextStage: string) {
  const stage = stageSchema.parse(nextStage)
  const sb = await getSupabaseServer()

  if (stage === 'ganado') {
    const { data, error } = await sb.rpc('fn_deal_won' as never, { p_deal_id: dealId } as never)
    if (error) return { ok: false, error: error.message }
    await emitEvent('deal.won', { deal_id: dealId, client_id: data })
    revalidatePath('/ventas')
    return { ok: true, client_id: data }
  }

  const { error } = await sb
    .from('deals')
    .update({ stage, last_activity_at: new Date().toISOString() })
    .eq('id', dealId)
  if (error) return { ok: false, error: error.message }

  await emitEvent('deal.stage_changed', { deal_id: dealId, stage })
  revalidatePath('/ventas')
  return { ok: true }
}

const dealSchema = z.object({
  title: z.string().min(2),
  client_id: z.string().uuid().optional().nullable().or(z.literal('')).transform(v => v || null),
  setup_amount: z.coerce.number().nonnegative().default(0),
  recurring_amount: z.coerce.number().nonnegative().default(0),
  probability: z.coerce.number().min(0).max(100).default(20),
  stage: z.enum(['lead', 'cualificado', 'propuesta', 'negociacion', 'ganado', 'perdido']).default('lead'),
  source: z.enum(['linkedin', 'referido', 'cold_outreach', 'inbound_web', 'otro']).default('inbound_web'),
  services: z.string().transform((s) => s.split(',').map(x => x.trim()).filter(Boolean)).default(''),
  expected_close: z.string().optional().nullable().transform(v => v || null),
  notes: z.string().optional().nullable(),
})

export async function createDeal(formData: FormData) {
  const parsed = dealSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { data, error } = await sb
    .from('deals')
    .insert({ ...parsed, services: parsed.services as string[] })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  await emitEvent('deal.created', { deal_id: data.id })
  revalidatePath('/ventas')
  return { ok: true, id: data.id }
}

export async function updateDeal(id: string, formData: FormData) {
  const parsed = dealSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb
    .from('deals')
    .update({ ...parsed, services: parsed.services as string[], last_activity_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/ventas')
  return { ok: true }
}

export async function archiveDeal(id: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/ventas')
  return { ok: true }
}

export async function addDealNote(dealId: string, body: string) {
  if (!body.trim()) return { ok: false, error: 'Vacío' }
  const sb = await getSupabaseServer()
  const { error } = await sb.from('deal_notes').insert({ deal_id: dealId, body })
  if (error) return { ok: false, error: error.message }
  await sb.from('deals').update({ last_activity_at: new Date().toISOString() }).eq('id', dealId)
  // Re-score (fire-and-forget al endpoint de scoring)
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/lead-score`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deal_id: dealId }),
  }).catch(() => {})
  revalidatePath('/ventas')
  return { ok: true }
}
