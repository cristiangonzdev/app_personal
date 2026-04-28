import { getSupabaseServer } from '@/lib/supabase/server'
import { Badge } from '@/components/ui'
import { formatFechaCorta } from '@/lib/utils'
import { Megaphone, Hash, Lightbulb, CalendarDays } from 'lucide-react'
import { NewContentButton, NewCampaignButton, NewHookInline, HookDeleteButton, ContentRowMenu } from './forms'

export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'slate' | 'cyan' | 'amber' | 'green' | 'violet'> = {
  idea: 'slate', guion: 'cyan', grabado: 'violet', editado: 'amber', publicado: 'green',
}

const STATUS_LABEL: Record<string, string> = {
  idea: 'Idea', guion: 'Guión', grabado: 'Grabado', editado: 'Editado', publicado: 'Publicado',
}

const PLATFORM_DOT: Record<string, string> = {
  instagram: 'bg-pink-500', linkedin: 'bg-sky-500', tiktok: 'bg-fuchsia-500',
  youtube: 'bg-red-500', blog: 'bg-amber-500', email: 'bg-slate-400',
}

export default async function MarketingPage() {
  const sb = await getSupabaseServer()
  const [{ data: contents }, { data: campaigns }, { data: hooks }] = await Promise.all([
    sb.from('contents').select('id,title,kind,platform,account_handle,status,scheduled_at,pillar,needs_editor,campaign_id')
      .order('scheduled_at', { ascending: false, nullsFirst: false }),
    sb.from('campaigns').select('id,name,goal,budget,starts_on'),
    sb.from('hooks_bank').select('id,phrase,angle,cta,tags').limit(12),
  ])

  const all = contents ?? []
  const idea = all.filter(c => c.status === 'idea').length
  const enProduccion = all.filter(c => c.status === 'guion' || c.status === 'grabado' || c.status === 'editado').length
  const publicados = all.filter(c => c.status === 'publicado').length

  // Agrupar por estado para Kanban-lite
  const groups: { key: string; label: string; tone: 'slate' | 'cyan' | 'violet' | 'amber' | 'green' }[] = [
    { key: 'idea', label: 'Ideas', tone: 'slate' },
    { key: 'guion', label: 'Guión', tone: 'cyan' },
    { key: 'grabado', label: 'Grabado', tone: 'violet' },
    { key: 'editado', label: 'Editado', tone: 'amber' },
    { key: 'publicado', label: 'Publicado', tone: 'green' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Megaphone size={22} className="text-accent-violet" />Marketing
          </h1>
          <p className="text-[12px] text-slate-500 mt-1">{all.length} piezas · {enProduccion} en producción · {publicados} publicadas</p>
        </div>
        <NewContentButton campaigns={(campaigns ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))} />
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ideas" value={String(idea)} accent="slate" />
        <Stat label="En producción" value={String(enProduccion)} accent="cyan" />
        <Stat label="Publicados" value={String(publicados)} accent="green" />
        <Stat label="Campañas" value={String((campaigns ?? []).length)} accent="violet" />
      </div>

      {/* Pipeline de contenido */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-slate-200 flex items-center gap-2">
            <CalendarDays size={13} className="text-accent-cyan" />Pipeline editorial
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          {groups.map(g => {
            const items = all.filter(c => c.status === g.key).slice(0, 8)
            return (
              <div key={g.key} className="rounded-lg border border-border/60 bg-bg-surface/30 backdrop-blur-md min-h-[160px]">
                <div className={`px-3 py-2 border-b border-border/40 flex items-center justify-between`}>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">{g.label}</span>
                  <span className="text-[10px] font-mono text-slate-600">{items.length}</span>
                </div>
                <div className="p-1.5 space-y-1.5">
                  {items.length === 0 ? (
                    <div className="text-[11px] text-slate-700 text-center py-4">—</div>
                  ) : items.map(c => (
                    <div key={c.id} className="rounded-md p-2 bg-bg-surface/60 hover:bg-bg-surface border border-border/30 group">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-[11px] text-slate-200 leading-snug flex-1">{c.title}</span>
                        <ContentRowMenu id={c.id} status={c.status} />
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[c.platform] ?? 'bg-slate-500'}`} />
                        <span className="text-[9px] text-slate-500 capitalize">{c.platform}</span>
                        {c.needs_editor && <span className="text-[9px] text-accent-amber font-medium">EDITOR</span>}
                      </div>
                      {c.scheduled_at && (
                        <div className="text-[9px] text-slate-600 font-mono mt-1">{formatFechaCorta(c.scheduled_at)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Campañas + Hooks */}
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-accent-cyan" />
              <h2 className="text-[13px] font-medium text-slate-200">Campañas</h2>
            </div>
            <NewCampaignButton />
          </header>
          {(campaigns ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-[12px] text-slate-500">Sin campañas activas.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {(campaigns ?? []).map(c => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-[13px] text-slate-200">{c.name}</div>
                    {c.goal && <div className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">{c.goal}</div>}
                  </div>
                  {c.budget != null && (
                    <span className="text-[12px] font-mono text-slate-500">{Number(c.budget).toLocaleString('es-ES')}€</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-accent-amber" />
              <h2 className="text-[13px] font-medium text-slate-200">Banco de hooks</h2>
            </div>
            <NewHookInline />
          </header>
          {(hooks ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-[12px] text-slate-500">Empieza añadiendo frases que enganchen.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {(hooks ?? []).map(h => (
                <li key={h.id} className="group flex items-start justify-between gap-2 px-5 py-3 hover:bg-bg-surface2/20">
                  <div className="min-w-0">
                    <div className="text-[12px] text-slate-200 italic leading-snug">&ldquo;{h.phrase}&rdquo;</div>
                    {h.angle && <div className="text-[9px] text-slate-600 mt-1 uppercase tracking-wider">{h.angle}</div>}
                  </div>
                  <HookDeleteButton id={h.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Listado completo */}
      {all.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md overflow-hidden">
          <header className="px-5 py-3.5 border-b border-border/40">
            <h2 className="text-[13px] font-medium text-slate-200">Todo el contenido</h2>
          </header>
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border/40 bg-bg-surface2/20">
              <tr>
                <th className="text-left py-2.5 px-5 font-normal">Pieza</th>
                <th className="text-left font-normal">Plataforma</th>
                <th className="text-left font-normal">Estado</th>
                <th className="text-right font-normal pr-5">Programado</th>
              </tr>
            </thead>
            <tbody>
              {all.map(c => (
                <tr key={c.id} className="border-b border-border/30 hover:bg-bg-surface2/20">
                  <td className="py-2.5 px-5">
                    <div className="text-slate-200">{c.title}</div>
                    {c.account_handle && <div className="text-[10px] text-slate-600 font-mono">{c.account_handle}</div>}
                  </td>
                  <td className="text-slate-400 capitalize">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[c.platform] ?? 'bg-slate-500'}`} />
                      {c.platform} · {c.kind}
                    </span>
                  </td>
                  <td>
                    <Badge tone={STATUS_TONE[c.status] ?? 'slate'}>{STATUS_LABEL[c.status] ?? c.status}</Badge>
                    {c.needs_editor && <Badge tone="amber" className="ml-1">EDITOR</Badge>}
                  </td>
                  <td className="text-right font-mono text-slate-500 pr-5">{formatFechaCorta(c.scheduled_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: 'cyan' | 'green' | 'violet' | 'slate' }) {
  const map = { cyan: 'text-accent-cyan', green: 'text-accent-green', violet: 'text-accent-violet', slate: 'text-slate-300' }
  return (
    <div className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1.5 font-mono text-[22px] font-semibold ${map[accent]}`}>{value}</div>
    </div>
  )
}
