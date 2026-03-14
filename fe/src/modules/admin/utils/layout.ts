import type { Position } from '../types/ui'
import type { DagData } from '../types/dag'

const NODE_WIDTH = 220
const NODE_HEIGHT = 80
const H_GAP = 160
const V_GAP = 100

export function computeLayout(dag: DagData): Record<string, Position> {
  const positions: Record<string, Position> = {}
  const nodeIds = Object.keys(dag.nodes)
  if (nodeIds.length === 0) return positions

  const depthMap: Record<string, number> = {}
  const byDepth: Record<number, string[]> = {}
  const visited = new Set<string>()

  if (dag.root && dag.nodes[dag.root]) {
    const queue: string[] = [dag.root]
    depthMap[dag.root] = 0

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      if (visited.has(nodeId)) continue
      visited.add(nodeId)

      const depth = depthMap[nodeId]
      if (!byDepth[depth]) byDepth[depth] = []
      byDepth[depth].push(nodeId)

      const node = dag.nodes[nodeId]
      if (!node) continue

      for (const edgeId of node.answers) {
        const edge = dag.edges[edgeId]
        if (!edge?.next || depthMap[edge.next] !== undefined) continue
        depthMap[edge.next] = depth + 1
        queue.push(edge.next)
      }
    }
  }

  let maxDepth = Object.values(depthMap).reduce((a, b) => Math.max(a, b), -1)
  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      maxDepth += 1
      depthMap[nodeId] = maxDepth
      if (!byDepth[maxDepth]) byDepth[maxDepth] = []
      byDepth[maxDepth].push(nodeId)
    }
  }

  for (const [depthStr, ids] of Object.entries(byDepth)) {
    const depth = parseInt(depthStr, 10)
    const totalHeight = ids.length * NODE_HEIGHT + (ids.length - 1) * V_GAP
    const startY = -totalHeight / 2
    ids.forEach((nodeId, i) => {
      positions[nodeId] = {
        x: depth * (NODE_WIDTH + H_GAP),
        y: startY + i * (NODE_HEIGHT + V_GAP),
      }
    })
  }

  return positions
}
