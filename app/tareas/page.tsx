'use client'

// ─────────────────────────────────────────────
// LOGIKA OS — Tareas Page
//
// Lista de tareas con:
// - Filtros por estado y urgencia
// - Marcar como completada
// - Indicadores visuales de vencimiento
// ─────────────────────────────────────────────

import { useState } from 'react'
import { useTareas } from '@/hooks/useQueries'
import { completarTarea } from '@/lib/queries'
import {
  Card, CardTitle, PageHeader, LoadingSpinner, EmptyState, ErrorState, Badge
} from '@/components/ui'
import { formatFechaCorta, isTareaVencida, cn } from '@/lib/utils'
import type { Tarea } from '@/types'
import { CheckCircle2, Circle, AlertCircle, Clock, Link2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Filtro = 'todas' | 'hoy' | 'vencidas' | 'sin_fecha'

export default function TareasPage() {
  const { data: tareas, loading, error, refetch } = useTareas()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [completandoId, setCompletandoId] = useState<string | null>(null)

  const hoy = format(new Date(), 'yyyy-MM-dd')

  // Aplicar filtro
  const tareasFiltradas = (tareas ?? []).filter((t) => {
    if (filtro === 'hoy') return t.fecha_limite === hoy
    if (filtro === 'vencidas') return isTareaVencida(t.fecha_limite)
    if (filtro === 'sin_fecha') return !t.fecha_limite
    return true
  })

  // Contadores para los badges del filtro
  const contadores = {
    todas: (tareas ?? []).length,
    hoy: (tareas ?? []).filter((t) => t.fecha_limite === hoy).length,
    vencidas: (tareas ?? []).filter((t) => isTareaVencida(t.fecha_limite)).length,
    sin_fecha: (tareas ?? []).filter((t) => !t.fecha_limite).length,
  }

  async function handleCompletar(id: string) {
    setCompletandoId(id)
    try {
      await completarTarea(id)
      await refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setCompletandoId(null)
    }
  }

  if (error) return <ErrorState message={error} />

  return (
    <div className="animate-in">
      <PageHeader
        title="Tareas"
        subtitle={`${(tareas ?? []).length} pendientes`}
      />

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(Object.entries(contadores) as [Filtro, number][]).map(([key, count]) => {
          const labels: Record<Filtro, string> = {
            todas: 'Todas',
            hoy: 'Hoy',
            vencidas: 'Vencidas',
            sin_fecha: 'Sin fecha',
          }
          return (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-all',
                filtro === key
                  ? key === 'vencidas'
                    ? 'bg-red-400/10 border-red-400/20 text-red-400'
                    : 'bg-[#00d9ff]/10 border-[#00d9ff]/20 text-[#00d9ff]'
                  : 'bg-[#111827] border-[#1e2d45] text-slate-500 hover:text-slate-300'
              )}
            >
              {labels[key]}
              {count > 0 && (
                <span className={cn(
                  'font-mono text-[10px] px-1 rounded',
                  filtro === key ? 'bg-current/20' : 'bg-[#1a2235]'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tareasFiltradas.length === 0 ? (
        <EmptyState message="No hay tareas en esta categoría." />
      ) : (
        <Card>
          <div className="flex flex-col stagger">
            {tareasFiltradas.map((tarea, idx) => (
              <TareaRow
                key={tarea.id}
                tarea={tarea}
                isLast={idx === tareasFiltradas.length - 1}
                isCompleting={completandoId === tarea.id}
                onCompletar={() => handleCompletar(tarea.id)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Fila de tarea ────────────────────────────

interface TareaRowProps {
  tarea: Tarea
  isLast: boolean
  isCompleting: boolean
  onCompletar: () => void
}

function TareaRow({ tarea, isLast, isCompleting, onCompletar }: TareaRowProps) {
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const vencida = isTareaVencida(tarea.fecha_limite)
  const esHoy = tarea.fecha_limite === hoy

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-3',
        !isLast && 'border-b border-[#1a2235]',
        vencida && 'pl-2 border-l-2 border-red-500',
        esHoy && !vencida && 'pl-2 border-l-2 border-amber-400'
      )}
    >
      {/* Check button */}
      <button
        onClick={onCompletar}
        disabled={isCompleting}
        className={cn(
          'flex-shrink-0 mt-0.5 text-slate-600 hover:text-[#00ff88] transition-colors',
          isCompleting && 'opacity-50'
        )}
      >
        {isCompleting ? (
          <CheckCircle2 size={16} className="text-[#00ff88] animate-pulse" />
        ) : (
          <Circle size={16} />
        )}
      </button>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-slate-300 mb-0.5">{tarea.titulo}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {tarea.lead?.nombre && (
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <Link2 size={10} />
              {tarea.lead.nombre}
            </div>
          )}
          {tarea.recordatorio_mismo_dia && (
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <Clock size={10} />
              {tarea.hora_recordatorio?.slice(0, 5)}
            </div>
          )}
        </div>
      </div>

      {/* Fecha */}
      <div className={cn(
        'flex items-center gap-1 flex-shrink-0 text-[11px] font-mono',
        vencida ? 'text-red-400' : esHoy ? 'text-amber-400' : 'text-slate-600'
      )}>
        {vencida && <AlertCircle size={10} />}
        {formatFechaCorta(tarea.fecha_limite)}
      </div>
    </div>
  )
}
