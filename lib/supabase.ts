// ─────────────────────────────────────────────
// LOGIKA OS — Supabase Client
//
// Dos clientes separados:
// - createBrowserClient: para componentes client-side (React hooks)
// - createServerClient: para Server Components y API routes
//
// Usamos el patrón singleton en el browser para
// evitar múltiples instancias WebSocket.
// ─────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

// ─── Cliente browser (singleton) ─────────────
let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  if (!url || !key) {
    throw new Error('Faltan variables de entorno de Supabase. Revisa .env.local')
  }
  if (browserClient) return browserClient
  browserClient = createClient(url, key, {
    auth: { persistSession: false },
  })
  return browserClient
}

// ─── Cliente server (service role) ───────────
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

// Alias corto para uso en componentes client
export const supabase = getSupabaseBrowser
