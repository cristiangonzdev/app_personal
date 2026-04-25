'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { Trash2 } from 'lucide-react'
import { archiveClient } from './actions'

export function ArchiveClientButton({ id, redirect }: { id: string; redirect?: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm('¿Archivar este cliente? Se ocultará pero no se borra de DB.')) return
        start(async () => {
          const res = await archiveClient(id)
          if (res.ok) { toast.success('Cliente archivado'); if (redirect) router.push(redirect) }
          else toast.error(res.error || 'Error')
        })
      }}
    >
      <Trash2 size={13} />Archivar
    </Button>
  )
}
