import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatFechaCorta } from '@/lib/utils'
import { NewContentButton, NewCampaignButton, NewHookInline, HookDeleteButton, ContentRowMenu } from './forms'

export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'slate' | 'cyan' | 'amber' | 'green' | 'violet'> = {
  idea: 'slate', guion: 'cyan', grabado: 'violet', editado: 'amber', publicado: 'green',
}

export default async function MarketingPage() {
  const sb = await getSupabaseServer()
  const [{ data: contents }, { data: campaigns }, { data: hooks }] = await Promise.all([
    sb.from('contents').select('id,title,kind,platform,account_handle,status,scheduled_at,pillar,needs_editor,campaign_id').order('scheduled_at', { ascending: false, nullsFirst: false }),
    sb.from('campaigns').select('id,name,goal,budget,starts_on'),
    sb.from('hooks_bank').select('id,phrase,angle,cta,tags').limit(8),
  ])

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <NewContentButton campaigns={(campaigns ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))} />
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Calendario editorial</CardTitle></CardHeader>
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
              <tr>
                <th className="text-left py-2 font-normal">Pieza</th>
                <th className="text-left font-normal">Plataforma</th>
                <th className="text-left font-normal">Estado</th>
                <th className="text-right font-normal">Programado</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {(contents ?? []).map(c => (
                <tr key={c.id} className="border-b border-border/40">
                  <td className="py-2">
                    <div className="text-slate-200">{c.title}</div>
                    {c.account_handle && <div className="text-[10px] text-slate-600 font-mono">{c.account_handle}</div>}
                  </td>
                  <td className="text-slate-400 capitalize">{c.platform} · {c.kind}</td>
                  <td>
                    <Badge tone={STATUS_TONE[c.status] ?? 'slate'}>{c.status}</Badge>
                    {c.needs_editor && <Badge tone="amber" className="ml-1">EDITOR</Badge>}
                  </td>
                  <td className="text-right font-mono text-slate-500">{formatFechaCorta(c.scheduled_at)}</td>
                  <td className="text-right pr-2"><ContentRowMenu id={c.id} status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campañas</CardTitle>
              <NewCampaignButton />
            </CardHeader>
            <ul className="space-y-2 text-[12px]">
              {(campaigns ?? []).map(c => (
                <li key={c.id} className="flex justify-between items-baseline">
                  <span className="text-slate-200">{c.name}</span>
                  <span className="text-[10px] text-slate-600 font-mono">{c.goal}</span>
                </li>
              ))}
              {(campaigns ?? []).length === 0 && <li className="text-[11px] text-slate-600">—</li>}
            </ul>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Banco de hooks</CardTitle>
            </CardHeader>
            <NewHookInline />
            <ul className="space-y-2 text-[12px]">
              {(hooks ?? []).map(h => (
                <li key={h.id} className="group flex items-start justify-between gap-2 border-l-2 border-accent-violet pl-2.5">
                  <div>
                    <div className="text-slate-300 italic">&ldquo;{h.phrase}&rdquo;</div>
                    {h.angle && <div className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wider">{h.angle}</div>}
                  </div>
                  <HookDeleteButton id={h.id} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
