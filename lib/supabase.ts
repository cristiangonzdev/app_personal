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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase. Revisa .env.local')
}

// ─── Cliente browser (singleton) ─────────────
// Usa la anon key — respeta las Row Level Security policies
let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowser() {
  if (browserClient) return browserClient
  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }, // app personal, sin auth por ahora
  })
  return browserClient
}

// ─── Cliente server (service role) ───────────
// Usa la service role key — bypasea RLS
// NUNCA expongas esta key en el browser
export function getSupabaseServer() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

// Alias corto para uso en componentes client
export const supabase = getSupabaseBrowser
