import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatFechaCorta, isVencida, pickRel } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateTaskStatus } from './actions'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await getSupabaseServer()
  const [{ data: project }, { data: tasks }, { data: milestones }] = await Promise.all([
    sb.from('projects').select('*,clients(legal_name,commercial_name)').eq('id', id).is('deleted_at', null).single(),
    sb.from('tasks').select('*').eq('project_id', id).is('deleted_at', null).order('due_on', { nullsFirst: false }),
    sb.from('milestones').select('*').eq('project_id', id).order('due_on'),
  ])

  if (!project) notFound()
  const client = pickRel((project as unknown as { clients: { legal_name: string; commercial_name: string | null } | { legal_name: string; commercial_name: string | null }[] | null }).clients)

  return (
    <div className="space-y-5 animate-fade-in">
      <header>
        <Link href="/proyectos" className="text-[11px] text-slate-500 hover:text-accent-cyan">← Proyectos</Link>
        <h1 className="text-2xl font-semibold mt-1">{project.name}</h1>
        <div className="text-[12px] text-slate-500 mt-1">{client?.commercial_name || client?.legal_name}</div>
      </header>

      <Card>
        <CardHeader><CardTitle>Tareas</CardTitle></CardHeader>
        <ul className="space-y-1.5">
          {(tasks ?? []).map(t => {
            const venc = t.status !== 'done' && isVencida(t.due_on)
            return (
              <li key={t.id} className="flex items-center gap-2.5 text-[12px] py-1.5 px-2 rounded hover:bg-bg-surface2/40">
                <form action={updateTaskStatus.bind(null, t.id, t.status === 'done' ? 'todo' : 'done')}>
                  <button type="submit" className={`w-4 h-4 rounded border ${t.status === 'done' ? 'bg-accent-green/20 border-accent-green' : 'border-border-hi hover:border-accent-cyan'} flex items-center justify-center`}>
                    {t.status === 'done' && <span className="text-accent-green text-[10px]">✓</span>}
                  </button>
                </form>
                <span className={`flex-1 ${t.status === 'done' ? 'line-through text-slate-600' : 'text-slate-200'}`}>{t.title}</span>
                <Badge tone={t.status === 'done' ? 'green' : t.status === 'doing' ? 'cyan' : t.status === 'blocked' ? 'red' : 'slate'}>
                  {STATUS_LABELS.task[t.status]}
                </Badge>
                {t.due_on && (
                  <span className={`text-[10px] font-mono ${venc ? 'text-accent-red' : 'text-slate-500'} w-14 text-right`}>
                    {formatFechaCorta(t.due_on)}
                  </span>
                )}
              </li>
            )
          })}
          {(tasks ?? []).length === 0 && <li className="text-[11px] text-slate-600 text-center py-4">Sin tareas</li>}
        </ul>
      </Card>

      {(milestones ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Hitos & pagos</CardTitle></CardHeader>
          <ul className="space-y-2 text-[12px]">
            {milestones!.map(m => (
              <li key={m.id} className="flex items-center justify-between">
                <span className={m.reached_at ? 'text-accent-green' : 'text-slate-300'}>{m.name}</span>
                <span className="text-[10px] font-mono text-slate-600">
                  {m.payment_pct ? `${m.payment_pct}% · ` : ''}{formatFechaCorta(m.due_on)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
