import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyInbound } from '@/lib/n8n'
import { getSupabaseService } from '@/lib/supabase/server'

const schema = z.object({
  request_id: z.string(),
  external_id: z.string(),
  from_number: z.string(),
  duration_sec: z.number().optional(),
  transcript: z.string().optional(),
  voicemail_url: z.string().url().optional(),
  occurred_at: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const sig = req.headers.get('x-logika-signature')
  if (!verifyInbound(raw, sig)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const body = schema.parse(JSON.parse(raw))
  const sb = await getSupabaseService()

  const { data: existing } = await sb.from('webhook_events').select('id')
    .eq('source', 'vapi').eq('request_id', body.request_id).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, deduped: true })

  await sb.from('webhook_events').insert({
    source: 'vapi', request_id: body.request_id, payload: body, signature_ok: true,
  })

  const { data: contact } = await sb
    .from('contacts').select('id,client_id').eq('phone', body.from_number).is('deleted_at', null).maybeSingle()

  await sb.from('communications').insert({
    client_id: contact?.client_id ?? null,
    contact_id: contact?.id ?? null,
    channel: 'vapi', direction: 'in',
    external_id: body.external_id,
    from_addr: body.from_number,
    body: body.transcript ?? '(llamada perdida sin transcripción)',
    metadata: { duration_sec: body.duration_sec, voicemail_url: body.voicemail_url },
    needs_attention: true,
    occurred_at: body.occurred_at ?? new Date().toISOString(),
  })

  await sb.from('webhook_events').update({ processed_at: new Date().toISOString() })
    .eq('source', 'vapi').eq('request_id', body.request_id)

  return NextResponse.json({ ok: true })
}
