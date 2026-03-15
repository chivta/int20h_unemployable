import { useState, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Plus, Trash2, Zap, X } from 'lucide-react'
import { useAppContext } from '../../state/context'
import type { EdgeAction } from '../../types/dag'

const API_URL = import.meta.env.VITE_API_URL ?? ''

interface FieldSchema {
  type: 'int' | 'enum' | 'string'
  options?: string[]
}

export interface QuestionRFData extends Record<string, unknown> {
  id: string
  text: string
  answers: Array<{ edgeId: string; label: string; hasNext: boolean }>
  questionType: 'single' | 'multi'
  nextNodeId: string | null
}

export function QuestionNode({ data }: NodeProps & { data: QuestionRFData }) {
  const { state, dispatch } = useAppContext()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [popupEdgeId, setPopupEdgeId] = useState<string | null>(null)
  const [schema, setSchema] = useState<Record<string, FieldSchema> | null>(null)

  const startEditing = (field: string, initialValue: string) => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setLocalValues(prev => ({ ...prev, [field]: initialValue }))
    setEditingField(field)
  }

  const stopEditing = () => {
    blurTimer.current = setTimeout(() => setEditingField(null), 100)
  }

  const openPopup = (edgeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPopupEdgeId(edgeId)
    if (!schema) {
      fetch(`${API_URL}/api/admin/field-schema`)
        .then(r => r.json())
        .then(setSchema)
        .catch(() => {})
    }
  }

  // Actions helpers — operate on the currently open edge
  const popupEdge = popupEdgeId ? state.app.dag.edges[popupEdgeId] : null
  const actions: EdgeAction[] = popupEdge?.actions ?? []
  const fieldNames = schema ? Object.keys(schema) : []
  const schemaAvailable = fieldNames.length > 0
  const questionType = data.questionType ?? 'single'
  const isMulti = questionType === 'multi'
  const allNodes = state.app.dag.nodes

  function updateActions(updated: EdgeAction[]) {
    if (!popupEdgeId) return
    dispatch({ type: 'SET_EDGE_ACTIONS', edgeId: popupEdgeId, actions: updated })
  }

  function addAction() {
    const firstField = fieldNames[0] ?? ''
    const firstSchema = schema?.[firstField]
    const defaultValue = firstSchema?.type === 'enum' ? (firstSchema.options?.[0] ?? '') : 0
    const defaultType: EdgeAction['type'] = isMulti ? 'delta' : 'set'
    updateActions([...actions, { type: defaultType, fieldName: firstField, value: defaultValue }])
  }

  function removeAction(i: number) {
    updateActions(actions.filter((_, idx) => idx !== i))
  }

  function updateAction(i: number, patch: Partial<EdgeAction>) {
    const updated = actions.map((a, idx) => {
      if (idx !== i) return a
      const merged = { ...a, ...patch }
      if (patch.fieldName && patch.fieldName !== a.fieldName) {
        const s = schema?.[patch.fieldName]
        merged.value = s?.type === 'enum' ? (s.options?.[0] ?? '') : 0
      }
      return merged
    })
    updateActions(updated)
  }

  return (
    <div className="min-w-[240px] rounded-lg border-2 border-blue-200 bg-white shadow-md">
      {/* Target handle (incoming edge) */}
      <Handle type="target" position={Position.Left} className="!bg-blue-400" />

      {/* Question header */}
      <div className="rounded-t-md bg-blue-50 px-3 py-2">
        <div className="mb-1 flex items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Question</p>
          {/* Single/Multi toggle */}
          <button
            className={[
              'nodrag nopan rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors',
              (data.questionType ?? 'single') === 'multi'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300',
            ].join(' ')}
            onClick={e => {
              e.stopPropagation()
              dispatch({
                type: 'SET_QUESTION_TYPE',
                nodeId: data.id,
                questionType: (data.questionType ?? 'single') === 'multi' ? 'single' : 'multi',
              })
            }}
            title="Toggle Single/Multi choice"
          >
            {(data.questionType ?? 'single') === 'multi' ? 'Multi' : 'Single'}
          </button>
        </div>
        <textarea
          className="nodrag nopan w-full resize-none rounded border border-transparent bg-transparent px-0 py-0 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:border-blue-300 focus:bg-white focus:px-1 focus:outline-none"
          rows={2}
          value={editingField === 'question' ? (localValues['question'] ?? data.text) : data.text}
          readOnly={editingField !== 'question'}
          onChange={e => {
            setLocalValues(prev => ({ ...prev, question: e.target.value }))
            dispatch({ type: 'UPDATE_NODE_TEXT', nodeId: data.id, text: e.target.value })
          }}
          placeholder="Enter question…"
          onClick={e => { e.stopPropagation(); startEditing('question', data.text) }}
          onBlur={stopEditing}
        />
      </div>

      {/* Answer rows */}
      <div className="divide-y divide-gray-100">
        {data.answers.map((ans, i) => (
          <div
            key={ans.edgeId}
            className="relative flex items-center gap-1 py-1.5 pl-3 pr-10"
            onContextMenu={e => openPopup(ans.edgeId, e)}
          >
            <span className="w-4 shrink-0 text-[10px] text-gray-400">{i + 1}.</span>
            <input
              className="nodrag nopan min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-xs text-gray-700 placeholder-gray-400 focus:bg-blue-50 focus:outline-none"
              value={editingField === ans.edgeId ? (localValues[ans.edgeId] ?? ans.label) : ans.label}
              readOnly={editingField !== ans.edgeId}
              onChange={e => {
                setLocalValues(prev => ({ ...prev, [ans.edgeId]: e.target.value }))
                dispatch({ type: 'UPDATE_ANSWER_LABEL', edgeId: ans.edgeId, label: e.target.value })
              }}
              placeholder="Answer…"
              onClick={e => { e.stopPropagation(); startEditing(ans.edgeId, ans.label) }}
              onBlur={stopEditing}
            />

            {/* Per-answer source handle — only for single-choice nodes */}
            {(data.questionType ?? 'single') === 'single' && (
              <>
                {!ans.hasNext && (
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-500">
                    +
                  </div>
                )}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={ans.edgeId}
                  style={{
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 20,
                    height: 20,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'crosshair',
                  }}
                />
              </>
            )}
          </div>
        ))}

        {/* Add option button */}
        <button
          className="nodrag nopan flex w-full items-center justify-center gap-1 py-1.5 text-[11px] text-blue-500 hover:bg-blue-50"
          onClick={e => {
            e.stopPropagation()
            dispatch({ type: 'ADD_ANSWER', nodeId: data.id })
          }}
        >
          <Plus size={11} /> Add option
        </button>
      </div>

      {/* Single outgoing handle for multi-choice nodes — vertically centered */}
      {(data.questionType ?? 'single') === 'multi' && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{
            right: -8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
            background: data.nextNodeId ? '#6366f1' : 'transparent',
            border: '2px solid #6366f1',
            borderRadius: '50%',
            cursor: 'crosshair',
          }}
        />
      )}

      {/* Config Popup */}
      {popupEdgeId && popupEdge && (
        <div
          className="nodrag nopan fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setPopupEdgeId(null)
          }}
        >
          <div
            className="relative w-80 max-h-[80vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Configure Answer</span>
              <button
                onClick={() => setPopupEdgeId(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
              {/* Label field */}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">Label</label>
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                  value={popupEdge.label}
                  onChange={e => dispatch({ type: 'UPDATE_ANSWER_LABEL', edgeId: popupEdgeId, label: e.target.value })}
                  placeholder="Answer label…"
                />
              </div>

              {/* Next node selector — single-choice only */}
              {questionType === 'single' && (
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">Next Node</label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    value={popupEdge.next ?? ''}
                    onChange={e => dispatch({ type: 'SET_ANSWER_NEXT', edgeId: popupEdgeId, next: e.target.value || null })}
                  >
                    <option value="">(terminal)</option>
                    {Object.values(allNodes).map(n => (
                      <option key={n.id} value={n.id}>
                        {n.id}{n.text ? ` — ${n.text.slice(0, 40)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions section */}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-2 uppercase tracking-wide">Actions</label>
                <div className="space-y-2">
                  {actions.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-5 text-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                        <Zap size={14} className="text-slate-400" />
                      </div>
                      <p className="text-xs font-medium text-slate-500">No actions yet</p>
                      {schemaAvailable && (
                        <button
                          onClick={addAction}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                          <Plus size={11} /> Add first action
                        </button>
                      )}
                    </div>
                  ) : (
                    actions.map((action, i) => {
                      const fieldSchema = schema?.[action.fieldName]
                      return (
                        <div
                          key={i}
                          className="rounded-lg border border-l-4 border-l-indigo-400 border-t-slate-200 border-r-slate-200 border-b-slate-200 bg-white p-2.5 space-y-2 shadow-sm"
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
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Field + Type row */}
                          <div className="flex gap-2">
                            <div className="flex-1 min-w-0">
                              <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">Field</label>
                              <select
                                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                                value={action.fieldName}
                                onChange={e => updateAction(i, { fieldName: e.target.value })}
                              >
                                {fieldNames.map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                            </div>

                            <div className="w-20 shrink-0">
                              <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">Type</label>
                              <select
                                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                                value={action.type}
                                onChange={e => updateAction(i, { type: e.target.value as EdgeAction['type'] })}
                              >
                                <option value="set">set</option>
                                <option value="delta">delta</option>
                              </select>
                            </div>
                          </div>

                          {/* Value row */}
                          <div>
                            <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">Value</label>
                            {fieldSchema?.type === 'enum' ? (
                              <select
                                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                                value={String(action.value)}
                                onChange={e => updateAction(i, { value: e.target.value })}
                              >
                                {fieldSchema.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : (
                              <input
                                type={fieldSchema?.type === 'int' ? 'number' : 'text'}
                                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                                value={String(action.value)}
                                onChange={e => updateAction(i, {
                                  value: fieldSchema?.type === 'int' ? (parseInt(e.target.value, 10) || 0) : e.target.value,
                                })}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Add action button when actions already exist */}
                {actions.length > 0 && (
                  <button
                    onClick={addAction}
                    disabled={!schemaAvailable}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={12} /> Add action
                  </button>
                )}

                {!schemaAvailable && (
                  <p className="mt-1 text-center text-[10px] text-slate-400 italic">
                    Backend unavailable — start the server to enable actions
                  </p>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => {
                  dispatch({ type: 'DELETE_ANSWER', edgeId: popupEdgeId })
                  setPopupEdgeId(null)
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 size={13} /> Delete Answer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
