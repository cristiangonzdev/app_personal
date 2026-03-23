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
import { CheckCircle2, Circle, AlertCircle, Clock, Link2, Plus, Trash2, Edit3, User, Briefcase } from 'lucide-react'
import { format } from 'date-fns'

type Filtro = 'todas' | 'hoy' | 'vencidas' | 'sin_fecha'

export default function TareasPage() {
  const { data: tareas, loading, error, refetch } = useTareas()
  const { data: leads } = useLeads()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [completandoId, setCompletandoId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateCtx, setShowCreateCtx] = useState<'personal' | 'logika'>('personal')
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const hoy = format(new Date(), 'yyyy-MM-dd')

  // Separar por contexto: lead_id → Logika, sin lead → Personal
  const allTareas = tareas ?? []
  const tareasPersonales = allTareas.filter((t) => !t.lead_id)
  const tareasLogika = allTareas.filter((t) => !!t.lead_id)

  function filtrar(lista: Tarea[]) {
    return lista.filter((t) => {
      if (filtro === 'hoy') return t.fecha_limite === hoy
      if (filtro === 'vencidas') return isTareaVencida(t.fecha_limite)
      if (filtro === 'sin_fecha') return !t.fecha_limite
      return true
    })
  }

  const personalFiltradas = filtrar(tareasPersonales)
  const logikaFiltradas = filtrar(tareasLogika)

  const contadores = {
    todas: allTareas.length,
    hoy: allTareas.filter((t) => t.fecha_limite === hoy).length,
    vencidas: allTareas.filter((t) => isTareaVencida(t.fecha_limite)).length,
    sin_fecha: allTareas.filter((t) => !t.fecha_limite).length,
  }

  async function handleCompletar(id: string) {
    setCompletandoId(id)
    try { await completarTarea(id); await refetch() }
    catch (e) { console.error(e) }
    finally { setCompletandoId(null) }
  }

  async function handleDelete(id: string) {
    try { await deleteTarea(id); setDeletingId(null); await refetch() }
    catch (e) { console.error(e) }
  }

  if (error) return <ErrorState message={error} />

  return (
    <div className="animate-in">
      <PageHeader
        title="Tareas"
        subtitle={`${allTareas.length} pendientes`}
      />

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {(Object.entries(contadores) as [Filtro, number][]).map(([key, count]) => {
          const labels: Record<Filtro, string> = { todas: 'Todas', hoy: 'Hoy', vencidas: 'Vencidas', sin_fecha: 'Sin fecha' }
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
                <span className={cn('font-mono text-[10px] px-1.5 py-0.5 rounded-md', filtro === key ? 'bg-current/10' : 'bg-[rgba(26,34,53,0.6)]')}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Personal ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User size={14} className="text-[#8b5cf6]" />
                <h3 className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">
                  Personal
                </h3>
                <span className="font-mono text-[10px] text-slate-600 bg-[rgba(26,34,53,0.6)] px-1.5 py-0.5 rounded">
                  {personalFiltradas.length}
                </span>
              </div>
              <button
                onClick={() => { setShowCreateCtx('personal'); setShowCreate(true) }}
                className="btn-glow p-1.5 rounded-md text-slate-500 hover:text-[#8b5cf6] transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {personalFiltradas.length === 0 ? (
              <EmptyState message="Sin tareas personales" />
            ) : (
              <div className="flex flex-col stagger">
                {personalFiltradas.map((t, i) => (
                  <TareaRow key={t.id} tarea={t} isLast={i === personalFiltradas.length - 1}
                    isCompleting={completandoId === t.id} isDeleting={deletingId === t.id}
                    onCompletar={() => handleCompletar(t.id)} onEdit={() => setEditingTarea(t)}
                    onDelete={() => setDeletingId(t.id)} onConfirmDelete={() => handleDelete(t.id)}
                    onCancelDelete={() => setDeletingId(null)} />
                ))}
              </div>
            )}
          </Card>

          {/* ── Logika Digital ── */}
          <Card accent="#00d9ff">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-[#00d9ff]" />
                <h3 className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">
                  Logika Digital
                </h3>
                <span className="font-mono text-[10px] text-slate-600 bg-[rgba(26,34,53,0.6)] px-1.5 py-0.5 rounded">
                  {logikaFiltradas.length}
                </span>
              </div>
              <button
                onClick={() => { setShowCreateCtx('logika'); setShowCreate(true) }}
                className="btn-glow p-1.5 rounded-md text-slate-500 hover:text-[#00d9ff] transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {logikaFiltradas.length === 0 ? (
              <EmptyState message="Sin tareas de Logika" />
            ) : (
              <div className="flex flex-col stagger">
                {logikaFiltradas.map((t, i) => (
                  <TareaRow key={t.id} tarea={t} isLast={i === logikaFiltradas.length - 1}
                    isCompleting={completandoId === t.id} isDeleting={deletingId === t.id}
                    onCompletar={() => handleCompletar(t.id)} onEdit={() => setEditingTarea(t)}
                    onDelete={() => setDeletingId(t.id)} onConfirmDelete={() => handleDelete(t.id)}
                    onCancelDelete={() => setDeletingId(null)} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <TareaFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={refetch} leads={leads ?? []} defaultCtx={showCreateCtx} />
      <TareaFormModal open={!!editingTarea} tarea={editingTarea ?? undefined} onClose={() => setEditingTarea(null)} onSaved={refetch} leads={leads ?? []} />
    </div>
  )
}

// ─── Task Row ────────────────────────────────

function TareaRow({ tarea, isLast, isCompleting, isDeleting, onCompletar, onEdit, onDelete, onConfirmDelete, onCancelDelete }: {
  tarea: Tarea; isLast: boolean; isCompleting: boolean; isDeleting: boolean
  onCompletar: () => void; onEdit: () => void; onDelete: () => void
  onConfirmDelete: () => void; onCancelDelete: () => void
}) {
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const vencida = isTareaVencida(tarea.fecha_limite)
  const esHoy = tarea.fecha_limite === hoy

  return (
    <div>
      <div className={cn(
        'task-row flex items-start gap-2.5 py-2.5 px-1 rounded-md group',
        !isLast && !isDeleting && 'border-b border-[rgba(26,34,53,0.5)]',
        vencida && 'pl-2 border-l-2 border-l-red-500',
        esHoy && !vencida && 'pl-2 border-l-2 border-l-amber-400'
      )}>
        <button onClick={onCompletar} disabled={isCompleting}
          className={cn('flex-shrink-0 mt-0.5 text-slate-600 hover:text-[#00ff88] transition-all active:scale-90', isCompleting && 'opacity-50')}>
          {isCompleting ? <CheckCircle2 size={16} className="text-[#00ff88] animate-pulse" /> : <Circle size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-slate-300 mb-0.5 leading-tight">{tarea.titulo}</div>
          <div className="flex items-center gap-2 flex-wrap">
            {tarea.lead?.nombre && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-600"><Link2 size={9} />{tarea.lead.nombre}</span>
            )}
            {tarea.recordatorio_mismo_dia && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-600"><Clock size={9} />{tarea.hora_recordatorio?.slice(0, 5)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="p-1 rounded text-slate-600 hover:text-[#00d9ff]"><Edit3 size={12} /></button>
          <button onClick={onDelete} className="p-1 rounded text-slate-600 hover:text-red-400"><Trash2 size={12} /></button>
        </div>
        <div className={cn('flex items-center gap-1 flex-shrink-0 text-[10px] font-mono mt-0.5',
          vencida ? 'text-red-400' : esHoy ? 'text-amber-400' : 'text-slate-600')}>
          {vencida && <AlertCircle size={9} />}
          {formatFechaCorta(tarea.fecha_limite)}
        </div>
      </div>
      {isDeleting && (
        <div className="flex items-center gap-2 px-1 py-1.5 border-b border-[rgba(26,34,53,0.5)]">
          <span className="text-[11px] text-red-400 flex-1">¿Eliminar?</span>
          <button onClick={onConfirmDelete} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-red-400/10">Sí</button>
          <button onClick={onCancelDelete} className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded">No</button>
        </div>
      )}
    </div>
  )
}

// ─── Task Form Modal ─────────────────────────

function TareaFormModal({ open, tarea, onClose, onSaved, leads, defaultCtx }: {
  open: boolean; tarea?: Tarea; onClose: () => void; onSaved: () => void
  leads: { id: string; nombre: string }[]; defaultCtx?: 'personal' | 'logika'
}) {
  const isEdit = !!tarea
  const editCtx = tarea?.lead_id ? 'logika' : 'personal'
  const [ctx, setCtx] = useState(isEdit ? editCtx : (defaultCtx ?? 'personal'))
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: tarea?.titulo ?? '',
    lead_id: tarea?.lead_id ?? '',
    fecha_limite: tarea?.fecha_limite ?? '',
    recordatorio_mismo_dia: tarea?.recordatorio_mismo_dia ?? false,
    hora_recordatorio: tarea?.hora_recordatorio?.slice(0, 5) ?? '09:00',
  })

  function u(f: string, v: string | boolean) { setForm((p) => ({ ...p, [f]: v })) }

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
        lead_id: ctx === 'logika' ? (form.lead_id || null) : null,
        fecha_limite: form.fecha_limite || null,
        recordatorio_mismo_dia: form.recordatorio_mismo_dia,
        hora_recordatorio: form.hora_recordatorio || '09:00',
      }
      if (isEdit) await updateTarea(tarea!.id, payload); else await createTarea(payload)
      onSaved(); onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar tarea' : 'Nueva tarea'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Context toggle */}
        {!isEdit && (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 block">Contexto</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCtx('personal')}
                className={cn('btn-glow flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all flex items-center justify-center gap-1.5',
                  ctx === 'personal' ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/20 text-[#8b5cf6]' : 'border-[rgba(30,45,69,0.5)] text-slate-500')}>
                <User size={12} /> Personal
              </button>
              <button type="button" onClick={() => setCtx('logika')}
                className={cn('btn-glow flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all flex items-center justify-center gap-1.5',
                  ctx === 'logika' ? 'bg-[#00d9ff]/10 border-[#00d9ff]/20 text-[#00d9ff]' : 'border-[rgba(30,45,69,0.5)] text-slate-500')}>
                <Briefcase size={12} /> Logika
              </button>
            </div>
          </div>
        )}

        <Input label="Título *" value={form.titulo} onChange={(e) => u('titulo', e.target.value)} placeholder="Qué hay que hacer..." required />
        {ctx === 'logika' && (
          <Select label="Lead asociado" value={form.lead_id} onChange={(e) => u('lead_id', e.target.value)} options={leadOptions} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha límite" value={form.fecha_limite} onChange={(e) => u('fecha_limite', e.target.value)} type="date" />
          <Input label="Hora recordatorio" value={form.hora_recordatorio} onChange={(e) => u('hora_recordatorio', e.target.value)} type="time" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.recordatorio_mismo_dia} onChange={(e) => u('recordatorio_mismo_dia', e.target.checked)}
            className="w-4 h-4 rounded border-[rgba(30,45,69,0.5)] bg-[rgba(26,34,53,0.5)] text-[#00d9ff]" />
          <span className="text-[12px] text-slate-400">Recordatorio el mismo día</span>
        </label>
        <div className="flex gap-2 mt-1">
          <Button type="submit" variant="primary" loading={saving} className="flex-1">{isEdit ? 'Guardar' : 'Crear tarea'}</Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </form>
    </Modal>
  )
}
