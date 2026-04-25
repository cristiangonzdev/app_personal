import { getSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge, Card } from '@/components/ui'
import { formatEuros, formatFechaCorta } from '@/lib/utils'
import { NewClientButton } from './client-form'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const sb = await getSupabaseServer()
  const { data: clients } = await sb
    .from('clients')
    .select('id,legal_name,commercial_name,client_type,sector,igic,tags,created_at')
    .is('deleted_at', null)
    .order('legal_name')

  // Calcular MRR por cliente desde subscriptions
  const { data: subs } = await sb
    .from('subscriptions')
    .select('client_id, amount_monthly, status')
    .eq('status', 'activa')

  const mrrByClient = new Map<string, number>()
  for (const s of subs ?? []) {
    mrrByClient.set(s.client_id, (mrrByClient.get(s.client_id) ?? 0) + Number(s.amount_monthly))
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">{clients?.length ?? 0} cuentas</p>
        </div>
        <NewClientButton />
      </header>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-bg-surface2/30">
            <tr>
              <th className="text-left px-4 py-2.5 font-normal">Cliente</th>
              <th className="text-left font-normal">Tipo</th>
              <th className="text-left font-normal">Sector</th>
              <th className="text-right font-normal">MRR</th>
              <th className="text-left font-normal">IGIC</th>
              <th className="text-right px-4 font-normal">Alta</th>
            </tr>
          </thead>
          <tbody>
            {clients?.map(c => {
              const mrr = mrrByClient.get(c.id) ?? 0
              return (
                <tr key={c.id} className="border-t border-border/50 hover:bg-bg-surface2/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/clientes/${c.id}`} className="text-slate-200 hover:text-accent-cyan">
                      {c.commercial_name || c.legal_name}
                    </Link>
                    {c.commercial_name && (
                      <div className="text-[10px] text-slate-600 mt-0.5">{c.legal_name}</div>
                    )}
                  </td>
                  <td>
                    <Badge tone={c.client_type === 'recurrente' ? 'green' : c.client_type === 'one_shot' ? 'cyan' : 'slate'}>
                      {c.client_type === 'recurrente' ? 'Recurrente' : c.client_type === 'one_shot' ? 'One-shot' : 'Lead'}
                    </Badge>
                  </td>
                  <td className="text-slate-400 capitalize">{c.sector ?? '—'}</td>
                  <td className="text-right font-mono text-accent-green">{mrr > 0 ? formatEuros(mrr) : '—'}</td>
                  <td><span className="text-[11px]">{c.igic ? '7%' : '—'}</span></td>
                  <td className="text-right px-4 font-mono text-slate-600">{formatFechaCorta(c.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
