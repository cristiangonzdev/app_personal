'use client'

// ─────────────────────────────────────────────
// LOGIKA OS — Sidebar
//
// Navegación lateral con:
// - Logo
// - Links con estado activo
// - Indicador de bot activo
// - Responsive: se colapsa en móvil
// ─────────────────────────────────────────────

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  TrendingUp,
  Calendar,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',          label: 'Overview',    icon: LayoutDashboard },
  { href: '/crm',       label: 'CRM',         icon: Users },
  { href: '/tareas',    label: 'Tareas',       icon: CheckSquare },
  { href: '/finanzas',  label: 'Finanzas',     icon: TrendingUp },
  { href: '/calendario',label: 'Calendario',   icon: Calendar },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="
      w-[200px] flex-shrink-0
      bg-[#111827] border-r border-[#1e2d45]
      flex flex-col
      h-screen sticky top-0
    ">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#1e2d45]">
        <span className="font-bold text-[15px] tracking-widest text-[#00d9ff]">
          LOGIKA <span className="text-[#00ff88]">OS</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-all duration-150',
                active
                  ? 'bg-[#00d9ff]/10 text-[#00d9ff] border-l-2 border-[#00d9ff] pl-[10px]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a2235]'
              )}
            >
              <Icon size={14} className="flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — estado del bot */}
      <div className="px-5 py-4 border-t border-[#1e2d45]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] pulse-dot" />
          <span className="text-[11px] text-slate-500">Bot activo</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
          <Zap size={10} />
          n8n · Supabase
        </div>
      </div>
    </aside>
  )
}
