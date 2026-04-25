'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, KanbanSquare, Users, FolderKanban, Receipt,
  MessageSquareText, Megaphone, BarChart3, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',               label: 'Cockpit',        icon: LayoutDashboard },
  { href: '/ventas',         label: 'Ventas',         icon: KanbanSquare },
  { href: '/clientes',       label: 'Clientes',       icon: Users },
  { href: '/proyectos',      label: 'Proyectos',      icon: FolderKanban },
  { href: '/pagos',          label: 'Pagos',          icon: Receipt },
  { href: '/comunicaciones', label: 'Inbox',          icon: MessageSquareText },
  { href: '/marketing',      label: 'Marketing',      icon: Megaphone },
  { href: '/analytics',      label: 'Analytics',      icon: BarChart3 },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="hidden md:flex w-[200px] flex-col border-r border-border bg-bg-surface/40 backdrop-blur-md">
      <div className="px-4 py-5 border-b border-border">
        <div className="text-[18px] font-semibold tracking-tight">Logika<span className="text-accent-cyan">·</span>OS</div>
        <div className="text-[10px] uppercase tracking-widest text-slate-600 mt-0.5">CRM v1</div>
      </div>
      <nav className="flex-1 py-3 px-2">
        {NAV.map((item) => {
          const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors',
                active
                  ? 'bg-accent-cyan/10 text-accent-cyan border-l-2 border-accent-cyan -ml-[2px] pl-[14px]'
                  : 'text-slate-400 hover:bg-bg-surface2 hover:text-slate-200',
              )}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-2 py-3 border-t border-border">
        <Link
          href="/configuracion"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-slate-500 hover:bg-bg-surface2 hover:text-slate-300"
        >
          <Settings size={15} />
          <span>Configuración</span>
        </Link>
      </div>
    </aside>
  )
}
