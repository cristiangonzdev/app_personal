// ─────────────────────────────────────────────
// LOGIKA OS — Custom Hooks
//
// Cada hook encapsula:
// - El estado de carga (loading)
// - El estado de error (error)
// - Los datos (data)
// - Una función para refrescar (refetch)
//
// Uso en cualquier componente:
//   const { data: leads, loading, refetch } = useLeads()
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import {
  getLeadsActivos,
  getTareasPendientes,
  getTransacciones,
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
  Proyecto,
  Evento,
  MetricasOverview,
  ResumenFinanciero,
} from '@/types'

// ─── Factory genérico ────────────────────────
// Evita repetir el mismo patrón loading/error/data
// en cada hook. Recibe una función async y devuelve
// el hook completo.

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

// ─── Hooks específicos ───────────────────────

export function useLeads() {
  return useQuery<Lead[]>(getLeadsActivos)
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
