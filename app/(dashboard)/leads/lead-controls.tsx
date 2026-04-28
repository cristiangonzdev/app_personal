'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight, MoreVertical, Trophy, X } from 'lucide-react'
import { moveLeadStage, archiveLead } from './actions'

const FLOW: Record<string, { label: string; next: string }> = {
  lead:        { label: 'Cualificar',   next: 'cualificado' },
  cualificado: { label: 'Propuesta',    next: 'propuesta' },
  propuesta:   { label: 'Negociación',  next: 'negociacion' },
  negociacion: { label: 'Ganar',        next: 'ganado' },
}

export function LeadStageControls({ id, stage }: { id: string; stage: string }) {
  const [pending, start] = useTransition()
  const [menu, setMenu] = useState(false)
  const router = useRouter()
  const flow = FLOW[stage]

  const move = (target: string) => start(async () => {
    setMenu(false)
    const res = await moveLeadStage(id, target)
    if (!res.ok) { toast.error(res.error || 'Error'); return }
    if (target === 'ganado' && 'client_id' in res && res.client_id) {
      toast.success('🎉 Convertido en cliente')
      router.push(`/clientes/${res.client_id}`)
    } else {
      toast.success(`→ ${target}`)
    }
  })

  return (
    <div className="flex items-center gap-1 shrink-0">
      {flow && (
        <button
          disabled={pending}
          onClick={() => move(flow.next)}
          className="text-[11px] px-2 py-1 rounded-md border border-border/60 text-slate-300 hover:border-accent-cyan/50 hover:text-accent-cyan inline-flex items-center gap-1 disabled:opacity-50"
        >
          {flow.next === 'ganado' ? <Trophy size={11} /> : <ChevronRight size={11} />}
          {flow.label}
        </button>
      )}
      <div className="relative">
        <button
          onClick={() => setMenu(o => !o)}
          className="p-1 text-slate-500 hover:text-slate-200 rounded"
        >
          <MoreVertical size={14} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-7 z-40 w-44 rounded-md border border-border bg-bg-surface shadow-lg py-1 text-[12px]">
              {(['lead', 'cualificado', 'propuesta', 'negociacion'] as const).map(s => (
                s !== stage && (
                  <button
                    key={s}
                    onClick={() => move(s)}
                    className="w-full text-left px-3 py-1.5 hover:bg-bg-surface2 text-slate-300"
                  >
                    Mover a {s}
                  </button>
                )
              ))}
              <button
                onClick={() => move('perdido')}
                className="w-full text-left px-3 py-1.5 hover:bg-bg-surface2 text-accent-amber"
              >
                Marcar perdido
              </button>
              <button
                onClick={() => start(async () => {
                  if (!confirm('¿Archivar este lead?')) return
                  const res = await archiveLead(id)
                  if (res.ok) toast.success('Lead archivado')
                  else toast.error(res.error || 'Error')
                  setMenu(false)
                })}
                className="w-full text-left px-3 py-1.5 hover:bg-bg-surface2 text-accent-red flex items-center gap-1"
              >
                <X size={11} />Archivar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
