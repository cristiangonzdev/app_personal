'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function FilterTabs({ param, active, options }: {
  param: string
  active: string
  options: { key: string; label: string; count?: number }[]
}) {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()

  const setKey = (k: string) => {
    const params = new URLSearchParams(sp.toString())
    if (k === 'todos') params.delete(param); else params.set(param, k)
    router.replace(`${path}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex gap-1 text-[11px] flex-wrap">
      {options.map(t => (
        <button
          key={t.key}
          onClick={() => setKey(t.key)}
          className={cn(
            'px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5',
            active === t.key
              ? 'bg-accent-cyan/15 text-accent-cyan'
              : 'text-slate-500 hover:bg-bg-surface2 hover:text-slate-300',
          )}
        >
          {t.label}
          {t.count != null && <span className="text-[9px] font-mono text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
