import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
  MarkerType,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react'
import type { NodeChange, Node, Edge, Connection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAppContext } from '../state/context'
import { QuestionNode } from './nodes/QuestionNode'
import type { QuestionRFData } from './nodes/QuestionNode'
import { FinishNode } from './nodes/FinishNode'
import { InfoNode } from './nodes/InfoNode'
import { CustomEdge } from './edges/CustomEdge'
import type { CustomEdgeData } from './edges/CustomEdge'

const nodeTypes = { questionNode: QuestionNode, finishNode: FinishNode, infoNode: InfoNode }
const edgeTypes = { custom: CustomEdge }

type ContextMenuState =
  | { kind: 'node'; nodeId: string; x: number; y: number }
  | { kind: 'edge'; edgeId: string; x: number; y: number }
  | { kind: 'pane'; x: number; y: number; flowX: number; flowY: number }
  | null

function ContextMenu({
  menu,
  onClose,
  onRemoveNode,
  onRemoveEdge,
  onAddNode,
  onAddFinishNode,
  onAddInfoNode,
  onSelectEdge,
}: {
  menu: ContextMenuState
  onClose: () => void
  onRemoveNode: (nodeId: string) => void
  onRemoveEdge: (edgeId: string) => void
  onAddNode: (x: number, y: number) => void
  onAddFinishNode: (x: number, y: number) => void
  onAddInfoNode: (x: number, y: number) => void
  onSelectEdge: (edgeId: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (!menu) return null

  return (
    <div
      ref={ref}
      style={{ top: menu.y, left: menu.x }}
      className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
    >
      {menu.kind === 'node' && (
        <button
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          onClick={() => { onRemoveNode(menu.nodeId); onClose() }}
        >
          Remove node
        </button>
      )}

      {menu.kind === 'edge' && (
        <>
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => { onRemoveEdge(menu.edgeId); onClose() }}
          >
            Remove edge
          </button>
        </>
      )}

      {menu.kind === 'pane' && (
        <>
          <button
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => { onAddNode(menu.flowX, menu.flowY); onClose() }}
          >
            Add question node
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
            onClick={() => { onAddInfoNode(menu.flowX, menu.flowY); onClose() }}
          >
            Add info node
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
            onClick={() => { onAddFinishNode(menu.flowX, menu.flowY); onClose() }}
          >
            Add finish node
          </button>
        </>
      )}
    </div>
  )
}

function FlowCanvasInner() {
  const { state, dispatch } = useAppContext()
  const { app, positions } = state
  const { screenToFlowPosition } = useReactFlow()
  const containerRef = useRef<HTMLDivElement>(null)

  const computedNodes: Node<QuestionRFData>[] = useMemo(() => {
    return Object.values(app.dag.nodes).map(node => {
      const isRoot = app.dag.root === node.id
      const isFinish = node.nodeType === 'finish'
      const isInfo = node.nodeType === 'info'
      const type = isFinish ? 'finishNode' : isInfo ? 'infoNode' : 'questionNode'
      return {
        id: node.id,
        type,
        position: positions[node.id] ?? { x: 0, y: 0 },
        data: {
          id: node.id,
          text: node.text,
          answers: node.answers.map(edgeId => ({
            edgeId,
            label: app.dag.edges[edgeId]?.label ?? edgeId,
            hasNext: !!app.dag.edges[edgeId]?.next,
          })),
          questionType: node.questionType ?? 'single',
          nextNodeId: node.nextNodeId ?? null,
          isRoot,
        },
      }
    })
  }, [app.dag, positions])

  const [rfNodes, setRfNodes] = useState<Node<QuestionRFData>[]>(computedNodes)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    setRfNodes(computedNodes)
  }, [computedNodes])

  const rfEdges: Edge<CustomEdgeData>[] = useMemo(() => {
    const result: Edge<CustomEdgeData>[] = []
    for (const node of Object.values(app.dag.nodes)) {
      if (node.nodeType === 'finish') continue // finish nodes have no outgoing edges
      if (node.nodeType === 'info' || (node.questionType ?? 'single') === 'multi') {
        // Info and multi-choice: single outgoing edge via 'out' handle using nextNodeId
        if (node.nextNodeId) {
          result.push({
            id: `${node.id}-out`,
            source: node.id,
            sourceHandle: 'out',
            target: node.nextNodeId,
            type: 'custom',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 20, height: 20 },
            data: { edgeId: `${node.id}-out`, label: '', actions: [] },
          })
        }
      } else {
        // Single-choice: per-answer edges
        for (const edgeId of node.answers) {
          const edge = app.dag.edges[edgeId]
          if (!edge?.next) continue
          result.push({
            id: edgeId,
            source: node.id,
            sourceHandle: edgeId,
            target: edge.next,
            type: 'custom',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 20, height: 20 },
            data: { edgeId, label: edge.label, actions: edge.actions ?? [] },
          })
        }
      }
    }
    return result
  }, [app.dag])

  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    setRfNodes(nds => applyNodeChanges(changes, nds) as Node<QuestionRFData>[])
    for (const change of changes) {
      if (change.type === 'position' && change.position && !change.dragging) {
        dispatch({ type: 'SET_NODE_POSITION', nodeId: change.id, position: change.position })
      }
    }
  }, [dispatch])

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.sourceHandle || !connection.target) return
    if (connection.sourceHandle === 'out') {
      // Multi-choice: dispatch SET_NODE_NEXT for the source node
      dispatch({ type: 'SET_NODE_NEXT', nodeId: connection.source ?? '', nextNodeId: connection.target })
    } else {
      dispatch({ type: 'SET_ANSWER_NEXT', edgeId: connection.sourceHandle, next: connection.target })
    }
  }, [dispatch])

  const relativePos = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
  }, [])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    const { x, y } = relativePos(e.clientX, e.clientY)
    setContextMenu({ kind: 'node', nodeId: node.id, x, y })
  }, [relativePos])

  const onEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault()
    const { x, y } = relativePos(e.clientX, e.clientY)
    setContextMenu({ kind: 'edge', edgeId: edge.id, x, y })
  }, [relativePos])

  const onPaneContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault()
    const clientX = (e as React.MouseEvent).clientX
    const clientY = (e as React.MouseEvent).clientY
    const { x, y } = relativePos(clientX, clientY)
    const flowPos = screenToFlowPosition({ x: clientX, y: clientY })
    setContextMenu({ kind: 'pane', x, y, flowX: flowPos.x, flowY: flowPos.y })
  }, [relativePos, screenToFlowPosition])

  const handleRemoveNode = useCallback((nodeId: string) => {
    dispatch({ type: 'DELETE_NODE', nodeId })
  }, [dispatch])

  const handleRemoveEdge = useCallback((edgeId: string) => {
    // Multi-choice synthetic edge id is `${nodeId}-out`
    if (edgeId.endsWith('-out')) {
      const nodeId = edgeId.slice(0, -4)
      dispatch({ type: 'SET_NODE_NEXT', nodeId, nextNodeId: null })
    } else {
      dispatch({ type: 'SET_ANSWER_NEXT', edgeId, next: null })
    }
  }, [dispatch])

  const handleAddNode = useCallback((x: number, y: number) => {
    dispatch({ type: 'ADD_NODE', position: { x, y } })
  }, [dispatch])

  const handleAddFinishNode = useCallback((x: number, y: number) => {
    dispatch({ type: 'ADD_FINISH_NODE', position: { x, y } })
  }, [dispatch])

  const handleAddInfoNode = useCallback((x: number, y: number) => {
    dispatch({ type: 'ADD_INFO_NODE', position: { x, y } })
  }, [dispatch])

  const handleSelectEdge = useCallback((edgeId: string) => {
    dispatch({ type: 'SELECT_EDGE', edgeId })
  }, [dispatch])

  return (
    <div ref={containerRef} className="relative flex-1 h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={closeContextMenu}
        onNodeClick={closeContextMenu}
        onEdgeClick={(_, edge) => { closeContextMenu(); handleSelectEdge(edge.id) }}
        fitView
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
      </ReactFlow>
      <ContextMenu
        menu={contextMenu}
        onClose={closeContextMenu}
        onRemoveNode={handleRemoveNode}
        onRemoveEdge={handleRemoveEdge}
        onAddNode={handleAddNode}
        onAddFinishNode={handleAddFinishNode}
        onAddInfoNode={handleAddInfoNode}
        onSelectEdge={handleSelectEdge}
      />

    </div>
  )
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  )
}
