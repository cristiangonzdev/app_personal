'use client'

import { useEffect, useState } from 'react'
import { Search, Command } from 'lucide-react'
import { CommandPalette } from './command-palette'

export function Topbar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 h-12 border-b border-border bg-bg/85 backdrop-blur-md">
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 px-3 h-8 rounded-md border border-border bg-bg-surface text-[12px] text-slate-500 hover:text-slate-300 hover:border-border-hi transition-colors w-[280px]"
      >
        <Search size={13} />
        <span className="flex-1 text-left">Buscar cliente, deal, factura…</span>
        <kbd className="flex items-center gap-0.5 text-[10px] text-slate-600">
          <Command size={10} />K
        </kbd>
      </button>
      <div className="text-[10px] uppercase tracking-widest text-slate-600 font-mono hidden sm:inline">
        single-user mode
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  )
}
