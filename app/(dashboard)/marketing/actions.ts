'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const contentSchema = z.object({
  campaign_id: z.string().uuid().optional().nullable().or(z.literal('')).transform(v => v || null),
  title: z.string().min(2),
  kind: z.enum(['reel', 'post', 'story', 'blog', 'email', 'short']),
  platform: z.string().min(2),
  account_handle: z.string().optional().nullable(),
  pillar: z.string().optional().nullable(),
  status: z.enum(['idea', 'guion', 'grabado', 'editado', 'publicado']).default('idea'),
  scheduled_at: z.string().optional().nullable().transform(v => v || null),
  needs_editor: z.union([z.literal('on'), z.literal(''), z.boolean()]).optional().transform(v => v === 'on' || v === true),
  notes: z.string().optional().nullable(),
})

export async function createContent(formData: FormData) {
  const parsed = contentSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('contents').insert(parsed)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true }
}

export async function setContentStatus(id: string, status: 'idea' | 'guion' | 'grabado' | 'editado' | 'publicado') {
  const sb = await getSupabaseServer()
  const patch: Record<string, unknown> = { status }
  if (status === 'publicado') patch.published_at = new Date().toISOString()
  const { error } = await sb.from('contents').update(patch).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true }
}

export async function deleteContent(id: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('contents').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true }
}

const campaignSchema = z.object({
  name: z.string().min(2),
  goal: z.string().optional().nullable(),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  starts_on: z.string().optional().nullable().transform(v => v || null),
  utm_campaign: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createCampaign(formData: FormData) {
  const parsed = campaignSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('campaigns').insert(parsed)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true }
}

const hookSchema = z.object({
  phrase: z.string().min(2),
  angle: z.string().optional().nullable(),
  cta: z.string().optional().nullable(),
})

export async function createHook(formData: FormData) {
  const parsed = hookSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('hooks_bank').insert(parsed)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true }
}

export async function deleteHook(id: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('hooks_bank').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true }
}
