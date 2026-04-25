import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/topbar'
import { getSupabaseServer } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await getSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6">{children}</main>
      </div>
    </div>
  )
}
