'use client'

import { useRouter } from 'next/navigation'
import { Button, ConfirmDialog } from '@/components/ui'
import { Trash2 } from 'lucide-react'
import { archiveClient } from './actions'

type Stats = { invoicesPendientes?: number; subsActivas?: number; mrr?: number }

export function DeleteClientButton({ id, name, redirect, stats }: { id: string; name?: string; redirect?: string; stats?: Stats }) {
  const router = useRouter()
  const hasOpenWork = (stats?.invoicesPendientes ?? 0) > 0 || (stats?.subsActivas ?? 0) > 0

  return (
    <ConfirmDialog
      trigger={<Button size="sm" variant="destructive"><Trash2 size={13} />Eliminar</Button>}
      title={`Eliminar ${name ? `"${name}"` : 'cliente'}`}
      description={
        <span className="block space-y-1">
          <span className="block">Se ocultará de listados y reportes. Los datos asociados (facturas, proyectos, mensajes) se conservan en histórico.</span>
          {hasOpenWork && (
            <span className="block mt-2 text-accent-amber">
              Atención: este cliente tiene
              {(stats?.invoicesPendientes ?? 0) > 0 && ` ${stats!.invoicesPendientes} factura(s) por cobrar`}
              {(stats?.subsActivas ?? 0) > 0 && ` · ${stats!.subsActivas} suscripción(es) activa(s)`}
              .
            </span>
          )}
        </span>
      }
      confirmLabel="Eliminar"
      destructive
      onConfirm={() => archiveClient(id)}
      successMessage="Cliente eliminado"
      onSuccess={() => { if (redirect) router.push(redirect) }}
    />
  )
}
