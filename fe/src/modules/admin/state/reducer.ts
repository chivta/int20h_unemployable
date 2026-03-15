import type { Action } from './actions'
import type { AppState, DagData } from '../types/dag'
import type { Position, SelectionState } from '../types/ui'
import { nextNodeId, nextEdgeId, seedCounters } from '../utils/id'
import { computeLayout } from '../utils/layout'

export interface FullState {
  app: AppState
  positions: Record<string, Position>
  selection: SelectionState
  validationWarnings: string[]
  showValidationBanner: boolean
  isDirty: boolean
}

function makeInitialApp(): AppState {
  return {
    dag: {
      root: 'q1',
      end: 'end',
      nodes: {
        q1: { id: 'q1', text: 'What is your primary fitness goal?', answers: ['a1'], questionType: 'single', nextNodeId: null },
        q2: { id: 'q2', text: 'How many days per week can you train?', answers: ['a2'], questionType: 'single', nextNodeId: null },
        q3: { id: 'q3', text: 'Do you have access to a gym?', answers: [], questionType: 'single', nextNodeId: null },
        end: { id: 'end', text: 'End', answers: [], questionType: 'single', nextNodeId: null },
      },
      edges: {
        a1: { id: 'a1', label: 'Next', next: 'q2', weights: { starter: 1, premium: 1 }, actions: [] },
        a2: { id: 'a2', label: 'Next', next: 'q3', weights: { starter: 1, premium: 1 }, actions: [] },
      },
    },
    offers: {
      starter: { id: 'starter', name: 'Starter Plan' },
      premium: { id: 'premium', name: 'Premium Plan' },
    },
    meta: { version: 1, updatedAt: new Date().toISOString(), updatedBy: 'admin@example.com' },
  }
}

function makeInitialState(): FullState {
  const app = makeInitialApp()
  seedCounters(app.dag)
  return {
    app,
    positions: computeLayout(app.dag),
    selection: { type: 'none' },
    validationWarnings: [],
    showValidationBanner: false,
    isDirty: false,
  }
}

export const initialState: FullState = makeInitialState()

export function reducer(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'SET_ROOT': {
      return { ...state, isDirty: true, app: { ...state.app, dag: { ...state.app.dag, root: action.nodeId } } }
    }

    case 'LOAD_STATE': {
      seedCounters(action.state.dag)
      // Normalize: ensure every node has a questionType (for configs saved before this field existed)
      const normalizedNodes = Object.fromEntries(
        Object.entries(action.state.dag.nodes).map(([id, node]) => [
          id,
          { ...node, questionType: node.questionType ?? 'single', nextNodeId: node.nextNodeId ?? null },
        ])
      )
      // Normalize: ensure end node exists (for configs saved before this field existed)
      const loadedEnd = action.state.dag.end
      const endNodeMissing = !loadedEnd || !normalizedNodes[loadedEnd]
      if (endNodeMissing) {
        normalizedNodes['end'] = { id: 'end', text: 'End', answers: [], questionType: 'single', nextNodeId: null }
      }
      const resolvedEnd = endNodeMissing ? 'end' : loadedEnd
      const normalizedState: AppState = {
        ...action.state,
        dag: { ...action.state.dag, end: resolvedEnd, nodes: normalizedNodes },
      }
      return {
        ...state,
        app: normalizedState,
        positions: computeLayout(normalizedState.dag),
        selection: { type: 'none' },
        isDirty: false,
      }
    }

    case 'RESET': {
      return makeInitialState()
    }

    case 'MARK_SAVED': {
      return { ...state, isDirty: false }
    }

    case 'ADD_NODE': {
      const id = nextNodeId()
      const n = Object.keys(state.app.dag.nodes).length
      const pos = action.position ?? { x: 80 + (n % 4) * 260, y: 80 + Math.floor(n / 4) * 160 }
      const dag: DagData = {
        ...state.app.dag,
        nodes: { ...state.app.dag.nodes, [id]: { id, text: '', answers: [], questionType: 'single', nextNodeId: null } },
      }
      return {
        ...state,
        isDirty: true,
        app: { ...state.app, dag },
        positions: { ...state.positions, [id]: pos },
        selection: { type: 'node', nodeId: id },
      }
    }

    case 'UPDATE_NODE_TEXT': {
      const node = state.app.dag.nodes[action.nodeId]
      if (!node) return state
      const dag: DagData = {
        ...state.app.dag,
        nodes: { ...state.app.dag.nodes, [action.nodeId]: { ...node, text: action.text } },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'DELETE_NODE': {
      if (action.nodeId === state.app.dag.root || action.nodeId === state.app.dag.end) return state
      const node = state.app.dag.nodes[action.nodeId]
      if (!node) return state

      // collect all edge IDs to remove: outgoing answers + incoming edges pointing to this node
      const incomingEdgeIds = Object.entries(state.app.dag.edges)
        .filter(([, e]) => e.next === action.nodeId)
        .map(([id]) => id)

      const newEdges = { ...state.app.dag.edges }
      for (const edgeId of node.answers) delete newEdges[edgeId]
      for (const edgeId of incomingEdgeIds) delete newEdges[edgeId]

      // remove incoming edge IDs from their source nodes' answers arrays
      const newNodes = { ...state.app.dag.nodes }
      delete newNodes[action.nodeId]
      for (const [nodeId, n] of Object.entries(newNodes)) {
        if (n.answers.some(id => incomingEdgeIds.includes(id))) {
          newNodes[nodeId] = { ...n, answers: n.answers.filter(id => !incomingEdgeIds.includes(id)) }
        }
      }

      const newRoot = state.app.dag.root === action.nodeId ? (Object.keys(newNodes)[0] ?? '') : state.app.dag.root
      const newPositions = { ...state.positions }
      delete newPositions[action.nodeId]

      return {
        ...state,
        isDirty: true,
        app: { ...state.app, dag: { root: newRoot, end: state.app.dag.end, nodes: newNodes, edges: newEdges } },
        positions: newPositions,
        selection: { type: 'none' },
      }
    }

    case 'ADD_ANSWER': {
      const node = state.app.dag.nodes[action.nodeId]
      if (!node) return state
      const edgeId = nextEdgeId()
      const weights: Record<string, number> = {}
      for (const offerId of Object.keys(state.app.offers)) weights[offerId] = 0
      const dag: DagData = {
        ...state.app.dag,
        nodes: { ...state.app.dag.nodes, [action.nodeId]: { ...node, answers: [...node.answers, edgeId] } },
        edges: { ...state.app.dag.edges, [edgeId]: { id: edgeId, label: 'New answer', next: null, weights, actions: [] } },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'UPDATE_ANSWER_LABEL': {
      const edge = state.app.dag.edges[action.edgeId]
      if (!edge) return state
      const dag: DagData = {
        ...state.app.dag,
        edges: { ...state.app.dag.edges, [action.edgeId]: { ...edge, label: action.label } },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'SET_ANSWER_NEXT': {
      const edge = state.app.dag.edges[action.edgeId]
      if (!edge) return state
      const dag: DagData = {
        ...state.app.dag,
        edges: { ...state.app.dag.edges, [action.edgeId]: { ...edge, next: action.next } },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'SET_ANSWER_WEIGHT': {
      const edge = state.app.dag.edges[action.edgeId]
      if (!edge) return state
      const dag: DagData = {
        ...state.app.dag,
        edges: {
          ...state.app.dag.edges,
          [action.edgeId]: { ...edge, weights: { ...edge.weights, [action.offerId]: action.weight } },
        },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'DELETE_ANSWER': {
      const ownerNode = Object.values(state.app.dag.nodes).find(n => n.answers.includes(action.edgeId))
      if (!ownerNode) return state
      const newEdges = { ...state.app.dag.edges }
      delete newEdges[action.edgeId]
      const dag: DagData = {
        ...state.app.dag,
        nodes: {
          ...state.app.dag.nodes,
          [ownerNode.id]: { ...ownerNode, answers: ownerNode.answers.filter(id => id !== action.edgeId) },
        },
        edges: newEdges,
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'REORDER_ANSWERS': {
      const node = state.app.dag.nodes[action.nodeId]
      if (!node) return state
      const dag: DagData = {
        ...state.app.dag,
        nodes: { ...state.app.dag.nodes, [action.nodeId]: { ...node, answers: action.answers } },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'INSERT_NODE_ON_EDGE': {
      const edge = state.app.dag.edges[action.edgeId]
      if (!edge) return state
      const sourceNode = Object.values(state.app.dag.nodes).find(n => n.answers.includes(action.edgeId))
      if (!sourceNode) return state

      const newNodeId = nextNodeId()
      const newEdgeId = nextEdgeId()
      const weights: Record<string, number> = {}
      for (const offerId of Object.keys(state.app.offers)) weights[offerId] = 0

      const dag: DagData = {
        ...state.app.dag,
        nodes: {
          ...state.app.dag.nodes,
          [newNodeId]: { id: newNodeId, text: action.text || 'New Question', answers: [newEdgeId], questionType: 'single', nextNodeId: null },
        },
        edges: {
          ...state.app.dag.edges,
          [action.edgeId]: { ...edge, next: newNodeId },
          [newEdgeId]: { id: newEdgeId, label: 'Continue', next: edge.next, weights, actions: [] },
        },
      }

      const srcPos = state.positions[sourceNode.id] ?? { x: 0, y: 0 }
      const tgtPos = edge.next ? (state.positions[edge.next] ?? { x: 0, y: 200 }) : { x: srcPos.x, y: srcPos.y + 200 }
      const newPos: Position = { x: (srcPos.x + tgtPos.x) / 2, y: (srcPos.y + tgtPos.y) / 2 }

      return {
        ...state,
        isDirty: true,
        app: { ...state.app, dag },
        positions: { ...state.positions, [newNodeId]: newPos },
        selection: { type: 'node', nodeId: newNodeId },
      }
    }

    case 'ADD_OFFER': {
      const slug = action.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `offer_${Object.keys(state.app.offers).length + 1}`
      const newEdges = { ...state.app.dag.edges }
      for (const [id, edge] of Object.entries(newEdges)) {
        newEdges[id] = { ...edge, weights: { ...edge.weights, [slug]: 0 } }
      }
      return {
        ...state,
        isDirty: true,
        app: {
          ...state.app,
          dag: { ...state.app.dag, edges: newEdges },
          offers: { ...state.app.offers, [slug]: { id: slug, name: action.name } },
        },
      }
    }

    case 'UPDATE_OFFER_NAME': {
      const offer = state.app.offers[action.offerId]
      if (!offer) return state
      return {
        ...state,
        isDirty: true,
        app: { ...state.app, offers: { ...state.app.offers, [action.offerId]: { ...offer, name: action.name } } },
      }
    }

    case 'DELETE_OFFER': {
      const newOffers = { ...state.app.offers }
      delete newOffers[action.offerId]
      const newEdges = { ...state.app.dag.edges }
      for (const [id, edge] of Object.entries(newEdges)) {
        const weights = { ...edge.weights }
        delete weights[action.offerId]
        newEdges[id] = { ...edge, weights }
      }
      return {
        ...state,
        isDirty: true,
        app: { ...state.app, dag: { ...state.app.dag, edges: newEdges }, offers: newOffers },
      }
    }

    case 'SET_NODE_POSITION': {
      return { ...state, positions: { ...state.positions, [action.nodeId]: action.position } }
    }

    case 'RECOMPUTE_LAYOUT': {
      return { ...state, positions: computeLayout(state.app.dag) }
    }

    case 'SELECT_NODE': {
      return { ...state, selection: { type: 'node', nodeId: action.nodeId } }
    }

    case 'SELECT_EDGE': {
      return { ...state, selection: { type: 'edge', edgeId: action.edgeId } }
    }

    case 'DESELECT': {
      return { ...state, selection: { type: 'none' } }
    }

    case 'SET_EDGE_ACTIONS': {
      const edge = state.app.dag.edges[action.edgeId]
      if (!edge) return state
      const dag: DagData = {
        ...state.app.dag,
        edges: { ...state.app.dag.edges, [action.edgeId]: { ...edge, actions: action.actions } },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'SET_VALIDATION': {
      return { ...state, validationWarnings: action.warnings, showValidationBanner: action.warnings.length > 0 }
    }

    case 'DISMISS_VALIDATION': {
      return { ...state, showValidationBanner: false }
    }

    case 'SET_QUESTION_TYPE': {
      const node = state.app.dag.nodes[action.nodeId]
      if (!node) return state
      let updatedNode = { ...node, questionType: action.questionType }
      if (action.questionType === 'multi') {
        // Auto-derive nextNodeId from the first answer that has a non-null next
        const firstConnectedEdge = node.answers
          .map(eid => state.app.dag.edges[eid])
          .find(e => e?.next)
        updatedNode = { ...updatedNode, nextNodeId: firstConnectedEdge?.next ?? null }
      } else if (action.questionType === 'single') {
        // When switching back to single, copy nextNodeId back as the next of the first answer
        if (node.nextNodeId && node.answers.length > 0) {
          const firstEdgeId = node.answers[0]
          const firstEdge = state.app.dag.edges[firstEdgeId]
          if (firstEdge) {
            const dag: DagData = {
              ...state.app.dag,
              nodes: { ...state.app.dag.nodes, [action.nodeId]: { ...updatedNode, nextNodeId: null } },
              edges: { ...state.app.dag.edges, [firstEdgeId]: { ...firstEdge, next: node.nextNodeId } },
            }
            return { ...state, isDirty: true, app: { ...state.app, dag } }
          }
        }
        updatedNode = { ...updatedNode, nextNodeId: null }
      }
      const dag: DagData = {
        ...state.app.dag,
        nodes: { ...state.app.dag.nodes, [action.nodeId]: updatedNode },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    case 'SET_NODE_NEXT': {
      const node = state.app.dag.nodes[action.nodeId]
      if (!node) return state
      const dag: DagData = {
        ...state.app.dag,
        nodes: { ...state.app.dag.nodes, [action.nodeId]: { ...node, nextNodeId: action.nextNodeId } },
      }
      return { ...state, isDirty: true, app: { ...state.app, dag } }
    }

    default:
      return state
  }
}
