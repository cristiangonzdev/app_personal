'use client'

import { useRouter } from 'next/navigation'
import { Button, ConfirmDialog } from '@/components/ui'
import { Trash2 } from 'lucide-react'
import { archiveProject } from './actions'

export function DeleteProjectButton({ id, name }: { id: string; name?: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={<Button size="sm" variant="destructive"><Trash2 size={13} />Eliminar</Button>}
      title={`Eliminar proyecto${name ? ` "${name}"` : ''}`}
      description="Se ocultará del listado. Las tareas y hitos quedan en histórico."
      confirmLabel="Eliminar"
      destructive
      onConfirm={() => archiveProject(id)}
      successMessage="Proyecto eliminado"
      onSuccess={() => router.push('/proyectos')}
    />
  )
}
