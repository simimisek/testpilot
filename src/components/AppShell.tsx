'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface Props {
  profile: Profile | null
  user: User
  children: React.ReactNode
}

export default function AppShell({ profile, user, children }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const isAdmin  = profile?.role === 'app_admin'

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'Projekty',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      adminOnly: false,
    },
    {
      href: '/admin/organizations',
      label: 'Organizace',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      adminOnly: true,
    },
    {
      href: '/admin/users',
      label: 'Uživatelé',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      adminOnly: true,
    },
  ]

  const visibleNav = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-4 shrink-0">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="hidden sm:block">TestPilot</span>
        </Link>

        {/* Nav */}
        <nav className="flex gap-1">
          {visibleNav.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                {item.icon}
                <span className="hidden sm:block">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {isAdmin && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium hidden sm:block">
              Admin
            </span>
          )}
          {profile?.organization && (
            <span className="text-xs text-slate-400 hidden md:block">
              {(profile.organization as any).name}
            </span>
          )}
          <Link href="/profile" className="text-sm text-slate-600 hover:text-slate-900 font-medium truncate max-w-[140px]">
            {profile?.full_name || user.email}
          </Link>
          <button onClick={signOut} className="text-sm text-slate-400 hover:text-slate-700 transition-colors shrink-0">
            Odhlásit
          </button>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
