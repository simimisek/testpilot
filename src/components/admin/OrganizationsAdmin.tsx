'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Org { id: string; name: string; created_at: string }

export default function OrganizationsAdmin({ organizations }: { organizations: Org[] }) {
  const [showNew, setShowNew]         = useState(false)
  const [name, setName]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Edit org name
  const [showEdit, setShowEdit]       = useState(false)
  const [editId, setEditId]           = useState('')
  const [editName, setEditName]       = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError]     = useState('')

  const router = useRouter()

  async function create() {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('organizations').insert({ name: name.trim() })
    setLoading(false)
    if (err) { setError(err.message); return }
    setShowNew(false)
    setName('')
    router.refresh()
  }

  async function deleteOrg(id: string) {
    if (!confirm('Smazat organizaci? Smažou se i všechny její projekty!')) return
    const supabase = createClient()
    await supabase.from('organizations').delete().eq('id', id)
    router.refresh()
  }

  function openEditModal(id: string, currentName: string) {
    setEditId(id)
    setEditName(currentName)
    setEditError('')
    setShowEdit(true)
  }

  async function renameOrg() {
    if (!editName.trim()) return
    setEditLoading(true)
    setEditError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('organizations')
      .update({ name: editName.trim() })
      .eq('id', editId)
    setEditLoading(false)
    if (err) { setEditError(err.message); return }
    setShowEdit(false)
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizace</h1>
          <p className="text-sm text-slate-400 mt-0.5">Správa organizací v TestPilot</p>
        </div>
        <button onClick={() => { setName(''); setError(''); setShowNew(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium">
          + Nová organizace
        </button>
      </div>

      <div className="grid gap-3">
        {organizations.length === 0 && (
          <p className="text-center py-12 text-slate-400">Žádné organizace.</p>
        )}
        {organizations.map(org => (
          <div key={org.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{org.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Vytvořeno: {new Date(org.created_at).toLocaleDateString('cs-CZ')}
              </p>
            </div>
            <Link href={`/dashboard?org=${org.id}`}
              className="text-sm text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 border border-indigo-200">
              Projekty
            </Link>
            <button onClick={() => openEditModal(org.id, org.name)}
              className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-slate-200">
              Přejmenovat
            </button>
            <button onClick={() => deleteOrg(org.id)}
              className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-red-200">
              Smazat
            </button>
          </div>
        ))}
      </div>

      {/* New org modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nová organizace</h2>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 mb-3"
              placeholder="Název firmy" autoFocus
            />
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={create} disabled={loading || !name.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {loading ? 'Vytváření…' : 'Vytvořit'}
              </button>
              <button onClick={() => setShowNew(false)}
                className="py-2 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm">
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit org name modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Přejmenovat organizaci</h2>
            <input
              type="text" value={editName} onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && renameOrg()}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 mb-3"
              autoFocus
            />
            {editError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{editError}</p>}
            <div className="flex gap-3">
              <button onClick={renameOrg} disabled={editLoading || !editName.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {editLoading ? 'Ukládání…' : 'Uložit'}
              </button>
              <button onClick={() => setShowEdit(false)}
                className="py-2 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm">
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
