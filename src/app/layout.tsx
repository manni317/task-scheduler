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
    default: 'Task Manager',
    template: '%s | Task Manager',
  },
  description: 'A modern task management application built with Next.js 14, Supabase, and shadcn/ui',
  keywords: ['task manager', 'project management', 'team collaboration', 'kanban', 'productivity'],
  authors: [{ name: 'Task Manager' }],
  creator: 'Task Manager',
  publisher: 'Task Manager',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://task-manager.vercel.app',
    siteName: 'Task Manager',
    title: 'Task Manager',
    description: 'A modern task management application',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Task Manager',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Task Manager',
    description: 'A modern task management application',
    images: ['/og-image.png'],
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
    title: 'Task Manager',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'theme-color': '#6366f1',
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
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}