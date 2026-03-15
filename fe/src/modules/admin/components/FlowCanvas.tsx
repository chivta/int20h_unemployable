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
import { CustomEdge } from './edges/CustomEdge'
import type { CustomEdgeData } from './edges/CustomEdge'
import { EdgePanel } from './sidebar/EdgePanel'
import { Zap } from 'lucide-react'

const nodeTypes = { question: QuestionNode }
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
  onSelectEdge,
  onOpenEdgeModal,
}: {
  menu: ContextMenuState
  onClose: () => void
  onRemoveNode: (nodeId: string) => void
  onRemoveEdge: (edgeId: string) => void
  onAddNode: (x: number, y: number) => void
  onSelectEdge: (edgeId: string) => void
  onOpenEdgeModal: (edgeId: string) => void
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
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => { onOpenEdgeModal(menu.edgeId); onClose() }}
          >
            Edit actions…
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => { onRemoveEdge(menu.edgeId); onClose() }}
          >
            Remove edge
          </button>
        </>
      )}

      {menu.kind === 'pane' && (
        <button
          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          onClick={() => { onAddNode(menu.flowX, menu.flowY); onClose() }}
        >
          Add node
        </button>
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
    return Object.values(app.dag.nodes).map(node => ({
      id: node.id,
      type: 'question',
      position: positions[node.id] ?? { x: 0, y: 0 },
      data: {
        id: node.id,
        text: node.text,
        answers: node.answers.map(edgeId => ({
          edgeId,
          label: app.dag.edges[edgeId]?.label ?? edgeId,
          hasNext: !!app.dag.edges[edgeId]?.next,
        })),
        isRoot: app.dag.root === node.id,
      },
    }))
  }, [app.dag, positions])

  const [rfNodes, setRfNodes] = useState<Node<QuestionRFData>[]>(computedNodes)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const closeContextMenu = useCallback(() => setContextMenu(null), [])
  const [edgeModalId, setEdgeModalId] = useState<string | null>(null)

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
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 20, height: 20 },
          data: { edgeId, label: edge.label, actions: edge.actions ?? [] },
        })
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
    if (connection.sourceHandle && connection.target) {
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
    dispatch({ type: 'DELETE_ANSWER', edgeId })
  }, [dispatch])

  const handleAddNode = useCallback((x: number, y: number) => {
    dispatch({ type: 'ADD_NODE', position: { x, y } })
  }, [dispatch])

  const handleSelectEdge = useCallback((edgeId: string) => {
    dispatch({ type: 'SELECT_EDGE', edgeId })
  }, [dispatch])

  const handleOpenEdgeModal = useCallback((edgeId: string) => {
    setEdgeModalId(edgeId)
  }, [])

  useEffect(() => {
    if (!edgeModalId) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setEdgeModalId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [edgeModalId])

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
        onEdgeClick={closeContextMenu}
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
        onSelectEdge={handleSelectEdge}
        onOpenEdgeModal={handleOpenEdgeModal}
      />

      {edgeModalId && (() => {
        const modalEdge = app.dag.edges[edgeModalId]
        const actionCount = modalEdge?.actions?.length ?? 0
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onMouseDown={() => setEdgeModalId(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-[460px] max-h-[85vh] flex flex-col ring-1 ring-black/10"
              onMouseDown={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                    <Zap size={15} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Edge actions</p>
                    <p className="text-xs text-slate-400">
                      {modalEdge?.label || edgeModalId}
                      {' · '}
                      {actionCount === 0 ? 'no actions' : `${actionCount} action${actionCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  onClick={() => setEdgeModalId(null)}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-6">
                <EdgePanel edgeId={edgeModalId} />
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-6 py-3 flex justify-end">
                <button
                  className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                  onClick={() => setEdgeModalId(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })()}
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
