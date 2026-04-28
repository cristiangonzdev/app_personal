'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Counts = { todos: number; recurrente: number; one_shot: number }

const TABS: { key: string; label: string; countKey: keyof Counts }[] = [
  { key: 'todos', label: 'Todos', countKey: 'todos' },
  { key: 'recurrente', label: 'Recurrentes', countKey: 'recurrente' },
  { key: 'one_shot', label: 'One-shot', countKey: 'one_shot' },
]

export function ClientFilters({ active, q, counts }: { active: string; q: string; counts: Counts }) {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()
  const [, start] = useTransition()
  const [text, setText] = useState(q)

  useEffect(() => { setText(q) }, [q])

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString())
      if (text) params.set('q', text); else params.delete('q')
      start(() => router.replace(`${path}?${params.toString()}`, { scroll: false }))
    }, 250)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const setTipo = (k: string) => {
    const params = new URLSearchParams(sp.toString())
    if (k === 'todos') params.delete('tipo'); else params.set('tipo', k)
    router.replace(`${path}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px] max-w-xs">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Buscar por nombre o sector…"
          className="w-full h-9 pl-8 pr-8 rounded-lg bg-bg-surface/60 border border-border/60 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-cyan/50"
        />
        {text && (
          <button onClick={() => setText('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex gap-1 text-[11px]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTipo(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5',
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
    </div>
  )
}
