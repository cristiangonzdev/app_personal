import type { Metadata, Viewport } from 'next'
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
  manifest: undefined,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#060a14',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${syne.variable} ${dmMono.variable}`}>
      <body className="bg-[#060a14] text-slate-200 antialiased">
        {/* Animated background */}
        <div className="bg-mesh" aria-hidden="true">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
        </div>
        <div className="bg-grid" aria-hidden="true" />

        {/* App shell */}
        <div className="relative z-10 flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto scroll-smooth">
            {/* Mobile: top padding for bar + bottom for nav */}
            <div className="min-h-full px-4 pt-[72px] pb-[90px] md:px-8 md:pt-8 md:pb-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
