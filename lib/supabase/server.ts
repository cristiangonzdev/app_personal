import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Hasta que generemos types/database.ts con `pnpm db:types`, tipamos como any
// para evitar fricción con TS estricto en filas/RPC.
type AnyClient = SupabaseClient<any, 'public', any>

let _anon: AnyClient | null = null
let _service: AnyClient | null = null

// Cliente anónimo sin cookies. Modo single-user: lecturas/escrituras desde
// Server Components vía RLS de anon. Sin auth.getUser() para no añadir round-trips.
export async function getSupabaseServer(): Promise<AnyClient> {
  if (_anon) return _anon
  _anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ) as AnyClient
  return _anon
}

// Service role: bypassa RLS. Solo para webhooks inbound y operaciones de cron.
export async function getSupabaseService(): Promise<AnyClient> {
  if (_service) return _service
  _service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ) as AnyClient
  return _service
}
