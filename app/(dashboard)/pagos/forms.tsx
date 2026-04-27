'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Plus, MoreVertical } from 'lucide-react'
import {
  createInvoice, setInvoiceStatus, archiveInvoice,
  createSubscription, setSubscriptionStatus,
} from './actions'

type Client = { id: string; name: string }

export function NewInvoiceButton({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} />Nueva factura</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva factura</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            const res = await createInvoice(fd)
            if (res.ok) { toast.success('Factura creada'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Cliente *</Label>
            <Select name="client_id" required>
              <option value="" disabled>— elegir —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div><Label>Descripción / concepto *</Label><Input name="description" required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Subtotal €</Label><Input name="subtotal" type="number" step="0.01" required /></div>
            <div><Label>IGIC %</Label><Input name="igic_pct" type="number" step="0.1" defaultValue={7} /></div>
            <div><Label>IRPF %</Label><Input name="irpf_pct" type="number" step="0.1" defaultValue={0} /></div>
          </div>
          <div><Label>Vencimiento (días)</Label><Input name="due_in_days" type="number" defaultValue={15} /></div>
          <label className="flex items-center gap-2 text-[12px] text-slate-300">
            <input type="checkbox" name="emit" defaultChecked className="accent-accent-cyan" />
            Emitir ahora (asigna número y fecha)
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

export function NewSubscriptionButton({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus size={13} />Nueva suscripción</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva suscripción mensual</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            const res = await createSubscription(fd)
            if (res.ok) { toast.success('Suscripción creada'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Cliente *</Label>
            <Select name="client_id" required>
              <option value="" disabled>— elegir —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div><Label>Servicio *</Label>
            <Select name="service" required>
              <option value="software_custom">Software</option>
              <option value="chatbot">Chatbot</option>
              <option value="web">Web</option>
              <option value="social_media_management">RRSS</option>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>€/mes</Label><Input name="amount_monthly" type="number" step="0.01" required /></div>
            <div><Label>IGIC %</Label><Input name="igic_pct" type="number" step="0.1" defaultValue={7} /></div>
            <div><Label>IRPF %</Label><Input name="irpf_pct" type="number" step="0.1" defaultValue={0} /></div>
          </div>
          <div><Label>Inicio *</Label><Input name="starts_on" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div><Label>Descripción</Label><Input name="description" /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function InvoiceMenu({ id, status }: { id: string; status: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const action = (s: 'borrador' | 'emitida' | 'enviada' | 'pagada' | 'vencida' | 'anulada') => start(async () => {
    const res = await setInvoiceStatus(id, s)
    if (res.ok) toast.success(`Marcada como ${s}`)
    else toast.error(res.error || 'Error')
    setOpen(false)
  })
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-slate-200 p-1"><MoreVertical size={13} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-40 w-44 rounded-md border border-border bg-bg-surface shadow-lg py-1 text-[12px]">
            {status !== 'pagada' && <MenuItem onClick={() => action('pagada')}>Marcar pagada</MenuItem>}
            {status === 'borrador' && <MenuItem onClick={() => action('emitida')}>Emitir</MenuItem>}
            {status !== 'enviada' && status !== 'pagada' && <MenuItem onClick={() => action('enviada')}>Marcar enviada</MenuItem>}
            {status !== 'anulada' && <MenuItem onClick={() => action('anulada')}>Anular</MenuItem>}
            <MenuItem destructive onClick={() => start(async () => {
              if (!confirm('¿Eliminar esta factura?\n\nSe ocultará del listado pero se conserva el histórico.')) return
              const res = await archiveInvoice(id)
              if (res.ok) toast.success('Eliminada')
              else toast.error(res.error || 'Error')
              setOpen(false)
            })}>Eliminar</MenuItem>
          </div>
        </>
      )}
      {pending && <span className="absolute -left-4 top-1.5 w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />}
    </div>
  )
}

export function SubscriptionMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const action = (s: 'activa' | 'pausada' | 'cancelada') => start(async () => {
    const res = await setSubscriptionStatus(id, s)
    if (res.ok) toast.success(`Suscripción ${s}`)
    else toast.error(res.error || 'Error')
    setOpen(false)
  })
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-slate-200 p-1"><MoreVertical size={13} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-40 w-40 rounded-md border border-border bg-bg-surface shadow-lg py-1 text-[12px]">
            <MenuItem onClick={() => action('pausada')}>Pausar</MenuItem>
            <MenuItem onClick={() => action('activa')}>Reactivar</MenuItem>
            <MenuItem destructive onClick={() => action('cancelada')}>Cancelar</MenuItem>
          </div>
        </>
      )}
      {pending && <span className="absolute -left-4 top-1.5 w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />}
    </div>
  )
}

function MenuItem({ children, onClick, destructive }: { children: React.ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 hover:bg-bg-surface2 ${destructive ? 'text-accent-red' : 'text-slate-300'}`}
    >{children}</button>
  )
}
