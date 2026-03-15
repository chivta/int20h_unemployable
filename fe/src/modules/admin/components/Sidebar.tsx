import { useAppContext } from '../state/context'
import { NodePanel } from './sidebar/NodePanel'
import { EdgeInsertPanel } from './sidebar/EdgeInsertPanel'
import { EdgePanel } from './sidebar/EdgePanel'

export function Sidebar() {
  const { state } = useAppContext()
  const { selection } = state

  const title =
    selection.type === 'node' ? `Node ${selection.nodeId}` :
    selection.type === 'edge' ? `Edge: ${state.app.dag.edges[selection.edgeId]?.label ?? selection.edgeId}` :
    'DAG Editor'

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>

      {selection.type === 'node' && <NodePanel nodeId={selection.nodeId} />}
      {selection.type === 'edge' && (
        <div className="space-y-6">
          <EdgePanel edgeId={selection.edgeId} />
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Insert Node on Edge</p>
            <EdgeInsertPanel edgeId={selection.edgeId} />
          </div>
        </div>
      )}
      {selection.type === 'none' && (
        <p className="text-sm text-gray-400 italic">Select a node to edit, or click + on an edge to insert.</p>
      )}
    </aside>
  )
}
