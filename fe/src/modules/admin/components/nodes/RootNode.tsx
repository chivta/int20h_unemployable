import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface RootRFData extends Record<string, unknown> {
  id: string
  nextNodeId: string | null
}

export function RootNode({ data }: NodeProps & { data: RootRFData }) {
  return (
    <div className="rounded-xl bg-indigo-600 px-6 py-4 shadow-md min-w-[120px] text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-white">Start</p>
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
          border: '2px solid #818cf8',
          borderRadius: '50%',
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}
