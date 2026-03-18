// ─────────────────────────────────────────────
// LOGIKA OS — Root Layout
//
// El layout envuelve TODAS las páginas.
// Incluye:
// - Fuentes (Syne + DM Mono)
// - Sidebar de navegación
// - Área de contenido principal
// ─────────────────────────────────────────────

import type { Metadata } from 'next'
import { Syne, DM_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Logika OS',
  description: 'Sistema operativo personal de Logika Digital',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${syne.variable} ${dmMono.variable}`}>
      <body className="bg-[#0a0e1a] text-slate-200 antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-[#0a0e1a]">
            <div className="min-h-full p-6 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
