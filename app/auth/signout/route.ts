import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const sb = await getSupabaseServer()
  await sb.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
