import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface FinishRFData extends Record<string, unknown> {
  id: string
}

export function FinishNode({ data: _ }: NodeProps & { data: FinishRFData }) {
  return (
    <div className="rounded-xl bg-green-600 px-6 py-4 shadow-md min-w-[120px] text-center">
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 12, height: 12 }}
      />
      <p className="text-sm font-bold uppercase tracking-widest text-white">Finish</p>
    </div>
  )
}
