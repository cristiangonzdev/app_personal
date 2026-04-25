'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Select, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Plus, CheckCircle2 } from 'lucide-react'
import { logOutboundMessage, toggleAttention } from './actions'

export function NewMessageButton({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} />Registrar envío</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar mensaje saliente</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            const res = await logOutboundMessage(fd)
            if (res.ok) { toast.success('Registrado'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Canal</Label>
              <Select name="channel" defaultValue="whatsapp">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="manual">Manual</option>
                <option value="sms">SMS</option>
              </Select>
            </div>
            <div><Label>Cliente</Label>
              <Select name="client_id" defaultValue="">
                <option value="">— ninguno —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>
          <div><Label>Destinatario *</Label><Input name="to_addr" placeholder="+34… o email@…" required /></div>
          <div><Label>Asunto</Label><Input name="subject" /></div>
          <div><Label>Mensaje *</Label><Textarea name="body" rows={4} required /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Registrar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ResolveButton({ id, currentlyAttention }: { id: string; currentlyAttention: boolean }) {
  const [pending, start] = useTransition()
  if (!currentlyAttention) return null
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        const res = await toggleAttention(id, true)
        if (res.ok) toast.success('Resuelto')
        else toast.error(res.error || 'Error')
      })}
      className="text-[10px] text-slate-500 hover:text-accent-green flex items-center gap-1"
    >
      <CheckCircle2 size={11} />Resolver
    </button>
  )
}
