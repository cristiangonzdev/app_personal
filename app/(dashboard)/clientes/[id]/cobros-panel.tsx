'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, MoreVertical, Repeat, Receipt, Check, Pause, Play, X } from 'lucide-react'
import { Button, Input, Label, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta, isVencida } from '@/lib/utils'
import { SERVICE_LABELS, STATUS_LABELS, type InvoiceStatus, type ServiceKind } from '@/types'
import {
  createInvoice, setInvoiceStatus, archiveInvoice,
  createSubscription, setSubscriptionStatus,
} from '../actions'

type Subscription = {
  id: string
  service: ServiceKind
  amount_monthly: number
  status: 'activa' | 'pausada' | 'cancelada'
  starts_on: string
  description: string | null
}

type Invoice = {
  id: string
  number: string | null
  status: InvoiceStatus
  total: number
  issue_date: string | null
  due_date: string | null
  notes: string | null
}

export function CobrosPanel({
  clientId, clientName, subscriptions, invoices,
}: {
  clientId: string
  clientName: string
  subscriptions: Subscription[]
  invoices: Invoice[]
}) {
  const subsActivas = subscriptions.filter(s => s.status === 'activa')
  const subsPausadas = subscriptions.filter(s => s.status === 'pausada')
  const mrr = subsActivas.reduce((s, x) => s + Number(x.amount_monthly), 0)
  const pendientes = invoices.filter(i => i.status !== 'pagada' && i.status !== 'anulada')
  const vencidas = pendientes.filter(i => isVencida(i.due_date))
  const cobrado = invoices.filter(i => i.status === 'pagada').reduce((s, i) => s + Number(i.total), 0)
  const porCobrar = pendientes.reduce((s, i) => s + Number(i.total), 0)

  return (
    <div className="space-y-4">
      {/* Métricas cobros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="MRR" value={formatEuros(mrr)} accent="green" />
        <MiniStat label="Por cobrar" value={formatEuros(porCobrar)} accent={porCobrar > 0 ? 'cyan' : 'slate'} sub={`${pendientes.length} factura(s)`} />
        <MiniStat label="Vencidas" value={String(vencidas.length)} accent={vencidas.length > 0 ? 'red' : 'slate'} sub={vencidas.length > 0 ? formatEuros(vencidas.reduce((s, i) => s + Number(i.total), 0)) : 'al día'} />
        <MiniStat label="Cobrado total" value={formatEuros(cobrado)} accent="slate" sub={`${invoices.filter(i => i.status === 'pagada').length} pagadas`} />
      </div>

      {/* Suscripciones */}
      <section className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md">
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Repeat size={14} className="text-accent-green" />
            <h3 className="text-[13px] font-medium text-slate-200">Suscripciones</h3>
            {subsActivas.length > 0 && <span className="text-[11px] font-mono text-accent-green ml-2">{formatEuros(mrr)}/mes</span>}
          </div>
          <NewSubButton clientId={clientId} clientName={clientName} />
        </header>

        {subscriptions.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[12px] text-slate-500">Este cliente no tiene suscripciones recurrentes.</p>
            <p className="text-[11px] text-slate-700 mt-1">Pulsa "+ Suscripción" para empezar a cobrar mensualmente.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {[...subsActivas, ...subsPausadas].map(s => {
              const dom = parseInt(s.starts_on.slice(8, 10), 10)
              return (
                <li key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-surface2/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-slate-200 font-medium">{SERVICE_LABELS[s.service]}</span>
                      <Badge tone={s.status === 'activa' ? 'green' : 'amber'}>{s.status}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cobra día {dom} de cada mes
                      {s.description && <span className="text-slate-600"> · {s.description}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[14px] font-mono text-accent-green">{formatEuros(Number(s.amount_monthly))}</span>
                    <SubMenu id={s.id} clientId={clientId} status={s.status} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Facturas */}
      <section className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md">
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-accent-cyan" />
            <h3 className="text-[13px] font-medium text-slate-200">Facturas</h3>
          </div>
          <NewInvoiceButton clientId={clientId} clientName={clientName} />
        </header>

        {invoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[12px] text-slate-500">Sin facturas todavía.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {invoices.map(i => {
              const venc = i.status !== 'pagada' && i.status !== 'anulada' && isVencida(i.due_date)
              return (
                <li key={i.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-surface2/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono text-slate-400">{i.number ?? '— borrador —'}</span>
                      <Badge tone={i.status === 'pagada' ? 'green' : venc || i.status === 'vencida' ? 'red' : i.status === 'borrador' ? 'slate' : 'cyan'}>
                        {STATUS_LABELS.invoice[i.status]}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{i.notes ?? 'Sin concepto'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[14px] font-mono text-slate-200">{formatEuros(Number(i.total))}</div>
                      {i.due_date && (
                        <div className={`text-[10px] font-mono ${venc ? 'text-accent-red' : 'text-slate-600'}`}>
                          {venc ? '⚠ vencía ' : 'vence '}{formatFechaCorta(i.due_date)}
                        </div>
                      )}
                    </div>
                    <InvoiceMenu id={i.id} clientId={clientId} status={i.status} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function MiniStat({ label, value, accent, sub }: {
  label: string
  value: string
  accent: 'cyan' | 'green' | 'red' | 'slate'
  sub?: string
}) {
  const map = { cyan: 'text-accent-cyan', green: 'text-accent-green', red: 'text-accent-red', slate: 'text-slate-300' }
  return (
    <div className="rounded-xl border border-border/60 bg-bg-surface/40 backdrop-blur-md p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 font-mono text-[18px] font-semibold ${map[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function NewSubButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus size={12} />Suscripción</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva suscripción para {clientName}</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            fd.set('client_id', clientId)
            const res = await createSubscription(fd)
            if (res.ok) { toast.success('Suscripción creada'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Servicio *</Label>
            <Select name="service" required defaultValue="software_custom">
              <option value="software_custom">Software</option>
              <option value="web">Web</option>
              <option value="chatbot">Chatbot</option>
              <option value="social_media_management">RRSS</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>€/mes *</Label><Input name="amount_monthly" type="number" step="0.01" required /></div>
            <div><Label>Cobrar día *</Label><Input name="starts_on" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          </div>
          <div><Label>Concepto</Label><Input name="description" placeholder="Mantenimiento web mensual…" /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewInvoiceButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}><Plus size={12} />Factura</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva factura para {clientName}</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            fd.set('client_id', clientId)
            const res = await createInvoice(fd)
            if (res.ok) { toast.success('Factura creada'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Concepto *</Label><Input name="description" placeholder="Setup web · Logika Digital" required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Subtotal €</Label><Input name="subtotal" type="number" step="0.01" required /></div>
            <div><Label>IGIC %</Label><Input name="igic_pct" type="number" step="0.1" defaultValue={7} /></div>
            <div><Label>Vence en (días)</Label><Input name="due_in_days" type="number" defaultValue={15} /></div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-300">
            <input type="checkbox" name="emit" defaultChecked className="accent-accent-cyan" />
            Emitir ahora (asigna número)
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function InvoiceMenu({ id, clientId, status }: { id: string; clientId: string; status: InvoiceStatus }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const action = (s: InvoiceStatus) => start(async () => {
    setOpen(false)
    const res = await setInvoiceStatus(id, s, clientId)
    if (res.ok) toast.success(`Marcada como ${s}`)
    else toast.error(res.error || 'Error')
  })
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-slate-200 p-1 rounded">
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-40 w-44 rounded-md border border-border bg-bg-surface shadow-lg py-1 text-[12px]">
            {status !== 'pagada' && <Item icon={Check} onClick={() => action('pagada')}>Marcar pagada</Item>}
            {status === 'borrador' && <Item onClick={() => action('emitida')}>Emitir</Item>}
            {status !== 'enviada' && status !== 'pagada' && <Item onClick={() => action('enviada')}>Marcar enviada</Item>}
            {status !== 'anulada' && <Item onClick={() => action('anulada')}>Anular</Item>}
            <Item destructive icon={X} onClick={() => start(async () => {
              if (!confirm('¿Eliminar esta factura?')) return
              const res = await archiveInvoice(id, clientId)
              if (res.ok) toast.success('Eliminada')
              else toast.error(res.error || 'Error')
              setOpen(false)
            })}>Eliminar</Item>
          </div>
        </>
      )}
      {pending && <span className="absolute -left-3 top-2 w-1.5 h-1.5 bg-accent-cyan rounded-full animate-pulse" />}
    </div>
  )
}

function SubMenu({ id, clientId, status }: { id: string; clientId: string; status: 'activa' | 'pausada' | 'cancelada' }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const action = (s: 'activa' | 'pausada' | 'cancelada') => start(async () => {
    setOpen(false)
    const res = await setSubscriptionStatus(id, s, clientId)
    if (res.ok) toast.success(`Suscripción ${s}`)
    else toast.error(res.error || 'Error')
  })
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-slate-200 p-1 rounded">
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-40 w-40 rounded-md border border-border bg-bg-surface shadow-lg py-1 text-[12px]">
            {status === 'activa' && <Item icon={Pause} onClick={() => action('pausada')}>Pausar</Item>}
            {status !== 'activa' && <Item icon={Play} onClick={() => action('activa')}>Reactivar</Item>}
            <Item destructive icon={X} onClick={() => action('cancelada')}>Cancelar</Item>
          </div>
        </>
      )}
      {pending && <span className="absolute -left-3 top-2 w-1.5 h-1.5 bg-accent-cyan rounded-full animate-pulse" />}
    </div>
  )
}

function Item({ children, onClick, destructive, icon: Icon }: {
  children: React.ReactNode
  onClick: () => void
  destructive?: boolean
  icon?: React.ElementType
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 hover:bg-bg-surface2 flex items-center gap-2 ${destructive ? 'text-accent-red' : 'text-slate-300'}`}
    >
      {Icon && <Icon size={11} />}
      {children}
    </button>
  )
}
