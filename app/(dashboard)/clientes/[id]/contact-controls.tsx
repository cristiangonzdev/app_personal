'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { createContact, deleteContact } from '../actions'

export function ContactForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button onClick={() => setOpen(true)} className="text-[10px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">
        <Plus size={11} /> Añadir
      </button>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo contacto</DialogTitle></DialogHeader>
        <form
          action={(fd) => {
            fd.set('client_id', clientId)
            start(async () => {
              const res = await createContact(fd)
              if (res.ok) { toast.success('Contacto creado'); setOpen(false) }
              else toast.error(res.error || 'Error')
            })
          }}
          className="space-y-3"
        >
          <div><Label>Nombre *</Label><Input name="full_name" required /></div>
          <div><Label>Cargo</Label><Input name="role" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input name="email" type="email" /></div>
            <div><Label>Teléfono</Label><Input name="phone" /></div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-300">
            <input type="checkbox" name="is_primary" className="accent-accent-cyan" />
            Contacto principal
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ContactDeleteButton({ id, clientId }: { id: string; clientId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        const res = await deleteContact(id, clientId)
        if (res.ok) toast.success('Contacto eliminado')
        else toast.error(res.error || 'Error')
      })}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-accent-red"
    >
      <X size={12} />
    </button>
  )
}
