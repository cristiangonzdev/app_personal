// ─────────────────────────────────────────────
// LOGIKA OS — Utils
// ─────────────────────────────────────────────

import { clsx, type ClassValue } from 'clsx'
import { format, isToday, isPast, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

// Re-exportamos los labels desde @/types para que los pages
// puedan importarlos desde '@/lib/utils'
export {
  LEAD_ESTADO_LABELS,
  CATEGORIA_PERSONAL_LABELS,
  CATEGORIA_LOGIKA_LABELS,
  PROYECTO_TIPO_LABELS,
} from '@/types'

// Merge clases Tailwind de forma segura
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Formatear moneda en euros
export function formatEuros(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formatear fecha corta: "18 mar"
export function formatFechaCorta(fecha: string | null): string {
  if (!fecha) return '—'
  const parsed = parseISO(fecha)
  if (!isValid(parsed)) return '—'
  if (isToday(parsed)) return 'Hoy'
  return format(parsed, 'd MMM', { locale: es })
}

// Formatear fecha larga: "18 de marzo de 2026"
export function formatFechaLarga(fecha: string): string {
  const parsed = parseISO(fecha)
  if (!isValid(parsed)) return '—'
  return format(parsed, "d 'de' MMMM 'de' yyyy", { locale: es })
}

// Formatear mes: "mar 2026"
export function formatMes(mesStr: string): string {
  const [anio, mes] = mesStr.split('-')
  const fecha = new Date(Number(anio), Number(mes) - 1, 1)
  return format(fecha, 'MMM yyyy', { locale: es })
}

// Determinar si una tarea está vencida
export function isTareaVencida(fechaLimite: string | null): boolean {
  if (!fechaLimite) return false
  const parsed = parseISO(fechaLimite)
  return isPast(parsed) && !isToday(parsed)
}

// Colores del pipeline por estado
export const LEAD_ESTADO_COLORS: Record<string, string> = {
  prospecto: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  visita_pendiente: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  contactado: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  caliente: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  propuesta_enviada: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  cerrado_ganado: 'text-green-400 bg-green-400/10 border-green-400/20',
  cerrado_perdido: 'text-red-400 bg-red-400/10 border-red-400/20',
}

// Dot color para kanban
export const LEAD_ESTADO_DOT: Record<string, string> = {
  prospecto: 'bg-slate-400',
  visita_pendiente: 'bg-amber-400',
  contactado: 'bg-blue-400',
  caliente: 'bg-orange-400',
  propuesta_enviada: 'bg-cyan-400',
  cerrado_ganado: 'bg-green-400',
  cerrado_perdido: 'bg-red-400',
}

// Calcular porcentaje de progreso (para barras de presupuesto)
export function calcularProgreso(gastado: number, presupuesto: number): number {
  if (presupuesto === 0) return 0
  return Math.min(Math.round((gastado / presupuesto) * 100), 100)
}

// Color de la barra según progreso
export function colorProgreso(porcentaje: number): string {
  if (porcentaje >= 90) return 'bg-red-500'
  if (porcentaje >= 70) return 'bg-amber-500'
  return 'bg-cyan-500'
}
