import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, Badge } from '@/components/ui'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Mail, Phone, Star } from 'lucide-react'
import { EditClientButton } from '../client-form'
import { DeleteClientButton } from '../archive-button'
import { ContactForm, ContactDeleteButton } from './contact-controls'
import { CobrosPanel } from './cobros-panel'

export const dynamic = 'force-dynamic'

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await getSupabaseServer()

  const [{ data: client }, { data: contacts }, { data: invoices }, { data: subs }] = await Promise.all([
    sb.from('clients').select('*').eq('id', id).is('deleted_at', null).single(),
    sb.from('contacts').select('*').eq('client_id', id).is('deleted_at', null),
    sb.from('invoices').select('id,number,status,total,issue_date,due_date,notes').eq('client_id', id).is('deleted_at', null).order('issue_date', { ascending: false, nullsFirst: false }),
    sb.from('subscriptions').select('id,service,amount_monthly,status,starts_on,description').eq('client_id', id).neq('status', 'cancelada'),
  ])

  if (!client) notFound()

  const mrr = (subs ?? []).filter(s => s.status === 'activa').reduce((s, x) => s + Number(x.amount_monthly), 0)
  const subsActivas = (subs ?? []).filter(s => s.status === 'activa').length
  const invoicesPendientes = (invoices ?? []).filter(i => i.status !== 'pagada' && i.status !== 'anulada').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link href="/clientes" className="text-[11px] text-slate-500 hover:text-accent-cyan inline-flex items-center gap-1">
          <ArrowLeft size={11} />Clientes
        </Link>
      </div>

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{client.commercial_name || client.legal_name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge tone={client.client_type === 'recurrente' ? 'green' : 'cyan'}>
              {client.client_type === 'recurrente' ? 'Recurrente' : 'One-shot'}
            </Badge>
            {client.fiscal_id && <span className="text-[11px] font-mono text-slate-500">{client.fiscal_id}</span>}
            {client.igic && <Badge tone="amber">IGIC 7%</Badge>}
            {client.sector && <span className="text-[11px] text-slate-500 capitalize">· {client.sector}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <EditClientButton client={client} />
          <DeleteClientButton
            id={client.id}
            name={client.commercial_name || client.legal_name}
            redirect="/clientes"
            stats={{ invoicesPendientes, subsActivas, mrr }}
          />
        </div>
      </header>

      {/* Cobros — bloque principal */}
      <CobrosPanel
        clientId={client.id}
        clientName={client.commercial_name || client.legal_name}
        subscriptions={(subs ?? []) as never}
        invoices={(invoices ?? []) as never}
      />

      {/* Datos auxiliares */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 size={11} />Datos fiscales
            </h3>
          </div>
          <dl className="space-y-2 text-[12px]">
            <Field label="Razón social" value={client.legal_name} />
            <Field label="Dirección" value={client.fiscal_address ?? '—'} />
            <Field label="Ciudad" value={[client.city, client.postal_code].filter(Boolean).join(' · ') || '—'} />
            <Field label="Provincia" value={client.province ?? '—'} />
          </dl>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">Notas</div>
              <p className="text-[12px] text-slate-300 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Mail size={11} />Contactos
            </h3>
            <ContactForm clientId={client.id} />
          </div>
          {(contacts ?? []).length === 0 ? (
            <p className="text-[12px] text-slate-500 py-3">Sin contactos registrados.</p>
          ) : (
            <ul className="space-y-2.5">
              {contacts!.map(c => (
                <li key={c.id} className="text-[12px] flex items-start justify-between gap-2 group">
                  <div className="min-w-0">
                    <div className="text-slate-200 flex items-center gap-1.5">
                      {c.full_name}
                      {c.is_primary && <Star size={10} className="text-accent-amber fill-accent-amber" />}
                    </div>
                    {c.role && <div className="text-[10px] text-slate-600">{c.role}</div>}
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                      {c.email && <span className="inline-flex items-center gap-1"><Mail size={9} />{c.email}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone size={9} />{c.phone}</span>}
                    </div>
                  </div>
                  <ContactDeleteButton id={c.id} clientId={client.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600 text-[10px] uppercase tracking-wider">{label}</dt>
      <dd className="text-slate-300 text-right">{value}</dd>
    </div>
  )
}
