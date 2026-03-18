'use client'

// ─────────────────────────────────────────────
// LOGIKA OS — UI Components
//
// Componentes base reutilizables en todo el app.
// Todos aceptan className para override puntual.
// ─────────────────────────────────────────────

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

// ─── Card ─────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  accent?: string // color del borde superior
}

export function Card({ children, className, accent }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[#111827] border border-[#1e2d45] rounded-xl p-5 relative overflow-hidden',
        className
      )}
    >
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: accent }}
        />
      )}
      {children}
    </div>
  )
}

// ─── CardTitle ────────────────────────────────

interface CardTitleProps {
  children: ReactNode
  action?: ReactNode
}

export function CardTitle({ children, action }: CardTitleProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">
        {children}
      </h3>
      {action && <div className="text-[11px] text-[#00d9ff]">{action}</div>}
    </div>
  )
}

// ─── MetricCard ───────────────────────────────

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  subColor?: 'green' | 'red' | 'amber' | 'muted'
  accent?: string
}

export function MetricCard({ label, value, sub, subColor = 'muted', accent }: MetricCardProps) {
  const subColorMap = {
    green: 'text-[#00ff88]',
    red: 'text-red-400',
    amber: 'text-amber-400',
    muted: 'text-slate-500',
  }

  return (
    <Card accent={accent}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
        {label}
      </div>
      <div className="text-[26px] font-bold font-mono tracking-tight text-slate-100">
        {value}
      </div>
      {sub && (
        <div className={cn('text-[11px] mt-1', subColorMap[subColor])}>
          {sub}
        </div>
      )}
    </Card>
  )
}

// ─── Badge ────────────────────────────────────

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'green' | 'amber' | 'red' | 'cyan' | 'blue'
  className?: string
}

const BADGE_VARIANTS = {
  default: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
  green: 'bg-green-400/10 text-green-400 border-green-400/20',
  amber: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  red: 'bg-red-400/10 text-red-400 border-red-400/20',
  cyan: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  blue: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border',
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// ─── PageHeader ───────────────────────────────

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase()

  return (
    <div className="flex items-start justify-between mb-7 animate-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <span className="font-mono text-[10px] text-slate-600 bg-[#111827] border border-[#1e2d45] px-2.5 py-1 rounded">
          {hoy}
        </span>
      </div>
    </div>
  )
}

// ─── Loading ──────────────────────────────────

export function LoadingSpinner({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-500 text-[13px]">
      <Loader2 size={14} className="animate-spin" />
      {text}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-slate-600 text-[13px]">
      {message}
    </div>
  )
}

// ─── ErrorState ───────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-[13px] text-red-400 bg-red-400/5 border border-red-400/20 rounded-lg px-4 py-3">
      Error: {message}
    </div>
  )
}
