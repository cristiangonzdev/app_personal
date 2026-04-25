import type { Metadata, Viewport } from 'next'
import { Syne, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400', '500', '600', '700'] })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500', '600'] })

export const metadata: Metadata = {
  title: 'CRM Logika',
  description: 'CRM interno de Logika Digital',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#060a14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${syne.variable} ${mono.variable} dark`}>
      <body className="min-h-screen bg-bg text-slate-200 antialiased">
        <div className="bg-mesh" aria-hidden />
        <div className="bg-grid" aria-hidden />
        <div className="relative z-10">{children}</div>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  )
}
