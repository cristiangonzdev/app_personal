import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, Badge } from '@/components/ui'
import { formatFechaCorta, pickRel } from '@/lib/utils'
import Link from 'next/link'
import { MessageSquareText, Mail, PhoneIncoming } from 'lucide-react'
import { NewMessageButton, ResolveButton } from './forms'

export const dynamic = 'force-dynamic'

export default async function ComunicacionesPage() {
  const sb = await getSupabaseServer()
  const [{ data: comms }, { data: clients }] = await Promise.all([
    sb.from('communications')
      .select('id,channel,direction,from_addr,body,occurred_at,needs_attention,bot_handled,client_id,clients(legal_name,commercial_name)')
      .order('occurred_at', { ascending: false })
      .limit(100),
    sb.from('clients').select('id,legal_name,commercial_name').is('deleted_at', null).order('legal_name'),
  ])
  const clientOptions = (clients ?? []).map((c: { id: string; legal_name: string; commercial_name: string | null }) => ({
    id: c.id, name: c.commercial_name || c.legal_name,
  }))

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox unificado</h1>
        <NewMessageButton clients={clientOptions} />
      </header>
      <div className="grid lg:grid-cols-2 gap-3">
        {(comms ?? []).map(c => {
          const Icon = c.channel === 'whatsapp' ? MessageSquareText : c.channel === 'email' ? Mail : PhoneIncoming
          const cl = pickRel((c as unknown as { clients: { legal_name: string; commercial_name: string | null } | { legal_name: string; commercial_name: string | null }[] | null }).clients)
          return (
            <Card key={c.id} className={`${c.needs_attention ? 'border-l-2 border-l-accent-amber' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Icon size={12} />
                  <span className="uppercase tracking-wider">{c.channel}</span>
                  <Badge tone={c.direction === 'in' ? 'cyan' : 'violet'}>{c.direction === 'in' ? 'IN' : 'OUT'}</Badge>
                  {c.bot_handled && <Badge tone="green">BOT</Badge>}
                </div>
                <span className="text-[10px] font-mono text-slate-600">{formatFechaCorta(c.occurred_at)}</span>
              </div>
              <div className="text-[12px] text-slate-200 mt-2 line-clamp-3">{c.body || '—'}</div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-[10px] font-mono text-slate-600">
                <span>{c.from_addr ?? '—'}</span>
                <div className="flex items-center gap-3">
                  <ResolveButton id={c.id} currentlyAttention={c.needs_attention} />
                  {cl ? (
                    <Link href={`/clientes/${c.client_id}`} className="hover:text-accent-cyan">{cl.commercial_name || cl.legal_name}</Link>
                  ) : (
                    <span className="text-accent-amber">Sin cliente</span>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
        {(comms ?? []).length === 0 && <div className="text-[11px] text-slate-600 col-span-full text-center py-10">Inbox vacío</div>}
      </div>
    </div>
  )
}
