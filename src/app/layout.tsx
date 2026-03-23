import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'İtemSatış Panel',
  description: 'Özel Satış Yönetim ve Analiz Paneli',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Varsayılan dil tr ve dark mode default (dark class eklendi)
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen bg-background text-foreground antialiased")}>
        {children}
      </body>
    </html>
  )
}
