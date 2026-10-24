import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { APPEARANCE_BOOTSTRAP_SCRIPT } from '@/lib/ogonek/appearance'
import { SECURITY_BOOTSTRAP_SCRIPT } from '@/lib/ogonek/security'
import { ServiceWorkerRegister } from '@/components/ogonek/sw-register'
import { OfflineBanner } from '@/components/ogonek/offline-banner'

export const metadata: Metadata = {
  metadataBase: new URL('https://ogonek.app'),
  title: 'Огонёк — Твой личный дневник силы',
  description: 'Без фальши и токсичной продуктивности. Стрик, который никогда не сгорает.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Огонёк — Твой личный дневник силы',
    description: 'Без фальши и токсичной продуктивности. Стрик, который никогда не сгорает.',
    url: 'https://ogonek.app',
    siteName: 'Огонёк',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Огонёк — Твой личный дневник силы',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Огонёк — Твой личный дневник силы',
    description: 'Без фальши и токсичной продуктивности. Стрик, который никогда не сгорает.',
    images: ['/og-image.png'],
  },
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
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SECURITY_BOOTSTRAP_SCRIPT }} />
        <ServiceWorkerRegister />
        <OfflineBanner />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
