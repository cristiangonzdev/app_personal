'use client'

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
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="
        hidden md:flex
        w-[220px] flex-shrink-0
        flex-col h-screen sticky top-0
        bg-[rgba(17,24,39,0.7)] backdrop-blur-xl
        border-r border-[rgba(30,45,69,0.5)]
        z-30
      ">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-[rgba(30,45,69,0.5)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ff88] flex items-center justify-center">
              <Zap size={14} className="text-[#060a14]" />
            </div>
            <span className="font-bold text-[15px] tracking-widest">
              <span className="text-[#00d9ff]">LOGIKA</span>{' '}
              <span className="text-[#00ff88]">OS</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'nav-item flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium',
                  active
                    ? 'active text-[#00d9ff]'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[rgba(30,45,69,0.5)]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] pulse-glow" />
            <span className="text-[11px] text-slate-500 font-medium">Bot activo</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
            <Zap size={10} className="text-[#00d9ff]" />
            n8n · Supabase
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className="
        md:hidden fixed top-0 left-0 right-0 z-40
        h-14 flex items-center justify-between px-4
        bg-[rgba(6,10,20,0.85)] backdrop-blur-xl
        border-b border-[rgba(30,45,69,0.5)]
        safe-top
      ">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#00d9ff] to-[#00ff88] flex items-center justify-center">
            <Zap size={11} className="text-[#060a14]" />
          </div>
          <span className="font-bold text-[13px] tracking-widest">
            <span className="text-[#00d9ff]">LOGIKA</span>{' '}
            <span className="text-[#00ff88]">OS</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] pulse-glow" />
          <span className="text-[10px] text-slate-500 font-mono">Online</span>
        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="
        md:hidden fixed bottom-0 left-0 right-0 z-40
        bottom-nav safe-bottom
      ">
        <div className="flex items-center justify-around px-2 py-1.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'bottom-nav-item flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl min-w-[56px]',
                  active ? 'active' : 'text-slate-600'
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[9px] font-medium tracking-wide">{label}</span>
                <div className={cn(
                  'nav-dot w-1 h-1 rounded-full bg-[#00d9ff]',
                  active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                )} />
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
