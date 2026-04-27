import { getSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge, Card } from '@/components/ui'
import { formatEuros, formatFechaCorta } from '@/lib/utils'
import { NewClientButton } from './client-form'
import { ClientFilters } from './filters'

export const dynamic = 'force-dynamic'

type SP = Promise<{ q?: string; tipo?: string }>

export default async function ClientesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const tipo = sp.tipo ?? 'todos'
  const sb = await getSupabaseServer()

  const { data: clients } = await sb
    .from('clients')
    .select('id,legal_name,commercial_name,client_type,sector,igic,tags,created_at')
    .is('deleted_at', null)
    .order('legal_name')

  const { data: subs } = await sb
    .from('subscriptions')
    .select('client_id, amount_monthly, status')
    .eq('status', 'activa')

  const mrrByClient = new Map<string, number>()
  for (const s of subs ?? []) {
    mrrByClient.set(s.client_id, (mrrByClient.get(s.client_id) ?? 0) + Number(s.amount_monthly))
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

  // Recurrentes primero, luego por MRR descendente, luego por nombre
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
    lead: clients?.filter(c => c.client_type === 'lead').length ?? 0,
  }
  const totalMrr = (subs ?? []).reduce((s, x) => s + Number(x.amount_monthly), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {counts.todos} cuentas · {counts.recurrente} recurrente(s) · MRR total <span className="font-mono text-accent-green">{formatEuros(totalMrr)}</span>
          </p>
        </div>
        <NewClientButton />
      </header>

      <ClientFilters active={tipo} q={q} counts={counts} />

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-[12px] text-slate-600 text-center py-10">
            {q || tipo !== 'todos' ? 'Sin resultados con esos filtros' : 'Sin clientes. Empieza creando uno arriba.'}
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-bg-surface2/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-normal">Cliente</th>
                <th className="text-left font-normal">Tipo</th>
                <th className="text-left font-normal">Sector</th>
                <th className="text-right font-normal">MRR</th>
                <th className="text-left font-normal pl-3">IGIC</th>
                <th className="text-right px-4 font-normal">Alta</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
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
                    <td className="text-right font-mono text-accent-green">{mrr > 0 ? formatEuros(mrr) : <span className="text-slate-700">—</span>}</td>
                    <td className="pl-3"><span className="text-[11px]">{c.igic ? '7%' : '—'}</span></td>
                    <td className="text-right px-4 font-mono text-slate-600">{formatFechaCorta(c.created_at)}</td>
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
