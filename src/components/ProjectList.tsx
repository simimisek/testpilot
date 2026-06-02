'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/types'

interface ProjectWithOrg extends Project {
  organization: { id: string; name: string } | null
}

interface Props {
  projects: ProjectWithOrg[]
  isAdmin: boolean
}

export default function ProjectList({ projects, isAdmin }: Props) {
  const [showNew, setShowNew] = useState(false)
  const [name, setName]       = useState('')
  const [orgId, setOrgId]     = useState('')
  const [orgs, setOrgs]       = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  async function openNewModal() {
    setName('')
    setOrgId('')
    setError('')
    if (isAdmin) {
      const supabase = createClient()
      const { data } = await supabase.from('organizations').select('id, name').order('name')
      setOrgs(data || [])
    }
    setShowNew(true)
  }

  async function createProject() {
    if (!name.trim()) return
    if (isAdmin && !orgId) { setError('Vyberte organizaci.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()

    let organizationId = orgId
    if (!isAdmin) {
      const { data: profileRows } = await supabase.rpc('get_my_profile')
      organizationId = profileRows?.[0]?.organization_id
    }

    const { data, error: err } = await supabase
      .from('projects')
      .insert({ name: name.trim(), organization_id: organizationId })
      .select()
      .single()

    setLoading(false)
    if (err) { setError(err.message); return }
    setShowNew(false)
    router.push(`/projects/${data.id}`)
    router.refresh()
  }

  async function deleteProject(id: string, name: string) {
    if (!confirm(`Smazat projekt „${name}"? Smažou se i všechny jeho testy.`)) return
    const supabase = createClient()
    await supabase.from('projects').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projekty</h1>
          <p className="text-sm text-slate-400 mt-0.5">Test plány ve vaší organizaci</p>
        </div>
        <button onClick={openNewModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium">
          + Nový projekt
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg font-medium text-slate-500">Zatím žádné projekty</p>
          <p className="text-sm mt-2">Vytvořte nový projekt a importujte CSV test plán.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate text-base">{p.name}</h3>
                  {isAdmin && p.organization && (
                    <p className="text-xs text-indigo-500 mt-0.5">{p.organization.name}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upraveno: {new Date(p.updated_at).toLocaleDateString('cs-CZ')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/projects/${p.id}`}
                    className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                    Otevřít
                  </Link>
                  <button onClick={() => deleteProject(p.id, p.name)}
                    className="px-3 py-1.5 text-red-500 text-sm rounded-lg hover:bg-red-50 border border-red-200">
                    Smazat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 mb-5">Nový projekt</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Název projektu *</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="např. Enectiva Mobile – v2.5" autoFocus
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Organizace *</label>
                  <select value={orgId} onChange={e => setOrgId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white">
                    <option value="">— Vyberte organizaci —</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={createProject} disabled={loading}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
                {loading ? 'Vytváření…' : 'Vytvořit projekt'}
              </button>
              <button onClick={() => setShowNew(false)}
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
