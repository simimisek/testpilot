'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserRow {
  id: string
  full_name: string | null
  role: string
  organization_id: string | null
  created_at: string
  organization: { id: string; name: string } | null
}

interface Org { id: string; name: string }

export default function UsersAdmin({ users, organizations }: { users: UserRow[], organizations: Org[] }) {
  const [showNew, setShowNew]   = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [orgId, setOrgId]       = useState('')
  const [role, setRole]         = useState('member')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  async function createUser() {
    if (!email.trim() || !password.trim() || !orgId) { setError('Vyplňte všechna povinná pole.'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, orgId, role })
      })

      let json: { error?: string } = {}
      try { json = await res.json() } catch { /* response not JSON – Vercel error page */ }

      if (!res.ok) {
        setError(json.error || `Chyba ${res.status} – zkontroluj Vercel logy.`)
        return
      }
      setShowNew(false)
      router.refresh()
    } catch (e: unknown) {
      setError('Síťová chyba: ' + (e instanceof Error ? e.message : 'zkuste znovu'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Uživatelé</h1>
          <p className="text-sm text-slate-400 mt-0.5">Správa uživatelů v TestPilot</p>
        </div>
        <button onClick={() => { setEmail(''); setPassword(''); setFullName(''); setOrgId(''); setRole('member'); setError(''); setShowNew(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium">
          + Nový uživatel
        </button>
      </div>

      <div className="grid gap-3">
        {users.length === 0 && <p className="text-center py-12 text-slate-400">Žádní uživatelé.</p>}
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{u.full_name || '(bez jména)'}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {(u.organization as any)?.name || '—'} · {u.role === 'app_admin' ? 'Admin' : 'Člen'}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'app_admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              {u.role === 'app_admin' ? 'Admin' : 'Člen'}
            </span>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 mb-5">Nový uživatel</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Celé jméno</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="Jana Nováková" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="jana@firma.cz" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Dočasné heslo *</label>
                <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="Dočasné heslo pro uživatele" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Organizace *</label>
                <select value={orgId} onChange={e => setOrgId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white">
                  <option value="">— Vyberte organizaci —</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white">
                  <option value="member">Člen</option>
                  <option value="app_admin">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={createUser} disabled={loading}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {loading ? 'Vytváření…' : 'Vytvořit uživatele'}
              </button>
              <button onClick={() => setShowNew(false)} className="py-2 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm">Zrušit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
