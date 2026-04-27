import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta, isVencida } from '@/lib/utils'
import { DEAL_STAGES, STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { ArrowUpRight, AlertTriangle, Sparkles, MessageSquareText, CheckSquare, Repeat } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CockpitPage() {
  const sb = await getSupabaseServer()

  const [mrrRes, dealsRes, invoicesRes, commsRes, subsRes, tasksRes, clientsRes] = await Promise.all([
    sb.rpc('fn_calculate_mrr' as never, { period: new Date().toISOString().slice(0, 10) } as never),
    sb.from('deals').select('id,title,stage,setup_amount,recurring_amount,probability,score,last_activity_at,expected_close,client_id').is('deleted_at', null),
    sb.from('invoices').select('id,number,total,status,due_date,client_id,clients(legal_name,commercial_name)').is('deleted_at', null),
    sb.from('communications').select('id,channel,from_addr,body,occurred_at,needs_attention').eq('needs_attention', true).order('occurred_at', { ascending: false }).limit(5),
    sb.from('subscriptions').select('id,client_id,service,amount_monthly,status,starts_on,clients(legal_name,commercial_name)').eq('status', 'activa'),
    sb.from('tasks').select('id,title,status,due_on,project_id,projects(name)').is('deleted_at', null).neq('status', 'done').order('due_on', { nullsFirst: false }).limit(8),
    sb.from('clients').select('id,client_type').is('deleted_at', null),
  ])

  const mrr = Number(mrrRes.data ?? 0)
  const deals = dealsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const comms = commsRes.data ?? []
  const subs = subsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const clients = clientsRes.data ?? []

  const openDeals = deals.filter(d => d.stage !== 'ganado' && d.stage !== 'perdido')
  const weightedSetup = openDeals.reduce((s, d) => s + Number(d.setup_amount) * d.probability / 100, 0)
  const weightedMrr = openDeals.reduce((s, d) => s + Number(d.recurring_amount) * d.probability / 100, 0)
  const overdue = invoices.filter(i => i.status !== 'pagada' && i.status !== 'anulada' && (i.status === 'vencida' || isVencida(i.due_date)))
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.total), 0)
  const stale = openDeals.filter(d => Date.now() - new Date(d.last_activity_at).getTime() > 14 * 24 * 3600_000)
  const recurrentes = clients.filter(c => c.client_type === 'recurrente').length
  const tasksVencidas = tasks.filter(t => isVencida(t.due_on))

  // Renovaciones del mes: subs activas cuyo "día del mes" del starts_on cae este mes
  const today = new Date()
  const cutoffEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const renovacionesMes = subs.filter(s => {
    if (!s.starts_on) return false
    const d = parseInt(s.starts_on.slice(8, 10), 10)
    const renovDate = new Date(today.getFullYear(), today.getMonth(), d)
    return renovDate >= today && renovDate <= cutoffEnd
  })
  const renovacionesTotal = renovacionesMes.reduce((s, x) => s + Number(x.amount_monthly), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cockpit</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="MRR" value={formatEuros(mrr)} accent="green" sub={`${recurrentes} cliente(s) recurrente(s)`} href="/pagos" />
        <Metric label="Pipeline weighted" value={formatEuros(weightedSetup + weightedMrr * 12)} accent="cyan" sub={`${openDeals.length} deal(s) abiertos`} href="/ventas" />
        <Metric label="Vencidas" value={formatEuros(overdueTotal)} accent={overdue.length ? 'red' : 'slate'} sub={`${overdue.length} factura(s)`} href="/pagos?filter=vencidas" />
        <Metric label="Tareas pendientes" value={String(tasks.length)} accent={tasksVencidas.length ? 'amber' : 'slate'} sub={tasksVencidas.length ? `${tasksVencidas.length} vencida(s)` : 'al día'} href="/proyectos" />
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
          {stale.length > 0 && (
            <div className="mt-3 text-[11px] text-accent-amber flex items-center gap-1.5">
              <AlertTriangle size={11} />
              {stale.length} deal(s) sin actividad &gt;14 días
            </div>
          )}
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

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle><Repeat size={11} className="inline mr-1" />Renovaciones del mes</CardTitle>
            <span className="text-[11px] font-mono text-accent-green">{formatEuros(renovacionesTotal)}</span>
          </CardHeader>
          {renovacionesMes.length === 0 ? (
            <div className="text-[12px] text-slate-600 py-3 text-center">Sin renovaciones próximas</div>
          ) : (
            <ul className="space-y-1.5 text-[12px]">
              {renovacionesMes.slice(0, 6).map(s => {
                type CRel = { legal_name: string; commercial_name: string | null }
                const rel = (s as unknown as { clients: CRel | CRel[] | null }).clients
                const c = Array.isArray(rel) ? rel[0] : rel
                const dom = parseInt(s.starts_on!.slice(8, 10), 10)
                return (
                  <li key={s.id} className="flex justify-between items-center">
                    <Link href={`/clientes/${s.client_id}`} className="text-slate-300 hover:text-accent-cyan truncate">{c?.commercial_name || c?.legal_name}</Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-600">día {dom}</span>
                      <span className="font-mono text-accent-green">{formatEuros(Number(s.amount_monthly))}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><CheckSquare size={11} className="inline mr-1" />Tareas a la vista</CardTitle>
            <Link href="/proyectos" className="text-[11px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">Ver todas <ArrowUpRight size={11} /></Link>
          </CardHeader>
          {tasks.length === 0 ? (
            <div className="text-[12px] text-slate-600 py-3 text-center">Sin tareas pendientes</div>
          ) : (
            <ul className="space-y-1.5 text-[12px]">
              {tasks.slice(0, 6).map(t => {
                type PRel = { name: string }
                const rel = (t as unknown as { projects: PRel | PRel[] | null }).projects
                const p = Array.isArray(rel) ? rel[0] : rel
                const venc = isVencida(t.due_on)
                return (
                  <li key={t.id} className="flex justify-between items-center gap-2">
                    <Link href={`/proyectos/${t.project_id}`} className="text-slate-300 hover:text-accent-cyan truncate min-w-0">
                      {t.title}
                      <span className="text-[10px] text-slate-600 ml-1">· {p?.name}</span>
                    </Link>
                    {t.due_on && (
                      <span className={`text-[10px] font-mono shrink-0 ${venc ? 'text-accent-red' : 'text-slate-500'}`}>{formatFechaCorta(t.due_on)}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><AlertTriangle size={11} className="inline mr-1" />Próximas facturas</CardTitle>
            <Link href="/pagos" className="text-[11px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">Ver <ArrowUpRight size={11} /></Link>
          </CardHeader>
          {invoices.length === 0 ? (
            <div className="text-[12px] text-slate-600 py-3 text-center">Sin facturas</div>
          ) : (
            <ul className="space-y-1.5 text-[12px]">
              {invoices.filter(i => i.status !== 'pagada' && i.status !== 'anulada').slice(0, 6).map(i => {
                const venc = isVencida(i.due_date)
                return (
                  <li key={i.id} className="flex justify-between items-center">
                    <span className="font-mono text-slate-400 truncate">{i.number ?? '— borrador —'}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge tone={tone(i.status, venc)}>{STATUS_LABELS.invoice[i.status]}</Badge>
                      <span className="font-mono text-slate-300">{formatEuros(Number(i.total))}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value, sub, accent, href }: { label: string; value: string; sub?: string; accent: 'cyan' | 'green' | 'amber' | 'red' | 'slate'; href?: string }) {
  const map: Record<string, string> = {
    cyan: 'text-accent-cyan',
    green: 'text-accent-green',
    amber: 'text-accent-amber',
    red: 'text-accent-red',
    slate: 'text-slate-300',
  }
  const inner = (
    <div className={`rounded-lg border border-border bg-bg-surface/60 backdrop-blur-md p-4 ${href ? 'hover:border-accent-cyan/40 transition-colors' : ''}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
        <Sparkles size={9} className={map[accent]} />
        {label}
      </div>
      <div className={`mt-1 font-mono text-[22px] font-semibold ${map[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function tone(status: string, venc: boolean): 'green' | 'amber' | 'red' | 'slate' | 'cyan' {
  if (status === 'pagada') return 'green'
  if (status === 'vencida' || venc) return 'red'
  if (status === 'emitida' || status === 'enviada') return 'cyan'
  return 'slate'
}
