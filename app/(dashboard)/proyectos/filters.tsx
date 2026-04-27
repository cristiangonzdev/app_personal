'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type Counts = { todos: number; activos: number; entregados: number; cancelados: number }

const TABS: { key: string; label: string; countKey: keyof Counts }[] = [
  { key: 'activos', label: 'Activos', countKey: 'activos' },
  { key: 'entregados', label: 'Entregados', countKey: 'entregados' },
  { key: 'cancelados', label: 'Cancelados', countKey: 'cancelados' },
  { key: 'todos', label: 'Todos', countKey: 'todos' },
]

export function ProjectFilters({ active, counts }: { active: string; counts: Counts }) {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()

  const setEstado = (k: string) => {
    const params = new URLSearchParams(sp.toString())
    if (k === 'activos') params.delete('estado'); else params.set('estado', k)
    router.replace(`${path}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex gap-1 text-[11px]">
      {TABS.map(t => (
        <button
          key={t.key}
          onClick={() => setEstado(t.key)}
          className={cn(
            'px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5',
            active === t.key
              ? 'bg-accent-cyan/15 text-accent-cyan'
              : 'text-slate-500 hover:bg-bg-surface2 hover:text-slate-300',
          )}
        >
          {t.label}
          <span className="text-[9px] font-mono text-slate-600">{counts[t.countKey]}</span>
        </button>
      ))}
    </div>
  )
}
