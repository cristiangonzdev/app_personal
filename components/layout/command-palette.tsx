'use client'

import { useEffect, useState, useTransition } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { KanbanSquare, Users, FolderKanban, Receipt, MessageSquareText, Megaphone, BarChart3 } from 'lucide-react'

type Item = { id: string; label: string; sub?: string; href: string }

const QUICK_LINKS: Item[] = [
  { id: 'go-ventas',    label: 'Ir a Ventas',         href: '/ventas' },
  { id: 'go-clientes',  label: 'Ir a Clientes',       href: '/clientes' },
  { id: 'go-proyectos', label: 'Ir a Proyectos',      href: '/proyectos' },
  { id: 'go-pagos',     label: 'Ir a Pagos',          href: '/pagos' },
  { id: 'go-inbox',     label: 'Ir a Inbox',          href: '/comunicaciones' },
  { id: 'go-marketing', label: 'Ir a Marketing',      href: '/marketing' },
  { id: 'go-analytics', label: 'Ir a Analytics',      href: '/analytics' },
]

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Item[]>([])
  const [, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); return }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    const sb = getSupabaseBrowser()
    let cancelled = false
    ;(async () => {
      const [clientsRes, dealsRes] = await Promise.all([
        sb.from('clients').select('id,legal_name,commercial_name').is('deleted_at', null).ilike('legal_name', `%${q}%`).limit(5),
        sb.from('deals').select('id,title,stage').is('deleted_at', null).ilike('title', `%${q}%`).limit(5),
      ])
      if (cancelled) return
      const cs = (clientsRes.data ?? []).map((c: { id: string; legal_name: string; commercial_name: string | null }) => ({ id: `c-${c.id}`, label: c.commercial_name || c.legal_name, sub: 'Cliente', href: `/clientes/${c.id}` }))
      const ds = (dealsRes.data ?? []).map((d: { id: string; title: string; stage: string }) => ({ id: `d-${d.id}`, label: d.title, sub: `Deal · ${d.stage}`, href: `/ventas?deal=${d.id}` }))
      setResults([...cs, ...ds])
    })()
    return () => { cancelled = true }
  }, [query])

  if (!open) return null

  const navigate = (href: string) => {
    startTransition(() => {
      onOpenChange(false)
      router.push(href)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <Command label="Command palette" className="rounded-lg border border-border bg-bg-surface shadow-2xl overflow-hidden">
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Escribe para buscar clientes, deals…"
            className="w-full px-4 py-3 bg-transparent border-b border-border text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
          <Command.List className="max-h-[360px] overflow-y-auto py-2">
            <Command.Empty className="px-4 py-6 text-center text-xs text-slate-500">Sin resultados</Command.Empty>
            {results.length > 0 && (
              <Command.Group heading="Resultados" className="px-2 text-[10px] uppercase tracking-wider text-slate-600">
                {results.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={r.id + ' ' + r.label}
                    onSelect={() => navigate(r.href)}
                    className="flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent-cyan/10 aria-selected:text-accent-cyan text-slate-300"
                  >
                    <span>{r.label}</span>
                    {r.sub && <span className="text-[10px] text-slate-600">{r.sub}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <Command.Group heading="Ir a" className="px-2 mt-1 text-[10px] uppercase tracking-wider text-slate-600">
              {QUICK_LINKS.map((l) => {
                const Icon = iconFor(l.href)
                return (
                  <Command.Item
                    key={l.id}
                    value={l.label}
                    onSelect={() => navigate(l.href)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent-cyan/10 aria-selected:text-accent-cyan text-slate-300"
                  >
                    <Icon size={13} />
                    <span>{l.label}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

function iconFor(href: string) {
  if (href.startsWith('/ventas')) return KanbanSquare
  if (href.startsWith('/clientes')) return Users
  if (href.startsWith('/proyectos')) return FolderKanban
  if (href.startsWith('/pagos')) return Receipt
  if (href.startsWith('/comunicaciones')) return MessageSquareText
  if (href.startsWith('/marketing')) return Megaphone
  return BarChart3
}
