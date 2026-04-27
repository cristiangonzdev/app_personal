'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type Counts = {
  pendientes: number
  vencidas: number
  pagadas: number
  borradores: number
  todas: number
}

const TABS: { key: keyof Counts; label: string }[] = [
  { key: 'pendientes', label: 'Por cobrar' },
  { key: 'vencidas', label: 'Vencidas' },
  { key: 'pagadas', label: 'Pagadas' },
  { key: 'borradores', label: 'Borradores' },
  { key: 'todas', label: 'Todas' },
]

export function InvoiceFilter({ active, counts }: { active: string; counts: Counts }) {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()

  const setFilter = (k: string) => {
    const params = new URLSearchParams(sp.toString())
    params.set('filter', k)
    router.replace(`${path}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex gap-1 text-[11px]">
      {TABS.map(t => (
        <button
          key={t.key}
          onClick={() => setFilter(t.key)}
          className={cn(
            'px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5',
            active === t.key
              ? 'bg-accent-cyan/15 text-accent-cyan'
              : 'text-slate-500 hover:bg-bg-surface2 hover:text-slate-300',
          )}
        >
          {t.label}
          <span className="text-[9px] font-mono text-slate-600">{counts[t.key]}</span>
        </button>
      ))}
    </div>
  )
}
