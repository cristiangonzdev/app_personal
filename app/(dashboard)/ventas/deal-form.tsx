'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Select, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Plus, Pencil } from 'lucide-react'
import { createDeal, updateDeal } from './actions'

type DealLite = {
  id?: string
  title: string
  client_id?: string | null
  services?: string[]
  setup_amount?: number
  recurring_amount?: number
  probability?: number
  stage?: string
  source?: string
  expected_close?: string | null
  notes?: string | null
}

export function NewDealButton({ clients }: { clients: { id: string; name: string }[] }) {
  return <DealFormButton mode="create" clients={clients} trigger={<Button size="sm"><Plus size={13} />Nuevo deal</Button>} />
}

export function EditDealButton({ deal, clients }: { deal: DealLite; clients: { id: string; name: string }[] }) {
  return (
    <DealFormButton
      mode="edit" deal={deal} clients={clients}
      trigger={<button className="text-[10px] text-slate-500 hover:text-accent-cyan flex items-center gap-1"><Pencil size={11} />Editar</button>}
    />
  )
}

function DealFormButton({
  mode, deal, clients, trigger,
}: { mode: 'create' | 'edit'; deal?: DealLite; clients: { id: string; name: string }[]; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const d = deal ?? ({} as DealLite)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo deal' : 'Editar deal'}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) => start(async () => {
            const res = mode === 'create' ? await createDeal(fd) : await updateDeal(deal!.id!, fd)
            if (res.ok) { toast.success(mode === 'create' ? 'Deal creado' : 'Deal actualizado'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Título *</Label><Input name="title" defaultValue={d.title} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cliente</Label>
              <Select name="client_id" defaultValue={d.client_id ?? ''}>
                <option value="">— Sin cliente —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div><Label>Etapa</Label>
              <Select name="stage" defaultValue={d.stage ?? 'lead'}>
                <option value="lead">Lead</option>
                <option value="cualificado">Cualificado</option>
                <option value="propuesta">Propuesta</option>
                <option value="negociacion">Negociación</option>
                <option value="ganado">Ganado</option>
                <option value="perdido">Perdido</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Setup €</Label><Input name="setup_amount" type="number" step="0.01" defaultValue={d.setup_amount ?? 0} /></div>
            <div><Label>Recurrente €/mes</Label><Input name="recurring_amount" type="number" step="0.01" defaultValue={d.recurring_amount ?? 0} /></div>
            <div><Label>Prob. %</Label><Input name="probability" type="number" min="0" max="100" defaultValue={d.probability ?? 20} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fuente</Label>
              <Select name="source" defaultValue={d.source ?? 'inbound_web'}>
                <option value="inbound_web">Web inbound</option>
                <option value="linkedin">LinkedIn</option>
                <option value="referido">Referido</option>
                <option value="cold_outreach">Cold outreach</option>
                <option value="otro">Otro</option>
              </Select>
            </div>
            <div><Label>Cierre estimado</Label><Input name="expected_close" type="date" defaultValue={d.expected_close ?? ''} /></div>
          </div>
          <div><Label>Servicios (coma-separados)</Label>
            <Input name="services" defaultValue={(d.services ?? []).join(',')} placeholder="chatbot, web" />
            <p className="text-[10px] text-slate-600 mt-0.5">Valores: software_custom, chatbot, web, social_media_management</p>
          </div>
          <div><Label>Notas</Label><Textarea name="notes" defaultValue={d.notes ?? ''} rows={3} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
