// Tipos manuales hasta que `pnpm db:types` genere database.ts.
// Espejo de los enums del schema.

export type ServiceKind = 'software_custom' | 'chatbot' | 'web' | 'social_media_management'
export type DealStage = 'lead' | 'cualificado' | 'propuesta' | 'negociacion' | 'ganado' | 'perdido'
export type DealSource = 'linkedin' | 'referido' | 'cold_outreach' | 'inbound_web' | 'otro'
export type ClientType = 'lead' | 'one_shot' | 'recurrente'
export type ProjectStatus = 'planificado' | 'en_curso' | 'pausado' | 'entregado' | 'cancelado'
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'
export type InvoiceStatus = 'borrador' | 'emitida' | 'enviada' | 'pagada' | 'vencida' | 'anulada'
export type SubscriptionStatus = 'activa' | 'pausada' | 'cancelada'
export type CommChannel = 'whatsapp' | 'email' | 'vapi' | 'sms' | 'manual'
export type CommDirection = 'in' | 'out'
export type ContentStatus = 'idea' | 'guion' | 'grabado' | 'editado' | 'publicado'
export type ContentKind = 'reel' | 'post' | 'story' | 'blog' | 'email' | 'short'

export const DEAL_STAGES: { key: DealStage; label: string; tone: string }[] = [
  { key: 'lead',         label: 'Lead',         tone: 'border-l-slate-400' },
  { key: 'cualificado',  label: 'Cualificado',  tone: 'border-l-blue-400' },
  { key: 'propuesta',    label: 'Propuesta',    tone: 'border-l-cyan-400' },
  { key: 'negociacion',  label: 'Negociación',  tone: 'border-l-orange-400' },
  { key: 'ganado',       label: 'Ganado',       tone: 'border-l-green-400' },
  { key: 'perdido',      label: 'Perdido',      tone: 'border-l-red-400' },
]

export const SERVICE_LABELS: Record<string, string> = {
  software_custom: 'Software',
  chatbot: 'Chatbot',
  web: 'Web',
  social_media_management: 'RRSS',
}

export const STATUS_LABELS: {
  invoice: Record<string, string>
  project: Record<string, string>
  task: Record<string, string>
} = {
  invoice: {
    borrador: 'Borrador', emitida: 'Emitida', enviada: 'Enviada',
    pagada: 'Pagada', vencida: 'Vencida', anulada: 'Anulada',
  },
  project: {
    planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado',
    entregado: 'Entregado', cancelado: 'Cancelado',
  },
  task: { todo: 'Por hacer', doing: 'En curso', blocked: 'Bloqueada', done: 'Hecha' },
}

export interface Deal {
  id: string
  title: string
  client_id: string | null
  services: ServiceKind[]
  setup_amount: number
  recurring_amount: number
  probability: number
  expected_close: string | null
  source: DealSource
  stage: DealStage
  score: number | null
  score_reasoning: string | null
  next_best_action: string | null
  last_activity_at: string
  created_at: string
}

export interface Client {
  id: string
  legal_name: string
  commercial_name: string | null
  client_type: ClientType
  fiscal_id: string | null
  igic: boolean
  sector: string | null
  ticket_avg: number | null
  tags: string[]
  created_at: string
}

export interface Invoice {
  id: string
  number: string | null
  client_id: string
  status: InvoiceStatus
  issue_date: string | null
  due_date: string | null
  paid_at: string | null
  subtotal: number
  igic_amount: number
  total: number
  notes: string | null
}

export interface Project {
  id: string
  client_id: string
  name: string
  kind: ServiceKind
  status: ProjectStatus
  starts_on: string | null
  ends_on: string | null
}

export interface Task {
  id: string
  project_id: string
  title: string
  status: TaskStatus
  due_on: string | null
}

export interface Communication {
  id: string
  client_id: string | null
  channel: CommChannel
  direction: CommDirection
  from_addr: string | null
  body: string | null
  occurred_at: string
  needs_attention: boolean
}
