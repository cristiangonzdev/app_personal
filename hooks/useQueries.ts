import { useState, useEffect, useCallback } from 'react'
import {
  getLeadsActivos,
  getAllLeads,
  getTareasPendientes,
  getTransacciones,
  getTransaccionesRecurrentes,
  getResumenMensual,
  getProyectosActivos,
  getMetricasOverview,
  getMRR,
  getEventosSemana,
} from '@/lib/queries'
import type {
  Lead,
  Tarea,
  Transaccion,
  TransaccionRecurrente,
  Proyecto,
  Evento,
  MetricasOverview,
  ResumenFinanciero,
} from '@/types'

function useQuery<T>(queryFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await queryFn()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [queryFn])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// Solo leads activos en pipeline (sin cerrados)
export function useLeads() {
  return useQuery<Lead[]>(getLeadsActivos)
}

// Todos los leads incluyendo cerrados (para CRM)
export function useAllLeads() {
  return useQuery<Lead[]>(getAllLeads)
}

export function useTareas() {
  return useQuery<Tarea[]>(getTareasPendientes)
}

export function useTransacciones(contexto: 'personal' | 'logika', mes?: Date) {
  const fn = useCallback(
    () => getTransacciones(contexto, mes),
    [contexto, mes?.getMonth()]
  )
  return useQuery<Transaccion[]>(fn)
}

export function useTransaccionesRecurrentes(contexto: 'personal' | 'logika') {
  const fn = useCallback(
    () => getTransaccionesRecurrentes(contexto),
    [contexto]
  )
  return useQuery<TransaccionRecurrente[]>(fn)
}

export function useResumenMensual(contexto: 'personal' | 'logika') {
  const fn = useCallback(() => getResumenMensual(contexto, 6), [contexto])
  return useQuery<ResumenFinanciero[]>(fn)
}

export function useProyectos() {
  return useQuery<Proyecto[]>(getProyectosActivos)
}

export function useMetricasOverview() {
  return useQuery<MetricasOverview>(getMetricasOverview)
}

export function useMRR() {
  return useQuery<number>(getMRR)
}

export function useEventosSemana() {
  return useQuery<Evento[]>(getEventosSemana)
}
