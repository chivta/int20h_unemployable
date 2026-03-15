import { useEffect, useState } from 'react'
import { Plus, Trash2, Zap, ArrowRight } from 'lucide-react'
import { useAppContext } from '../../state/context'
import type { EdgeAction } from '../../types/dag'

const API_URL = import.meta.env.VITE_API_URL ?? ''

interface FieldSchema {
  type: 'int' | 'enum' | 'string'
  options: string[]
}

export function EdgePanel({ edgeId }: { edgeId: string }) {
  const { state, dispatch } = useAppContext()
  const edge = state.app.dag.edges[edgeId]
  const [schema, setSchema] = useState<Record<string, FieldSchema>>({})

  useEffect(() => {
    fetch(`${API_URL}/api/admin/field-schema`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setSchema)
      .catch(() => {})
  }, [])

  if (!edge) return null

  const actions = edge.actions ?? []
  const fieldNames = Object.keys(schema)
  const schemaAvailable = fieldNames.length > 0

  function updateActions(updated: EdgeAction[]) {
    dispatch({ type: 'SET_EDGE_ACTIONS', edgeId, actions: updated })
  }

  function addAction() {
    const firstField = fieldNames[0] ?? ''
    const firstSchema = schema[firstField]
    const defaultValue = firstSchema?.type === 'enum' ? (firstSchema.options[0] ?? '') : 0
    updateActions([...actions, { type: 'set', fieldName: firstField, value: defaultValue }])
  }

  function removeAction(i: number) {
    updateActions(actions.filter((_, idx) => idx !== i))
  }

  function updateAction(i: number, patch: Partial<EdgeAction>) {
    const updated = actions.map((a, idx) => {
      if (idx !== i) return a
      const merged = { ...a, ...patch }
      if (patch.fieldName && patch.fieldName !== a.fieldName) {
        const s = schema[patch.fieldName]
        merged.value = s?.type === 'enum' ? (s.options[0] ?? '') : 0
      }
      return merged
    })
    updateActions(updated)
  }

  return (
    <div className="space-y-5">
      {/* Edge info */}
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
        <span className="text-sm font-medium text-slate-700 truncate">{edge.label || edgeId}</span>
        <ArrowRight size={14} className="shrink-0 text-slate-400" />
        <span className="text-sm text-slate-500 truncate">{edge.next ?? 'terminal'}</span>
      </div>

      {/* Actions list */}
      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Zap size={18} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">No actions yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Actions mutate UserData when this edge is traversed</p>
            </div>
            {schemaAvailable && (
              <button
                onClick={addAction}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus size={12} /> Add first action
              </button>
            )}
          </div>
        ) : (
          <>
            {actions.map((action, i) => {
              const fieldSchema = schema[action.fieldName]
              return (
                <div
                  key={i}
                  className="rounded-lg border border-l-4 border-l-indigo-400 border-t-slate-200 border-r-slate-200 border-b-slate-200 bg-white p-3 space-y-2.5 shadow-sm"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-indigo-50 text-indigo-600">
                      <Zap size={9} />
                      Action {i + 1}
                    </span>
                    <button
                      onClick={() => removeAction(i)}
                      className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Field + Type row */}
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">Field</label>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                        value={action.fieldName}
                        onChange={e => updateAction(i, { fieldName: e.target.value })}
                      >
                        {fieldNames.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>

                  </div>

                  {/* Value row */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">Value</label>
                    {fieldSchema?.type === 'enum' ? (
                      <select
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                        value={String(action.value)}
                        onChange={e => updateAction(i, { value: e.target.value })}
                      >
                        {fieldSchema.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={fieldSchema?.type === 'int' ? 'number' : 'text'}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                        value={String(action.value)}
                        onChange={e => updateAction(i, {
                          value: fieldSchema?.type === 'int' ? (parseInt(e.target.value, 10) || 0) : e.target.value,
                        })}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Add button (only when there are existing actions) */}
      {actions.length > 0 && (
        <button
          onClick={addAction}
          disabled={!schemaAvailable}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={13} /> Add action
        </button>
      )}

      {!schemaAvailable && (
        <p className="text-center text-[11px] text-slate-400 italic">
          Backend unavailable — start the server to enable editing
        </p>
      )}
    </div>
  )
}
