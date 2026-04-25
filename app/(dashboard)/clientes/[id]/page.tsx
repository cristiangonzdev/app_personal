import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatEuros, formatFechaCorta } from '@/lib/utils'
import { STATUS_LABELS, type ProjectStatus, type InvoiceStatus } from '@/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EditClientButton } from '../client-form'
import { ArchiveClientButton } from '../archive-button'
import { ContactForm, ContactDeleteButton } from './contact-controls'

export const dynamic = 'force-dynamic'

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await getSupabaseServer()

  const [{ data: client }, { data: contacts }, { data: projects }, { data: invoices }, { data: subs }, { data: comms }] = await Promise.all([
    sb.from('clients').select('*').eq('id', id).is('deleted_at', null).single(),
    sb.from('contacts').select('*').eq('client_id', id).is('deleted_at', null),
    sb.from('projects').select('id,name,kind,status,starts_on').eq('client_id', id).is('deleted_at', null),
    sb.from('invoices').select('id,number,status,total,due_date,issue_date').eq('client_id', id).is('deleted_at', null).order('issue_date', { ascending: false }),
    sb.from('subscriptions').select('id,service,amount_monthly,status,starts_on').eq('client_id', id),
    sb.from('communications').select('id,channel,direction,body,occurred_at').eq('client_id', id).order('occurred_at', { ascending: false }).limit(15),
  ])

  if (!client) notFound()

  const mrr = (subs ?? []).filter(s => s.status === 'activa').reduce((s, x) => s + Number(x.amount_monthly), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/clientes" className="text-[11px] text-slate-500 hover:text-accent-cyan">← Clientes</Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{client.commercial_name || client.legal_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge tone={client.client_type === 'recurrente' ? 'green' : client.client_type === 'one_shot' ? 'cyan' : 'slate'}>{client.client_type}</Badge>
            {client.fiscal_id && <span className="text-[11px] font-mono text-slate-500">{client.fiscal_id}</span>}
            {client.igic && <Badge tone="amber">IGIC 7%</Badge>}
            {mrr > 0 && <span className="text-[12px] font-mono text-accent-green">MRR {formatEuros(mrr)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <EditClientButton client={client} />
          <ArchiveClientButton id={client.id} redirect="/clientes" />
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Datos fiscales</CardTitle></CardHeader>
          <dl className="space-y-1.5 text-[12px]">
            <Field label="Razón social" value={client.legal_name} />
            <Field label="Sector" value={client.sector ?? '—'} />
            <Field label="Dirección" value={client.fiscal_address ?? '—'} />
            <Field label="Provincia" value={client.province ?? '—'} />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contactos</CardTitle>
            <ContactForm clientId={client.id} />
          </CardHeader>
          {(contacts ?? []).length === 0 ? (
            <div className="text-[11px] text-slate-600">Sin contactos</div>
          ) : (
            <ul className="space-y-2">
              {contacts!.map(c => (
                <li key={c.id} className="text-[12px] flex items-start justify-between gap-2 group">
                  <div>
                    <div className="text-slate-200">{c.full_name} {c.is_primary && <span className="text-[9px] text-accent-cyan ml-1">PRIMARY</span>}</div>
                    <div className="text-[10px] text-slate-600 font-mono">{c.email ?? c.phone ?? '—'}</div>
                  </div>
                  <ContactDeleteButton id={c.id} clientId={client.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Proyectos</CardTitle></CardHeader>
          {(projects ?? []).length === 0 ? <div className="text-[11px] text-slate-600">—</div> : (
            <ul className="space-y-2 text-[12px]">
              {projects!.map(p => (
                <li key={p.id} className="flex justify-between">
                  <Link href={`/proyectos/${p.id}`} className="text-slate-300 hover:text-accent-cyan">{p.name}</Link>
                  <Badge tone={p.status === 'en_curso' ? 'cyan' : p.status === 'entregado' ? 'green' : 'slate'}>{STATUS_LABELS.project[p.status as ProjectStatus]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Facturas</CardTitle></CardHeader>
        <table className="w-full text-[12px]">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
            <tr>
              <th className="text-left py-2 font-normal">Número</th>
              <th className="text-left font-normal">Estado</th>
              <th className="text-right font-normal">Total</th>
              <th className="text-right font-normal">Emisión</th>
              <th className="text-right font-normal">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map(i => (
              <tr key={i.id} className="border-b border-border/40">
                <td className="py-2 font-mono">{i.number ?? '—'}</td>
                <td><Badge tone={i.status === 'pagada' ? 'green' : i.status === 'vencida' ? 'red' : 'cyan'}>{STATUS_LABELS.invoice[i.status as InvoiceStatus]}</Badge></td>
                <td className="text-right font-mono">{formatEuros(Number(i.total))}</td>
                <td className="text-right font-mono text-slate-500">{formatFechaCorta(i.issue_date)}</td>
                <td className="text-right font-mono text-slate-500">{formatFechaCorta(i.due_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader><CardTitle>Timeline comunicaciones</CardTitle></CardHeader>
        {(comms ?? []).length === 0 ? <div className="text-[11px] text-slate-600">Sin actividad</div> : (
          <ul className="space-y-2">
            {comms!.map(c => (
              <li key={c.id} className={`text-[12px] border-l-2 pl-2.5 ${c.direction === 'in' ? 'border-accent-cyan' : 'border-accent-violet'}`}>
                <div className="text-slate-300 line-clamp-2">{c.body}</div>
                <div className="text-[10px] text-slate-600 font-mono mt-0.5">{c.channel} · {c.direction} · {formatFechaCorta(c.occurred_at)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
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
