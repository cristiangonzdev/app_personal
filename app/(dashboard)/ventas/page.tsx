import { getSupabaseServer } from '@/lib/supabase/server'
import { Kanban } from './kanban'
import type { Deal } from '@/types'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const sb = await getSupabaseServer()
  const { data: deals } = await sb
    .from('deals')
    .select('id,title,stage,setup_amount,recurring_amount,probability,score,score_reasoning,next_best_action,last_activity_at,services,client_id,expected_close,source,created_at')
    .is('deleted_at', null)
    .order('last_activity_at', { ascending: false })

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">{deals?.length ?? 0} deals · arrastra para mover de etapa</p>
        </div>
      </header>
      <Kanban initialDeals={(deals ?? []) as Deal[]} />
    </div>
  )
}
