import { getSupabaseServer } from '@/lib/supabase/server'
import { Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta, isVencida } from '@/lib/utils'
import { SERVICE_LABELS, type ServiceKind } from '@/types'
import Link from 'next/link'
import { ArrowUpRight, Sparkles, Users, Megaphone, AlertCircle, Repeat, Flame, Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const sb = await getSupabaseServer()

  const [mrrRes, dealsRes, invoicesRes, subsRes, contentsRes, clientsRes] = await Promise.all([
    sb.rpc('fn_calculate_mrr' as never, { period: new Date().toISOString().slice(0, 10) } as never),
    sb.from('deals').select('id,title,stage,setup_amount,recurring_amount,probability,score,services')
      .is('deleted_at', null).neq('stage', 'ganado').neq('stage', 'perdido')
      .order('last_activity_at', { ascending: false }).limit(20),
    sb.from('invoices').select('id,number,total,status,due_date,client_id,clients(legal_name,commercial_name)')
      .is('deleted_at', null),
    sb.from('subscriptions').select('id,client_id,service,amount_monthly,status,starts_on,clients(legal_name,commercial_name)')
      .eq('status', 'activa'),
    sb.from('contents').select('id,title,kind,platform,status,scheduled_at,account_handle')
      .neq('status', 'publicado').order('scheduled_at', { ascending: true, nullsFirst: false }).limit(5),
    sb.from('clients').select('id,client_type').is('deleted_at', null),
  ])

  const mrr = Number(mrrRes.data ?? 0)
  const deals = dealsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const subs = subsRes.data ?? []
  const contents = contentsRes.data ?? []
  const clients = clientsRes.data ?? []

  const recurrentes = clients.filter(c => c.client_type === 'recurrente').length
  const overdue = invoices.filter(i => i.status !== 'pagada' && i.status !== 'anulada' && isVencida(i.due_date))
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.total), 0)

  // Próximos 30 días: facturas + suscripciones
  const today = new Date()
  const limit = new Date(today); limit.setDate(today.getDate() + 30)

  type Charge = { id: string; date: Date; amount: number; clientName: string; clientId: string; kind: 'invoice' | 'sub'; label: string }
  const charges: Charge[] = []

  for (const i of invoices) {
    if (i.status === 'pagada' || i.status === 'anulada' || i.status === 'borrador' || !i.due_date) continue
    const d = new Date(i.due_date)
    if (d < today || d > limit) continue
    type CRel = { legal_name: string; commercial_name: string | null }
    const rel = (i as unknown as { clients: CRel | CRel[] | null }).clients
    const c = Array.isArray(rel) ? rel[0] : rel
    charges.push({
      id: `i-${i.id}`,
      date: d,
      amount: Number(i.total),
      clientName: c?.commercial_name || c?.legal_name || '—',
      clientId: i.client_id,
      kind: 'invoice',
      label: i.number ?? 'Factura',
    })
  }

  for (const s of subs) {
    const dom = parseInt(s.starts_on.slice(8, 10), 10)
    let candidate = new Date(today.getFullYear(), today.getMonth(), dom)
    if (candidate < today) candidate = new Date(today.getFullYear(), today.getMonth() + 1, dom)
    if (candidate > limit) continue
    type CRel = { legal_name: string; commercial_name: string | null }
    const rel = (s as unknown as { clients: CRel | CRel[] | null }).clients
    const c = Array.isArray(rel) ? rel[0] : rel
    charges.push({
      id: `s-${s.id}`,
      date: candidate,
      amount: Number(s.amount_monthly),
      clientName: c?.commercial_name || c?.legal_name || '—',
      clientId: s.client_id,
      kind: 'sub',
      label: SERVICE_LABELS[s.service] ?? s.service,
    })
  }
  charges.sort((a, b) => a.date.getTime() - b.date.getTime())
  const totalProx = charges.reduce((s, c) => s + c.amount, 0)

  // Leads calientes
  const hotLeads = deals
    .filter(d => (d.score ?? 0) >= 70 || d.stage === 'negociacion')
    .slice(0, 4)
  const totalLeadValue = deals.reduce((s, d) => s + (Number(d.setup_amount) + Number(d.recurring_amount) * 12) * d.probability / 100, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
          {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Hola Cristian.</h1>
        <p className="text-[13px] text-slate-500 mt-1">Esto es lo importante hoy.</p>
      </header>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigStat
          label="MRR activo"
          value={formatEuros(mrr)}
          sub={`${recurrentes} cliente(s) recurrente(s)`}
          accent="green"
          href="/clientes?tipo=recurrente"
          icon={Repeat}
        />
        <BigStat
          label="Próximos 30 días"
          value={formatEuros(totalProx)}
          sub={`${charges.length} cobro(s) pendiente(s)`}
          accent="cyan"
          href="/clientes"
          icon={Calendar}
        />
        <BigStat
          label="Vencido"
          value={formatEuros(overdueTotal)}
          sub={overdue.length > 0 ? `${overdue.length} factura(s) sin cobrar` : 'al día'}
          accent={overdue.length > 0 ? 'red' : 'slate'}
          href="/clientes"
          icon={overdue.length > 0 ? AlertCircle : undefined}
        />
        <BigStat
          label="Pipeline ponderado"
          value={formatEuros(totalLeadValue)}
          sub={`${deals.length} lead(s) abiertos`}
          accent="violet"
          href="/leads"
          icon={Sparkles}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Próximos cobros */}
        <section className="lg:col-span-2 rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-accent-cyan" />
              <h2 className="text-[13px] font-medium text-slate-200">Próximos cobros · 30 días</h2>
            </div>
            <Link href="/clientes" className="text-[11px] text-slate-500 hover:text-accent-cyan inline-flex items-center gap-1">
              Ver clientes <ArrowUpRight size={11} />
            </Link>
          </header>
          {charges.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-slate-500">Sin cobros previstos en los próximos 30 días.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {charges.slice(0, 8).map(c => {
                const days = Math.ceil((c.date.getTime() - today.getTime()) / 86400000)
                const urgent = days <= 3
                return (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-surface2/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-1 h-8 rounded-full ${c.kind === 'sub' ? 'bg-accent-green' : 'bg-accent-cyan'}`} />
                      <div className="min-w-0">
                        <Link href={`/clientes/${c.clientId}`} className="text-[13px] text-slate-200 hover:text-accent-cyan font-medium truncate block">
                          {c.clientName}
                        </Link>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                          {c.kind === 'sub' ? 'Suscripción' : 'Factura'} · {c.label}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`text-[10px] font-mono w-16 text-right ${urgent ? 'text-accent-amber' : 'text-slate-500'}`}>
                        {days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days}d`}
                      </span>
                      <span className="text-[14px] font-mono text-slate-200 w-20 text-right">{formatEuros(c.amount)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Vencidas */}
        <section className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className={overdue.length > 0 ? 'text-accent-red' : 'text-slate-500'} />
              <h2 className="text-[13px] font-medium text-slate-200">Vencidas</h2>
            </div>
            <span className="text-[11px] font-mono text-accent-red">{overdue.length}</span>
          </header>
          {overdue.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-slate-500">Sin facturas vencidas. ✓</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {overdue.slice(0, 5).map(i => {
                type CRel = { legal_name: string; commercial_name: string | null }
                const rel = (i as unknown as { clients: CRel | CRel[] | null }).clients
                const c = Array.isArray(rel) ? rel[0] : rel
                return (
                  <li key={i.id} className="px-5 py-2.5 hover:bg-bg-surface2/30 transition-colors">
                    <Link href={`/clientes/${i.client_id}`} className="block">
                      <div className="text-[12px] text-slate-200 truncate">{c?.commercial_name || c?.legal_name}</div>
                      <div className="flex justify-between items-baseline mt-0.5">
                        <span className="text-[10px] font-mono text-slate-600">{i.number ?? '— sin nº —'}</span>
                        <span className="text-[12px] font-mono text-accent-red">{formatEuros(Number(i.total))}</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Leads calientes */}
        <section className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-accent-amber" />
              <h2 className="text-[13px] font-medium text-slate-200">Leads calientes</h2>
            </div>
            <Link href="/leads" className="text-[11px] text-slate-500 hover:text-accent-cyan inline-flex items-center gap-1">
              Ver leads <ArrowUpRight size={11} />
            </Link>
          </header>
          {hotLeads.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Sparkles size={20} className="mx-auto text-slate-700 mb-2" />
              <p className="text-[12px] text-slate-500">No hay leads calientes ahora mismo.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {hotLeads.map(d => (
                <li key={d.id} className="px-5 py-3 hover:bg-bg-surface2/30 transition-colors">
                  <Link href="/leads" className="block">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-slate-200 truncate font-medium">{d.title}</span>
                      <span className="text-[12px] font-mono text-accent-green shrink-0">
                        {formatEuros(Number(d.setup_amount) + Number(d.recurring_amount) * 12)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge tone={d.stage === 'negociacion' ? 'amber' : 'violet'}>{d.stage}</Badge>
                      {d.score != null && <span className="text-[10px] font-mono text-accent-amber">score {d.score}</span>}
                      {((d.services ?? []) as ServiceKind[]).slice(0, 2).map((s: ServiceKind) => (
                        <span key={s} className="text-[10px] text-slate-500">{SERVICE_LABELS[s]}</span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Marketing próximas piezas */}
        <section className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Megaphone size={14} className="text-accent-violet" />
              <h2 className="text-[13px] font-medium text-slate-200">Marketing próximo</h2>
            </div>
            <Link href="/marketing" className="text-[11px] text-slate-500 hover:text-accent-cyan inline-flex items-center gap-1">
              Calendario <ArrowUpRight size={11} />
            </Link>
          </header>
          {contents.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Megaphone size={20} className="mx-auto text-slate-700 mb-2" />
              <p className="text-[12px] text-slate-500">Sin contenido en producción.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {contents.map(c => (
                <li key={c.id} className="px-5 py-3 hover:bg-bg-surface2/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-slate-200 truncate font-medium">{c.title}</span>
                    <Badge tone="violet">{c.status}</Badge>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1 font-mono flex items-center gap-2">
                    <span className="capitalize">{c.platform} · {c.kind}</span>
                    {c.account_handle && <span>· {c.account_handle}</span>}
                    {c.scheduled_at && <span className="text-slate-500">· {formatFechaCorta(c.scheduled_at)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function BigStat({ label, value, sub, accent, href, icon: Icon }: {
  label: string
  value: string
  sub?: string
  accent: 'cyan' | 'green' | 'red' | 'slate' | 'violet'
  href?: string
  icon?: React.ElementType
}) {
  const map: Record<string, string> = {
    cyan: 'text-accent-cyan',
    green: 'text-accent-green',
    red: 'text-accent-red',
    violet: 'text-accent-violet',
    slate: 'text-slate-300',
  }
  const inner = (
    <div className={`rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md p-5 ${href ? 'hover:border-accent-cyan/40 hover:bg-bg-surface/70 transition-all group' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          {Icon && <Icon size={11} className={map[accent]} />}
          {label}
        </div>
        {href && <ArrowUpRight size={12} className="text-slate-700 group-hover:text-accent-cyan transition-colors" />}
      </div>
      <div className={`mt-2 font-mono text-[26px] font-semibold ${map[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-1">{sub}</div>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}
