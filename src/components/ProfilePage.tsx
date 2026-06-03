'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  email: string
  fullName: string
  role: string
  orgName: string
}

export default function ProfilePage({ userId, email, fullName, role, orgName }: Props) {
  const [name, setName]               = useState(fullName)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg]         = useState('')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwLoading, setPwLoading]     = useState(false)
  const [pwMsg, setPwMsg]             = useState('')
  const [pwError, setPwError]         = useState('')

  const router = useRouter()

  async function saveName() {
    if (!name.trim()) return
    setNameLoading(true)
    setNameMsg('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', userId)
    setNameLoading(false)
    if (error) { setNameMsg('Chyba: ' + error.message); return }
    setNameMsg('Uloženo.')
    router.refresh()
  }

  async function changePassword() {
    if (!newPassword.trim()) return
    setPwLoading(true)
    setPwMsg('')
    setPwError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwLoading(false)
    if (error) { setPwError('Chyba: ' + error.message); return }
    setPwMsg('Heslo bylo změněno.')
    setOldPassword('')
    setNewPassword('')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Můj profil</h1>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Email</p>
            <p className="text-slate-800">{email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Role</p>
            <p className="text-slate-800">{role === 'app_admin' ? 'Admin' : 'Člen'}</p>
          </div>
          {orgName && (
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Organizace</p>
              <p className="text-slate-800">{orgName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit name */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Jméno</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setNameMsg('') }}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
            placeholder="Tvoje jméno"
          />
          <button
            onClick={saveName}
            disabled={nameLoading || !name.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-indigo-700"
          >
            {nameLoading ? 'Ukládám…' : 'Uložit'}
          </button>
        </div>
        {nameMsg && <p className="text-sm text-green-600 mt-2">{nameMsg}</p>}
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Změna hesla</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Nové heslo</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPwMsg(''); setPwError('') }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              placeholder="Minimálně 6 znaků"
            />
          </div>
        </div>
        {pwError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{pwError}</p>}
        {pwMsg && <p className="text-sm text-green-600 mt-3">{pwMsg}</p>}
        <button
          onClick={changePassword}
          disabled={pwLoading || !newPassword.trim()}
          className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-indigo-700"
        >
          {pwLoading ? 'Měním…' : 'Změnit heslo'}
        </button>
      </div>
    </div>
  )
}
