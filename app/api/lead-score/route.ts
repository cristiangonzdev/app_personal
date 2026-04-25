import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getSupabaseServer, getSupabaseService } from '@/lib/supabase/server'
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic'

const schema = z.object({ deal_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  const sb = await getSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { deal_id } = schema.parse(body)

  const { data: deal } = await sb
    .from('deals')
    .select('id,title,services,setup_amount,recurring_amount,source,probability,client_id,deal_notes(body,created_at)')
    .eq('id', deal_id)
    .single()
  if (!deal) return NextResponse.json({ error: 'deal not found' }, { status: 404 })

  const anthropic = getAnthropic()
  const prompt = `Eres analista comercial de Logika Digital (agencia AI/automatización en Canarias).
Devuelve JSON válido: {"score": 0-100, "reasoning": "...", "next_best_action": "..."}.
Score considera: encaje servicio, ticket económico, frescura de actividad, calidad de la fuente, evidencia en notas.

Deal:
- Título: ${deal.title}
- Servicios: ${(deal.services ?? []).join(', ')}
- Setup: €${deal.setup_amount} · Recurrente: €${deal.recurring_amount}/mes
- Fuente: ${deal.source}
- Probabilidad declarada: ${deal.probability}%
- Notas (más reciente arriba):
${(deal.deal_notes ?? []).slice(0, 8).map((n: { body: string }) => `· ${n.body}`).join('\n') || '(sin notas)'}
`

  const msg = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('')

  let parsed: { score: number; reasoning: string; next_best_action: string }
  try {
    const match = text.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(match?.[0] ?? text)
  } catch {
    return NextResponse.json({ error: 'modelo devolvió formato inválido', raw: text }, { status: 502 })
  }

  // Escribir con service role (saltarse RLS para cron-like)
  const svc = await getSupabaseService()
  await svc.from('deals').update({
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    score_reasoning: parsed.reasoning,
    next_best_action: parsed.next_best_action,
  }).eq('id', deal_id)

  return NextResponse.json({ ok: true, ...parsed })
}

import type Anthropic from '@anthropic-ai/sdk'
