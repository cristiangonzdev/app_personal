'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Select, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Plus, Pencil } from 'lucide-react'
import { createLead, updateLead } from './actions'
import { SERVICE_LABELS } from '@/types'

const SERVICES = ['software_custom', 'chatbot', 'web', 'social_media_management'] as const

type LeadLite = {
  id?: string
  title: string
  services?: string[]
  setup_amount?: number
  recurring_amount?: number
  probability?: number
  stage?: string
  source?: string
  expected_close?: string | null
  notes?: string | null
}

export function NewLeadButton() {
  return (
    <LeadFormButton
      mode="create"
      trigger={<Button size="sm"><Plus size={14} />Nuevo lead</Button>}
    />
  )
}

export function EditLeadButton({ lead }: { lead: LeadLite }) {
  return (
    <LeadFormButton
      mode="edit"
      lead={lead}
      trigger={
        <button className="text-[11px] text-slate-500 hover:text-accent-cyan inline-flex items-center gap-1">
          <Pencil size={11} />Editar
        </button>
      }
    />
  )
}

function LeadFormButton({ mode, lead, trigger }: { mode: 'create' | 'edit'; lead?: LeadLite; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const d = lead ?? ({} as LeadLite)
  const selectedServices = new Set(d.services ?? [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo lead' : 'Editar lead'}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) => start(async () => {
            const res = mode === 'create' ? await createLead(fd) : await updateLead(lead!.id!, fd)
            if (res.ok) { toast.success(mode === 'create' ? 'Lead creado' : 'Lead actualizado'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-4"
        >
          <div>
            <Label>Título *</Label>
            <Input name="title" defaultValue={d.title} placeholder="Ej. Web restaurante Casa Pepe" required />
          </div>

          {mode === 'create' && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contacto</Label><Input name="contact_name" placeholder="Pepe Pérez" /></div>
              <div><Label>Email</Label><Input name="contact_email" type="email" placeholder="pepe@…" /></div>
              <div className="col-span-2"><Label>Teléfono</Label><Input name="contact_phone" placeholder="+34…" /></div>
            </div>
          )}

          <div>
            <Label>Servicios</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {SERVICES.map(s => (
                <label key={s} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-bg-surface/40 text-[12px] text-slate-300 cursor-pointer hover:border-accent-cyan/40">
                  <input
                    type="checkbox"
                    name="services"
                    value={s}
                    defaultChecked={selectedServices.has(s)}
                    className="accent-accent-cyan"
                  />
                  {SERVICE_LABELS[s]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>Setup €</Label><Input name="setup_amount" type="number" step="0.01" defaultValue={d.setup_amount ?? 0} /></div>
            <div><Label>Recurrente €/mes</Label><Input name="recurring_amount" type="number" step="0.01" defaultValue={d.recurring_amount ?? 0} /></div>
            <div><Label>Prob. %</Label><Input name="probability" type="number" min="0" max="100" defaultValue={d.probability ?? 20} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Etapa</Label>
              <Select name="stage" defaultValue={d.stage ?? 'lead'}>
                <option value="lead">Lead nuevo</option>
                <option value="cualificado">Cualificado</option>
                <option value="propuesta">Propuesta enviada</option>
                <option value="negociacion">Negociación</option>
              </Select>
            </div>
            <div>
              <Label>Fuente</Label>
              <Select name="source" defaultValue={d.source ?? 'inbound_web'}>
                <option value="inbound_web">Web</option>
                <option value="linkedin">LinkedIn</option>
                <option value="referido">Referido</option>
                <option value="cold_outreach">Cold outreach</option>
                <option value="otro">Otro</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Cierre estimado</Label>
            <Input name="expected_close" type="date" defaultValue={d.expected_close ?? ''} />
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea name="notes" defaultValue={d.notes ?? ''} rows={3} placeholder="Lo que sabes del lead, próximo paso…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
