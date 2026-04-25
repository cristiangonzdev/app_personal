'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const composeSchema = z.object({
  client_id: z.string().uuid().optional().nullable().or(z.literal('')).transform(v => v || null),
  channel: z.enum(['whatsapp', 'email', 'vapi', 'sms', 'manual']),
  to_addr: z.string().min(2),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
})

export async function logOutboundMessage(formData: FormData) {
  const parsed = composeSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('communications').insert({
    ...parsed,
    direction: 'out',
    occurred_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/comunicaciones')
  return { ok: true }
}

export async function toggleAttention(id: string, value: boolean) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('communications').update({ needs_attention: !value }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/comunicaciones')
  return { ok: true }
}
