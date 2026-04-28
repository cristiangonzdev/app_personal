import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta } from '@/lib/utils'
import { SERVICE_LABELS, type ServiceKind } from '@/types'
import { Sparkles, Flame, Mail, Phone, Globe, Linkedin, Send } from 'lucide-react'
import { NewLeadButton, EditLeadButton } from './lead-form'
import { LeadStageControls } from './lead-controls'
import { FilterTabs } from './filters'

export const dynamic = 'force-dynamic'

const STAGE_META: Record<string, { label: string; tone: 'slate' | 'cyan' | 'violet' | 'amber'; dot: string }> = {
  lead:        { label: 'Lead nuevo',     tone: 'slate',  dot: 'bg-slate-400' },
  cualificado: { label: 'Cualificado',    tone: 'cyan',   dot: 'bg-accent-cyan' },
  propuesta:   { label: 'Propuesta',      tone: 'violet', dot: 'bg-accent-violet' },
  negociacion: { label: 'Negociación',    tone: 'amber',  dot: 'bg-accent-amber' },
}

const SOURCE_ICON: Record<string, React.ElementType> = {
  inbound_web: Globe, linkedin: Linkedin, referido: Send, cold_outreach: Mail, otro: Mail,
}

type SP = Promise<{ stage?: string; service?: string }>

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const stageFilter = sp.stage ?? 'todos'
  const serviceFilter = sp.service ?? 'todos'

  const sb = await getSupabaseServer()
  const { data: deals } = await sb
    .from('deals')
    .select('id,title,stage,services,setup_amount,recurring_amount,probability,score,source,expected_close,last_activity_at,notes')
    .is('deleted_at', null)
    .neq('stage', 'ganado')
    .neq('stage', 'perdido')
    .order('last_activity_at', { ascending: false })

  const all = deals ?? []
  let filtered = all
  if (stageFilter !== 'todos') filtered = filtered.filter(d => d.stage === stageFilter)
  if (serviceFilter !== 'todos') filtered = filtered.filter(d => (d.services ?? []).includes(serviceFilter as ServiceKind))

  const counts = {
    todos: all.length,
    lead: all.filter(d => d.stage === 'lead').length,
    cualificado: all.filter(d => d.stage === 'cualificado').length,
    propuesta: all.filter(d => d.stage === 'propuesta').length,
    negociacion: all.filter(d => d.stage === 'negociacion').length,
  }

  const totalSetup = filtered.reduce((s, d) => s + Number(d.setup_amount), 0)
  const totalMRR = filtered.reduce((s, d) => s + Number(d.recurring_amount), 0)
  const weighted = filtered.reduce((s, d) => s + (Number(d.setup_amount) + Number(d.recurring_amount) * 12) * d.probability / 100, 0)

  const hot = filtered.filter(d => (d.score ?? 0) >= 70 || d.stage === 'negociacion').slice(0, 3)

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles size={22} className="text-accent-cyan" />Leads
          </h1>
          <p className="text-[12px] text-slate-500 mt-1">{all.length} en pipeline · pipeline ponderado <span className="font-mono text-accent-cyan">{formatEuros(weighted)}</span></p>
        </div>
        <NewLeadButton />
      </header>

      {/* Métricas pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Setup potencial" value={formatEuros(totalSetup)} sub={`${filtered.length} lead(s)`} accent="cyan" />
        <Stat label="MRR potencial" value={formatEuros(totalMRR)} sub={`${formatEuros(totalMRR * 12)} ARR`} accent="green" />
        <Stat label="Ponderado" value={formatEuros(weighted)} sub="setup + 12m MRR · prob." accent="violet" />
        <Stat label="Calientes" value={String(hot.length)} sub="score 70+ o en negociación" accent="amber" />
      </div>

      {/* Filtros etapa */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs param="stage" active={stageFilter} options={[
          { key: 'todos', label: 'Todos', count: counts.todos },
          { key: 'lead', label: 'Nuevos', count: counts.lead },
          { key: 'cualificado', label: 'Cualificados', count: counts.cualificado },
          { key: 'propuesta', label: 'Propuesta', count: counts.propuesta },
          { key: 'negociacion', label: 'Negociación', count: counts.negociacion },
        ]} />
        <span className="w-px h-5 bg-border/60 mx-1" />
        <FilterTabs param="service" active={serviceFilter} options={[
          { key: 'todos', label: 'Todos servicios', count: all.length },
          { key: 'software_custom', label: 'Software', count: all.filter(d => d.services?.includes('software_custom')).length },
          { key: 'web', label: 'Web', count: all.filter(d => d.services?.includes('web')).length },
          { key: 'chatbot', label: 'Chatbot', count: all.filter(d => d.services?.includes('chatbot')).length },
          { key: 'social_media_management', label: 'RRSS', count: all.filter(d => d.services?.includes('social_media_management')).length },
        ]} />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <Sparkles size={32} className="mx-auto text-slate-700 mb-3" />
            <div className="text-[14px] text-slate-400">{all.length === 0 ? 'Sin leads. Empieza creando uno.' : 'Sin leads con esos filtros.'}</div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(d => {
            const stage = STAGE_META[d.stage] ?? STAGE_META.lead!
            const Icon = SOURCE_ICON[d.source as string] ?? Globe
            const value = Number(d.setup_amount) + Number(d.recurring_amount) * 12
            const isHot = (d.score ?? 0) >= 70 || d.stage === 'negociacion'
            return (
              <div key={d.id} className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md p-4 hover:border-accent-cyan/30 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                      <h3 className="text-[15px] font-medium text-slate-100 truncate">{d.title}</h3>
                      {isHot && <Flame size={12} className="text-accent-amber" />}
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge tone={stage.tone}>{stage.label}</Badge>
                      <span className="text-[10px] text-slate-600 inline-flex items-center gap-1">
                        <Icon size={10} />
                        {d.source}
                      </span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span className="text-[10px] font-mono text-slate-500">{d.probability}% prob</span>
                      {d.score != null && (
                        <>
                          <span className="text-[10px] text-slate-600">·</span>
                          <span className={`text-[10px] font-mono ${(d.score ?? 0) >= 70 ? 'text-accent-amber' : 'text-slate-500'}`}>score {d.score}</span>
                        </>
                      )}
                      {d.expected_close && (
                        <>
                          <span className="text-[10px] text-slate-600">·</span>
                          <span className="text-[10px] font-mono text-slate-500">cierra {formatFechaCorta(d.expected_close)}</span>
                        </>
                      )}
                    </div>

                    {(d.services as ServiceKind[] | null)?.length ? (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {(d.services as ServiceKind[]).map((s: ServiceKind) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-bg-surface2/60 text-slate-300 border border-border/40">
                            {SERVICE_LABELS[s]}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {d.notes && <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{d.notes}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[18px] font-mono font-semibold text-accent-green leading-none">{formatEuros(value)}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                        {Number(d.setup_amount) > 0 && `${formatEuros(Number(d.setup_amount))} setup`}
                        {Number(d.recurring_amount) > 0 && ` · ${formatEuros(Number(d.recurring_amount))}/mes`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <EditLeadButton lead={d} />
                      <LeadStageControls id={d.id} stage={d.stage} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: 'cyan' | 'green' | 'violet' | 'amber' }) {
  const map: Record<string, string> = {
    cyan: 'text-accent-cyan',
    green: 'text-accent-green',
    violet: 'text-accent-violet',
    amber: 'text-accent-amber',
  }
  return (
    <div className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1.5 font-mono text-[22px] font-semibold ${map[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

