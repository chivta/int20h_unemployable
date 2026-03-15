import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface RootRFData extends Record<string, unknown> {
  id: string
  text: string
  answers: Array<{ edgeId: string; label: string; hasNext: boolean }>
}

export function RootNode({ data }: NodeProps & { data: RootRFData }) {
  return (
    <div className="rounded-xl bg-indigo-600 px-6 py-4 shadow-md min-w-[120px] text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-white">Start</p>

      {/* One source handle per answer so edges connect via their edgeId */}
      {data.answers.map((ans, i) => (
        <Handle
          key={ans.edgeId}
          type="source"
          position={Position.Right}
          id={ans.edgeId}
          style={{
            top: `${((i + 1) / (data.answers.length + 1)) * 100}%`,
            background: 'transparent',
            border: 'none',
            width: 12,
            height: 12,
          }}
        />
      ))}
    </div>
  )
}
