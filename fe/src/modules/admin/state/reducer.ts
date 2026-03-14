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
}

function makeInitialApp(): AppState {
  return {
    dag: {
      root: 'q1',
      nodes: {
        q1: { id: 'q1', text: 'What is your primary fitness goal?', answers: ['a1', 'a2', 'a3'] },
        q2: { id: 'q2', text: 'How many days per week can you train?', answers: ['a4', 'a5', 'a6'] },
        q3: { id: 'q3', text: 'What is your current fitness level?', answers: ['a7', 'a8', 'a9'] },
        q4: { id: 'q4', text: 'Do you have access to a gym?', answers: ['a10', 'a11'] },
        q5: { id: 'q5', text: 'How much time can you dedicate per session?', answers: ['a12', 'a13', 'a14'] },
        q6: { id: 'q6', text: 'Do you have any dietary restrictions?', answers: ['a15', 'a16', 'a17'] },
        q7: { id: 'q7', text: 'What is your age group?', answers: ['a18', 'a19', 'a20'] },
        q8: { id: 'q8', text: 'Have you worked with a personal trainer before?', answers: ['a21', 'a22'] },
      },
      edges: {
        // q1 branches
        a1: { id: 'a1', label: 'Lose weight', next: 'q2', weights: { starter: 2, premium: 1 } },
        a2: { id: 'a2', label: 'Build muscle', next: 'q3', weights: { starter: 1, premium: 3 } },
        a3: { id: 'a3', label: 'Improve endurance', next: 'q4', weights: { starter: 1, premium: 2 } },
        // q2 branches
        a4: { id: 'a4', label: '1–2 days', next: 'q5', weights: { starter: 3, premium: 0 } },
        a5: { id: 'a5', label: '3–4 days', next: 'q5', weights: { starter: 2, premium: 2 } },
        a6: { id: 'a6', label: '5+ days', next: 'q6', weights: { starter: 0, premium: 3 } },
        // q3 branches
        a7: { id: 'a7', label: 'Beginner', next: 'q4', weights: { starter: 3, premium: 0 } },
        a8: { id: 'a8', label: 'Intermediate', next: 'q5', weights: { starter: 1, premium: 2 } },
        a9: { id: 'a9', label: 'Advanced', next: 'q6', weights: { starter: 0, premium: 3 } },
        // q4 branches
        a10: { id: 'a10', label: 'Yes, full gym', next: 'q7', weights: { starter: 0, premium: 3 } },
        a11: { id: 'a11', label: 'Home only', next: 'q5', weights: { starter: 3, premium: 0 } },
        // q5 branches
        a12: { id: 'a12', label: 'Under 30 min', next: 'q8', weights: { starter: 2, premium: 0 } },
        a13: { id: 'a13', label: '30–60 min', next: 'q6', weights: { starter: 1, premium: 2 } },
        a14: { id: 'a14', label: 'Over 60 min', next: 'q7', weights: { starter: 0, premium: 3 } },
        // q6 branches
        a15: { id: 'a15', label: 'None', next: 'q8', weights: { starter: 1, premium: 2 } },
        a16: { id: 'a16', label: 'Vegetarian / vegan', next: 'q7', weights: { starter: 2, premium: 1 } },
        a17: { id: 'a17', label: 'Gluten-free', next: 'q8', weights: { starter: 2, premium: 1 } },
        // q7 branches
        a18: { id: 'a18', label: '18–30', next: 'q8', weights: { starter: 1, premium: 2 } },
        a19: { id: 'a19', label: '31–50', next: 'q8', weights: { starter: 2, premium: 1 } },
        a20: { id: 'a20', label: '51+', next: 'q8', weights: { starter: 3, premium: 0 } },
        // q8 branches (terminal)
        a21: { id: 'a21', label: 'Yes', next: null, weights: { starter: 0, premium: 3 } },
        a22: { id: 'a22', label: 'No', next: null, weights: { starter: 2, premium: 1 } },
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
  }
}

export const initialState: FullState = makeInitialState()

export function reducer(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'SET_ROOT': {
      return { ...state, app: { ...state.app, dag: { ...state.app.dag, root: action.nodeId } } }
    }

    case 'LOAD_STATE': {
      seedCounters(action.state.dag)
      return {
        ...state,
        app: action.state,
        positions: computeLayout(action.state.dag),
        selection: { type: 'none' },
      }
    }

    case 'RESET': {
      return makeInitialState()
    }

    case 'ADD_NODE': {
      const id = nextNodeId()
      const n = Object.keys(state.app.dag.nodes).length
      const dag: DagData = {
        ...state.app.dag,
        nodes: { ...state.app.dag.nodes, [id]: { id, text: 'New Question', answers: [] } },
      }
      return {
        ...state,
        app: { ...state.app, dag },
        positions: { ...state.positions, [id]: { x: 50, y: 50 + n * 120 } },
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
      return { ...state, app: { ...state.app, dag } }
    }

    case 'DELETE_NODE': {
      const hasIncoming = Object.values(state.app.dag.edges).some(e => e.next === action.nodeId)
      if (hasIncoming) return state
      const node = state.app.dag.nodes[action.nodeId]
      if (!node) return state

      const newNodes = { ...state.app.dag.nodes }
      delete newNodes[action.nodeId]
      const newEdges = { ...state.app.dag.edges }
      for (const edgeId of node.answers) delete newEdges[edgeId]
      const newRoot = state.app.dag.root === action.nodeId ? (Object.keys(newNodes)[0] ?? '') : state.app.dag.root
      const newPositions = { ...state.positions }
      delete newPositions[action.nodeId]

      return {
        ...state,
        app: { ...state.app, dag: { root: newRoot, nodes: newNodes, edges: newEdges } },
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
        edges: { ...state.app.dag.edges, [edgeId]: { id: edgeId, label: 'New answer', next: null, weights } },
      }
      return { ...state, app: { ...state.app, dag } }
    }

    case 'UPDATE_ANSWER_LABEL': {
      const edge = state.app.dag.edges[action.edgeId]
      if (!edge) return state
      const dag: DagData = {
        ...state.app.dag,
        edges: { ...state.app.dag.edges, [action.edgeId]: { ...edge, label: action.label } },
      }
      return { ...state, app: { ...state.app, dag } }
    }

    case 'SET_ANSWER_NEXT': {
      const edge = state.app.dag.edges[action.edgeId]
      if (!edge) return state
      const dag: DagData = {
        ...state.app.dag,
        edges: { ...state.app.dag.edges, [action.edgeId]: { ...edge, next: action.next } },
      }
      return { ...state, app: { ...state.app, dag } }
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
      return { ...state, app: { ...state.app, dag } }
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
      return { ...state, app: { ...state.app, dag } }
    }

    case 'REORDER_ANSWERS': {
      const node = state.app.dag.nodes[action.nodeId]
      if (!node) return state
      const dag: DagData = {
        ...state.app.dag,
        nodes: { ...state.app.dag.nodes, [action.nodeId]: { ...node, answers: action.answers } },
      }
      return { ...state, app: { ...state.app, dag } }
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
          [newNodeId]: { id: newNodeId, text: action.text || 'New Question', answers: [newEdgeId] },
        },
        edges: {
          ...state.app.dag.edges,
          [action.edgeId]: { ...edge, next: newNodeId },
          [newEdgeId]: { id: newEdgeId, label: 'Continue', next: edge.next, weights },
        },
      }

      const srcPos = state.positions[sourceNode.id] ?? { x: 0, y: 0 }
      const tgtPos = edge.next ? (state.positions[edge.next] ?? { x: 0, y: 200 }) : { x: srcPos.x, y: srcPos.y + 200 }
      const newPos: Position = { x: (srcPos.x + tgtPos.x) / 2, y: (srcPos.y + tgtPos.y) / 2 }

      return {
        ...state,
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

    case 'SET_VALIDATION': {
      return { ...state, validationWarnings: action.warnings, showValidationBanner: action.warnings.length > 0 }
    }

    case 'DISMISS_VALIDATION': {
      return { ...state, showValidationBanner: false }
    }

    default:
      return state
  }
}
