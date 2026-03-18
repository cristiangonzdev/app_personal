// ─────────────────────────────────────────────
// LOGIKA OS — Types
// Estos tipos reflejan exactamente el schema
// de Supabase. Si cambias una tabla, cambia
// aquí también.
// ─────────────────────────────────────────────

export type LeadEstado =
  | 'prospecto'
  | 'visita_pendiente'
  | 'contactado'
  | 'caliente'
  | 'propuesta_enviada'
  | 'cerrado_ganado'
  | 'cerrado_perdido'

export type LeadOrigen = 'referido' | 'visita' | 'outbound' | 'inbound'

export type ProyectoTipo =
  | 'bot_whatsapp'
  | 'web_app'
  | 'scraper'
  | 'voz_vapi'
  | 'automatizacion'
  | 'otro'

export type ProyectoEstado = 'activo' | 'pausado' | 'completado' | 'cancelado'

export type TareaEstado = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'

export type TransaccionTipo = 'ingreso' | 'gasto'

export type TransaccionContexto = 'personal' | 'logika'

export type CategoriaPersonal =
  | 'sueldo_ingresos'
  | 'alimentacion'
  | 'transporte'
  | 'ocio'
  | 'marketing_contenido'
  | 'infra_software'
  | 'otro'

export type CategoriaLogika =
  | 'ingreso_proyecto'
  | 'ingreso_mrr'
  | 'infra_software'
  | 'marketing'
  | 'herramientas'
  | 'otro'

// ─── Entidades principales ───────────────────

export interface Lead {
  id: string
  nombre: string
  empresa: string | null
  telefono: string | null
  email: string | null
  sector: string | null
  estado: LeadEstado
  origen: LeadOrigen | null
  valor_estimado: number | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Proyecto {
  id: string
  lead_id: string | null
  nombre: string
  tipo: ProyectoTipo
  estado: ProyectoEstado
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  precio_setup: number | null
  precio_mrr: number | null
  notas: string | null
  created_at: string
  updated_at: string
  // join
  lead?: Pick<Lead, 'nombre' | 'empresa'>
}

export interface Tarea {
  id: string
  titulo: string
  estado: TareaEstado
  lead_id: string | null
  proyecto_id: string | null
  fecha_limite: string | null
  recordatorio_dia_antes: boolean
  recordatorio_mismo_dia: boolean
  hora_recordatorio: string
  completada_at: string | null
  created_at: string
  updated_at: string
  // join
  lead?: Pick<Lead, 'nombre' | 'empresa'>
}

export interface Transaccion {
  id: string
  contexto: TransaccionContexto
  tipo: TransaccionTipo
  importe: number
  descripcion: string
  categoria_personal: CategoriaPersonal | null
  categoria_logika: CategoriaLogika | null
  lead_id: string | null
  proyecto_id: string | null
  fecha: string
  created_at: string
}

export interface PresupuestoMensual {
  id: string
  anio: number
  mes: number
  categoria: CategoriaPersonal
  importe: number
}

export interface Evento {
  id: string
  gcal_event_id: string | null
  titulo: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string | null
  lead_id: string | null
  created_at: string
}

// ─── Tipos de UI / derivados ─────────────────

// Para el kanban — leads agrupados por estado
export type KanbanColumn = {
  estado: LeadEstado
  label: string
  leads: Lead[]
}

// Para el resumen financiero mensual
export type ResumenFinanciero = {
  mes: string         // "2026-03"
  ingresos: number
  gastos: number
  balance: number
}

// Para las métricas del overview
export type MetricasOverview = {
  leads_activos: number
  visitas_pendientes: number
  mrr_logika: number
  tareas_hoy: number
  tareas_vencidas: number
  balance_personal_mes: number
}

// Labels legibles para la UI
export const LEAD_ESTADO_LABELS: Record<LeadEstado, string> = {
  prospecto: 'Prospecto',
  visita_pendiente: 'Visita pendiente',
  contactado: 'Contactado',
  caliente: 'Caliente',
  propuesta_enviada: 'Propuesta enviada',
  cerrado_ganado: 'Cerrado — ganado',
  cerrado_perdido: 'Cerrado — perdido',
}

export const CATEGORIA_PERSONAL_LABELS: Record<CategoriaPersonal, string> = {
  sueldo_ingresos: 'Sueldo / ingresos',
  alimentacion: 'Alimentación',
  transporte: 'Transporte',
  ocio: 'Ocio',
  marketing_contenido: 'Marketing',
  infra_software: 'Infra / software',
  otro: 'Otro',
}

export const CATEGORIA_LOGIKA_LABELS: Record<CategoriaLogika, string> = {
  ingreso_proyecto: 'Proyecto (setup)',
  ingreso_mrr: 'MRR recurrente',
  infra_software: 'Infra / software',
  marketing: 'Marketing',
  herramientas: 'Herramientas',
  otro: 'Otro',
}

export const PROYECTO_TIPO_LABELS: Record<ProyectoTipo, string> = {
  bot_whatsapp: 'Bot WhatsApp',
  web_app: 'Web App',
  scraper: 'Scraper',
  voz_vapi: 'Agente de voz',
  automatizacion: 'Automatización',
  otro: 'Otro',
}
