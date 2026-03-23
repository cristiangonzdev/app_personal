import { getSupabaseBrowser } from './supabase'
import type {
  Lead,
  Tarea,
  Transaccion,
  Proyecto,
  PresupuestoMensual,
  Evento,
  LeadEstado,
  TareaEstado,
  MetricasOverview,
  ResumenFinanciero,
} from '@/types'
import { startOfMonth, endOfMonth, format, isToday, isPast, parseISO } from 'date-fns'

// ─── LEADS ───────────────────────────────────

export async function getLeads(estado?: LeadEstado): Promise<Lead[]> {
  const sb = getSupabaseBrowser()
  let query = sb
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Lead[]
}

export async function getLeadsActivos(): Promise<Lead[]> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .in('estado', ['prospecto', 'visita_pendiente', 'contactado', 'caliente', 'propuesta_enviada'])
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Lead[]
}

export async function updateLeadEstado(id: string, estado: LeadEstado): Promise<void> {
  const sb = getSupabaseBrowser()
  const { error } = await sb
    .from('leads')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function createLead(lead: Partial<Lead>): Promise<Lead> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('leads')
    .insert(lead)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Lead
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Lead
}

export async function deleteLead(id: string): Promise<void> {
  const sb = getSupabaseBrowser()
  const { error } = await sb
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── TAREAS ──────────────────────────────────

export async function getTareas(estado?: string): Promise<Tarea[]> {
  const sb = getSupabaseBrowser()
  let query = sb
    .from('tareas')
    .select('*, lead:lead_id(nombre, empresa)')
    .order('fecha_limite', { ascending: true, nullsFirst: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Tarea[]
}

export async function getTareasPendientes(): Promise<Tarea[]> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('tareas')
    .select('*, lead:lead_id(nombre, empresa)')
    .eq('estado', 'pendiente')
    .order('fecha_limite', { ascending: true, nullsFirst: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as unknown as Tarea[]
}

export async function completarTarea(id: string): Promise<void> {
  const sb = getSupabaseBrowser()
  const { error } = await sb
    .from('tareas')
    .update({
      estado: 'completada',
      completada_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function createTarea(tarea: {
  titulo: string
  lead_id?: string | null
  fecha_limite?: string | null
  recordatorio_mismo_dia?: boolean
  hora_recordatorio?: string
}): Promise<Tarea> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('tareas')
    .insert({
      titulo: tarea.titulo,
      estado: 'pendiente' as TareaEstado,
      lead_id: tarea.lead_id || null,
      fecha_limite: tarea.fecha_limite || null,
      recordatorio_mismo_dia: tarea.recordatorio_mismo_dia ?? false,
      hora_recordatorio: tarea.hora_recordatorio ?? '09:00',
      recordatorio_dia_antes: false,
    })
    .select('*, lead:lead_id(nombre, empresa)')
    .single()

  if (error) throw error
  return data as unknown as Tarea
}

export async function updateTarea(id: string, updates: Partial<Tarea>): Promise<Tarea> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('tareas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, lead:lead_id(nombre, empresa)')
    .single()

  if (error) throw error
  return data as unknown as Tarea
}

export async function deleteTarea(id: string): Promise<void> {
  const sb = getSupabaseBrowser()
  const { error } = await sb
    .from('tareas')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── TRANSACCIONES ───────────────────────────

export async function getTransacciones(
  contexto: 'personal' | 'logika',
  mes?: Date
): Promise<Transaccion[]> {
  const sb = getSupabaseBrowser()
  const fechaRef = mes ?? new Date()
  const desde = format(startOfMonth(fechaRef), 'yyyy-MM-dd')
  const hasta = format(endOfMonth(fechaRef), 'yyyy-MM-dd')

  const { data, error } = await sb
    .from('transacciones')
    .select('*')
    .eq('contexto', contexto)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Transaccion[]
}

export async function createTransaccion(tx: {
  contexto: 'personal' | 'logika'
  tipo: 'ingreso' | 'gasto'
  importe: number
  descripcion: string
  categoria_personal?: string | null
  categoria_logika?: string | null
  fecha?: string
}): Promise<Transaccion> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('transacciones')
    .insert({
      contexto: tx.contexto,
      tipo: tx.tipo,
      importe: tx.importe,
      descripcion: tx.descripcion,
      categoria_personal: tx.categoria_personal || null,
      categoria_logika: tx.categoria_logika || null,
      fecha: tx.fecha ?? format(new Date(), 'yyyy-MM-dd'),
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as Transaccion
}

export async function deleteTransaccion(id: string): Promise<void> {
  const sb = getSupabaseBrowser()
  const { error } = await sb
    .from('transacciones')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getResumenMensual(
  contexto: 'personal' | 'logika',
  meses: number = 6
): Promise<ResumenFinanciero[]> {
  const sb = getSupabaseBrowser()
  const resultado: ResumenFinanciero[] = []

  for (let i = meses - 1; i >= 0; i--) {
    const fecha = new Date()
    fecha.setMonth(fecha.getMonth() - i)
    const mesStr = format(fecha, 'yyyy-MM')
    const desde = `${mesStr}-01`
    const hasta = format(endOfMonth(fecha), 'yyyy-MM-dd')

    const { data } = await sb
      .from('transacciones')
      .select('tipo, importe')
      .eq('contexto', contexto)
      .gte('fecha', desde)
      .lte('fecha', hasta)

    const ingresos = (data ?? [])
      .filter((t) => t.tipo === 'ingreso')
      .reduce((acc, t) => acc + Number(t.importe), 0)

    const gastos = (data ?? [])
      .filter((t) => t.tipo === 'gasto')
      .reduce((acc, t) => acc + Number(t.importe), 0)

    resultado.push({ mes: mesStr, ingresos, gastos, balance: ingresos - gastos })
  }

  return resultado
}

export async function getPresupuestosMes(
  anio: number,
  mes: number
): Promise<PresupuestoMensual[]> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('presupuestos_mensuales')
    .select('*')
    .eq('anio', anio)
    .eq('mes', mes)

  if (error) throw error
  return (data ?? []) as unknown as PresupuestoMensual[]
}

// ─── PROYECTOS ───────────────────────────────

export async function getProyectosActivos(): Promise<Proyecto[]> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('proyectos')
    .select('*, lead:lead_id(nombre, empresa)')
    .eq('estado', 'activo')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Proyecto[]
}

// ─── MRR ─────────────────────────────────────

export async function getMRR(): Promise<number> {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from('proyectos')
    .select('precio_mrr')
    .eq('estado', 'activo')
    .not('precio_mrr', 'is', null)

  if (error) throw error
  return (data ?? []).reduce((acc, p) => acc + Number(p.precio_mrr ?? 0), 0)
}

// ─── EVENTOS ─────────────────────────────────

export async function getEventosSemana(): Promise<Evento[]> {
  const sb = getSupabaseBrowser()
  const hoy = new Date()
  const en7dias = new Date()
  en7dias.setDate(en7dias.getDate() + 7)

  const { data, error } = await sb
    .from('eventos')
    .select('*')
    .gte('fecha_inicio', hoy.toISOString())
    .lte('fecha_inicio', en7dias.toISOString())
    .order('fecha_inicio', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as Evento[]
}

// ─── MÉTRICAS OVERVIEW ───────────────────────

export async function getMetricasOverview(): Promise<MetricasOverview> {
  const [leadsActivos, tareasPendientes, mrr, transPersonal] = await Promise.all([
    getLeadsActivos(),
    getTareasPendientes(),
    getMRR(),
    getTransacciones('personal'),
  ])

  const hoy = format(new Date(), 'yyyy-MM-dd')

  const tareasHoy = tareasPendientes.filter(
    (t) => t.fecha_limite === hoy
  ).length

  const tareasVencidas = tareasPendientes.filter(
    (t) => t.fecha_limite !== null && t.fecha_limite < hoy
  ).length

  const visitasPendientes = leadsActivos.filter(
    (l) => l.estado === 'visita_pendiente'
  ).length

  const ingresosMes = transPersonal
    .filter((t) => t.tipo === 'ingreso')
    .reduce((acc, t) => acc + Number(t.importe), 0)

  const gastosMes = transPersonal
    .filter((t) => t.tipo === 'gasto')
    .reduce((acc, t) => acc + Number(t.importe), 0)

  return {
    leads_activos: leadsActivos.length,
    visitas_pendientes: visitasPendientes,
    mrr_logika: mrr,
    tareas_hoy: tareasHoy,
    tareas_vencidas: tareasVencidas,
    balance_personal_mes: ingresosMes - gastosMes,
  }
}
