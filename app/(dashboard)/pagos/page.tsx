import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta, isVencida, pickRel } from '@/lib/utils'
import { STATUS_LABELS, SERVICE_LABELS } from '@/types'
import Link from 'next/link'
import { NewInvoiceButton, NewSubscriptionButton, InvoiceMenu, SubscriptionMenu } from './forms'
import { InvoiceFilter } from './invoice-filter'

export const dynamic = 'force-dynamic'

type SP = Promise<{ filter?: string }>

export default async function PagosPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filter = sp.filter ?? 'pendientes'
  const sb = await getSupabaseServer()

  const [mrrRes, { data: invoices }, { data: subs }, { data: clients }] = await Promise.all([
    sb.rpc('fn_calculate_mrr' as never, { period: new Date().toISOString().slice(0, 10) } as never),
    sb.from('invoices').select('id,number,status,total,subtotal,igic_amount,due_date,issue_date,client_id,clients(legal_name,commercial_name)').is('deleted_at', null).order('issue_date', { ascending: false, nullsFirst: false }),
    sb.from('subscriptions').select('id,service,amount_monthly,status,starts_on,client_id,clients(legal_name,commercial_name)').neq('status', 'cancelada'),
    sb.from('clients').select('id,legal_name,commercial_name').is('deleted_at', null).order('legal_name'),
  ])
  const clientOptions = (clients ?? []).map((c: { id: string; legal_name: string; commercial_name: string | null }) => ({
    id: c.id, name: c.commercial_name || c.legal_name,
  }))

  const mrr = Number(mrrRes.data ?? 0)
  const arr = mrr * 12
  const allInvoices = invoices ?? []
  const cobrado = allInvoices.filter(i => i.status === 'pagada').reduce((s, i) => s + Number(i.total), 0)
  const overdue = allInvoices.filter(i => i.status !== 'pagada' && i.status !== 'anulada' && isVencida(i.due_date))
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.total), 0)
  const porCobrar = allInvoices.filter(i => i.status !== 'pagada' && i.status !== 'anulada' && i.status !== 'borrador').reduce((s, i) => s + Number(i.total), 0)

  // Filtrado
  let filteredInvoices = allInvoices
  if (filter === 'pendientes') filteredInvoices = allInvoices.filter(i => i.status !== 'pagada' && i.status !== 'anulada')
  else if (filter === 'vencidas') filteredInvoices = overdue
  else if (filter === 'pagadas') filteredInvoices = allInvoices.filter(i => i.status === 'pagada')
  else if (filter === 'borradores') filteredInvoices = allInvoices.filter(i => i.status === 'borrador')

  // Próximos cobros 30 días: facturas emitidas/enviadas con vencimiento en próximos 30
  const today = new Date()
  const limit = new Date(today); limit.setDate(today.getDate() + 30)
  const upcoming = allInvoices
    .filter(i => i.status !== 'pagada' && i.status !== 'anulada' && i.status !== 'borrador' && i.due_date)
    .filter(i => {
      const d = new Date(i.due_date!)
      return d >= today && d <= limit
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  const subsActivas = (subs ?? []).filter(s => s.status === 'activa')
  const subsPausadas = (subs ?? []).filter(s => s.status === 'pausada')

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos & facturación</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">{subsActivas.length} suscripciones activas · {overdue.length} factura(s) vencida(s)</p>
        </div>
        <div className="flex gap-2">
          <NewSubscriptionButton clients={clientOptions} />
          <NewInvoiceButton clients={clientOptions} />
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="MRR activo" value={formatEuros(mrr)} accent="green" sub={`ARR ${formatEuros(arr)}`} />
        <Stat label="Por cobrar" value={formatEuros(porCobrar)} accent={porCobrar > 0 ? 'cyan' : 'slate'} sub={`${allInvoices.filter(i => i.status === 'emitida' || i.status === 'enviada').length} factura(s)`} />
        <Stat label="Vencido" value={formatEuros(overdueTotal)} accent={overdueTotal > 0 ? 'red' : 'slate'} sub={`${overdue.length} factura(s)`} />
        <Stat label="Cobrado total" value={formatEuros(cobrado)} accent="slate" sub={`${allInvoices.filter(i => i.status === 'pagada').length} pagadas`} />
      </div>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Próximos cobros · 30 días</CardTitle>
            <span className="text-[11px] font-mono text-accent-cyan">{formatEuros(upcoming.reduce((s, i) => s + Number(i.total), 0))}</span>
          </CardHeader>
          <ul className="space-y-1 text-[12px]">
            {upcoming.slice(0, 6).map(i => {
              const c = pickRel((i as unknown as { clients: { legal_name: string; commercial_name: string | null } | { legal_name: string; commercial_name: string | null }[] | null }).clients)
              const days = Math.ceil((new Date(i.due_date!).getTime() - today.getTime()) / 86400000)
              return (
                <li key={i.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-slate-600 text-[10px] w-12">{i.number ?? '—'}</span>
                    <Link href={`/clientes/${i.client_id}`} className="text-slate-300 hover:text-accent-cyan truncate">
                      {c?.commercial_name || c?.legal_name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-slate-200">{formatEuros(Number(i.total))}</span>
                    <span className={`text-[10px] font-mono w-16 text-right ${days <= 3 ? 'text-accent-amber' : 'text-slate-500'}`}>en {days}d</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suscripciones recurrentes</CardTitle>
          <span className="text-[11px] font-mono text-accent-green">{formatEuros(subsActivas.reduce((s, x) => s + Number(x.amount_monthly), 0))}/mes</span>
        </CardHeader>
        {(subs ?? []).length === 0 ? <div className="text-[11px] text-slate-600">Sin suscripciones</div> : (
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
              <tr>
                <th className="text-left py-2 font-normal">Cliente</th>
                <th className="text-left font-normal">Servicio</th>
                <th className="text-right font-normal">€/mes</th>
                <th className="text-left font-normal pl-3">Estado</th>
                <th className="text-right font-normal">Alta</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {[...subsActivas, ...subsPausadas].map(s => {
                const c = pickRel((s as unknown as { clients: { legal_name: string; commercial_name: string | null } | { legal_name: string; commercial_name: string | null }[] | null }).clients)
                return (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-bg-surface2/30">
                    <td className="py-2"><Link className="text-slate-200 hover:text-accent-cyan" href={`/clientes/${s.client_id}`}>{c?.commercial_name || c?.legal_name}</Link></td>
                    <td className="text-slate-400">{SERVICE_LABELS[s.service] ?? s.service}</td>
                    <td className="text-right font-mono text-accent-green">{formatEuros(Number(s.amount_monthly))}</td>
                    <td className="pl-3"><Badge tone={s.status === 'activa' ? 'green' : 'amber'}>{s.status}</Badge></td>
                    <td className="text-right font-mono text-slate-600">{formatFechaCorta(s.starts_on)}</td>
                    <td className="text-right pr-2"><SubscriptionMenu id={s.id} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturas</CardTitle>
          <InvoiceFilter active={filter} counts={{
            pendientes: allInvoices.filter(i => i.status !== 'pagada' && i.status !== 'anulada').length,
            vencidas: overdue.length,
            pagadas: allInvoices.filter(i => i.status === 'pagada').length,
            borradores: allInvoices.filter(i => i.status === 'borrador').length,
            todas: allInvoices.length,
          }} />
        </CardHeader>
        {filteredInvoices.length === 0 ? (
          <div className="text-[11px] text-slate-600 text-center py-6">Sin facturas en esta vista</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
              <tr>
                <th className="text-left py-2 font-normal">Número</th>
                <th className="text-left font-normal">Cliente</th>
                <th className="text-left font-normal">Estado</th>
                <th className="text-right font-normal">Subtotal</th>
                <th className="text-right font-normal">IGIC</th>
                <th className="text-right font-normal">Total</th>
                <th className="text-right font-normal">Vencimiento</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(i => {
                const c = pickRel((i as unknown as { clients: { legal_name: string; commercial_name: string | null } | { legal_name: string; commercial_name: string | null }[] | null }).clients)
                const venc = i.status !== 'pagada' && isVencida(i.due_date)
                return (
                  <tr key={i.id} className="border-b border-border/40 hover:bg-bg-surface2/30">
                    <td className="py-2 font-mono">
                      {i.number ? (
                        <Link href={`/api/invoices/${i.id}/pdf`} className="hover:text-accent-cyan" target="_blank">{i.number}</Link>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="text-slate-300"><Link href={`/clientes/${i.client_id}`} className="hover:text-accent-cyan">{c?.commercial_name || c?.legal_name}</Link></td>
                    <td><Badge tone={i.status === 'pagada' ? 'green' : venc || i.status === 'vencida' ? 'red' : i.status === 'borrador' ? 'slate' : 'cyan'}>{STATUS_LABELS.invoice[i.status]}</Badge></td>
                    <td className="text-right font-mono">{formatEuros(Number(i.subtotal))}</td>
                    <td className="text-right font-mono text-slate-500">{formatEuros(Number(i.igic_amount))}</td>
                    <td className="text-right font-mono text-slate-200">{formatEuros(Number(i.total))}</td>
                    <td className={`text-right font-mono ${venc ? 'text-accent-red' : 'text-slate-500'}`}>{formatFechaCorta(i.due_date)}</td>
                    <td className="text-right pr-2"><InvoiceMenu id={i.id} status={i.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value, accent, sub }: { label: string; value: string; accent: 'cyan' | 'green' | 'red' | 'slate'; sub?: string }) {
  const map: Record<string, string> = { cyan: 'text-accent-cyan', green: 'text-accent-green', red: 'text-accent-red', slate: 'text-slate-300' }
  return (
    <div className="rounded-lg border border-border bg-bg-surface/60 backdrop-blur-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-[20px] font-semibold ${map[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}
