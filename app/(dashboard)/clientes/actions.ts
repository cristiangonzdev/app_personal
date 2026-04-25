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
