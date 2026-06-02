import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'TestPilot',
  description: 'QA Test Plan Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-50 text-slate-800 antialiased">{children}</body>
    </html>
  )
}
