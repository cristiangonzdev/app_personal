import { signInWithMagicLink, signInWithGoogle } from './actions'
import { Button, Input } from '@/components/ui'

export const metadata = { title: 'Login · CRM Logika' }

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; sent?: string }> }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-surface/70 backdrop-blur-md p-7 animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-[22px] font-semibold tracking-tight">Logika<span className="text-accent-cyan">·</span>OS</div>
          <p className="text-[11px] uppercase tracking-widest text-slate-600 mt-1">CRM interno</p>
        </div>
        <Suspense searchParams={searchParams}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}

async function Suspense({ children }: { children: React.ReactNode; searchParams: Promise<unknown> }) {
  return <>{children}</>
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; sent?: string }> }) {
  const sp = await searchParams
  return (
    <>
      {sp.sent && (
        <div className="mb-4 rounded-md bg-accent-green/10 border border-accent-green/30 px-3 py-2 text-[12px] text-accent-green">
          Magic link enviado. Revisa tu correo.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-md bg-accent-red/10 border border-accent-red/30 px-3 py-2 text-[12px] text-accent-red">
          {sp.error}
        </div>
      )}
      <form action={signInWithMagicLink} className="space-y-3">
        <input type="hidden" name="next" value={sp.next || '/'} />
        <Input type="email" name="email" placeholder="tu@email.com" required autoFocus />
        <Button type="submit" className="w-full">Enviar magic link</Button>
      </form>
      <div className="my-4 flex items-center gap-3 text-[10px] text-slate-600">
        <div className="flex-1 h-px bg-border" /> O <div className="flex-1 h-px bg-border" />
      </div>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={sp.next || '/'} />
        <Button variant="outline" type="submit" className="w-full">Continuar con Google</Button>
      </form>
    </>
  )
}
