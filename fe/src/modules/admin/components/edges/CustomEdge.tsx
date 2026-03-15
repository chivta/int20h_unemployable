import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { useAppContext } from '../../state/context'

export interface CustomEdgeData extends Record<string, unknown> {
  edgeId: string
  label: string
  actions: { type: string; fieldName: string; value: string | number }[]
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
      <BaseEdge id={id} path={edgePath} style={{ stroke: selected || isSelectedForInsert ? '#3b82f6' : '#64748b', strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className="absolute pointer-events-all nodrag nopan"
        >
          {data?.actions?.length > 0 && (
            <div className="flex flex-col items-center gap-0.5">
              {data.actions.map((a, i) => (
                <span key={i} className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] text-blue-600 shadow-sm whitespace-nowrap font-mono">
                  {a.fieldName} = {a.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
