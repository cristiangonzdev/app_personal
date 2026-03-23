'use client'

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
import type { TransaccionContexto } from '@/types'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function FinanzasPage() {
  const [contexto, setContexto] = useState<TransaccionContexto>('personal')

  return (
    <div className="animate-in">
      <PageHeader title="Finanzas" subtitle="Personal y Logika Digital — separadas" />

      {/* Toggle */}
      <div className="inline-flex glass-card rounded-lg p-1 mb-6">
        {(['personal', 'logika'] as TransaccionContexto[]).map((ctx) => (
          <button
            key={ctx}
            onClick={() => setContexto(ctx)}
            className={cn(
              'btn-glow px-4 py-1.5 rounded-md text-[12px] font-medium transition-all',
              contexto === ctx
                ? 'bg-[rgba(0,217,255,0.1)] text-[#00d9ff] shadow-[0_0_15px_rgba(0,217,255,0.1)]'
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
    <div className="animate-slide-up">
      {/* Month metrics - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="glass-card rounded-xl p-4 relative overflow-hidden">
          <div className="accent-line absolute top-0 left-0 right-0 h-[2px] bg-[#00ff88]" />
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Ingresos</div>
          <div className="font-mono text-[20px] md:text-[22px] font-bold text-[#00ff88] animate-count">{formatEuros(ingresos)}</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={11} className="text-[#00ff88]" />
            <span className="text-[10px] text-slate-600">{new Date().toLocaleDateString('es-ES', { month: 'long' })}</span>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 relative overflow-hidden">
          <div className="accent-line absolute top-0 left-0 right-0 h-[2px] bg-[#ef4444]" />
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Gastos</div>
          <div className="font-mono text-[20px] md:text-[22px] font-bold text-red-400 animate-count">{formatEuros(gastos)}</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown size={11} className="text-red-400" />
            <span className="text-[10px] text-slate-600">{new Date().toLocaleDateString('es-ES', { month: 'long' })}</span>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 relative overflow-hidden">
          <div className="accent-line absolute top-0 left-0 right-0 h-[2px] bg-[#00d9ff]" />
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Balance</div>
          <div className={cn('font-mono text-[20px] md:text-[22px] font-bold animate-count', balance >= 0 ? 'text-[#00d9ff]' : 'text-red-400')}>{formatEuros(balance)}</div>
          <div className="text-[10px] text-slate-600 mt-1">{balance >= 0 ? 'Positivo' : 'Negativo'}</div>
        </div>
      </div>

      {/* Chart */}
      <Card className="mb-4">
        <CardTitle>Evolución 6 meses</CardTitle>
        {loadingResumen ? <LoadingSpinner /> : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resumen ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,69,0.5)" vertical={false} />
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
                  contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(30,45,69,0.5)', borderRadius: 12, fontSize: 12, backdropFilter: 'blur(20px)' }}
                  labelFormatter={formatMes}
                  formatter={(value: number) => [formatEuros(value), '']}
                />
                <Bar dataKey="ingresos" fill="#00ff88" radius={[4, 4, 0, 0]} maxBarSize={28} name="Ingresos" />
                <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* By category */}
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
                      <div className="h-1.5 bg-[rgba(26,34,53,0.6)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full animate-progress"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </Card>

        {/* Transactions */}
        <Card>
          <CardTitle>Últimas transacciones</CardTitle>
          {loading ? <LoadingSpinner /> : (transacciones ?? []).length === 0 ? (
            <EmptyState message="Sin transacciones este mes" />
          ) : (
            <div className="flex flex-col gap-0.5 stagger">
              {(transacciones ?? []).slice(0, 12).map((t) => (
                <div key={t.id} className="tx-row flex items-center gap-2 py-2 px-1 rounded-md border-b border-[rgba(26,34,53,0.5)] last:border-0">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    t.tipo === 'ingreso' ? 'bg-[#00ff88]' : 'bg-red-400'
                  )} />
                  <span className="flex-1 text-[12px] text-slate-400 truncate">{t.descripcion}</span>
                  <span className="text-[10px] text-slate-600 flex-shrink-0 hidden sm:inline">{formatFechaCorta(t.fecha)}</span>
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
