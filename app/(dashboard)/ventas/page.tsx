import { getSupabaseServer } from '@/lib/supabase/server'
import { Kanban } from './kanban'
import { NewDealButton } from './deal-form'
import type { Deal } from '@/types'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const sb = await getSupabaseServer()
  const [{ data: deals }, { data: clients }] = await Promise.all([
    sb.from('deals')
      .select('id,title,stage,setup_amount,recurring_amount,probability,score,score_reasoning,next_best_action,last_activity_at,services,client_id,expected_close,source,notes,created_at')
      .is('deleted_at', null)
      .order('last_activity_at', { ascending: false }),
    sb.from('clients').select('id,legal_name,commercial_name').is('deleted_at', null).order('legal_name'),
  ])

  const clientOptions = (clients ?? []).map((c: { id: string; legal_name: string; commercial_name: string | null }) => ({
    id: c.id, name: c.commercial_name || c.legal_name,
  }))

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">{deals?.length ?? 0} deals · arrastra para mover de etapa</p>
        </div>
        <NewDealButton clients={clientOptions} />
      </header>
      <Kanban initialDeals={(deals ?? []) as Deal[]} clients={clientOptions} />
    </div>
  )
}
