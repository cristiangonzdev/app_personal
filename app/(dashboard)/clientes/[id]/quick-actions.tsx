'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Receipt, Repeat, FolderKanban, Plus } from 'lucide-react'
import { Button, Input, Label, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { quickInvoice, quickSubscription, quickProject } from '../actions'

export function QuickActions({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [menu, setMenu] = useState(false)
  const [active, setActive] = useState<'invoice' | 'sub' | 'project' | null>(null)

  return (
    <>
      <div className="relative">
        <Button size="sm" variant="outline" onClick={() => setMenu(o => !o)}>
          <Plus size={13} />Acción rápida
        </Button>
        {menu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-40 w-52 rounded-md border border-border bg-bg-surface shadow-lg py-1 text-[12px]">
              <MenuItem icon={Receipt} onClick={() => { setMenu(false); setActive('invoice') }}>Crear factura</MenuItem>
              <MenuItem icon={Repeat} onClick={() => { setMenu(false); setActive('sub') }}>Crear suscripción</MenuItem>
              <MenuItem icon={FolderKanban} onClick={() => { setMenu(false); setActive('project') }}>Crear proyecto</MenuItem>
            </div>
          </>
        )}
      </div>
      {active === 'invoice' && <QuickInvoiceDialog clientId={clientId} clientName={clientName} onClose={() => setActive(null)} />}
      {active === 'sub' && <QuickSubDialog clientId={clientId} clientName={clientName} onClose={() => setActive(null)} />}
      {active === 'project' && <QuickProjectDialog clientId={clientId} clientName={clientName} onClose={() => setActive(null)} />}
    </>
  )
}

function MenuItem({ children, onClick, icon: Icon }: { children: React.ReactNode; onClick: () => void; icon: React.ElementType }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 hover:bg-bg-surface2 flex items-center gap-2 text-slate-300">
      <Icon size={12} />{children}
    </button>
  )
}

function QuickInvoiceDialog({ clientId, clientName, onClose }: { clientId: string; clientName: string; onClose: () => void }) {
  const [pending, start] = useTransition()
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Factura para {clientName}</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            fd.set('client_id', clientId)
            const res = await quickInvoice(fd)
            if (res.ok) { toast.success('Factura creada'); onClose() }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Concepto *</Label><Input name="description" required /></div>
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
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuickSubDialog({ clientId, clientName, onClose }: { clientId: string; clientName: string; onClose: () => void }) {
  const [pending, start] = useTransition()
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Suscripción para {clientName}</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            fd.set('client_id', clientId)
            const res = await quickSubscription(fd)
            if (res.ok) { toast.success('Suscripción creada'); onClose() }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Servicio *</Label>
            <Select name="service" required>
              <option value="software_custom">Software</option>
              <option value="chatbot">Chatbot</option>
              <option value="web">Web</option>
              <option value="social_media_management">RRSS</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>€/mes *</Label><Input name="amount_monthly" type="number" step="0.01" required /></div>
            <div><Label>Inicio *</Label><Input name="starts_on" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          </div>
          <div><Label>Descripción</Label><Input name="description" /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuickProjectDialog({ clientId, clientName, onClose }: { clientId: string; clientName: string; onClose: () => void }) {
  const [pending, start] = useTransition()
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Proyecto para {clientName}</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            fd.set('client_id', clientId)
            const res = await quickProject(fd)
            if (res.ok) { toast.success('Proyecto creado'); onClose() }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Nombre *</Label><Input name="name" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo *</Label>
              <Select name="kind" required>
                <option value="software_custom">Software</option>
                <option value="chatbot">Chatbot</option>
                <option value="web">Web</option>
                <option value="social_media_management">RRSS</option>
              </Select>
            </div>
            <div><Label>Inicio</Label><Input name="starts_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
