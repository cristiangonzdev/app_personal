'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Select, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Plus, Pencil } from 'lucide-react'
import { createClient, updateClient } from './actions'

type Client = {
  id?: string
  legal_name: string
  commercial_name?: string | null
  client_type?: string
  fiscal_id?: string | null
  igic?: boolean
  fiscal_address?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country?: string | null
  sector?: string | null
  notes?: string | null
}

export function NewClientButton() {
  return <ClientFormButton mode="create" trigger={<Button size="sm"><Plus size={13} />Nuevo cliente</Button>} />
}

export function EditClientButton({ client }: { client: Client }) {
  return <ClientFormButton mode="edit" client={client} trigger={<Button size="sm" variant="outline"><Pencil size={13} />Editar</Button>} />
}

function ClientFormButton({ mode, client, trigger }: { mode: 'create' | 'edit'; client?: Client; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const c = client ?? ({} as Client)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo cliente' : 'Editar cliente'}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) => {
            start(async () => {
              const res = mode === 'create'
                ? await createClient(fd)
                : await updateClient(client!.id!, fd)
              if (res.ok) { toast.success(mode === 'create' ? 'Cliente creado' : 'Cliente actualizado'); setOpen(false) }
              else toast.error(res.error || 'Error')
            })
          }}
          className="space-y-3"
        >
          <Field label="Razón social *">
            <Input name="legal_name" defaultValue={c.legal_name} required />
          </Field>
          <Field label="Nombre comercial">
            <Input name="commercial_name" defaultValue={c.commercial_name ?? ''} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="client_type" defaultValue={c.client_type ?? 'one_shot'}>
                <option value="one_shot">One-shot</option>
                <option value="recurrente">Recurrente</option>
              </Select>
            </Field>
            <Field label="CIF/NIF">
              <Input name="fiscal_id" defaultValue={c.fiscal_id ?? ''} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sector">
              <Input name="sector" defaultValue={c.sector ?? ''} placeholder="hostelería, real estate…" />
            </Field>
            <label className="flex items-center gap-2 mt-5 text-[12px] text-slate-300">
              <input type="checkbox" name="igic" defaultChecked={c.igic ?? true} className="accent-accent-cyan" />
              IGIC 7% Canarias
            </label>
          </div>
          <Field label="Dirección fiscal">
            <Input name="fiscal_address" defaultValue={c.fiscal_address ?? ''} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="CP"><Input name="postal_code" defaultValue={c.postal_code ?? ''} /></Field>
            <Field label="Ciudad"><Input name="city" defaultValue={c.city ?? ''} /></Field>
            <Field label="Provincia"><Input name="province" defaultValue={c.province ?? 'Las Palmas'} /></Field>
          </div>
          <Field label="Notas">
            <Textarea name="notes" defaultValue={c.notes ?? ''} rows={3} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>
}
