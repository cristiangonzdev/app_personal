'use client'

// ─────────────────────────────────────────────
// LOGIKA OS — CRM Page
//
// Kanban completo con todos los estados del pipeline.
// Permite mover leads entre columnas con un click.
// ─────────────────────────────────────────────

import { useState } from 'react'
import { useLeads } from '@/hooks/useQueries'
import { updateLeadEstado } from '@/lib/queries'
import {
  Card, CardTitle, Badge, PageHeader, LoadingSpinner, EmptyState, ErrorState
} from '@/components/ui'
import { formatEuros, LEAD_ESTADO_LABELS, LEAD_ESTADO_DOT, cn } from '@/lib/utils'
import type { Lead, LeadEstado } from '@/types'
import { Phone, Mail, ChevronRight, ChevronLeft } from 'lucide-react'

// Pipeline completo — de izquierda a derecha
const PIPELINE: LeadEstado[] = [
  'prospecto',
  'visita_pendiente',
  'contactado',
  'caliente',
  'propuesta_enviada',
]

// Colores del borde superior de cada columna
const COL_ACCENTS: Record<LeadEstado, string> = {
  prospecto: '#64748b',
  visita_pendiente: '#f59e0b',
  contactado: '#3b82f6',
  caliente: '#f97316',
  propuesta_enviada: '#00d9ff',
  cerrado_ganado: '#00ff88',
  cerrado_perdido: '#ef4444',
}

export default function CRMPage() {
  const { data: leads, loading, error, refetch } = useLeads()
  const [movingId, setMovingId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Agrupar leads por estado
  const kanban = PIPELINE.map((estado) => ({
    estado,
    leads: (leads ?? []).filter((l) => l.estado === estado),
  }))

  // Mover lead al estado anterior o siguiente
  async function moverLead(lead: Lead, direccion: 'adelante' | 'atras') {
    const idx = PIPELINE.indexOf(lead.estado)
    const nuevoIdx = direccion === 'adelante' ? idx + 1 : idx - 1
    if (nuevoIdx < 0 || nuevoIdx >= PIPELINE.length) return

    setMovingId(lead.id)
    try {
      await updateLeadEstado(lead.id, PIPELINE[nuevoIdx])
      await refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setMovingId(null)
    }
  }

  if (error) return <ErrorState message={error} />

  return (
    <div className="animate-in">
      <PageHeader
        title="CRM"
        subtitle={`${(leads ?? []).length} leads activos en pipeline`}
      />

      {loading ? (
        <LoadingSpinner text="Cargando pipeline..." />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {kanban.map(({ estado, leads: colLeads }) => (
            <div key={estado} className="flex-shrink-0 w-[200px]">
              {/* Header de columna */}
              <div
                className="rounded-t-lg px-3 py-2 flex items-center justify-between mb-0.5"
                style={{ borderTop: `2px solid ${COL_ACCENTS[estado]}` }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', LEAD_ESTADO_DOT[estado])}
                  />
                  <span className="text-[11px] text-slate-400 font-medium">
                    {LEAD_ESTADO_LABELS[estado]}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-600">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {colLeads.length === 0 ? (
                  <div className="text-[11px] text-slate-700 text-center py-4 bg-[#111827] border border-[#1e2d45] rounded-lg">
                    Vacío
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isMoving={movingId === lead.id}
                      onSelect={() => setSelectedLead(lead)}
                      onMover={moverLead}
                      pipelineIndex={PIPELINE.indexOf(lead.estado)}
                      pipelineLength={PIPELINE.length}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel lateral de detalle */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onMover={async (dir) => {
            await moverLead(selectedLead, dir)
            // Actualizar el lead seleccionado
            const idx = PIPELINE.indexOf(selectedLead.estado)
            const nuevoIdx = dir === 'adelante' ? idx + 1 : idx - 1
            if (nuevoIdx >= 0 && nuevoIdx < PIPELINE.length) {
              setSelectedLead({ ...selectedLead, estado: PIPELINE[nuevoIdx] })
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Lead Card ────────────────────────────────

interface LeadCardProps {
  lead: Lead
  isMoving: boolean
  onSelect: () => void
  onMover: (lead: Lead, dir: 'adelante' | 'atras') => void
  pipelineIndex: number
  pipelineLength: number
}

function LeadCard({ lead, isMoving, onSelect, onMover, pipelineIndex, pipelineLength }: LeadCardProps) {
  return (
    <div
      className={cn(
        'bg-[#111827] border border-[#1e2d45] rounded-lg p-3 cursor-pointer',
        'hover:border-[#2a3f5f] transition-all duration-150',
        isMoving && 'opacity-50'
      )}
      onClick={onSelect}
    >
      <div className="font-medium text-[13px] text-slate-200 truncate mb-0.5">
        {lead.nombre}
      </div>
      {lead.empresa && (
        <div className="text-[11px] text-slate-600 truncate mb-2">{lead.empresa}</div>
      )}
      {lead.sector && (
        <Badge variant="default" className="mb-2">{lead.sector}</Badge>
      )}
      {lead.valor_estimado && (
        <div className="font-mono text-[11px] text-[#00ff88] mb-2">
          {formatEuros(lead.valor_estimado)}
        </div>
      )}

      {/* Controles de mover */}
      <div className="flex gap-1 mt-2 pt-2 border-t border-[#1e2d45]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onMover(lead, 'atras')}
          disabled={pipelineIndex === 0 || isMoving}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-slate-600 hover:text-slate-400 hover:bg-[#1a2235] disabled:opacity-20 transition-all"
        >
          <ChevronLeft size={10} /> Atrás
        </button>
        <button
          onClick={() => onMover(lead, 'adelante')}
          disabled={pipelineIndex === pipelineLength - 1 || isMoving}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-slate-600 hover:text-[#00d9ff] hover:bg-[#00d9ff]/5 disabled:opacity-20 transition-all"
        >
          Avanzar <ChevronRight size={10} />
        </button>
      </div>
    </div>
  )
}

// ─── Lead Detail Panel ────────────────────────

function LeadDetail({
  lead,
  onClose,
  onMover,
}: {
  lead: Lead
  onClose: () => void
  onMover: (dir: 'adelante' | 'atras') => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-[340px] h-full bg-[#111827] border-l border-[#1e2d45] p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="text-[11px] text-slate-500 hover:text-slate-300 mb-5"
        >
          ← Cerrar
        </button>

        <h2 className="text-[18px] font-bold text-slate-100 mb-0.5">{lead.nombre}</h2>
        {lead.empresa && (
          <div className="text-[13px] text-slate-500 mb-4">{lead.empresa}</div>
        )}

        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-5"
          style={{ background: `${COL_ACCENTS[lead.estado]}15`, border: `1px solid ${COL_ACCENTS[lead.estado]}30` }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: COL_ACCENTS[lead.estado] }} />
          <span className="text-[11px]" style={{ color: COL_ACCENTS[lead.estado] }}>
            {LEAD_ESTADO_LABELS[lead.estado]}
          </span>
        </div>

        {/* Detalles */}
        <div className="flex flex-col gap-3 mb-6">
          {lead.telefono && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone size={13} className="text-slate-600" />
              <a href={`tel:${lead.telefono}`} className="text-slate-400 hover:text-[#00d9ff]">
                {lead.telefono}
              </a>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-[13px]">
              <Mail size={13} className="text-slate-600" />
              <a href={`mailto:${lead.email}`} className="text-slate-400 hover:text-[#00d9ff]">
                {lead.email}
              </a>
            </div>
          )}
          {lead.sector && (
            <div className="text-[12px]">
              <span className="text-slate-600">Sector: </span>
              <span className="text-slate-300">{lead.sector}</span>
            </div>
          )}
          {lead.valor_estimado && (
            <div className="text-[12px]">
              <span className="text-slate-600">Valor estimado: </span>
              <span className="font-mono text-[#00ff88]">{formatEuros(lead.valor_estimado)}</span>
            </div>
          )}
          {lead.origen && (
            <div className="text-[12px]">
              <span className="text-slate-600">Origen: </span>
              <span className="text-slate-300 capitalize">{lead.origen}</span>
            </div>
          )}
        </div>

        {lead.notas && (
          <div className="bg-[#1a2235] rounded-lg p-3 mb-6">
            <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Notas</div>
            <p className="text-[12px] text-slate-400 leading-relaxed">{lead.notas}</p>
          </div>
        )}

        {/* Mover */}
        <div className="flex gap-2">
          <button
            onClick={() => onMover('atras')}
            disabled={PIPELINE.indexOf(lead.estado) === 0}
            className="flex-1 py-2 border border-[#1e2d45] rounded-lg text-[12px] text-slate-500 hover:text-slate-300 hover:border-[#2a3f5f] disabled:opacity-20 transition-all"
          >
            ← Atrás
          </button>
          <button
            onClick={() => onMover('adelante')}
            disabled={PIPELINE.indexOf(lead.estado) === PIPELINE.length - 1}
            className="flex-1 py-2 bg-[#00d9ff]/10 border border-[#00d9ff]/20 rounded-lg text-[12px] text-[#00d9ff] hover:bg-[#00d9ff]/15 disabled:opacity-20 transition-all"
          >
            Avanzar →
          </button>
        </div>
      </div>
    </div>
  )
}
