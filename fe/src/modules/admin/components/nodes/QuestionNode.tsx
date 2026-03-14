import { useState, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useAppContext } from '../../state/context'

export interface QuestionRFData extends Record<string, unknown> {
  id: string
  text: string
  answers: Array<{ edgeId: string; label: string; hasNext: boolean }>
  isRoot: boolean
}

export function QuestionNode({ data }: NodeProps & { data: QuestionRFData }) {
  const { dispatch } = useAppContext()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startEditing = (field: string, initialValue: string) => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setLocalValues(prev => ({ ...prev, [field]: initialValue }))
    setEditingField(field)
  }

  const stopEditing = () => {
    blurTimer.current = setTimeout(() => setEditingField(null), 100)
  }

  return (
    <div className="min-w-[240px] rounded-lg border-2 border-blue-200 bg-white shadow-md">
      {/* Target handle (incoming edge) */}
      <Handle type="target" position={Position.Left} className="!bg-blue-400" />

      {/* Question header */}
      <div className="rounded-t-md bg-blue-50 px-3 py-2">
        {data.isRoot && (
          <span className="mb-1 inline-block rounded bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            Root
          </span>
        )}
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-500">Question</p>
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
          <div key={ans.edgeId} className="relative flex items-center gap-1 py-1.5 pl-3 pr-10">
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

            {/* Visual + (non-interactive, shows through the transparent Handle) */}
            {!ans.hasNext && (
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-500">
                +
              </div>
            )}

            {/* Draggable source Handle — transparent, sits on top of the + icon */}
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
    </div>
  )
}
