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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-6 h-14 border-b border-border/60 bg-bg/80 backdrop-blur-md">
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2.5 px-3.5 h-9 rounded-lg border border-border/60 bg-bg-surface/60 text-[12px] text-slate-500 hover:text-slate-300 hover:border-accent-cyan/30 transition-all w-[320px]"
      >
        <Search size={13} />
        <span className="flex-1 text-left">Buscar lead, cliente…</span>
        <kbd className="flex items-center gap-0.5 text-[10px] text-slate-600">
          <Command size={10} />K
        </kbd>
      </button>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-mono hidden sm:inline">
        {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  )
}
