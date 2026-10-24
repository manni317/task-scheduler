import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/providers/providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SysB International | Task Management Platform',
    template: '%s | SysB International',
  },
  description: 'Enterprise task scheduling and workforce management by SysB International',
  keywords: ['sysb international', 'task manager', 'project management', 'team collaboration', 'kanban', 'productivity'],
  authors: [{ name: 'SysB International' }],
  creator: 'SysB International',
  publisher: 'SysB International',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sysbinternational.com',
    siteName: 'SysB International',
    title: 'SysB International | Task Management Platform',
    description: 'Enterprise task scheduling and workforce management by SysB International',
    images: [
      {
        url: '/sysb-logo.png',
        width: 1500,
        height: 500,
        alt: 'SysB International Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SysB International | Task Management Platform',
    description: 'Enterprise task scheduling and workforce management by SysB International',
    images: ['/sysb-logo.png'],
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SysB Tasks',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'theme-color': '#ffffff',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('sysb_splash_played')) {
                  document.documentElement.classList.add('splash-skip');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}