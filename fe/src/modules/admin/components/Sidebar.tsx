import { useAppContext } from '../state/context'
import { NodePanel } from './sidebar/NodePanel'
import { EdgeInsertPanel } from './sidebar/EdgeInsertPanel'

export function Sidebar() {
  const { state } = useAppContext()
  const { selection } = state

  const title =
    selection.type === 'node' ? `Node ${selection.nodeId}` :
    selection.type === 'edge' ? 'Insert Node' :
    'DAG Editor'

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>

      {selection.type === 'node' && <NodePanel nodeId={selection.nodeId} />}
      {selection.type === 'edge' && <EdgeInsertPanel edgeId={selection.edgeId} />}
      {selection.type === 'none' && (
        <p className="text-sm text-gray-400 italic">Select a node to edit, or click + on an edge to insert.</p>
      )}
    </aside>
  )
}
