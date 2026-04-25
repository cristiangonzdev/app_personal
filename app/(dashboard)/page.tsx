import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta, isVencida } from '@/lib/utils'
import { DEAL_STAGES, STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { ArrowUpRight, AlertTriangle, Sparkles, MessageSquareText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CockpitPage() {
  const sb = await getSupabaseServer()

  const [mrrRes, dealsRes, invoicesRes, commsRes] = await Promise.all([
    sb.rpc('fn_calculate_mrr' as never, { period: new Date().toISOString().slice(0, 10) } as never),
    sb.from('deals').select('id,title,stage,setup_amount,recurring_amount,probability,score,last_activity_at,expected_close,client_id').is('deleted_at', null),
    sb.from('invoices').select('id,number,total,status,due_date,client_id').is('deleted_at', null),
    sb.from('communications').select('id,channel,from_addr,body,occurred_at,needs_attention').eq('needs_attention', true).order('occurred_at', { ascending: false }).limit(5),
  ])

  const mrr = Number(mrrRes.data ?? 0)
  const deals = dealsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const comms = commsRes.data ?? []

  const openDeals = deals.filter(d => d.stage !== 'ganado' && d.stage !== 'perdido')
  const weightedSetup = openDeals.reduce((s, d) => s + Number(d.setup_amount) * d.probability / 100, 0)
  const weightedMrr = openDeals.reduce((s, d) => s + Number(d.recurring_amount) * d.probability / 100, 0)
  const overdue = invoices.filter(i => i.status === 'vencida' || (i.status !== 'pagada' && isVencida(i.due_date)))
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.total), 0)
  const stale = openDeals.filter(d => Date.now() - new Date(d.last_activity_at).getTime() > 14 * 24 * 3600_000)

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cockpit</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="MRR" value={formatEuros(mrr)} accent="green" sub="recurrente activo" />
        <Metric label="Pipeline weighted" value={formatEuros(weightedSetup + weightedMrr * 12)} accent="cyan" sub={`${openDeals.length} deals abiertos`} />
        <Metric label="Vencidas" value={formatEuros(overdueTotal)} accent={overdue.length ? 'red' : 'slate'} sub={`${overdue.length} factura${overdue.length === 1 ? '' : 's'}`} />
        <Metric label="Stale deals" value={String(stale.length)} accent={stale.length ? 'amber' : 'slate'} sub=">14 días sin actividad" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline · Ventas</CardTitle>
            <Link href="/ventas" className="text-[11px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">Ver kanban <ArrowUpRight size={11} /></Link>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DEAL_STAGES.filter(s => s.key !== 'ganado' && s.key !== 'perdido').map(stage => {
              const items = deals.filter(d => d.stage === stage.key)
              const total = items.reduce((s, d) => s + Number(d.setup_amount) + Number(d.recurring_amount) * 12, 0)
              return (
                <div key={stage.key} className={`rounded-md bg-bg-surface2/50 border-l-2 ${stage.tone} px-3 py-2`}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{stage.label}</div>
                  <div className="text-[18px] font-semibold mt-0.5">{items.length}</div>
                  <div className="text-[10px] font-mono text-slate-600 mt-0.5">{formatEuros(total)}</div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><MessageSquareText size={11} className="inline mr-1" />Inbox urgente</CardTitle>
            <Link href="/comunicaciones" className="text-[11px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">Abrir <ArrowUpRight size={11} /></Link>
          </CardHeader>
          {comms.length === 0 ? (
            <div className="text-[12px] text-slate-600 py-4 text-center">Sin pendientes</div>
          ) : (
            <ul className="space-y-2">
              {comms.map(c => (
                <li key={c.id} className="text-[12px] border-l-2 border-accent-amber pl-2.5">
                  <div className="text-slate-300 line-clamp-1">{c.body || '—'}</div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">{c.channel} · {c.from_addr ?? ''} · {formatFechaCorta(c.occurred_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><AlertTriangle size={11} className="inline mr-1" />Próximas facturas</CardTitle>
          <Link href="/pagos" className="text-[11px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">Ver todas <ArrowUpRight size={11} /></Link>
        </CardHeader>
        <table className="w-full text-[12px]">
          <thead className="text-[10px] uppercase tracking-wider text-slate-600">
            <tr className="border-b border-border">
              <th className="text-left py-2 font-normal">Número</th>
              <th className="text-left font-normal">Estado</th>
              <th className="text-right font-normal">Total</th>
              <th className="text-right font-normal">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {invoices.slice(0, 6).map(i => {
              const venc = i.status !== 'pagada' && isVencida(i.due_date)
              return (
                <tr key={i.id} className="border-b border-border/50 hover:bg-bg-surface2/40">
                  <td className="py-2 font-mono text-slate-300">{i.number ?? '—'}</td>
                  <td><Badge tone={tone(i.status, venc)}>{STATUS_LABELS.invoice[i.status]}</Badge></td>
                  <td className="text-right font-mono text-slate-300">{formatEuros(Number(i.total))}</td>
                  <td className={`text-right font-mono ${venc ? 'text-accent-red' : 'text-slate-500'}`}>{formatFechaCorta(i.due_date)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: 'cyan' | 'green' | 'amber' | 'red' | 'slate' }) {
  const map: Record<string, string> = {
    cyan: 'text-accent-cyan',
    green: 'text-accent-green',
    amber: 'text-accent-amber',
    red: 'text-accent-red',
    slate: 'text-slate-300',
  }
  return (
    <div className="rounded-lg border border-border bg-bg-surface/60 backdrop-blur-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
        <Sparkles size={9} className={map[accent]} />
        {label}
      </div>
      <div className={`mt-1 font-mono text-[22px] font-semibold ${map[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function tone(status: string, venc: boolean): 'green' | 'amber' | 'red' | 'slate' | 'cyan' {
  if (status === 'pagada') return 'green'
  if (status === 'vencida' || venc) return 'red'
  if (status === 'emitida' || status === 'enviada') return 'cyan'
  return 'slate'
}
