'use client'

import { useState } from 'react'
import { useAllLeads, useProyectos, useTransaccionesRecurrentes } from '@/hooks/useQueries'
import {
  updateLeadEstado, createLead, updateLead, deleteLead,
  createTransaccionRecurrente, deleteTransaccionRecurrente, createTransaccion
} from '@/lib/queries'
import {
  Card, CardTitle, Badge, PageHeader, LoadingSpinner, EmptyState, ErrorState
} from '@/components/ui'
import { Modal, Input, Select, Textarea, Button } from '@/components/ui/Modal'
import {
  formatEuros, cn,
  CATEGORIA_LOGIKA_LABELS,
} from '@/lib/utils'
import {
  CRM_PIPELINE, ADVANCE_STATE, RETREAT_STATE,
  LEAD_ESTADO_LABELS, PROYECTO_TIPO_LABELS,
} from '@/types'
import type { Lead, LeadEstado, LeadOrigen, TransaccionRecurrente } from '@/types'
import { Phone, Mail, ChevronRight, ChevronLeft, X, Plus, Edit3, Trash2, XCircle, Zap } from 'lucide-react'
import { format } from 'date-fns'

const ORIGEN_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'referido', label: 'Referido' },
  { value: 'visita', label: 'Visita' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
]

export default function CRMPage() {
  const { data: leads, loading, error, refetch } = useAllLeads()
  const { data: recurrentes, refetch: refetchRec } = useTransaccionesRecurrentes('logika')
  const [movingId, setMovingId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [showAddCliente, setShowAddCliente] = useState(false)

  const kanban = CRM_PIPELINE.map((col) => ({
    ...col,
    leads: (leads ?? []).filter((l) => col.dbStates.includes(l.estado)),
  }))

  const leadsActivos = (leads ?? []).filter(
    (l) => !['cerrado_ganado', 'cerrado_perdido'].includes(l.estado)
  )
  const valorPipeline = leadsActivos.reduce((acc, l) => acc + (l.valor_estimado ?? 0), 0)
  const cerradosGanados = (leads ?? []).filter((l) => l.estado === 'cerrado_ganado').length
  const totalCerrados = (leads ?? []).filter((l) => l.estado === 'cerrado_ganado' || l.estado === 'cerrado_perdido').length

  // Clientes activos = ingresos recurrentes de Logika (sincronizado con Finanzas)
  const clientesActivos = (recurrentes ?? []).filter((r) => r.tipo === 'ingreso')
  const totalMRR = clientesActivos.reduce((a, r) => a + Number(r.importe), 0)

  async function handleDeleteCliente(id: string) {
    try { await deleteTransaccionRecurrente(id); await refetchRec() }
    catch (e) { console.error(e) }
  }

  async function moverLead(lead: Lead, direccion: 'adelante' | 'atras') {
    const currentCol = CRM_PIPELINE.find((c) => c.dbStates.includes(lead.estado))
    if (!currentCol) return

    const nuevoEstado = direccion === 'adelante'
      ? ADVANCE_STATE[currentCol.key]
      : RETREAT_STATE[currentCol.key]
    if (!nuevoEstado) return

    setMovingId(lead.id)
    try {
      await updateLeadEstado(lead.id, nuevoEstado)
      await refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setMovingId(null)
    }
  }

  async function marcarPerdido(lead: Lead) {
    setMovingId(lead.id)
    try {
      await updateLeadEstado(lead.id, 'cerrado_perdido')
      setSelectedLead(null)
      await refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setMovingId(null)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLead(id)
      setSelectedLead(null)
      await refetch()
    } catch (e) {
      console.error(e)
    }
  }

  if (error) return <ErrorState message={error} />

  return (
    <div className="animate-in">
      <PageHeader
        title="CRM"
        subtitle={`${leadsActivos.length} leads activos`}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="btn-glow btn-shimmer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#00d9ff]/10 border border-[#00d9ff]/20 text-[#00d9ff] hover:bg-[#00d9ff]/15 transition-all"
          >
            <Plus size={14} /> Nuevo lead
          </button>
        }
      />

      {/* ── Kanban 4 columnas ── */}
      {loading ? (
        <LoadingSpinner text="Cargando pipeline..." />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
          {kanban.map((col) => {
            const colIdx = CRM_PIPELINE.findIndex((c) => c.key === col.key)
            return (
              <div key={col.key} className="flex-shrink-0 w-[160px] md:w-[200px] snap-start">
                <div
                  className="rounded-t-lg px-3 py-2 flex items-center justify-between mb-0.5"
                  style={{ borderTop: `2px solid ${col.color}` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', col.dot)} />
                    <span className="text-[11px] text-slate-400 font-medium">{col.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-600">{col.leads.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {col.leads.length === 0 ? (
                    <div className="text-[11px] text-slate-700 text-center py-4 glass-card rounded-lg">Vacío</div>
                  ) : (
                    col.leads.slice(0, 8).map((lead) => (
                      <div
                        key={lead.id}
                        className={cn('lead-card glass-card rounded-lg p-2.5 cursor-pointer', movingId === lead.id && 'opacity-50')}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <div className="font-medium text-[12px] text-slate-200 truncate">{lead.nombre}</div>
                        {lead.empresa && <div className="text-[10px] text-slate-600 truncate">{lead.empresa}</div>}
                        <div className="flex items-center justify-between mt-1.5">
                          {lead.valor_estimado ? (
                            <span className="font-mono text-[10px] text-[#00ff88]">{formatEuros(lead.valor_estimado)}</span>
                          ) : <span />}
                          {/* Cerrado: mostrar ganado/perdido */}
                          {col.key === 'cerrado' && (
                            <Badge variant={lead.estado === 'cerrado_ganado' ? 'green' : 'red'} className="text-[8px]">
                              {lead.estado === 'cerrado_ganado' ? 'Ganado' : 'Perdido'}
                            </Badge>
                          )}
                        </div>
                        {/* Quick move */}
                        {col.key !== 'cerrado' && (
                          <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-[rgba(30,45,69,0.4)]" onClick={(e) => e.stopPropagation()}>
                            {colIdx > 0 && (
                              <button
                                onClick={() => moverLead(lead, 'atras')}
                                disabled={movingId === lead.id}
                                className="flex-1 flex items-center justify-center py-1 rounded text-[9px] text-slate-600 hover:text-slate-400 disabled:opacity-20 transition-all"
                              >
                                <ChevronLeft size={10} />
                              </button>
                            )}
                            <button
                              onClick={() => moverLead(lead, 'adelante')}
                              disabled={movingId === lead.id}
                              className="flex-1 flex items-center justify-center py-1 rounded text-[9px] text-slate-600 hover:text-[#00d9ff] disabled:opacity-20 transition-all"
                            >
                              <ChevronRight size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Resumen + Clientes activos (llena espacio en mobile) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Resumen pipeline */}
        <Card>
          <CardTitle>Resumen pipeline</CardTitle>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-slate-600 mb-1">En pipeline</div>
              <div className="font-mono text-[20px] font-bold text-slate-100">{leadsActivos.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-600 mb-1">Valor total</div>
              <div className="font-mono text-[20px] font-bold text-[#00d9ff]">{formatEuros(valorPipeline)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-600 mb-1">Tasa cierre</div>
              <div className="font-mono text-[20px] font-bold text-[#00ff88]">
                {totalCerrados > 0 ? Math.round((cerradosGanados / totalCerrados) * 100) : 0}%
              </div>
            </div>
          </div>
        </Card>

        {/* Clientes activos (sincronizado con ingresos fijos Logika) */}
        <Card accent="#00ff88">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">
                Clientes activos
              </h3>
              {totalMRR > 0 && (
                <span className="font-mono text-[10px] text-[#00ff88]">{formatEuros(totalMRR)}/mes</span>
              )}
            </div>
            <button
              onClick={() => setShowAddCliente(true)}
              className="btn-glow btn-shimmer flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/20 hover:bg-[#00ff88]/15 transition-all"
            >
              <Plus size={11} /> <span className="hidden sm:inline">Añadir cliente</span>
            </button>
          </div>
          {clientesActivos.length === 0 ? (
            <div className="text-center py-4 text-slate-600 text-[12px]">
              Añade clientes con mantenimiento recurrente mensual. Se sincronizan con los ingresos fijos de Logika en Finanzas.
            </div>
          ) : (
            <div className="flex flex-col gap-1 stagger">
              {clientesActivos.map((r) => (
                <div key={r.id} className="flex items-center gap-2 py-2 px-1 rounded-md group tx-row">
                  <Zap size={12} className="text-[#00ff88] flex-shrink-0" />
                  <span className="flex-1 text-[12px] text-slate-300 truncate">{r.descripcion}</span>
                  <button
                    onClick={() => handleDeleteCliente(r.id)}
                    className="p-0.5 rounded text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                  <span className="font-mono text-[12px] text-[#00ff88] font-medium flex-shrink-0">
                    {formatEuros(r.importe)}/mes
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onEdit={() => { setEditingLead(selectedLead); setSelectedLead(null) }}
          onDelete={() => handleDelete(selectedLead.id)}
          onMover={async (dir) => {
            await moverLead(selectedLead, dir)
            await refetch()
            setSelectedLead(null)
          }}
          onPerdido={() => marcarPerdido(selectedLead)}
        />
      )}

      <LeadFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={refetch} />
      <LeadFormModal open={!!editingLead} lead={editingLead ?? undefined} onClose={() => setEditingLead(null)} onSaved={refetch} />
      <ClienteActivoFormModal open={showAddCliente} onClose={() => setShowAddCliente(false)} onSaved={refetchRec} />
    </div>
  )
}

// ─── Lead Detail Panel ────────────────────────

function LeadDetail({
  lead, onClose, onEdit, onDelete, onMover, onPerdido,
}: {
  lead: Lead; onClose: () => void; onEdit: () => void; onDelete: () => void
  onMover: (dir: 'adelante' | 'atras') => void; onPerdido: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const currentCol = CRM_PIPELINE.find((c) => c.dbStates.includes(lead.estado))
  const colIdx = CRM_PIPELINE.findIndex((c) => c.key === currentCol?.key)
  const isCerrado = currentCol?.key === 'cerrado'

  return (
    <div className="fixed inset-0 z-50 flex justify-end overlay-backdrop" onClick={onClose}>
      <div className="panel-slide w-full max-w-[360px] h-full bg-[rgba(17,24,39,0.95)] backdrop-blur-2xl border-l border-[rgba(30,45,69,0.5)] p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={onClose} className="btn-glow flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded-md">
            <X size={12} /> Cerrar
          </button>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="btn-glow p-1.5 rounded-md text-slate-500 hover:text-[#00d9ff]" title="Editar"><Edit3 size={14} /></button>
            <button onClick={() => setConfirmDelete(true)} className="btn-glow p-1.5 rounded-md text-slate-500 hover:text-red-400" title="Eliminar"><Trash2 size={14} /></button>
          </div>
        </div>

        <h2 className="text-[18px] font-bold text-slate-100 mb-0.5">{lead.nombre}</h2>
        {lead.empresa && <div className="text-[13px] text-slate-500 mb-4">{lead.empresa}</div>}

        {currentCol && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-5" style={{ background: `${currentCol.color}15`, border: `1px solid ${currentCol.color}30` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: currentCol.color }} />
            <span className="text-[11px]" style={{ color: currentCol.color }}>
              {isCerrado ? LEAD_ESTADO_LABELS[lead.estado] : currentCol.label}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3 mb-6">
          {lead.telefono && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone size={13} className="text-slate-600" />
              <a href={`tel:${lead.telefono}`} className="text-slate-400 hover:text-[#00d9ff] transition-colors">{lead.telefono}</a>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-[13px]">
              <Mail size={13} className="text-slate-600" />
              <a href={`mailto:${lead.email}`} className="text-slate-400 hover:text-[#00d9ff] transition-colors">{lead.email}</a>
            </div>
          )}
          {lead.sector && <div className="text-[12px]"><span className="text-slate-600">Sector: </span><span className="text-slate-300">{lead.sector}</span></div>}
          {lead.valor_estimado && <div className="text-[12px]"><span className="text-slate-600">Valor: </span><span className="font-mono text-[#00ff88]">{formatEuros(lead.valor_estimado)}</span></div>}
          {lead.origen && <div className="text-[12px]"><span className="text-slate-600">Origen: </span><span className="text-slate-300 capitalize">{lead.origen}</span></div>}
        </div>

        {lead.notas && (
          <div className="glass-card rounded-lg p-3 mb-6">
            <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Notas</div>
            <p className="text-[12px] text-slate-400 leading-relaxed">{lead.notas}</p>
          </div>
        )}

        {/* Actions */}
        {!isCerrado && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {colIdx > 0 && (
                <button onClick={() => onMover('atras')} className="btn-glow btn-shimmer flex-1 py-2.5 border border-[rgba(30,45,69,0.5)] rounded-lg text-[12px] text-slate-500 hover:text-slate-300 transition-all">
                  ← Atrás
                </button>
              )}
              <button onClick={() => onMover('adelante')} className="btn-glow btn-shimmer flex-1 py-2.5 bg-[#00d9ff]/10 border border-[#00d9ff]/20 rounded-lg text-[12px] text-[#00d9ff] hover:bg-[#00d9ff]/15 transition-all">
                Avanzar →
              </button>
            </div>
            <button onClick={onPerdido} className="btn-glow flex items-center justify-center gap-1.5 py-2 border border-red-400/20 rounded-lg text-[11px] text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all">
              <XCircle size={12} /> Marcar como perdido
            </button>
          </div>
        )}

        {confirmDelete && (
          <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3 mt-4">
            <p className="text-[12px] text-red-400 mb-3">¿Eliminar este lead?</p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={onDelete} className="flex-1">Eliminar</Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Lead Form Modal ─────────────────────────

function LeadFormModal({ open, lead, onClose, onSaved }: {
  open: boolean; lead?: Lead; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!lead
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: lead?.nombre ?? '', empresa: lead?.empresa ?? '',
    telefono: lead?.telefono ?? '', email: lead?.email ?? '',
    sector: lead?.sector ?? '', origen: (lead?.origen ?? '') as string,
    valor_estimado: lead?.valor_estimado?.toString() ?? '',
    notas: lead?.notas ?? '',
  })

  function u(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(), empresa: form.empresa.trim() || null,
        telefono: form.telefono.trim() || null, email: form.email.trim() || null,
        sector: form.sector.trim() || null,
        estado: (isEdit ? lead!.estado : 'visita_pendiente') as LeadEstado,
        origen: (form.origen || null) as LeadOrigen | null,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
        notas: form.notas.trim() || null,
      }
      if (isEdit) await updateLead(lead!.id, payload); else await createLead(payload)
      onSaved(); onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar lead' : 'Nuevo lead'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input label="Nombre *" value={form.nombre} onChange={(e) => u('nombre', e.target.value)} placeholder="Nombre del contacto" required />
        <Input label="Empresa" value={form.empresa} onChange={(e) => u('empresa', e.target.value)} placeholder="Empresa" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Teléfono" value={form.telefono} onChange={(e) => u('telefono', e.target.value)} placeholder="+34 600..." type="tel" />
          <Input label="Email" value={form.email} onChange={(e) => u('email', e.target.value)} placeholder="email@..." type="email" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Sector" value={form.sector} onChange={(e) => u('sector', e.target.value)} placeholder="Tech, salud..." />
          <Input label="Valor (€)" value={form.valor_estimado} onChange={(e) => u('valor_estimado', e.target.value)} placeholder="0" type="number" />
        </div>
        <Select label="Origen" value={form.origen} onChange={(e) => u('origen', e.target.value)} options={ORIGEN_OPTIONS} />
        <Textarea label="Notas" value={form.notas} onChange={(e) => u('notas', e.target.value)} placeholder="Apuntes..." />
        <div className="flex gap-2 mt-1">
          <Button type="submit" variant="primary" loading={saving} className="flex-1">{isEdit ? 'Guardar' : 'Crear lead'}</Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Cliente Activo Form (crea ingreso recurrente Logika) ──

function ClienteActivoFormModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ descripcion: '', importe: '', categoria: 'ingreso_mrr' })
  function u(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })) }

  const catOptions = Object.entries(CATEGORIA_LOGIKA_LABELS)
    .filter(([k]) => k.startsWith('ingreso'))
    .map(([v, l]) => ({ value: v, label: l }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.descripcion.trim() || !form.importe) return
    setSaving(true)
    try {
      // Crear como ingreso recurrente de Logika (sincroniza con Finanzas)
      await createTransaccionRecurrente({
        contexto: 'logika', tipo: 'ingreso',
        importe: Number(form.importe), descripcion: form.descripcion.trim(),
        categoria_logika: form.categoria || 'ingreso_mrr',
      })
      // También registrar como transacción real de este mes
      await createTransaccion({
        contexto: 'logika', tipo: 'ingreso',
        importe: Number(form.importe), descripcion: form.descripcion.trim(),
        categoria_logika: form.categoria || 'ingreso_mrr',
        fecha: format(new Date(), 'yyyy-MM-dd'),
      })
      await onSaved()
      setForm({ descripcion: '', importe: '', categoria: 'ingreso_mrr' })
      onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente recurrente">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input label="Cliente / servicio *" value={form.descripcion} onChange={(e) => u('descripcion', e.target.value)} placeholder="Ej: Mantenimiento web XYZ" required />
        <Input label="Importe mensual (€) *" value={form.importe} onChange={(e) => u('importe', e.target.value)} placeholder="0" type="number" step="0.01" required />
        <Select label="Tipo de ingreso" value={form.categoria} onChange={(e) => u('categoria', e.target.value)} options={catOptions} />
        <p className="text-[10px] text-slate-600">Se registra como ingreso fijo de Logika Digital en Finanzas.</p>
        <div className="flex gap-2 mt-1">
          <Button type="submit" variant="primary" loading={saving} className="flex-1">Añadir cliente</Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </form>
    </Modal>
  )
}
