// Edge Function: re-scorea un deal vía Anthropic. Llamada por trigger desde
// el route handler /api/lead-score (server) o por n8n cuando llega nueva nota.
// deno run --allow-net --allow-env

// @ts-expect-error Deno runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-expect-error Deno-only ESM
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: { env: { get(name: string): string | undefined } }

serve(async (req) => {
  const { deal_id } = await req.json()
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: deal } = await sb
    .from('deals')
    .select('id,title,services,setup_amount,recurring_amount,source,probability,deal_notes(body)')
    .eq('id', deal_id).single()
  if (!deal) return new Response('not found', { status: 404 })

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') || 'claude-opus-4-7',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Devuelve JSON: {"score":0-100,"reasoning":"...","next_best_action":"..."}.
Deal: ${deal.title} · servicios ${(deal.services ?? []).join(',')} · setup €${deal.setup_amount} · rec €${deal.recurring_amount}/mes · fuente ${deal.source}.
Notas: ${(deal.deal_notes ?? []).map((n: { body: string }) => n.body).join(' | ') || '(sin notas)'}`,
      }],
    }),
  })

  const json = await r.json()
  const text = json?.content?.[0]?.text ?? '{}'
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')

  await sb.from('deals').update({
    score: parsed.score ?? null,
    score_reasoning: parsed.reasoning ?? null,
    next_best_action: parsed.next_best_action ?? null,
  }).eq('id', deal_id)

  return new Response(JSON.stringify({ ok: true, ...parsed }), {
    headers: { 'content-type': 'application/json' },
  })
})
