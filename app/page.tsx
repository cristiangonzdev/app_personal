'use client'

import { useMetricasOverview, useLeads, useTareas, useTransacciones } from '@/hooks/useQueries'
import {
  Card, CardTitle, MetricCard, PageHeader, LoadingSpinner, EmptyState, ErrorState
} from '@/components/ui'
import { formatEuros, formatFechaCorta, isTareaVencida, CATEGORIA_PERSONAL_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CRM_PIPELINE } from '@/types'
import type { Lead, CategoriaPersonal } from '@/types'
import Link from 'next/link'
import { ArrowRight, AlertCircle, Plus, Users, CheckSquare, TrendingUp } from 'lucide-react'

export default function OverviewPage() {
  const { data: metricas, loading: loadingMetricas, error: errorMetricas } = useMetricasOverview()
  const { data: leads, loading: loadingLeads } = useLeads()
  const { data: tareas, loading: loadingTareas } = useTareas()
  const { data: transacciones, loading: loadingTrans } = useTransacciones('personal')

  // Pipeline simplificado (4 columnas, sin cerrados en overview)
  const pipelineCols = CRM_PIPELINE.slice(0, 3) // visita, contactado, caliente
  const kanban = pipelineCols.map((col) => ({
    ...col,
    leads: (leads ?? []).filter((l) => col.dbStates.includes(l.estado)),
  }))

  const gastosPorCategoria = (transacciones ?? [])
    .filter((t) => t.tipo === 'gasto')
    .reduce((acc, t) => { const cat = t.categoria_personal ?? 'otro'; acc[cat] = (acc[cat] ?? 0) + Number(t.importe); return acc }, {} as Record<string, number>)
  const totalGastos = Object.values(gastosPorCategoria).reduce((a, b) => a + b, 0)
  const ingresosMes = (transacciones ?? []).filter((t) => t.tipo === 'ingreso').reduce((a, t) => a + Number(t.importe), 0)

  // Separar tareas
  const tareasPersonales = (tareas ?? []).filter((t) => !t.lead_id)
  const tareasLogika = (tareas ?? []).filter((t) => !!t.lead_id)

  if (errorMetricas) return <ErrorState message={errorMetricas} />

  return (
    <div className="animate-in">
      <PageHeader
        title="Overview"
        subtitle="Resumen de Logika Digital y vida personal"
      />

      {/* ── Quick Actions ── */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        <Link href="/crm" className="btn-glow btn-shimmer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#00d9ff]/5 border border-[#00d9ff]/15 text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-all flex-shrink-0">
          <Users size={12} /> CRM
        </Link>
        <Link href="/tareas" className="btn-glow btn-shimmer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#8b5cf6]/5 border border-[#8b5cf6]/15 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition-all flex-shrink-0">
          <CheckSquare size={12} /> Tareas
        </Link>
        <Link href="/finanzas" className="btn-glow btn-shimmer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#00ff88]/5 border border-[#00ff88]/15 text-[#00ff88] hover:bg-[#00ff88]/10 transition-all flex-shrink-0">
          <TrendingUp size={12} /> Finanzas
        </Link>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {loadingMetricas ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-5 h-24 animate-pulse" />
          ))
        ) : (
          <>
            <MetricCard label="Leads activos" value={metricas?.leads_activos ?? 0} sub="en pipeline" accent="#00d9ff" />
            <MetricCard label="Visitas pend." value={metricas?.visitas_pendientes ?? 0} sub="por hacer" subColor="amber" accent="#f59e0b" />
            <MetricCard label="MRR Logika" value={formatEuros(metricas?.mrr_logika ?? 0)} sub="recurrente" subColor="green" accent="#00ff88" />
            <MetricCard label="Tareas hoy" value={metricas?.tareas_hoy ?? 0}
              sub={metricas?.tareas_vencidas ? `${metricas.tareas_vencidas} vencida${metricas.tareas_vencidas > 1 ? 's' : ''}` : 'al día'}
              subColor={metricas?.tareas_vencidas ? 'red' : 'green'} accent="#8b5cf6" />
          </>
        )}
      </div>

      {/* ── Pipeline (3 cols, sin cerrados) ── */}
      <Card className="mb-4">
        <CardTitle action={<Link href="/crm" className="btn-shimmer flex items-center gap-1 hover:text-white transition-colors px-2 py-0.5 rounded">Ver todo <ArrowRight size={11} /></Link>}>
          Pipeline CRM
        </CardTitle>
        <div className="flex md:grid md:grid-cols-3 gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory md:snap-none">
          {kanban.map((col) => (
            <div key={col.key} className="kanban-col bg-[rgba(26,34,53,0.4)] rounded-lg p-3 min-w-[140px] md:min-w-0 snap-start">
              <div className="flex items-center gap-1.5 mb-2.5">
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', col.dot)} />
                <span className="text-[10px] uppercase tracking-wider text-slate-500 truncate">{col.label}</span>
                <span className="ml-auto text-[10px] font-mono text-slate-600">{col.leads.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {loadingLeads ? (
                  <div className="h-10 bg-[rgba(17,24,39,0.5)] rounded animate-pulse" />
                ) : col.leads.length === 0 ? (
                  <div className="text-[10px] text-slate-700 py-2 text-center">—</div>
                ) : (
                  col.leads.slice(0, 3).map((lead) => (
                    <MiniCard key={lead.id} lead={lead} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Tareas (Personal + Logika side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardTitle action={<Link href="/tareas" className="btn-shimmer flex items-center gap-1 hover:text-white transition-colors px-2 py-0.5 rounded">Ver <ArrowRight size={11} /></Link>}>
            Tareas personales
          </CardTitle>
          {loadingTareas ? <LoadingSpinner /> : tareasPersonales.length === 0 ? (
            <EmptyState message="Todo al día" />
          ) : (
            <div className="flex flex-col gap-1.5 stagger">
              {tareasPersonales.slice(0, 4).map((t) => <MiniTarea key={t.id} tarea={t} />)}
            </div>
          )}
        </Card>
        <Card accent="#00d9ff">
          <CardTitle action={<Link href="/tareas" className="btn-shimmer flex items-center gap-1 hover:text-white transition-colors px-2 py-0.5 rounded">Ver <ArrowRight size={11} /></Link>}>
            Tareas Logika
          </CardTitle>
          {loadingTareas ? <LoadingSpinner /> : tareasLogika.length === 0 ? (
            <EmptyState message="Sin tareas de Logika" />
          ) : (
            <div className="flex flex-col gap-1.5 stagger">
              {tareasLogika.slice(0, 4).map((t) => <MiniTarea key={t.id} tarea={t} />)}
            </div>
          )}
        </Card>
      </div>

      {/* ── Finanzas personales ── */}
      <Card>
        <CardTitle action={<Link href="/finanzas" className="btn-shimmer flex items-center gap-1 hover:text-white transition-colors px-2 py-0.5 rounded">Ver todo <ArrowRight size={11} /></Link>}>
          Finanzas — {new Date().toLocaleDateString('es-ES', { month: 'long' })}
        </CardTitle>
        <div className="flex gap-4 mb-4">
          <div>
            <div className="text-[10px] text-slate-600 mb-0.5">Ingresos</div>
            <div className="font-mono text-[14px] md:text-[16px] font-bold text-[#00ff88] animate-count">{formatEuros(ingresosMes)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-600 mb-0.5">Gastos</div>
            <div className="font-mono text-[14px] md:text-[16px] font-bold text-red-400 animate-count">{formatEuros(totalGastos)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-600 mb-0.5">Balance</div>
            <div className={cn('font-mono text-[14px] md:text-[16px] font-bold animate-count', ingresosMes - totalGastos >= 0 ? 'text-[#00d9ff]' : 'text-red-400')}>
              {formatEuros(ingresosMes - totalGastos)}
            </div>
          </div>
        </div>
        {loadingTrans ? <LoadingSpinner /> : (
          <div className="flex flex-col gap-2 stagger">
            {Object.entries(gastosPorCategoria).sort(([, a], [, b]) => b - a).slice(0, 4).map(([cat, importe]) => {
              const pct = totalGastos > 0 ? Math.round((importe / totalGastos) * 100) : 0
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 w-24 md:w-28 truncate flex-shrink-0">{CATEGORIA_PERSONAL_LABELS[cat as CategoriaPersonal] ?? cat}</span>
                  <div className="flex-1 h-1 bg-[rgba(26,34,53,0.6)] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00d9ff] rounded-full animate-progress" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 w-14 text-right flex-shrink-0">{formatEuros(importe)}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Mini components ──────────────────────────

function MiniCard({ lead }: { lead: Lead }) {
  return (
    <div className="lead-card bg-[rgba(17,24,39,0.5)] border border-[rgba(30,45,69,0.5)] rounded px-2.5 py-2">
      <div className="text-[12px] font-medium text-slate-300 truncate">{lead.nombre}</div>
      {lead.empresa && <div className="text-[10px] text-slate-600 truncate">{lead.empresa}</div>}
      {lead.valor_estimado && <div className="text-[10px] font-mono text-[#00ff88] mt-0.5">{formatEuros(lead.valor_estimado)}</div>}
    </div>
  )
}

function MiniTarea({ tarea }: { tarea: { id: string; titulo: string; fecha_limite: string | null; lead?: { nombre: string } | null } }) {
  const vencida = isTareaVencida(tarea.fecha_limite)
  const esHoy = tarea.fecha_limite === new Date().toISOString().split('T')[0]
  return (
    <div className={cn(
      'task-row flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[rgba(26,34,53,0.4)] text-[12px]',
      vencida && 'border-l-2 border-red-500',
      esHoy && !vencida && 'border-l-2 border-amber-400'
    )}>
      <div className="w-3 h-3 rounded border border-[#2a3f5f] flex-shrink-0" />
      <span className="flex-1 text-slate-300 truncate">{tarea.titulo}</span>
      {tarea.lead?.nombre && <span className="text-[10px] text-slate-600 truncate max-w-[60px] hidden sm:inline">{tarea.lead.nombre}</span>}
      <span className={cn('font-mono text-[10px] flex-shrink-0', vencida ? 'text-red-400' : esHoy ? 'text-amber-400' : 'text-slate-600')}>
        {vencida && <AlertCircle size={9} className="inline mr-0.5" />}
        {formatFechaCorta(tarea.fecha_limite)}
      </span>
    </div>
  )
}
