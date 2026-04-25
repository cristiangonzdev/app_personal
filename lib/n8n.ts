import { createHmac, timingSafeEqual } from 'node:crypto'

const OUTBOUND_SECRET = process.env.N8N_OUTBOUND_SECRET || ''
const INBOUND_SECRET = process.env.N8N_INBOUND_SECRET || ''
const BASE = process.env.N8N_WEBHOOK_BASE || ''

export function sign(payload: string, secret = OUTBOUND_SECRET): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifyInbound(payload: string, signature: string | null): boolean {
  if (!signature || !INBOUND_SECRET) return false
  const expected = createHmac('sha256', INBOUND_SECRET).update(payload).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature.replace(/^sha256=/, ''), 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Dispara evento saliente a n8n. Si BASE no está configurado, deja el evento en
 * automations_log sin entregar (el cron de retry lo recogerá luego).
 */
export async function emitEvent(event: string, payload: unknown): Promise<{ ok: boolean; status: number }> {
  if (!BASE) return { ok: false, status: 0 }
  const body = JSON.stringify({ event, payload, at: new Date().toISOString() })
  const res = await fetch(`${BASE}/${event.replace(/\./g, '-')}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-logika-signature': `sha256=${sign(body)}`,
    },
    body,
  }).catch(() => null)
  return { ok: !!res?.ok, status: res?.status ?? 0 }
}
