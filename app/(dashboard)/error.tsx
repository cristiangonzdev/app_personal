'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'
import { AlertTriangle } from 'lucide-react'

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  const isMissingEnv =
    error.message?.includes('supabaseUrl') ||
    error.message?.includes('SUPABASE') ||
    error.message?.includes('fetch failed')

  return (
    <div className="max-w-xl mx-auto mt-16 rounded-lg border border-accent-red/30 bg-bg-surface/70 p-6">
      <div className="flex items-center gap-2 text-accent-red mb-3">
        <AlertTriangle size={16} />
        <span className="text-[12px] uppercase tracking-wider">Error en la sección</span>
      </div>
      <h2 className="text-lg font-semibold mb-2">No se pudo cargar la página</h2>
      <p className="text-[13px] text-slate-400 mb-3">
        {isMissingEnv
          ? 'Parece que faltan variables de entorno de Supabase en Vercel. Define NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY en el dashboard de Vercel y vuelve a desplegar.'
          : 'Revisa la consola del navegador y los logs de Vercel para más detalle.'}
      </p>
      <pre className="text-[11px] font-mono text-slate-500 bg-bg-surface2/50 rounded p-2 overflow-x-auto whitespace-pre-wrap">
        {error.message}
      </pre>
      <div className="flex gap-2 mt-4">
        <Button onClick={reset} size="sm">Reintentar</Button>
      </div>
    </div>
  )
}
