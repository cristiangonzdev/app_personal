'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button, Input, Label, Select, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Plus, X, ChevronRight } from 'lucide-react'
import { createContent, setContentStatus, deleteContent, createCampaign, createHook, deleteHook } from './actions'

type Campaign = { id: string; name: string }

export function NewContentButton({ campaigns }: { campaigns: Campaign[] }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} />Nueva pieza</Button>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nueva pieza de contenido</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            const res = await createContent(fd)
            if (res.ok) { toast.success('Pieza creada'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Título *</Label><Input name="title" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select name="kind" defaultValue="reel">
                <option value="reel">Reel</option>
                <option value="post">Post</option>
                <option value="story">Story</option>
                <option value="short">Short YouTube</option>
                <option value="blog">Blog</option>
                <option value="email">Email</option>
              </Select>
            </div>
            <div><Label>Plataforma</Label>
              <Input name="platform" placeholder="instagram, linkedin…" defaultValue="instagram" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cuenta</Label><Input name="account_handle" placeholder="@logika_labs" /></div>
            <div><Label>Pillar</Label><Input name="pillar" placeholder="ventas, fiscalidad…" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Estado</Label>
              <Select name="status" defaultValue="idea">
                <option value="idea">Idea</option>
                <option value="guion">Guión</option>
                <option value="grabado">Grabado</option>
                <option value="editado">Editado</option>
                <option value="publicado">Publicado</option>
              </Select>
            </div>
            <div><Label>Programado</Label><Input name="scheduled_at" type="datetime-local" /></div>
          </div>
          <div><Label>Campaña</Label>
            <Select name="campaign_id" defaultValue="">
              <option value="">— ninguna —</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-300">
            <input type="checkbox" name="needs_editor" className="accent-accent-cyan" />
            Mandar a editor LATAM
          </label>
          <div><Label>Notas</Label><Textarea name="notes" rows={3} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function NewCampaignButton() {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button onClick={() => setOpen(true)} className="text-[10px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">
        <Plus size={11} />Nueva
      </button>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva campaña</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            const res = await createCampaign(fd)
            if (res.ok) { toast.success('Campaña creada'); setOpen(false) }
            else toast.error(res.error || 'Error')
          })}
          className="space-y-3"
        >
          <div><Label>Nombre *</Label><Input name="name" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Objetivo</Label>
              <Select name="goal" defaultValue="leads">
                <option value="leads">Leads</option>
                <option value="awareness">Awareness</option>
                <option value="ventas">Ventas</option>
              </Select>
            </div>
            <div><Label>Presupuesto €</Label><Input name="budget" type="number" step="0.01" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Inicio</Label><Input name="starts_on" type="date" /></div>
            <div><Label>UTM campaign</Label><Input name="utm_campaign" /></div>
          </div>
          <div><Label>Notas</Label><Textarea name="notes" rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function NewHookInline() {
  const [show, setShow] = useState(false)
  const [pending, start] = useTransition()
  if (!show) return (
    <button onClick={() => setShow(true)} className="text-[10px] text-slate-500 hover:text-accent-cyan flex items-center gap-1">
      <Plus size={11} />Añadir
    </button>
  )
  return (
    <form
      action={(fd) => start(async () => {
        const res = await createHook(fd)
        if (res.ok) { toast.success('Hook añadido'); setShow(false) }
        else toast.error(res.error || 'Error')
      })}
      className="space-y-2 mb-3"
    >
      <Input name="phrase" placeholder="Frase del hook…" required autoFocus className="h-7 text-[12px]" />
      <Input name="angle" placeholder="Ángulo (contrarian, autoridad…)" className="h-7 text-[12px]" />
      <Input name="cta" placeholder="CTA" className="h-7 text-[12px]" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? '…' : 'OK'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShow(false)}>Cancelar</Button>
      </div>
    </form>
  )
}

export function HookDeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        const res = await deleteHook(id)
        if (res.ok) toast.success('Eliminado')
        else toast.error(res.error || 'Error')
      })}
      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-accent-red transition-opacity"
    >
      <X size={11} />
    </button>
  )
}

export function ContentRowMenu({ id, status }: { id: string; status: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const flow: Record<string, 'idea' | 'guion' | 'grabado' | 'editado' | 'publicado' | null> = {
    idea: 'guion', guion: 'grabado', grabado: 'editado', editado: 'publicado', publicado: null,
  }
  const next = flow[status]
  return (
    <div className="flex items-center gap-1">
      {next && (
        <button
          disabled={pending}
          onClick={() => start(async () => {
            const res = await setContentStatus(id, next)
            if (res.ok) toast.success(`→ ${next}`)
            else toast.error(res.error || 'Error')
          })}
          className="text-[10px] text-slate-500 hover:text-accent-cyan flex items-center gap-1"
        >
          <ChevronRight size={11} />{next}
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm('¿Borrar pieza?')) return
          start(async () => {
            const res = await deleteContent(id)
            if (res.ok) toast.success('Borrada')
            else toast.error(res.error || 'Error')
          })
        }}
        className="text-slate-600 hover:text-accent-red"
      >
        <X size={11} />
      </button>
    </div>
  )
}
