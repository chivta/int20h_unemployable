import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { useAppContext } from '../../state/context'

export interface CustomEdgeData extends Record<string, unknown> {
  edgeId: string
  label: string
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps & { data: CustomEdgeData }) {
  const { state } = useAppContext()
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  const isSelectedForInsert = state.selection.type === 'edge' && state.selection.edgeId === data?.edgeId

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: selected || isSelectedForInsert ? '#3b82f6' : '#94a3b8', strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className="absolute pointer-events-all nodrag nopan"
        >
          {data?.label && (
            <span className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 shadow-sm whitespace-nowrap">
              {data.label}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
