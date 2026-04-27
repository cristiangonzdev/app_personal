'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'

type Props = {
  trigger: React.ReactNode
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => Promise<{ ok: boolean; error?: string }>
  onSuccess?: () => void
  successMessage?: string
}

export function ConfirmDialog({
  trigger, title, description, confirmLabel = 'Confirmar',
  destructive, onConfirm, onSuccess, successMessage = 'Hecho',
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  const handle = () => start(async () => {
    const res = await onConfirm()
    if (res.ok) {
      toast.success(successMessage)
      setOpen(false)
      onSuccess?.()
    } else {
      toast.error(res.error || 'Error')
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle size={16} className="text-accent-red" />}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={handle}
          >
            {pending ? 'Procesando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
