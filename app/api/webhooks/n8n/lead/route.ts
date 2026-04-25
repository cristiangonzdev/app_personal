import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyInbound } from '@/lib/n8n'
import { getSupabaseService } from '@/lib/supabase/server'

const schema = z.object({
  request_id: z.string(),
  source: z.string().optional(),         // linkedin, web_form, ...
  legal_name: z.string(),
  contact_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  service: z.enum(['software_custom', 'chatbot', 'web', 'social_media_management']).optional(),
  setup_amount: z.number().optional(),
  recurring_amount: z.number().optional(),
  notes: z.string().optional(),
  utm_campaign: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const sig = req.headers.get('x-logika-signature')
  if (!verifyInbound(raw, sig)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const body = schema.parse(JSON.parse(raw))
  const sb = await getSupabaseService()

  // Idempotencia
  const { data: existing } = await sb
    .from('webhook_events').select('id').eq('source', 'n8n.lead').eq('request_id', body.request_id).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, deduped: true })

  await sb.from('webhook_events').insert({
    source: 'n8n.lead', request_id: body.request_id, payload: body, signature_ok: true,
  })

  // Crear cliente lead
  const { data: client } = await sb.from('clients').insert({
    legal_name: body.legal_name, client_type: 'lead',
  }).select('id').single()
  if (!client) return NextResponse.json({ error: 'client insert failed' }, { status: 500 })

  if (body.contact_name || body.email || body.phone) {
    await sb.from('contacts').insert({
      client_id: client.id, full_name: body.contact_name ?? body.legal_name,
      email: body.email, phone: body.phone, is_primary: true,
    })
  }

  // Crear deal
  const { data: deal } = await sb.from('deals').insert({
    title: body.legal_name,
    client_id: client.id,
    services: body.service ? [body.service] : [],
    setup_amount: body.setup_amount ?? 0,
    recurring_amount: body.recurring_amount ?? 0,
    source: (body.source as 'linkedin' | 'referido' | 'cold_outreach' | 'inbound_web' | 'otro') ?? 'inbound_web',
    notes: body.notes,
    stage: 'lead',
  }).select('id').single()

  await sb.from('webhook_events').update({ processed_at: new Date().toISOString() })
    .eq('source', 'n8n.lead').eq('request_id', body.request_id)

  return NextResponse.json({ ok: true, client_id: client.id, deal_id: deal?.id })
}
