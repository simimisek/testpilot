'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import SortableTestCard from '@/components/SortableTestCard'
import type { TestCase, Project } from '@/lib/types'

const STATUS_OPTIONS = ['Ready to Test', 'Pass', 'Fail', 'Blocked', 'Skipped', 'Not Relevant'] as const
const PRIORITY_OPTIONS = ['', 'High', 'Medium', 'Low'] as const

interface Props {
  project: Project & { organization: { id: string; name: string } | null }
  tests: TestCase[]
}

async function touchProject(projectId: string) {
  const supabase = createClient()
  await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', projectId)
}

function today() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

const EMPTY_FORM = {
  test_id: '', area: '', name: '', description: '',
  steps: '', expected_result: '', notes: '',
  priority: '' as TestCase['priority'], status: 'Ready to Test' as TestCase['status'],
}

export default function ProjectDetail({ project, tests: initialTests }: Props) {
  const sorted = [...initialTests].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const [tests, setTests]         = useState<TestCase[]>(sorted)
  const [updatedAt, setUpdatedAt] = useState<string>(project.updated_at)
  const [expanded, setExpanded]   = useState<Set<number>>(new Set())
  const [search, setSearch]       = useState('')
  const [filterStatus, setFS]     = useState('')
  const [filterPriority, setFP]   = useState('')
  const [filterArea, setFA]       = useState('')
  const [quickFilter, setQF]      = useState('')
  const [importing, setImporting] = useState(false)
  const [toast, setToast]         = useState('')
  const [modal, setModal]         = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const areas = [...new Set(tests.map(t => t.area).filter(Boolean))]

  const isFiltering = !!(quickFilter || filterStatus || filterPriority || filterArea || search)
  let filtered = tests
  if (quickFilter === 'untested') filtered = filtered.filter(t => !t.status || t.status === 'Ready to Test')
  else if (quickFilter === 'failed')  filtered = filtered.filter(t => t.status === 'Fail')
  else if (quickFilter === 'blocked') filtered = filtered.filter(t => t.status === 'Blocked')
  else if (quickFilter === 'high')    filtered = filtered.filter(t => t.priority === 'High')
  if (filterStatus)   filtered = filtered.filter(t => t.status === filterStatus)
  if (filterPriority) filtered = filtered.filter(t => t.priority === filterPriority)
  if (filterArea)     filtered = filtered.filter(t => t.area === filterArea)
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(t =>
      t.test_id.toLowerCase().includes(s) ||
      t.name.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s)
    )
  }

  const total   = tests.length
  const pass    = tests.filter(t => t.status === 'Pass').length
  const fail    = tests.filter(t => t.status === 'Fail').length
  const blocked = tests.filter(t => t.status === 'Blocked').length
  const ready   = tests.filter(t => !t.status || t.status === 'Ready to Test').length
  const prog    = total > 0 ? Math.round(((total - ready) / total) * 100) : 0

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function refreshTests() {
    const supabase = createClient()
    const { data } = await supabase.from('tests').select('*').eq('project_id', project.id).eq('archived', false).order('position').order('id')
    if (data) setTests(data as TestCase[])
  }

  // ── Drag and drop ──────────────────────────────────
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tests.findIndex(t => t.id === active.id)
    const newIndex = tests.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tests, oldIndex, newIndex)
    setTests(reordered)

    const supabase = createClient()
    await Promise.all(reordered.map((t, i) => supabase.from('tests').update({ position: i }).eq('id', t.id)))
    const now = new Date().toISOString()
    await supabase.from('projects').update({ updated_at: now }).eq('id', project.id)
    setUpdatedAt(now)
  }

  // ── Status change ──────────────────────────────────
  async function changeStatus(testId: number, newStatus: string) {
    const supabase = createClient()
    await supabase.from('tests').update({ status: newStatus, last_test_date: today() }).eq('id', testId)
    setTests(prev => prev.map(t => t.id === testId ? { ...t, status: newStatus as TestCase['status'], last_test_date: today() } : t))
  }

  // ── Add / Edit ─────────────────────────────────────
  function openAdd() {
    const maxNum = tests.reduce((m, t) => { const n = parseInt((t.test_id || '').replace(/\D/g, '')) || 0; return n > m ? n : m }, 0)
    setForm({ ...EMPTY_FORM, test_id: `TC-${maxNum + 1}` })
    setFormError(''); setEditingId(null); setModal('add')
  }

  function openEdit(t: TestCase) {
    setForm({ test_id: t.test_id, area: t.area, name: t.name, description: t.description, steps: t.steps, expected_result: t.expected_result, notes: t.notes, priority: t.priority, status: t.status })
    setFormError(''); setEditingId(t.id); setModal('edit')
  }

  async function saveForm() {
    if (!form.test_id.trim() || !form.name.trim()) { setFormError('ID testu a Název jsou povinné.'); return }
    setSaving(true); setFormError('')
    const supabase = createClient()
    if (modal === 'add') {
      const dup = tests.find(t => t.test_id === form.test_id.trim())
      if (dup) { setFormError(`ID ${form.test_id} již existuje.`); setSaving(false); return }
      const position = tests.length
      const { error } = await supabase.from('tests').insert({ ...form, test_id: form.test_id.trim(), name: form.name.trim(), project_id: project.id, archived: false, position })
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('tests').update({ ...form, test_id: form.test_id.trim(), name: form.name.trim() }).eq('id', editingId!)
      if (error) { setFormError(error.message); setSaving(false); return }
    }
    const now = new Date().toISOString()
    await supabase.from('projects').update({ updated_at: now }).eq('id', project.id)
    setUpdatedAt(now)
    await refreshTests(); setSaving(false); setModal(null)
    showToast(modal === 'add' ? 'Test case přidán' : 'Změny uloženy')
  }

  async function deleteTest(t: TestCase) {
    if (!confirm(`Smazat test case ${t.test_id}?`)) return
    const supabase = createClient()
    await supabase.from('tests').delete().eq('id', t.id)
    setTests(prev => prev.filter(x => x.id !== t.id))
    const now = new Date().toISOString()
    await supabase.from('projects').update({ updated_at: now }).eq('id', project.id)
    setUpdatedAt(now)
    showToast('Test case smazán')
  }

  // ── CSV import ─────────────────────────────────────
  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target?.result as string
      const result = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim().replace(/﻿/g, '') })
      try {
        await importCsv(result.data as Record<string, string>[])
      } finally {
        setImporting(false)
        if (csvRef.current) csvRef.current.value = ''
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function importCsv(rows: Record<string, string>[]) {
    const supabase = createClient()
    const validRows = rows.filter(r => (r['ID testu'] || '').trim())
    const existingMap = new Map(tests.map(t => [t.test_id, t]))
    const toAdd: Omit<TestCase, 'id'>[] = []
    const toUpdate: { id: number; data: Partial<TestCase> }[] = []
    let pos = tests.length
    for (const row of validRows) {
      const testId = row['ID testu'].trim()
      const data = {
        test_id: testId, project_id: project.id,
        area: (row['Oblast'] || '').trim(),
        name: (row['Název'] || '').trim(),
        description: (row['Popis'] || '').trim(),
        steps: (row['Testovací kroky'] || '').trim(),
        expected_result: (row['Očekávaný výsledek'] || '').trim(),
        notes: (row['Poznámky'] || '').trim(),
        priority: (row['Priorita'] || '').trim() as TestCase['priority'],
        status: ((row['Status'] || 'Ready to Test').trim() || 'Ready to Test') as TestCase['status'],
        last_test_date: (row['Datum posledního testu'] || '').trim(),
        build: (row['Build'] || '').trim(),
        bug_id: (row['Bug ID'] || '').trim(),
        run_note: (row['Test run poznámka'] || '').trim(),
        archived: false, position: pos++,
      }
      existingMap.has(testId) ? toUpdate.push({ id: existingMap.get(testId)!.id, data }) : toAdd.push(data)
    }
    if (toAdd.length > 0) {
      const { error } = await supabase.from('tests').insert(toAdd)
      if (error) { showToast(`Chyba importu: ${error.message}`); return }
    }
    for (const u of toUpdate) await supabase.from('tests').update(u.data).eq('id', u.id)
    const now = new Date().toISOString()
    await supabase.from('projects').update({ last_import_at: now, updated_at: now }).eq('id', project.id)
    setUpdatedAt(now)
    await refreshTests()
    showToast(`Import dokončen: ${toAdd.length} nových, ${toUpdate.length} aktualizovaných`)
  }

  // ── CSV export ─────────────────────────────────────
  function exportCsv() {
    const rows = tests.map(t => ({
      'ID testu': t.test_id, 'Oblast': t.area, 'Název': t.name, 'Popis': t.description,
      'Testovací kroky': t.steps, 'Očekávaný výsledek': t.expected_result,
      'Poznámky': t.notes, 'Priorita': t.priority,
      'Status': t.status || 'Ready to Test',
      'Test run poznámka': t.run_note,
    }))
    const csv = '﻿' + Papa.unparse(rows, { quotes: true })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${project.name}_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function downloadTemplate() {
    const headers = ['ID testu','Oblast','Název','Popis','Testovací kroky','Očekávaný výsledek','Poznámky','Priorita','Status','Test run poznámka']
    const csv = '﻿' + Papa.unparse([headers], { quotes: true, header: false })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'testpilot_sablona.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ─────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg pointer-events-none">{toast}</div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">{project.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {project.organization && <span className="text-indigo-500 mr-2">{project.organization.name}</span>}
            Aktualizováno: {new Date(updatedAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button onClick={openAdd} className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium">+ Přidat test</button>
          <button onClick={downloadTemplate} className="px-3 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 text-sm">Šablona CSV</button>
          <button onClick={() => csvRef.current?.click()} disabled={importing}
            className="px-3 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 text-sm disabled:opacity-50">
            {importing ? 'Importuji…' : 'Import CSV'}
          </button>
          <button onClick={exportCsv} className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm">Export CSV</button>
        </div>
        <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[{val:total,label:'Celkem',cls:'text-slate-700'},{val:pass,label:'Pass',cls:'text-green-600'},{val:fail,label:'Fail',cls:'text-red-500'},{val:blocked,label:'Blocked',cls:'text-orange-500'}].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600 font-medium">Pokrok</span>
          <span className="font-bold text-indigo-600">{prog}%</span>
        </div>
        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${prog}%` }} />
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
        {[{key:'',label:'Vše'},{key:'untested',label:'Netestované'},{key:'failed',label:'Failed'},{key:'blocked',label:'Blocked'},{key:'high',label:'High priority'}].map(qf => (
          <button key={qf.key} onClick={() => setQF(qf.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs border font-medium transition-colors ${
              quickFilter === qf.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}>{qf.label}</button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex flex-wrap gap-2">
        <input type="text" placeholder="Hledat ID, název, popis…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
        <select value={filterStatus} onChange={e => setFS(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">Všechny statusy</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFP(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">Všechny priority</option>
          {['High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterArea} onChange={e => setFA(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">Všechny oblasti</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Test list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          {total === 0
            ? <><p className="text-lg font-medium text-slate-500 mb-2">Žádné testy</p><p className="text-sm">Přidej test ručně nebo importuj CSV.</p></>
            : <p>Žádné testy neodpovídají filtru.</p>}
        </div>
      ) : (
        <>
          {isFiltering && (
            <p className="text-xs text-slate-400 mb-2 text-center">Řazení přetažením je dostupné bez aktivních filtrů.</p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-2">
                {filtered.map(t => (
                  <SortableTestCard
                    key={t.id}
                    t={t}
                    isOpen={expanded.has(t.id)}
                    onToggle={() => setExpanded(prev => { const s = new Set(prev); s.has(t.id) ? s.delete(t.id) : s.add(t.id); return s })}
                    onStatusChange={changeStatus}
                    onEdit={openEdit}
                    onDelete={deleteTest}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">{modal === 'add' ? 'Přidat test case' : 'Editovat test case'}</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ID testu *</label>
                    <input value={form.test_id} onChange={e => setForm(f => ({...f, test_id: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" placeholder="TC-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Priorita</label>
                    <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value as TestCase['priority']}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white">
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p || '—'}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Oblast</label>
                  <input value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} list="area-list"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" placeholder="např. Login" />
                  <datalist id="area-list">{areas.map(a => <option key={a} value={a} />)}</datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Název *</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" placeholder="Co se testuje" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Popis</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-vertical" placeholder="Kontext a detaily…" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Testovací kroky</label>
                  <textarea value={form.steps} onChange={e => setForm(f => ({...f, steps: e.target.value}))} rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-vertical font-mono"
                    placeholder={'1. Otevři…\n2. Klikni na…\n3. Ověř…'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Očekávaný výsledek</label>
                  <textarea value={form.expected_result} onChange={e => setForm(f => ({...f, expected_result: e.target.value}))} rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-vertical" placeholder="Co se má stát…" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Poznámky</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-vertical" placeholder="Volitelné poznámky…" />
                </div>
                {modal === 'edit' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as TestCase['status']}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white">
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{formError}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={saveForm} disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Ukládání…' : modal === 'add' ? 'Přidat' : 'Uložit změny'}
                </button>
                <button onClick={() => setModal(null)} className="py-2 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm">Zrušit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
