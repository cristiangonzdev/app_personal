'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Sparkles, Users, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',          label: 'Inicio',    icon: Home },
  { href: '/leads',     label: 'Leads',     icon: Sparkles },
  { href: '/clientes',  label: 'Clientes',  icon: Users },
  { href: '/marketing', label: 'Marketing', icon: Megaphone },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="hidden md:flex w-[210px] shrink-0 flex-col border-r border-border/60 bg-bg-surface/30 backdrop-blur-md">
      <div className="px-5 py-6">
        <div className="text-[20px] font-semibold tracking-tight">Logika<span className="text-accent-cyan">·</span>CRM</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600 mt-1">Cristian · Lanzarote</div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map((item) => {
          const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all',
                active
                  ? 'bg-accent-cyan/10 text-accent-cyan ring-1 ring-accent-cyan/20'
                  : 'text-slate-400 hover:bg-bg-surface2/60 hover:text-slate-100',
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.7} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-5 pb-5 pt-4 border-t border-border/40">
        <div className="text-[10px] uppercase tracking-widest text-slate-600">Servicios</div>
        <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
          Software · Web<br />Chatbot · RRSS
        </div>
      </div>
    </aside>
  )
}
