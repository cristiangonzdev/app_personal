import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta, isVencida, pickRel } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PagosPage() {
  const sb = await getSupabaseServer()

  const [mrrRes, { data: invoices }, { data: subs }] = await Promise.all([
    sb.rpc('fn_calculate_mrr' as never, { period: new Date().toISOString().slice(0, 10) } as never),
    sb.from('invoices').select('id,number,status,total,subtotal,igic_amount,due_date,issue_date,client_id,clients(legal_name,commercial_name)').is('deleted_at', null).order('issue_date', { ascending: false, nullsFirst: false }),
    sb.from('subscriptions').select('id,service,amount_monthly,status,starts_on,client_id,clients(legal_name,commercial_name)').eq('status', 'activa'),
  ])

  const mrr = Number(mrrRes.data ?? 0)
  const arr = mrr * 12
  const cobrado = (invoices ?? []).filter(i => i.status === 'pagada').reduce((s, i) => s + Number(i.total), 0)
  const vencido = (invoices ?? []).filter(i => i.status === 'vencida' || (i.status !== 'pagada' && isVencida(i.due_date))).reduce((s, i) => s + Number(i.total), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">Pagos & facturación</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="MRR activo" value={formatEuros(mrr)} accent="green" />
        <Stat label="ARR proyectado" value={formatEuros(arr)} accent="cyan" />
        <Stat label="Cobrado total" value={formatEuros(cobrado)} accent="slate" />
        <Stat label="Vencido" value={formatEuros(vencido)} accent={vencido > 0 ? 'red' : 'slate'} />
      </div>

      <Card>
        <CardHeader><CardTitle>Suscripciones activas</CardTitle></CardHeader>
        {(subs ?? []).length === 0 ? <div className="text-[11px] text-slate-600">Sin suscripciones</div> : (
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
              <tr>
                <th className="text-left py-2 font-normal">Cliente</th>
                <th className="text-left font-normal">Servicio</th>
                <th className="text-right font-normal">€/mes</th>
                <th className="text-right font-normal">Alta</th>
              </tr>
            </thead>
            <tbody>
              {subs!.map(s => {
                const c = pickRel((s as unknown as { clients: { legal_name: string; commercial_name: string | null } | { legal_name: string; commercial_name: string | null }[] | null }).clients)
                return (
                  <tr key={s.id} className="border-b border-border/40">
                    <td className="py-2"><Link className="text-slate-200 hover:text-accent-cyan" href={`/clientes/${s.client_id}`}>{c?.commercial_name || c?.legal_name}</Link></td>
                    <td className="text-slate-400">{s.service}</td>
                    <td className="text-right font-mono text-accent-green">{formatEuros(Number(s.amount_monthly))}</td>
                    <td className="text-right font-mono text-slate-600">{formatFechaCorta(s.starts_on)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Facturas</CardTitle></CardHeader>
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
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map(i => {
              const c = pickRel((i as unknown as { clients: { legal_name: string; commercial_name: string | null } | { legal_name: string; commercial_name: string | null }[] | null }).clients)
              const venc = i.status !== 'pagada' && isVencida(i.due_date)
              return (
                <tr key={i.id} className="border-b border-border/40 hover:bg-bg-surface2/30">
                  <td className="py-2 font-mono">
                    <Link href={`/api/invoices/${i.id}/pdf`} className="hover:text-accent-cyan" target="_blank">{i.number ?? '—'}</Link>
                  </td>
                  <td className="text-slate-300">{c?.commercial_name || c?.legal_name}</td>
                  <td><Badge tone={i.status === 'pagada' ? 'green' : venc || i.status === 'vencida' ? 'red' : 'cyan'}>{STATUS_LABELS.invoice[i.status]}</Badge></td>
                  <td className="text-right font-mono">{formatEuros(Number(i.subtotal))}</td>
                  <td className="text-right font-mono text-slate-500">{formatEuros(Number(i.igic_amount))}</td>
                  <td className="text-right font-mono text-slate-200">{formatEuros(Number(i.total))}</td>
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

function Stat({ label, value, accent }: { label: string; value: string; accent: 'cyan' | 'green' | 'red' | 'slate' }) {
  const map: Record<string, string> = { cyan: 'text-accent-cyan', green: 'text-accent-green', red: 'text-accent-red', slate: 'text-slate-300' }
  return (
    <div className="rounded-lg border border-border bg-bg-surface/60 backdrop-blur-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-[20px] font-semibold ${map[accent]}`}>{value}</div>
    </div>
  )
}
