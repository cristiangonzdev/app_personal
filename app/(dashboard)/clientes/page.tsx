import { getSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta, isVencida } from '@/lib/utils'
import { SERVICE_LABELS, type ServiceKind } from '@/types'
import { Users, Repeat, AlertCircle, ArrowRight } from 'lucide-react'
import { NewClientButton } from './client-form'
import { ClientFilters } from './filters'

export const dynamic = 'force-dynamic'

type SP = Promise<{ q?: string; tipo?: string }>

type SubRow = { client_id: string; service: ServiceKind; amount_monthly: number; status: string; starts_on: string }
type InvoiceRow = { client_id: string; status: string; total: number; due_date: string | null }

export default async function ClientesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const tipo = sp.tipo ?? 'todos'
  const sb = await getSupabaseServer()

  const [{ data: clients }, { data: subs }, { data: invoices }] = await Promise.all([
    sb.from('clients').select('id,legal_name,commercial_name,client_type,sector,igic,created_at')
      .is('deleted_at', null).neq('client_type', 'lead').order('legal_name'),
    sb.from('subscriptions').select('client_id,service,amount_monthly,status,starts_on'),
    sb.from('invoices').select('client_id,status,total,due_date').is('deleted_at', null),
  ])

  const subsByClient = new Map<string, SubRow[]>()
  const mrrByClient = new Map<string, number>()
  for (const s of (subs ?? []) as SubRow[]) {
    const list = subsByClient.get(s.client_id) ?? []
    list.push(s)
    subsByClient.set(s.client_id, list)
    if (s.status === 'activa') {
      mrrByClient.set(s.client_id, (mrrByClient.get(s.client_id) ?? 0) + Number(s.amount_monthly))
    }
  }

  const pendingByClient = new Map<string, { count: number; total: number; overdue: number }>()
  for (const i of (invoices ?? []) as InvoiceRow[]) {
    if (i.status === 'pagada' || i.status === 'anulada') continue
    const cur = pendingByClient.get(i.client_id) ?? { count: 0, total: 0, overdue: 0 }
    cur.count += 1
    cur.total += Number(i.total)
    if (isVencida(i.due_date)) cur.overdue += 1
    pendingByClient.set(i.client_id, cur)
  }

  // Próximo cobro (día del mes de la sub activa más próxima)
  const today = new Date()
  function nextChargeFor(clientId: string): { date: Date; amount: number } | null {
    const list = (subsByClient.get(clientId) ?? []).filter(s => s.status === 'activa')
    if (!list.length) return null
    const candidates = list.map(s => {
      const dom = parseInt(s.starts_on.slice(8, 10), 10)
      const candidate = new Date(today.getFullYear(), today.getMonth(), dom)
      if (candidate < today) candidate.setMonth(candidate.getMonth() + 1)
      return { date: candidate, amount: Number(s.amount_monthly) }
    })
    candidates.sort((a, b) => a.date.getTime() - b.date.getTime())
    return candidates[0] ?? null
  }

  let filtered = clients ?? []
  if (tipo !== 'todos') filtered = filtered.filter(c => c.client_type === tipo)
  if (q) {
    const ql = q.toLowerCase()
    filtered = filtered.filter(c =>
      c.legal_name.toLowerCase().includes(ql) ||
      (c.commercial_name?.toLowerCase().includes(ql) ?? false) ||
      (c.sector?.toLowerCase().includes(ql) ?? false),
    )
  }

  filtered.sort((a, b) => {
    if (a.client_type === 'recurrente' && b.client_type !== 'recurrente') return -1
    if (b.client_type === 'recurrente' && a.client_type !== 'recurrente') return 1
    const ma = mrrByClient.get(a.id) ?? 0
    const mb = mrrByClient.get(b.id) ?? 0
    if (ma !== mb) return mb - ma
    return a.legal_name.localeCompare(b.legal_name)
  })

  const counts = {
    todos: clients?.length ?? 0,
    recurrente: clients?.filter(c => c.client_type === 'recurrente').length ?? 0,
    one_shot: clients?.filter(c => c.client_type === 'one_shot').length ?? 0,
  }
  const totalMrr = (subs ?? []).filter(s => s.status === 'activa').reduce((s, x) => s + Number(x.amount_monthly), 0)
  const totalPending = Array.from(pendingByClient.values()).reduce((s, x) => s + x.total, 0)
  const totalOverdue = Array.from(pendingByClient.values()).reduce((s, x) => s + x.overdue, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Users size={22} className="text-accent-cyan" />Clientes
          </h1>
          <p className="text-[12px] text-slate-500 mt-1">
            {counts.todos} cuentas · {counts.recurrente} recurrente(s)
          </p>
        </div>
        <NewClientButton />
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="MRR activo" value={formatEuros(totalMrr)} sub={`${formatEuros(totalMrr * 12)} ARR`} accent="green" icon={Repeat} />
        <Stat label="Por cobrar" value={formatEuros(totalPending)} sub={`${Array.from(pendingByClient.values()).reduce((s, x) => s + x.count, 0)} factura(s)`} accent="cyan" />
        <Stat label="Vencidas" value={String(totalOverdue)} sub={totalOverdue > 0 ? 'requieren acción' : 'al día' } accent={totalOverdue > 0 ? 'red' : 'slate'} icon={totalOverdue > 0 ? AlertCircle : undefined} />
      </div>

      <ClientFilters active={tipo} q={q} counts={counts} />

      {filtered.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <Users size={32} className="mx-auto text-slate-700 mb-3" />
            <div className="text-[14px] text-slate-400">{q || tipo !== 'todos' ? 'Sin resultados con esos filtros' : 'Sin clientes. Empieza creando uno.'}</div>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(c => {
            const mrr = mrrByClient.get(c.id) ?? 0
            const pending = pendingByClient.get(c.id) ?? { count: 0, total: 0, overdue: 0 }
            const subList = (subsByClient.get(c.id) ?? []).filter(s => s.status === 'activa')
            const services = Array.from(new Set(subList.map(s => s.service)))
            const next = nextChargeFor(c.id)
            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className="group rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md p-5 hover:border-accent-cyan/40 hover:bg-bg-surface/70 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-medium text-slate-100 truncate group-hover:text-accent-cyan transition-colors">
                        {c.commercial_name || c.legal_name}
                      </h3>
                      <Badge tone={c.client_type === 'recurrente' ? 'green' : 'cyan'}>
                        {c.client_type === 'recurrente' ? 'Recurrente' : 'One-shot'}
                      </Badge>
                    </div>
                    {c.sector && <p className="text-[11px] text-slate-500 mt-1 capitalize">{c.sector}</p>}

                    {services.length > 0 && (
                      <div className="flex gap-1.5 mt-2.5 flex-wrap">
                        {services.map(s => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-bg-surface2/60 text-slate-300 border border-border/40">
                            {SERVICE_LABELS[s]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArrowRight size={14} className="text-slate-700 group-hover:text-accent-cyan transition-colors mt-1" />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/40">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-600">MRR</div>
                    <div className="text-[14px] font-mono text-accent-green mt-0.5">{mrr > 0 ? formatEuros(mrr) : <span className="text-slate-700">—</span>}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-600">Próx. cobro</div>
                    <div className="text-[14px] font-mono text-slate-200 mt-0.5">
                      {next ? (
                        <>
                          {formatFechaCorta(next.date.toISOString())}
                          <span className="text-[10px] text-slate-500 ml-1">{formatEuros(next.amount)}</span>
                        </>
                      ) : <span className="text-slate-700">—</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-600">Por cobrar</div>
                    <div className={`text-[14px] font-mono mt-0.5 ${pending.overdue > 0 ? 'text-accent-red' : pending.count > 0 ? 'text-accent-cyan' : 'text-slate-700'}`}>
                      {pending.count > 0 ? formatEuros(pending.total) : '—'}
                      {pending.overdue > 0 && <span className="text-[9px] ml-1">·{pending.overdue} vencida</span>}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, accent, icon: Icon }: {
  label: string
  value: string
  sub?: string
  accent: 'cyan' | 'green' | 'red' | 'slate'
  icon?: React.ElementType
}) {
  const map: Record<string, string> = {
    cyan: 'text-accent-cyan',
    green: 'text-accent-green',
    red: 'text-accent-red',
    slate: 'text-slate-300',
  }
  return (
    <div className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
        {Icon && <Icon size={11} />}{label}
      </div>
      <div className={`mt-1.5 font-mono text-[22px] font-semibold ${map[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}
