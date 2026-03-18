'use client'

// ─────────────────────────────────────────────
// LOGIKA OS — Finanzas Page
//
// Dos vistas (Personal / Logika) con:
// - Resumen del mes
// - Gráfico de 6 meses (barras)
// - Lista de transacciones
// - Barras de progreso por categoría
// ─────────────────────────────────────────────

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { useTransacciones, useResumenMensual } from '@/hooks/useQueries'
import {
  Card, CardTitle, PageHeader, LoadingSpinner, EmptyState, ErrorState
} from '@/components/ui'
import {
  formatEuros, formatMes, formatFechaCorta, cn,
  CATEGORIA_PERSONAL_LABELS, CATEGORIA_LOGIKA_LABELS
} from '@/lib/utils'
import type { TransaccionContexto, CategoriaPersonal, CategoriaLogika } from '@/types'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function FinanzasPage() {
  const [contexto, setContexto] = useState<TransaccionContexto>('personal')

  return (
    <div className="animate-in">
      <PageHeader title="Finanzas" subtitle="Personal y Logika Digital — separadas" />

      {/* Toggle de contexto */}
      <div className="inline-flex bg-[#111827] border border-[#1e2d45] rounded-lg p-1 mb-6">
        {(['personal', 'logika'] as TransaccionContexto[]).map((ctx) => (
          <button
            key={ctx}
            onClick={() => setContexto(ctx)}
            className={cn(
              'px-4 py-1.5 rounded text-[12px] font-medium transition-all',
              contexto === ctx
                ? 'bg-[#1a2235] text-[#00d9ff]'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {ctx === 'personal' ? 'Personal' : 'Logika Digital'}
          </button>
        ))}
      </div>

      <FinanzasContexto key={contexto} contexto={contexto} />
    </div>
  )
}

// ─── Vista por contexto ───────────────────────

function FinanzasContexto({ contexto }: { contexto: TransaccionContexto }) {
  const { data: transacciones, loading, error } = useTransacciones(contexto)
  const { data: resumen, loading: loadingResumen } = useResumenMensual(contexto)

  if (error) return <ErrorState message={error} />

  const ingresos = (transacciones ?? [])
    .filter((t) => t.tipo === 'ingreso')
    .reduce((acc, t) => acc + Number(t.importe), 0)

  const gastos = (transacciones ?? [])
    .filter((t) => t.tipo === 'gasto')
    .reduce((acc, t) => acc + Number(t.importe), 0)

  const balance = ingresos - gastos

  // Agrupar gastos por categoría
  const catKey = contexto === 'personal' ? 'categoria_personal' : 'categoria_logika'
  const labels = contexto === 'personal' ? CATEGORIA_PERSONAL_LABELS : CATEGORIA_LOGIKA_LABELS

  const porCategoria = (transacciones ?? [])
    .filter((t) => t.tipo === 'gasto')
    .reduce((acc, t) => {
      const cat = (t[catKey] as string) ?? 'otro'
      acc[cat] = (acc[cat] ?? 0) + Number(t.importe)
      return acc
    }, {} as Record<string, number>)

  const totalGastos = Object.values(porCategoria).reduce((a, b) => a + b, 0)

  return (
    <div>
      {/* Métricas del mes */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4" style={{ borderTop: '2px solid #00ff88' }}>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Ingresos</div>
          <div className="font-mono text-[22px] font-bold text-[#00ff88]">{formatEuros(ingresos)}</div>
          <div className="flex items-center gap-1 mt-1"><TrendingUp size={11} className="text-[#00ff88]" /><span className="text-[10px] text-slate-600">{new Date().toLocaleDateString('es-ES', { month: 'long' })}</span></div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4" style={{ borderTop: '2px solid #ef4444' }}>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Gastos</div>
          <div className="font-mono text-[22px] font-bold text-red-400">{formatEuros(gastos)}</div>
          <div className="flex items-center gap-1 mt-1"><TrendingDown size={11} className="text-red-400" /><span className="text-[10px] text-slate-600">{new Date().toLocaleDateString('es-ES', { month: 'long' })}</span></div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4" style={{ borderTop: '2px solid #00d9ff' }}>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Balance</div>
          <div className={cn('font-mono text-[22px] font-bold', balance >= 0 ? 'text-[#00d9ff]' : 'text-red-400')}>{formatEuros(balance)}</div>
          <div className="text-[10px] text-slate-600 mt-1">{balance >= 0 ? 'Positivo' : 'Negativo'}</div>
        </div>
      </div>

      {/* Gráfico 6 meses */}
      <Card className="mb-4">
        <CardTitle>Evolución 6 meses</CardTitle>
        {loadingResumen ? <LoadingSpinner /> : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resumen ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tickFormatter={formatMes}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}€`}
                />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={formatMes}
                  formatter={(value: number) => [formatEuros(value), '']}
                />
                <Bar dataKey="ingresos" fill="#00ff88" radius={[3, 3, 0, 0]} maxBarSize={28} name="Ingresos" />
                <Bar dataKey="gastos" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={28} name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Por categoría */}
        <Card>
          <CardTitle>Gastos por categoría</CardTitle>
          {loading ? <LoadingSpinner /> : Object.keys(porCategoria).length === 0 ? (
            <EmptyState message="Sin gastos este mes" />
          ) : (
            <div className="flex flex-col gap-3 stagger">
              {Object.entries(porCategoria)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, importe]) => {
                  const pct = totalGastos > 0 ? Math.round((importe / totalGastos) * 100) : 0
                  const barColor = pct >= 30 ? '#ef4444' : pct >= 20 ? '#f59e0b' : '#00d9ff'
                  return (
                    <div key={cat}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[12px] text-slate-400">
                          {(labels as Record<string, string>)[cat] ?? cat}
                        </span>
                        <span className="font-mono text-[12px] text-slate-300">
                          {formatEuros(importe)} <span className="text-slate-600">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1a2235] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </Card>

        {/* Lista de transacciones */}
        <Card>
          <CardTitle>Últimas transacciones</CardTitle>
          {loading ? <LoadingSpinner /> : (transacciones ?? []).length === 0 ? (
            <EmptyState message="Sin transacciones este mes" />
          ) : (
            <div className="flex flex-col gap-1 stagger">
              {(transacciones ?? []).slice(0, 12).map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-[#1a2235] last:border-0">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    t.tipo === 'ingreso' ? 'bg-[#00ff88]' : 'bg-red-400'
                  )} />
                  <span className="flex-1 text-[12px] text-slate-400 truncate">{t.descripcion}</span>
                  <span className="text-[10px] text-slate-600 flex-shrink-0">{formatFechaCorta(t.fecha)}</span>
                  <span className={cn(
                    'font-mono text-[12px] flex-shrink-0 w-16 text-right',
                    t.tipo === 'ingreso' ? 'text-[#00ff88]' : 'text-red-400'
                  )}>
                    {t.tipo === 'ingreso' ? '+' : '-'}{formatEuros(t.importe)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
