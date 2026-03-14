import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { OfferNodeData } from '../../../../shared/types'

export function OfferNode({ data, selected }: NodeProps & { data: OfferNodeData }) {
  return (
    <div
      className={[
        'min-w-[180px] rounded-lg border-2 bg-white shadow-md',
        selected ? 'border-emerald-500' : 'border-emerald-200',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} className="!bg-emerald-400" />

      <div className="rounded-md bg-emerald-50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Offer</p>
        <p className="truncate text-sm font-semibold text-gray-800">{data.label || 'Untitled'}</p>
        <p className="font-mono text-[10px] text-gray-400">{data.offer_id}</p>
      </div>
    </div>
  )
}
