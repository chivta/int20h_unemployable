import { useCallback, useMemo, useState, useEffect } from 'react'
import { ReactFlow, Background, Controls, BackgroundVariant, MarkerType, applyNodeChanges } from '@xyflow/react'
import type { NodeChange, Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAppContext } from '../state/context'
import { QuestionNode } from './nodes/QuestionNode'
import type { QuestionRFData } from './nodes/QuestionNode'
import { CustomEdge } from './edges/CustomEdge'
import type { CustomEdgeData } from './edges/CustomEdge'

const nodeTypes = { question: QuestionNode }
const edgeTypes = { custom: CustomEdge }

export function FlowCanvas() {
  const { state, dispatch } = useAppContext()
  const { app, positions, selection } = state

  const computedNodes: Node<QuestionRFData>[] = useMemo(() => {
    return Object.values(app.dag.nodes).map(node => ({
      id: node.id,
      type: 'question',
      position: positions[node.id] ?? { x: 0, y: 0 },
      selected: selection.type === 'node' && selection.nodeId === node.id,
      data: {
        id: node.id,
        text: node.text,
        answers: node.answers.map(edgeId => ({
          edgeId,
          label: app.dag.edges[edgeId]?.label ?? edgeId,
        })),
        isRoot: app.dag.root === node.id,
      },
    }))
  }, [app.dag, positions, selection])

  const [rfNodes, setRfNodes] = useState<Node<QuestionRFData>[]>(computedNodes)

  useEffect(() => {
    setRfNodes(computedNodes)
  }, [computedNodes])

  const rfEdges: Edge<CustomEdgeData>[] = useMemo(() => {
    const result: Edge<CustomEdgeData>[] = []
    for (const node of Object.values(app.dag.nodes)) {
      for (const edgeId of node.answers) {
        const edge = app.dag.edges[edgeId]
        if (!edge?.next) continue
        result.push({
          id: edgeId,
          source: node.id,
          sourceHandle: edgeId,
          target: edge.next,
          type: 'custom',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          data: { edgeId, label: edge.label },
        })
      }
    }
    return result
  }, [app.dag])

  const onNodesChange = useCallback((changes: NodeChange<Node<QuestionRFData>>[]) => {
    setRfNodes(nds => applyNodeChanges(changes, nds))
    for (const change of changes) {
      if (change.type === 'position' && change.position && !change.dragging) {
        dispatch({ type: 'SET_NODE_POSITION', nodeId: change.id, position: change.position })
      }
    }
  }, [dispatch])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    dispatch({ type: 'SELECT_NODE', nodeId: node.id })
  }, [dispatch])

  const onPaneClick = useCallback(() => {
    dispatch({ type: 'DESELECT' })
  }, [dispatch])

  return (
    <div className="relative flex-1 h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
