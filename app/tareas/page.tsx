'use client'

import { useState } from 'react'
import { useTareas, useLeads } from '@/hooks/useQueries'
import { completarTarea, createTarea, updateTarea, deleteTarea } from '@/lib/queries'
import {
  Card, CardTitle, PageHeader, LoadingSpinner, EmptyState, ErrorState
} from '@/components/ui'
import { Modal, Input, Select, Button } from '@/components/ui/Modal'
import { formatFechaCorta, isTareaVencida, cn } from '@/lib/utils'
import type { Tarea } from '@/types'
import { CheckCircle2, Circle, AlertCircle, Clock, Link2, Plus, Trash2, Edit3 } from 'lucide-react'
import { format } from 'date-fns'

type Filtro = 'todas' | 'hoy' | 'vencidas' | 'sin_fecha'

export default function TareasPage() {
  const { data: tareas, loading, error, refetch } = useTareas()
  const { data: leads } = useLeads()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [completandoId, setCompletandoId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const hoy = format(new Date(), 'yyyy-MM-dd')

  const tareasFiltradas = (tareas ?? []).filter((t) => {
    if (filtro === 'hoy') return t.fecha_limite === hoy
    if (filtro === 'vencidas') return isTareaVencida(t.fecha_limite)
    if (filtro === 'sin_fecha') return !t.fecha_limite
    return true
  })

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

  async function handleDelete(id: string) {
    try {
      await deleteTarea(id)
      setDeletingId(null)
      await refetch()
    } catch (e) {
      console.error(e)
    }
  }

  if (error) return <ErrorState message={error} />

  return (
    <div className="animate-in">
      <PageHeader
        title="Tareas"
        subtitle={`${(tareas ?? []).length} pendientes`}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="btn-glow btn-shimmer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#00d9ff]/10 border border-[#00d9ff]/20 text-[#00d9ff] hover:bg-[#00d9ff]/15 transition-all"
          >
            <Plus size={14} /> Nueva tarea
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
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
                'btn-glow flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-all snap-start',
                filtro === key
                  ? key === 'vencidas'
                    ? 'bg-red-400/10 border-red-400/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : 'bg-[#00d9ff]/10 border-[#00d9ff]/20 text-[#00d9ff] shadow-[0_0_15px_rgba(0,217,255,0.1)]'
                  : 'glass-card text-slate-500 hover:text-slate-300'
              )}
            >
              {labels[key]}
              {count > 0 && (
                <span className={cn(
                  'font-mono text-[10px] px-1.5 py-0.5 rounded-md',
                  filtro === key ? 'bg-current/10' : 'bg-[rgba(26,34,53,0.6)]'
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
                isDeleting={deletingId === tarea.id}
                onCompletar={() => handleCompletar(tarea.id)}
                onEdit={() => setEditingTarea(tarea)}
                onDelete={() => setDeletingId(tarea.id)}
                onConfirmDelete={() => handleDelete(tarea.id)}
                onCancelDelete={() => setDeletingId(null)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Create modal */}
      <TareaFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={refetch}
        leads={leads ?? []}
      />

      {/* Edit modal */}
      <TareaFormModal
        open={!!editingTarea}
        tarea={editingTarea ?? undefined}
        onClose={() => setEditingTarea(null)}
        onSaved={refetch}
        leads={leads ?? []}
      />
    </div>
  )
}

// ─── Task Row ────────────────────────────────

interface TareaRowProps {
  tarea: Tarea
  isLast: boolean
  isCompleting: boolean
  isDeleting: boolean
  onCompletar: () => void
  onEdit: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function TareaRow({ tarea, isLast, isCompleting, isDeleting, onCompletar, onEdit, onDelete, onConfirmDelete, onCancelDelete }: TareaRowProps) {
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const vencida = isTareaVencida(tarea.fecha_limite)
  const esHoy = tarea.fecha_limite === hoy

  return (
    <div>
      <div
        className={cn(
          'task-row flex items-start gap-3 py-3 px-1 rounded-md group',
          !isLast && !isDeleting && 'border-b border-[rgba(26,34,53,0.5)]',
          vencida && 'pl-2 border-l-2 border-l-red-500',
          esHoy && !vencida && 'pl-2 border-l-2 border-l-amber-400'
        )}
      >
        {/* Check */}
        <button
          onClick={onCompletar}
          disabled={isCompleting}
          className={cn(
            'flex-shrink-0 mt-0.5 text-slate-600 hover:text-[#00ff88] transition-all active:scale-90',
            isCompleting && 'opacity-50'
          )}
        >
          {isCompleting ? (
            <CheckCircle2 size={18} className="text-[#00ff88] animate-pulse" />
          ) : (
            <Circle size={18} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-slate-300 mb-0.5">{tarea.titulo}</div>
          <div className="flex items-center gap-2 flex-wrap">
            {tarea.lead?.nombre && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                <Link2 size={10} />
                <span className="truncate max-w-[120px]">{tarea.lead.nombre}</span>
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

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="p-1 rounded text-slate-600 hover:text-[#00d9ff] transition-colors" title="Editar">
            <Edit3 size={13} />
          </button>
          <button onClick={onDelete} className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors" title="Eliminar">
            <Trash2 size={13} />
          </button>
        </div>

        {/* Date */}
        <div className={cn(
          'flex items-center gap-1 flex-shrink-0 text-[11px] font-mono',
          vencida ? 'text-red-400' : esHoy ? 'text-amber-400' : 'text-slate-600'
        )}>
          {vencida && <AlertCircle size={10} />}
          {formatFechaCorta(tarea.fecha_limite)}
        </div>
      </div>

      {/* Inline delete confirmation */}
      {isDeleting && (
        <div className="flex items-center gap-2 px-1 py-2 border-b border-[rgba(26,34,53,0.5)]">
          <span className="text-[11px] text-red-400 flex-1">¿Eliminar tarea?</span>
          <button onClick={onConfirmDelete} className="text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-400/10 transition-colors">Sí</button>
          <button onClick={onCancelDelete} className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition-colors">No</button>
        </div>
      )}
    </div>
  )
}

// ─── Task Form Modal ─────────────────────────

function TareaFormModal({
  open,
  tarea,
  onClose,
  onSaved,
  leads,
}: {
  open: boolean
  tarea?: Tarea
  onClose: () => void
  onSaved: () => void
  leads: { id: string; nombre: string }[]
}) {
  const isEdit = !!tarea
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: tarea?.titulo ?? '',
    lead_id: tarea?.lead_id ?? '',
    fecha_limite: tarea?.fecha_limite ?? '',
    recordatorio_mismo_dia: tarea?.recordatorio_mismo_dia ?? false,
    hora_recordatorio: tarea?.hora_recordatorio?.slice(0, 5) ?? '09:00',
  })

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const leadOptions = [
    { value: '', label: 'Sin lead asociado' },
    ...leads.map((l) => ({ value: l.id, label: l.nombre })),
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return

    setSaving(true)
    try {
      const payload = {
        titulo: form.titulo.trim(),
        lead_id: form.lead_id || null,
        fecha_limite: form.fecha_limite || null,
        recordatorio_mismo_dia: form.recordatorio_mismo_dia,
        hora_recordatorio: form.hora_recordatorio || '09:00',
      }

      if (isEdit && tarea) {
        await updateTarea(tarea.id, payload)
      } else {
        await createTarea(payload)
      }

      onSaved()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar tarea' : 'Nueva tarea'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input label="Título *" value={form.titulo} onChange={(e) => update('titulo', e.target.value)} placeholder="Qué hay que hacer..." required />
        <Select label="Lead asociado" value={form.lead_id} onChange={(e) => update('lead_id', e.target.value)} options={leadOptions} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha límite" value={form.fecha_limite} onChange={(e) => update('fecha_limite', e.target.value)} type="date" />
          <Input label="Hora recordatorio" value={form.hora_recordatorio} onChange={(e) => update('hora_recordatorio', e.target.value)} type="time" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.recordatorio_mismo_dia}
            onChange={(e) => update('recordatorio_mismo_dia', e.target.checked)}
            className="w-4 h-4 rounded border-[rgba(30,45,69,0.5)] bg-[rgba(26,34,53,0.5)] text-[#00d9ff] focus:ring-[#00d9ff]/20"
          />
          <span className="text-[12px] text-slate-400">Recordatorio el mismo día</span>
        </label>

        <div className="flex gap-2 mt-2">
          <Button type="submit" variant="primary" loading={saving} className="flex-1">
            {isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
