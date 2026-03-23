'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overlay-backdrop" onClick={onClose}>
      <div
        className={cn(
          'w-full sm:max-w-[440px] max-h-[85vh] overflow-y-auto',
          'bg-[rgba(17,24,39,0.97)] backdrop-blur-2xl',
          'border border-[rgba(30,45,69,0.5)] rounded-t-2xl sm:rounded-2xl',
          'p-5 md:p-6 animate-slide-up',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="btn-glow p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Reusable form elements ──────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 block">{label}</span>
      <input
        className={cn(
          'w-full px-3 py-2.5 rounded-lg text-[13px] text-slate-200',
          'bg-[rgba(26,34,53,0.5)] border border-[rgba(30,45,69,0.5)]',
          'focus:border-[#00d9ff]/40 focus:outline-none focus:ring-1 focus:ring-[#00d9ff]/20',
          'placeholder:text-slate-600 transition-all',
          className
        )}
        {...props}
      />
    </label>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 block">{label}</span>
      <select
        className={cn(
          'w-full px-3 py-2.5 rounded-lg text-[13px] text-slate-200',
          'bg-[rgba(26,34,53,0.5)] border border-[rgba(30,45,69,0.5)]',
          'focus:border-[#00d9ff]/40 focus:outline-none focus:ring-1 focus:ring-[#00d9ff]/20',
          'transition-all appearance-none',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#111827]">
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 block">{label}</span>
      <textarea
        className={cn(
          'w-full px-3 py-2.5 rounded-lg text-[13px] text-slate-200 resize-none',
          'bg-[rgba(26,34,53,0.5)] border border-[rgba(30,45,69,0.5)]',
          'focus:border-[#00d9ff]/40 focus:outline-none focus:ring-1 focus:ring-[#00d9ff]/20',
          'placeholder:text-slate-600 transition-all',
          className
        )}
        rows={3}
        {...props}
      />
    </label>
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost'
  loading?: boolean
}

export function Button({ variant = 'primary', loading, children, className, disabled, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-[#00d9ff]/10 border-[#00d9ff]/20 text-[#00d9ff] hover:bg-[#00d9ff]/15 shadow-[0_0_15px_rgba(0,217,255,0.08)]',
    danger: 'bg-red-400/10 border-red-400/20 text-red-400 hover:bg-red-400/15',
    ghost: 'border-[rgba(30,45,69,0.5)] text-slate-500 hover:text-slate-300 hover:border-[rgba(30,45,69,0.8)]',
  }

  return (
    <button
      className={cn(
        'btn-glow btn-shimmer px-4 py-2.5 rounded-lg text-[12px] font-medium border transition-all',
        'disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  )
}
