'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Select, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Plus, Pencil } from 'lucide-react'
import { createProject, updateProject } from './actions'

type ProjectLite = {
  id?: string
  client_id?: string
  name: string
  kind?: string
  status?: string
  starts_on?: string | null
  ends_on?: string | null
  hours_estimated?: number | null
  notes?: string | null
}

export function NewProjectButton({ clients }: { clients: { id: string; name: string }[] }) {
  return <ProjectFormButton mode="create" clients={clients} trigger={<Button size="sm"><Plus size={13} />Nuevo proyecto</Button>} />
}

export function EditProjectButton({ project, clients }: { project: ProjectLite; clients: { id: string; name: string }[] }) {
  return <ProjectFormButton mode="edit" project={project} clients={clients} trigger={<Button size="sm" variant="outline"><Pencil size={13} />Editar</Button>} />
}

function ProjectFormButton({
  mode, project, clients, trigger,
}: { mode: 'create' | 'edit'; project?: ProjectLite; clients: { id: string; name: string }[]; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const p = project ?? ({} as ProjectLite)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === 'create' ? 'Nuevo proyecto' : 'Editar proyecto'}</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            const res = mode === 'create' ? await createProject(fd) : await updateProject(project!.id!, fd)
            if (res.ok) { toast.success(mode === 'create' ? 'Proyecto creado (con plantilla)' : 'Proyecto actualizado'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Nombre *</Label><Input name="name" defaultValue={p.name} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cliente *</Label>
              <Select name="client_id" defaultValue={p.client_id ?? ''} required>
                <option value="" disabled>— elegir —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div><Label>Tipo *</Label>
              <Select name="kind" defaultValue={p.kind ?? 'software_custom'} required>
                <option value="software_custom">Software</option>
                <option value="chatbot">Chatbot</option>
                <option value="web">Web</option>
                <option value="social_media_management">RRSS</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Estado</Label>
              <Select name="status" defaultValue={p.status ?? 'planificado'}>
                <option value="planificado">Planificado</option>
                <option value="en_curso">En curso</option>
                <option value="pausado">Pausado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </div>
            <div><Label>Horas estimadas</Label><Input name="hours_estimated" type="number" step="0.5" defaultValue={p.hours_estimated ?? ''} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Inicio</Label><Input name="starts_on" type="date" defaultValue={p.starts_on ?? ''} /></div>
            <div><Label>Fin</Label><Input name="ends_on" type="date" defaultValue={p.ends_on ?? ''} /></div>
          </div>
          <div><Label>Notas</Label><Textarea name="notes" defaultValue={p.notes ?? ''} rows={3} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
