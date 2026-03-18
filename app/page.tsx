'use client'

// ─────────────────────────────────────────────
// LOGIKA OS — Overview Page
//
// Página principal. Muestra:
// - 4 métricas clave
// - Pipeline kanban resumido
// - Tareas del día
// - Balance financiero del mes
// ─────────────────────────────────────────────

import { useMetricasOverview, useLeads, useTareas, useTransacciones } from '@/hooks/useQueries'
import {
  Card, CardTitle, MetricCard, Badge, PageHeader, LoadingSpinner, EmptyState, ErrorState
} from '@/components/ui'
import { formatEuros, formatFechaCorta, isTareaVencida, LEAD_ESTADO_LABELS, LEAD_ESTADO_DOT, CATEGORIA_PERSONAL_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Lead, LeadEstado, CategoriaPersonal } from '@/types'
import Link from 'next/link'
import { ArrowRight, AlertCircle } from 'lucide-react'

// Estados del pipeline que mostramos en el overview (sin cerrados)
const PIPELINE_ESTADOS: LeadEstado[] = [
  'prospecto', 'visita_pendiente', 'caliente', 'propuesta_enviada'
]

export default function OverviewPage() {
  const { data: metricas, loading: loadingMetricas, error: errorMetricas } = useMetricasOverview()
  const { data: leads, loading: loadingLeads } = useLeads()
  const { data: tareas, loading: loadingTareas } = useTareas()
  const { data: transacciones, loading: loadingTrans } = useTransacciones('personal')

  // Agrupar leads por estado para el mini-kanban
  const kanban = PIPELINE_ESTADOS.map((estado) => ({
    estado,
    leads: (leads ?? []).filter((l) => l.estado === estado),
  }))

  // Calcular gastos por categoría para el mes actual
  const gastosPorCategoria = (transacciones ?? [])
    .filter((t) => t.tipo === 'gasto')
    .reduce((acc, t) => {
      const cat = t.categoria_personal ?? 'otro'
      acc[cat] = (acc[cat] ?? 0) + Number(t.importe)
      return acc
    }, {} as Record<string, number>)

  const totalGastos = Object.values(gastosPorCategoria).reduce((a, b) => a + b, 0)

  const ingresosMes = (transacciones ?? [])
    .filter((t) => t.tipo === 'ingreso')
    .reduce((acc, t) => acc + Number(t.importe), 0)

  if (errorMetricas) return <ErrorState message={errorMetricas} />

  return (
    <div className="animate-in">
      <PageHeader
        title="Overview"
        subtitle="Resumen de Logika Digital y vida personal"
      />

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loadingMetricas ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#111827] border border-[#1e2d45] rounded-xl p-5 h-24 animate-pulse" />
          ))
        ) : (
          <>
            <MetricCard
              label="Leads activos"
              value={metricas?.leads_activos ?? 0}
              sub="en pipeline"
              accent="#00d9ff"
            />
            <MetricCard
              label="Visitas pendientes"
              value={metricas?.visitas_pendientes ?? 0}
              sub="por hacer"
              subColor="amber"
              accent="#f59e0b"
            />
            <MetricCard
              label="MRR Logika"
              value={formatEuros(metricas?.mrr_logika ?? 0)}
              sub="recurrente mensual"
              subColor="green"
              accent="#00ff88"
            />
            <MetricCard
              label="Tareas hoy"
              value={metricas?.tareas_hoy ?? 0}
              sub={metricas?.tareas_vencidas ? `${metricas.tareas_vencidas} vencida${metricas.tareas_vencidas > 1 ? 's' : ''}` : 'al día'}
              subColor={metricas?.tareas_vencidas ? 'red' : 'green'}
              accent="#8b5cf6"
            />
          </>
        )}
      </div>

      {/* ── Pipeline kanban ── */}
      <Card className="mb-4">
        <CardTitle action={<Link href="/crm" className="flex items-center gap-1 hover:text-white transition-colors">Ver todo <ArrowRight size={11} /></Link>}>
          Pipeline CRM
        </CardTitle>
        <div className="grid grid-cols-4 gap-2">
          {PIPELINE_ESTADOS.map((estado) => {
            const col = kanban.find((k) => k.estado === estado)!
            return (
              <div key={estado} className="bg-[#1a2235] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', LEAD_ESTADO_DOT[estado])} />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 truncate">
                    {LEAD_ESTADO_LABELS[estado]}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-slate-600">
                    {col.leads.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {loadingLeads ? (
                    <div className="h-10 bg-[#111827] rounded animate-pulse" />
                  ) : col.leads.length === 0 ? (
                    <div className="text-[10px] text-slate-700 py-2 text-center">—</div>
                  ) : (
                    col.leads.slice(0, 3).map((lead) => (
                      <KanbanCard key={lead.id} lead={lead} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Tareas + Finanzas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tareas */}
        <Card>
          <CardTitle action={<Link href="/tareas" className="flex items-center gap-1 hover:text-white transition-colors">Ver todo <ArrowRight size={11} /></Link>}>
            Tareas pendientes
          </CardTitle>
          {loadingTareas ? (
            <LoadingSpinner />
          ) : (tareas ?? []).length === 0 ? (
            <EmptyState message="No hay tareas pendientes. Todo al día." />
          ) : (
            <div className="flex flex-col gap-1.5 stagger">
              {(tareas ?? []).slice(0, 5).map((tarea) => {
                const vencida = isTareaVencida(tarea.fecha_limite)
                const esHoy = tarea.fecha_limite === new Date().toISOString().split('T')[0]
                return (
                  <div
                    key={tarea.id}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1a2235] text-[12px]',
                      vencida && 'border-l-2 border-red-500',
                      esHoy && !vencida && 'border-l-2 border-amber-400'
                    )}
                  >
                    <div className="w-3.5 h-3.5 rounded border border-[#2a3f5f] flex-shrink-0" />
                    <span className="flex-1 text-slate-300 truncate">{tarea.titulo}</span>
                    {tarea.lead?.nombre && (
                      <span className="text-[10px] text-slate-600 truncate max-w-[80px]">
                        {tarea.lead.nombre}
                      </span>
                    )}
                    <span className={cn(
                      'font-mono text-[10px] flex-shrink-0',
                      vencida ? 'text-red-400' : esHoy ? 'text-amber-400' : 'text-slate-600'
                    )}>
                      {vencida && <AlertCircle size={10} className="inline mr-1" />}
                      {formatFechaCorta(tarea.fecha_limite)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Finanzas personales del mes */}
        <Card>
          <CardTitle action={<Link href="/finanzas" className="flex items-center gap-1 hover:text-white transition-colors">Ver todo <ArrowRight size={11} /></Link>}>
            Finanzas personales — {new Date().toLocaleDateString('es-ES', { month: 'long' })}
          </CardTitle>
          <div className="flex gap-4 mb-4">
            <div>
              <div className="text-[10px] text-slate-600 mb-0.5">Ingresos</div>
              <div className="font-mono text-[16px] font-bold text-[#00ff88]">
                {formatEuros(ingresosMes)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-600 mb-0.5">Gastos</div>
              <div className="font-mono text-[16px] font-bold text-red-400">
                {formatEuros(totalGastos)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-600 mb-0.5">Balance</div>
              <div className={cn('font-mono text-[16px] font-bold', ingresosMes - totalGastos >= 0 ? 'text-[#00d9ff]' : 'text-red-400')}>
                {formatEuros(ingresosMes - totalGastos)}
              </div>
            </div>
          </div>
          {loadingTrans ? <LoadingSpinner /> : (
            <div className="flex flex-col gap-2 stagger">
              {Object.entries(gastosPorCategoria)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([cat, importe]) => {
                  const pct = totalGastos > 0 ? Math.round((importe / totalGastos) * 100) : 0
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 w-28 truncate flex-shrink-0">
                        {CATEGORIA_PERSONAL_LABELS[cat as CategoriaPersonal] ?? cat}
                      </span>
                      <div className="flex-1 h-1 bg-[#1a2235] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00d9ff] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 w-14 text-right flex-shrink-0">
                        {formatEuros(importe)}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}

// ─── Mini card del kanban ─────────────────────
function KanbanCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-[#111827] border border-[#1e2d45] rounded px-2.5 py-2">
      <div className="text-[12px] font-medium text-slate-300 truncate">{lead.nombre}</div>
      {lead.empresa && (
        <div className="text-[10px] text-slate-600 truncate">{lead.empresa}</div>
      )}
      {lead.valor_estimado && (
        <div className="text-[10px] font-mono text-[#00ff88] mt-0.5">
          {formatEuros(lead.valor_estimado)}
        </div>
      )}
    </div>
  )
}
