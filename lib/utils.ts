import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isPast, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEuros(amount: number | null | undefined): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

export function formatEurosExact(amount: number | null | undefined): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0)
}

export function formatFechaCorta(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—'
  const parsed = typeof fecha === 'string' ? parseISO(fecha) : fecha
  if (!isValid(parsed)) return '—'
  if (isToday(parsed)) return 'Hoy'
  return format(parsed, 'd MMM', { locale: es })
}

export function formatFechaLarga(fecha: string | Date): string {
  const parsed = typeof fecha === 'string' ? parseISO(fecha) : fecha
  if (!isValid(parsed)) return '—'
  return format(parsed, "d 'de' MMMM 'de' yyyy", { locale: es })
}

export function isVencida(fecha: string | null | undefined): boolean {
  if (!fecha) return false
  const parsed = parseISO(fecha)
  return isValid(parsed) && isPast(parsed) && !isToday(parsed)
}

// Supabase joins llegan como T[] o T según relación. Pick seguro.
export function pickRel<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel
}
