import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useAppContext } from '../../state/context'

export interface InfoRFData extends Record<string, unknown> {
  id: string
  text: string
  nextNodeId: string | null
}

export function InfoNode({ data }: NodeProps & { data: InfoRFData }) {
  const { dispatch } = useAppContext()

  return (
    <div className="min-w-[240px] rounded-lg border-2 border-amber-300 bg-white shadow-md">
      {/* Target handle */}
      <Handle type="target" position={Position.Left} className="!bg-amber-400" />

      {/* Header */}
      <div className="rounded-t-md bg-amber-50 px-3 py-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">Info</p>
        <textarea
          className="nodrag nopan w-full resize-none rounded border border-transparent bg-transparent px-0 py-0 text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-amber-300 focus:bg-white focus:px-1 focus:outline-none"
          rows={3}
          value={data.text}
          onChange={e => dispatch({ type: 'UPDATE_NODE_TEXT', nodeId: data.id, text: e.target.value })}
          onClick={e => e.stopPropagation()}
          placeholder="Enter info text…"
        />
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 text-[10px] text-amber-500 italic">
        Shows info, then continues →
      </div>

      {/* Single outgoing handle */}
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
          background: data.nextNodeId ? '#f59e0b' : 'transparent',
          border: '2px solid #f59e0b',
          borderRadius: '50%',
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}
