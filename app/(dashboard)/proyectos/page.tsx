import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, Badge } from '@/components/ui'
import { formatFechaCorta, pickRel } from '@/lib/utils'
import { STATUS_LABELS, SERVICE_LABELS } from '@/types'
import Link from 'next/link'
import { NewProjectButton } from './project-form'

export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
  const sb = await getSupabaseServer()
  const [{ data: projects }, { data: tasks }, { data: clients }] = await Promise.all([
    sb.from('projects')
      .select('id,name,kind,status,starts_on,ends_on,client_id,clients(legal_name,commercial_name)')
      .is('deleted_at', null)
      .order('starts_on', { ascending: false }),
    sb.from('tasks').select('project_id,status').is('deleted_at', null),
    sb.from('clients').select('id,legal_name,commercial_name').is('deleted_at', null).order('legal_name'),
  ])

  const clientOptions = (clients ?? []).map((c: { id: string; legal_name: string; commercial_name: string | null }) => ({
    id: c.id, name: c.commercial_name || c.legal_name,
  }))

  const taskStats = new Map<string, { done: number; total: number }>()
  for (const t of tasks ?? []) {
    const s = taskStats.get(t.project_id) ?? { done: 0, total: 0 }
    s.total += 1
    if (t.status === 'done') s.done += 1
    taskStats.set(t.project_id, s)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
        <NewProjectButton clients={clientOptions} />
      </header>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(projects ?? []).map(p => {
          const stats = taskStats.get(p.id) ?? { done: 0, total: 0 }
          const pct = stats.total > 0 ? Math.round(stats.done / stats.total * 100) : 0
          const client = pickRel((p as unknown as { clients: { legal_name: string; commercial_name: string | null } | { legal_name: string; commercial_name: string | null }[] | null }).clients)
          return (
            <Link key={p.id} href={`/proyectos/${p.id}`}>
              <Card className="hover:border-accent-cyan/40 transition-colors h-full cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-[14px] font-medium text-slate-200">{p.name}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{client?.commercial_name || client?.legal_name}</div>
                  </div>
                  <Badge tone={p.status === 'en_curso' ? 'cyan' : p.status === 'entregado' ? 'green' : p.status === 'cancelado' ? 'red' : 'slate'}>
                    {STATUS_LABELS.project[p.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                  <span className="uppercase tracking-wider">{SERVICE_LABELS[p.kind]}</span>
                  <span className="font-mono">{formatFechaCorta(p.starts_on)} → {p.ends_on ? formatFechaCorta(p.ends_on) : '∞'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-bg-surface2 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-cyan rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{stats.done}/{stats.total}</span>
                </div>
              </Card>
            </Link>
          )
        })}
        {(projects ?? []).length === 0 && (
          <div className="col-span-full text-[12px] text-slate-600 text-center py-8">Sin proyectos. Cierra un deal para crear uno.</div>
        )}
      </div>
    </div>
  )
}
