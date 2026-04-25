'use server'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get('email') || '')
  const next = String(formData.get('next') || '/')
  const sb = await getSupabaseServer()
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${SITE}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  redirect(`/login?sent=1`)
}

export async function signInWithGoogle(formData: FormData) {
  const next = String(formData.get('next') || '/')
  const sb = await getSupabaseServer()
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${SITE}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  if (data?.url) redirect(data.url)
}
