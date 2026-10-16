import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { APPEARANCE_BOOTSTRAP_SCRIPT } from '@/lib/ogonek/appearance'
import { SECURITY_BOOTSTRAP_SCRIPT } from '@/lib/ogonek/security'
import { ServiceWorkerRegister } from '@/components/ogonek/sw-register'

export const metadata: Metadata = {
  title: 'Огонёк — Дневник силы и благодарности',
  description: 'Личный дневник достижений, благодарностей и фиксации внутренней опоры.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Огонёк',
  },
  icons: {
    icon: [
      {
        url: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        url: '/icons/icon-192.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SECURITY_BOOTSTRAP_SCRIPT }} />
        <ServiceWorkerRegister />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
