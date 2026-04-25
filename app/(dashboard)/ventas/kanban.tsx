'use client'

import { useEffect, useState, useTransition } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import { DEAL_STAGES, SERVICE_LABELS, type Deal, type DealStage } from '@/types'
import { formatEuros, formatFechaCorta } from '@/lib/utils'
import { moveDealStage, archiveDeal } from './actions'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { Sparkles, Clock, Trash2 } from 'lucide-react'
import { EditDealButton } from './deal-form'

export function Kanban({ initialDeals, clients }: { initialDeals: Deal[]; clients: { id: string; name: string }[] }) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [, startTransition] = useTransition()

  // Realtime: cualquier cambio en deals refresca local state
  useEffect(() => {
    const sb = getSupabaseBrowser()
    const channel = sb
      .channel('deals-kanban')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, (payload) => {
        setDeals((prev) => {
          if (payload.eventType === 'INSERT') return [payload.new as Deal, ...prev]
          if (payload.eventType === 'DELETE') return prev.filter(d => d.id !== (payload.old as Deal).id)
          return prev.map(d => d.id === (payload.new as Deal).id ? (payload.new as Deal) : d)
        })
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return
    const next = r.destination.droppableId as DealStage
    const id = r.draggableId
    const original = deals
    setDeals((prev) => prev.map(d => d.id === id ? { ...d, stage: next } : d))
    startTransition(async () => {
      const res = await moveDealStage(id, next)
      if (!res.ok) {
        setDeals(original)
        toast.error(`No se pudo mover: ${res.error}`)
      } else if (next === 'ganado') {
        toast.success('Deal ganado · cliente, proyecto y factura creados')
      } else {
        toast.success(`Movido a ${next}`)
      }
    })
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
        {DEAL_STAGES.map(stage => {
          const items = deals.filter(d => d.stage === stage.key)
          const total = items.reduce((s, d) => s + Number(d.setup_amount) + Number(d.recurring_amount) * 12, 0)
          return (
            <Droppable key={stage.key} droppableId={stage.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-w-[260px] w-[260px] snap-start rounded-lg bg-bg-surface/50 backdrop-blur-md border ${snapshot.isDraggingOver ? 'border-accent-cyan/50' : 'border-border'} p-3`}
                >
                  <div className={`flex items-center justify-between mb-2 pb-2 border-b border-border border-l-2 ${stage.tone} pl-2 -ml-3 -mt-1 pt-1`}>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{stage.label}</span>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
                      <span>{items.length}</span>
                      <span>·</span>
                      <span>{formatEuros(total)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-h-[40px]">
                    {items.map((d, i) => (
                      <Draggable key={d.id} draggableId={d.id} index={i}>
                        {(p) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            className="kanban-card group rounded-md border border-border bg-bg-surface px-3 py-2.5 cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[12px] font-medium text-slate-200 line-clamp-2">{d.title}</span>
                              {d.score !== null && d.score !== undefined && (
                                <span className={`flex items-center gap-0.5 text-[10px] font-mono ${d.score >= 70 ? 'text-accent-green' : d.score >= 40 ? 'text-accent-amber' : 'text-slate-500'}`}>
                                  <Sparkles size={9} />{d.score}
                                </span>
                              )}
                            </div>
                            {d.services?.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {d.services.map(s => (
                                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-accent-violet/10 text-accent-violet uppercase tracking-wider">
                                    {SERVICE_LABELS[s]}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2 text-[10px] font-mono">
                              <span className="text-accent-green">{formatEuros(Number(d.setup_amount))}</span>
                              {Number(d.recurring_amount) > 0 && (
                                <span className="text-accent-cyan">+{formatEuros(Number(d.recurring_amount))}/mes</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-600">
                              <Clock size={9} />
                              <span>{formatFechaCorta(d.last_activity_at)}</span>
                              <span className="ml-auto">{d.probability}%</span>
                            </div>
                            {d.next_best_action && (
                              <div className="mt-2 pt-2 border-t border-border text-[10px] text-slate-400 italic line-clamp-2">
                                → {d.next_best_action}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={(e) => e.stopPropagation()}>
                              <EditDealButton deal={d} clients={clients} />
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (!confirm('¿Archivar este deal?')) return
                                  const res = await archiveDeal(d.id)
                                  if (res.ok) { toast.success('Deal archivado'); setDeals(prev => prev.filter(x => x.id !== d.id)) }
                                  else toast.error(res.error || 'Error')
                                }}
                                className="text-[10px] text-slate-600 hover:text-accent-red flex items-center gap-1"
                              >
                                <Trash2 size={11} />Archivar
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          )
        })}
      </div>
    </DragDropContext>
  )
}
