'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TestCase } from '@/lib/types'

const STATUS_OPTIONS = ['Ready to Test', 'Pass', 'Fail', 'Blocked', 'Skipped', 'Not Relevant'] as const
const STATUS_CLS: Record<string, string> = {
  'Ready to Test': 'bg-slate-100 text-slate-700',
  'Pass':          'bg-green-100 text-green-700',
  'Fail':          'bg-red-100 text-red-700',
  'Blocked':       'bg-orange-100 text-orange-700',
  'Skipped':       'bg-blue-100 text-blue-700',
  'Not Relevant':  'bg-slate-100 text-slate-500',
}
const PRIORITY_CLS: Record<string, string> = {
  'High':   'bg-red-100 text-red-700',
  'Medium': 'bg-yellow-100 text-yellow-700',
  'Low':    'bg-green-100 text-green-700',
}

interface Props {
  t: TestCase
  isOpen: boolean
  onToggle: () => void
  onStatusChange: (id: number, status: string) => void
  onEdit: (t: TestCase) => void
  onDelete: (t: TestCase) => void
}

export default function SortableTestCard({ t, isOpen, onToggle, onStatusChange, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const status = t.status || 'Ready to Test'

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 select-none">

        {/* Drag handle */}
        <button
          {...attributes} {...listeners}
          className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          title="Přetáhnout"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16"/>
          </svg>
        </button>

        {/* Clickable area */}
        <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
          <span className="text-xs font-mono text-slate-400 w-16 shrink-0 truncate">{t.test_id}</span>
          <span className="font-semibold text-slate-800 flex-1 truncate text-sm">{t.name}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {t.priority && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_CLS[t.priority] || ''}`}>{t.priority}</span>
          )}
          <select
            value={status}
            onChange={e => onStatusChange(t.id, e.target.value)}
            className={`text-xs font-medium px-2 py-1 rounded cursor-pointer border-0 outline-none ${STATUS_CLS[status]}`}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => onEdit(t)} className="p-1 text-slate-300 hover:text-indigo-500 transition-colors" title="Editovat">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button onClick={() => onDelete(t)} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title="Smazat">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
          <svg className={`w-4 h-4 text-slate-300 transition-transform cursor-pointer ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" onClick={onToggle}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="divide-y divide-slate-100">
          {t.description && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Popis</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{t.description}</p>
            </div>
          )}
          {t.steps && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Testovací kroky</p>
              <div className="space-y-1">
                {t.steps.split('\n').filter(l => l.trim()).map((line, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-indigo-500 font-bold shrink-0 w-5 text-right">{i + 1}.</span>
                    <span className="text-slate-700">{line.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {t.expected_result && (
            <div className="px-4 py-3 bg-emerald-50 border-l-4 border-emerald-400">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">✓ Očekávaný výsledek</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{t.expected_result}</p>
            </div>
          )}
          {t.notes && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Poznámky</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{t.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
