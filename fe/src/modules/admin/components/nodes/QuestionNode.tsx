import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface QuestionRFData extends Record<string, unknown> {
  id: string
  text: string
  answers: Array<{ edgeId: string; label: string }>
  isRoot: boolean
}

export function QuestionNode({ data, selected }: NodeProps & { data: QuestionRFData }) {
  return (
    <div
      className={[
        'min-w-[220px] rounded-lg border-2 bg-white shadow-md',
        selected ? 'border-blue-500' : 'border-blue-200',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-400" />

      <div className="rounded-t-md bg-blue-50 px-3 py-2">
        {data.isRoot && (
          <span className="mb-1 inline-block rounded bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            Root
          </span>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Question</p>
        <p className="text-sm font-semibold text-gray-800 break-words">{data.text || 'Untitled'}</p>
      </div>

      <div className="divide-y divide-gray-100">
        {data.answers.map((ans, i) => (
          <div key={ans.edgeId} className="relative flex items-center px-3 py-1.5 pr-5">
            <span className="text-xs text-gray-600 truncate">
              {i + 1}. {ans.label || <em className="text-gray-400">empty</em>}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={ans.edgeId}
              style={{ right: -8, top: `${((i + 1) / (data.answers.length + 1)) * 100}%`, transform: 'none' }}
              className="!bg-blue-400 !h-3 !w-3"
            />
          </div>
        ))}
        {data.answers.length === 0 && (
          <p className="px-3 py-2 text-xs italic text-gray-400">No answers yet</p>
        )}
      </div>
    </div>
  )
}
