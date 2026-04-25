'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button, Input } from '@/components/ui'
import { Plus, X } from 'lucide-react'
import { createTask, deleteTask } from '../actions'

export function NewTaskInline({ projectId }: { projectId: string }) {
  const [show, setShow] = useState(false)
  const [pending, start] = useTransition()
  if (!show) return (
    <button onClick={() => setShow(true)} className="text-[10px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">
      <Plus size={11} />Añadir tarea
    </button>
  )
  return (
    <form
      action={(fd) => {
        fd.set('project_id', projectId)
        start(async () => {
          const res = await createTask(fd)
          if (res.ok) { toast.success('Tarea añadida'); setShow(false) }
          else toast.error(res.error || 'Error')
        })
      }}
      className="flex items-center gap-2"
    >
      <Input name="title" placeholder="Nueva tarea…" required autoFocus className="h-7 text-[12px] flex-1" />
      <Input name="due_on" type="date" className="h-7 w-32 text-[12px]" />
      <Button type="submit" size="sm" disabled={pending}>{pending ? '…' : 'OK'}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setShow(false)}>Cancelar</Button>
    </form>
  )
}

export function TaskDeleteButton({ id, projectId }: { id: string; projectId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        const res = await deleteTask(id, projectId)
        if (res.ok) toast.success('Tarea eliminada')
        else toast.error(res.error || 'Error')
      })}
      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-accent-red transition-opacity"
    >
      <X size={11} />
    </button>
  )
}
