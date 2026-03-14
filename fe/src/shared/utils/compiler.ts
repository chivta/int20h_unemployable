import type { Edge } from '@xyflow/react'
import type {
  AppNode,
  ClientManifest,
  QuestionNodeData,
  OfferNodeData,
} from '../types'

export interface CompileResult {
  valid: boolean
  errors: string[]
  manifest: ClientManifest | null
}

function isQuestionNode(node: AppNode): node is AppNode & { type: 'question'; data: QuestionNodeData } {
  return node.type === 'question'
}

function isOfferNode(node: AppNode): node is AppNode & { type: 'offer'; data: OfferNodeData } {
  return node.type === 'offer'
}

export function compileGraph(nodes: AppNode[], edges: Edge[]): CompileResult {
  const errors: string[] = []

  if (nodes.length === 0) {
    return { valid: false, errors: ['Graph is empty'], manifest: null }
  }

  // Build adjacency: nodeId → Map<handleId, targetNodeId>
  const adj = new Map<string, Map<string, string>>()
  for (const node of nodes) adj.set(node.id, new Map())

  for (const edge of edges) {
    const src = adj.get(edge.source)
    if (src) {
      const handle = edge.sourceHandle ?? '__default__'
      src.set(handle, edge.target)
    }
  }

  // ── Cycle detection (DFS) ──────────────────────────────────────────────
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>(nodes.map((n) => [n.id, WHITE]))

  function dfs(id: string): boolean {
    color.set(id, GRAY)
    const targets = adj.get(id) ?? new Map()
    for (const targetId of targets.values()) {
      const c = color.get(targetId)
      if (c === GRAY) return true // back edge → cycle
      if (c === WHITE && dfs(targetId)) return true
    }
    color.set(id, BLACK)
    return false
  }

  for (const node of nodes) {
    if (color.get(node.id) === WHITE) {
      if (dfs(node.id)) {
        errors.push('Graph contains a cycle — remove cycles before publishing')
        return { valid: false, errors, manifest: null }
      }
    }
  }

  // ── Leaf nodes must be OfferNodes ──────────────────────────────────────
  for (const node of nodes) {
    const outgoing = adj.get(node.id)!
    if (outgoing.size === 0 && !isOfferNode(node)) {
      errors.push(`Node "${node.id}" has no outgoing edges and is not an Offer node`)
    }
  }

  // ── QuestionNodes: every option must have an outgoing edge ────────────
  for (const node of nodes) {
    if (isQuestionNode(node)) {
      const out = adj.get(node.id)!
      for (const opt of node.data.options) {
        if (!out.has(opt.id)) {
          errors.push(
            `Question "${node.data.label || node.id}": option "${opt.text}" has no outgoing edge`
          )
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, manifest: null }
  }

  // ── Build manifest ─────────────────────────────────────────────────────
  const manifest: ClientManifest = {}

  for (const node of nodes) {
    if (isQuestionNode(node)) {
      const out = adj.get(node.id)!
      manifest[node.id] = {
        type: 'QUESTION',
        question: node.data.label,
        variable: node.data.variable,
        options: node.data.options.map((opt) => ({
          label: opt.text,
          value: opt.value,
          next_id: out.get(opt.id) ?? null,
        })),
      }
    } else if (isOfferNode(node)) {
      manifest[node.id] = {
        type: 'OFFER',
        offer_id: node.data.offer_id,
      }
    }
  }

  // Find start node (no incoming edges)
  const hasIncoming = new Set(edges.map((e) => e.target))
  const roots = nodes.filter((n) => !hasIncoming.has(n.id))
  if (roots.length === 0) {
    return { valid: false, errors: ['No root node found (every node has incoming edges)'], manifest: null }
  }

  // Re-order manifest so root is first entry (cosmetic)
  const ordered: ClientManifest = {}
  for (const root of roots) ordered[root.id] = manifest[root.id]
  for (const [k, v] of Object.entries(manifest)) {
    if (!(k in ordered)) ordered[k] = v
  }

  return { valid: true, errors: [], manifest: ordered }
}
