import { Analytics } from '@vercel/analytics/next'
import { Inter } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})
import { APPEARANCE_BOOTSTRAP_SCRIPT } from '@/lib/ogonek/appearance'
import { SECURITY_BOOTSTRAP_SCRIPT } from '@/lib/ogonek/security'
import { ServiceWorkerRegister } from '@/components/ogonek/sw-register'
import { OfflineBanner } from '@/components/ogonek/offline-banner'
import { Preloader } from '@/components/ui/preloader'

export const metadata: Metadata = {
  metadataBase: new URL('https://ogonek.app'),
  title: 'Priday — Твой личный дневник силы',
  description: 'Без фальши и токсичной продуктивности. Стрик, который никогда не сгорает.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Priday — Твой личный дневник силы',
    description: 'Без фальши и токсичной продуктивности. Стрик, который никогда не сгорает.',
    url: 'https://ogonek.app',
    siteName: 'Priday',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Priday — Твой личный дневник силы',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Priday — Твой личный дневник силы',
    description: 'Без фальши и токсичной продуктивности. Стрик, который никогда не сгорает.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Priday',
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
      <body className={`antialiased ${inter.variable}`} suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SECURITY_BOOTSTRAP_SCRIPT }} />
        <Preloader />
        <ServiceWorkerRegister />
        <OfflineBanner />
        {children}
        {Boolean(process.env.VERCEL) && <Analytics />}
      </body>
    </html>
  )
}
