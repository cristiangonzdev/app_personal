import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle } from '@/components/ui'
import { formatEuros } from '@/lib/utils'
import { DEAL_STAGES, SERVICE_LABELS, type ServiceKind } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const sb = await getSupabaseServer()
  const [{ data: deals }, { data: invoices }, { data: subs }, mrrRes] = await Promise.all([
    sb.from('deals').select('stage,setup_amount,recurring_amount,services,probability').is('deleted_at', null),
    sb.from('invoices').select('total,status,issue_date,client_id').is('deleted_at', null),
    sb.from('subscriptions').select('amount_monthly,service,status,client_id').eq('status', 'activa'),
    sb.rpc('fn_calculate_mrr' as never, { period: new Date().toISOString().slice(0, 10) } as never),
  ])

  const mrr = Number(mrrRes.data ?? 0)
  const stages = DEAL_STAGES.map(s => ({
    ...s,
    count: (deals ?? []).filter(d => d.stage === s.key).length,
    total: (deals ?? []).filter(d => d.stage === s.key).reduce((acc, d) => acc + Number(d.setup_amount) + Number(d.recurring_amount) * 12, 0),
  }))

  const byService: Record<string, number> = {}
  for (const s of subs ?? []) {
    byService[s.service] = (byService[s.service] ?? 0) + Number(s.amount_monthly)
  }

  // Top 5 clientes por revenue (suma de facturas pagadas)
  const revByClient = new Map<string, number>()
  for (const i of invoices ?? []) {
    if (i.status === 'pagada') revByClient.set(i.client_id, (revByClient.get(i.client_id) ?? 0) + Number(i.total))
  }
  const topClientIds = [...revByClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const { data: topClients } = topClientIds.length
    ? await sb.from('clients').select('id,legal_name,commercial_name').in('id', topClientIds.map(([id]) => id))
    : { data: [] as { id: string; legal_name: string; commercial_name: string | null }[] }

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="MRR" value={formatEuros(mrr)} />
        <Stat label="ARR" value={formatEuros(mrr * 12)} />
        <Stat label="Cobrado total" value={formatEuros((invoices ?? []).filter(i => i.status === 'pagada').reduce((s, i) => s + Number(i.total), 0))} />
        <Stat label="Deals abiertos" value={String((deals ?? []).filter(d => d.stage !== 'ganado' && d.stage !== 'perdido').length)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Funnel de ventas</CardTitle></CardHeader>
          <div className="space-y-2">
            {stages.map(s => {
              const max = Math.max(...stages.map(x => x.count), 1)
              const pct = (s.count / max) * 100
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 uppercase tracking-wider">{s.label}</span>
                    <span className="font-mono text-slate-500">{s.count} · {formatEuros(s.total)}</span>
                  </div>
                  <div className="h-2 bg-bg-surface2/40 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-accent-cyan/70 ${s.tone}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>MRR por servicio</CardTitle></CardHeader>
          <div className="space-y-3">
            {Object.entries(byService).sort((a, b) => b[1] - a[1]).map(([svc, amt]) => {
              const total = Object.values(byService).reduce((a, b) => a + b, 0) || 1
              const pct = (amt / total) * 100
              return (
                <div key={svc}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-300">{SERVICE_LABELS[svc as ServiceKind] ?? svc}</span>
                    <span className="font-mono text-accent-green">{formatEuros(amt)}</span>
                  </div>
                  <div className="h-1.5 bg-bg-surface2/40 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-green rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(byService).length === 0 && <div className="text-[11px] text-slate-600">Sin suscripciones activas</div>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top 5 clientes por revenue</CardTitle></CardHeader>
        <ol className="space-y-1.5 text-[12px]">
          {topClientIds.map(([cid, total], i) => {
            const c = (topClients ?? []).find(x => x.id === cid)
            return (
              <li key={cid} className="flex justify-between">
                <span><span className="text-slate-600 font-mono mr-2">{i + 1}.</span>{c?.commercial_name || c?.legal_name || '—'}</span>
                <span className="font-mono text-accent-green">{formatEuros(total)}</span>
              </li>
            )
          })}
          {topClientIds.length === 0 && <li className="text-[11px] text-slate-600">Sin datos</li>}
        </ol>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface/60 p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-[20px] font-semibold text-slate-200">{value}</div>
    </div>
  )
}
