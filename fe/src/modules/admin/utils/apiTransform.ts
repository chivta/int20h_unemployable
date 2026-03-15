import type { AppState, DagEdge } from '../types/dag'
import type { Position } from '../types/ui'

// Backend types (mirrors Go models)
interface BackendAction {
  type: string
  field_name: string
  value: string | number
}

interface BackendEdge {
  match_value: string
  actions: BackendAction[]
  to_node_id: string
  weights: Record<string, number>
}

interface BackendNode {
  id: string
  type: string
  content: string
  edges: BackendEdge[]
}

interface BackendOffer {
  id: string
  name: string
  description: string
  url?: string
  requirements: Array<{
    field_name: string
    match_value: string
    is_obligatory: boolean
    is_must_not: boolean
    score: number
  }>
}

export interface BackendConfig {
  root?: string
  end?: string // kept for backward compat when reading old configs
  nodes: Record<string, BackendNode>
  offers: Record<string, BackendOffer>
  layout?: Record<string, { x: number; y: number }>
}

/**
 * Convert frontend AppState + node positions → backend Config format.
 *
 * Edge mapping:
 *   DagEdge.label  → Edge.MatchValue
 *   DagEdge.next   → Edge.ToNodeID
 *   DagEdge.actions → Edge.Actions (field_name is snake_cased)
 *
 * Node mapping:
 *   DagNode.id     → Node.ID
 *   DagNode.text   → Node.Content
 *   DagNode.answers[] edges → Node.Edges[] (in order)
 */
export function toBackendConfig(state: AppState, positions: Record<string, Position>): BackendConfig {
  const backendNodes: Record<string, BackendNode> = {}

  for (const [nodeId, node] of Object.entries(state.dag.nodes)) {
    const isMulti = node.questionType === 'multi'
    const isFinish = node.nodeType === 'finish'

    let edges: BackendEdge[]
    let nodeType: string

    const isInfo = node.nodeType === 'info'

    if (isFinish) {
      nodeType = 'finish'
      edges = []
    } else if (isInfo) {
      nodeType = 'info'
      edges = node.nextNodeId
        ? [{ match_value: '', to_node_id: node.nextNodeId, actions: [], weights: {} }]
        : []
    } else if (isMulti) {
      nodeType = 'multi_choice'
      edges = node.answers
        .map(edgeId => state.dag.edges[edgeId])
        .filter((e): e is DagEdge => Boolean(e))
        .map(edge => ({
          match_value: edge.label,
          to_node_id: node.nextNodeId ?? '',
          actions: (edge.actions ?? []).map(a => ({
            type: a.type,
            field_name: toSnakeCase(a.fieldName),
            value: a.value,
          })),
          weights: edge.weights ?? {},
        }))
    } else {
      nodeType = 'question'
      edges = node.answers
        .map(edgeId => state.dag.edges[edgeId])
        .filter((e): e is DagEdge => Boolean(e))
        .map(edge => ({
          match_value: edge.label,
          to_node_id: edge.next ?? '',
          actions: (edge.actions ?? []).map(a => ({
            type: a.type,
            field_name: toSnakeCase(a.fieldName),
            value: a.value,
          })),
          weights: edge.weights ?? {},
        }))
    }

    backendNodes[nodeId] = {
      id: node.id,
      type: nodeType,
      content: node.text,
      edges,
    }
  }

  const backendOffers: Record<string, BackendOffer> = {}
  for (const [offerId, offer] of Object.entries(state.offers)) {
    backendOffers[offerId] = {
      id: offer.id,
      name: offer.name,
      description: offer.description ?? '',
      ...(offer.url ? { url: offer.url } : {}),
      requirements: (offer.requirements ?? []).map(r => ({
        field_name: r.field_name,
        match_value: r.match_value,
        is_obligatory: r.is_obligatory,
        is_must_not: r.is_must_not ?? false,
        score: r.score,
      })),
    }
  }

  return {
    root: state.dag.root,
    nodes: backendNodes,
    offers: backendOffers,
    layout: positions,
  }
}

/**
 * Convert backend Config → frontend AppState.
 * Edges are exploded out of Node.Edges[] into a flat edges map keyed by
 * a generated ID (`${nodeId}_e${index}`).
 */
export function fromBackendConfig(config: BackendConfig): { state: AppState; positions: Record<string, Position> } {
  const nodes: AppState['dag']['nodes'] = {}
  const edges: AppState['dag']['edges'] = {}

  for (const [nodeId, node] of Object.entries(config.nodes)) {
    const answerIds: string[] = []

    node.edges.forEach((beEdge, i) => {
      const edgeId = `${nodeId}_e${i}`
      answerIds.push(edgeId)
      edges[edgeId] = {
        id: edgeId,
        label: beEdge.match_value,
        next: beEdge.to_node_id || null,
        weights: {},
        actions: (beEdge.actions ?? []).map(a => ({
          type: 'set' as const,
          fieldName: toCamelCase(a.field_name),
          value: a.value,
        })),
      }
    })

    const isMultiChoice = node.type === 'multi_choice'
    const isFinish = node.type === 'finish'
    const isInfo = node.type === 'info'
    // For multi-choice and info nodes, derive nextNodeId from the first edge's to_node_id
    const nextNodeId = (isMultiChoice || isInfo) ? (node.edges[0]?.to_node_id || null) : null
    nodes[nodeId] = {
      id: nodeId,
      text: node.content,
      answers: answerIds,
      questionType: isMultiChoice ? 'multi' : 'single',
      nextNodeId,
      ...(isFinish ? { nodeType: 'finish' as const } : isInfo ? { nodeType: 'info' as const } : {}),
    }
  }

  // Backward compat: if config.end is set, mark that node as a finish node
  if (config.end && nodes[config.end]) {
    nodes[config.end] = { ...nodes[config.end], nodeType: 'finish' }
  }

  const offers: AppState['offers'] = {}
  for (const [offerId, offer] of Object.entries(config.offers ?? {})) {
    offers[offerId] = {
      id: offer.id,
      name: offer.name,
      description: offer.description,
      url: offer.url,
      requirements: offer.requirements,
    }
  }

  // Determine root: node with no incoming edges
  const allTargets = new Set(Object.values(edges).map(e => e.next).filter(Boolean))
  const rootCandidates = Object.keys(nodes).filter(id => !allTargets.has(id))
  const root = config.root ?? rootCandidates[0] ?? Object.keys(nodes)[0] ?? ''

  const positions: Record<string, Position> = {}
  if (config.layout) {
    for (const [id, pos] of Object.entries(config.layout)) {
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        positions[id] = { x: pos.x, y: pos.y }
      }
    }
  }

  return {
    state: {
      dag: { root, nodes, edges },
      offers,
      meta: { version: 1, updatedAt: new Date().toISOString(), updatedBy: 'admin' },
    },
    positions,
  }
}

function toSnakeCase(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1).replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
}

function toCamelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
