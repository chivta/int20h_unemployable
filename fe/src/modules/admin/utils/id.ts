let nodeCounter = 0
let edgeCounter = 0

export function nextNodeId(): string {
  nodeCounter += 1
  return `q${nodeCounter}`
}

export function nextEdgeId(): string {
  edgeCounter += 1
  return `a${edgeCounter}`
}

// Seed counters above max IDs found in loaded state
export function seedCounters(dag: { nodes: Record<string, unknown>; edges: Record<string, unknown> }): void {
  const nodeMax = Object.keys(dag.nodes)
    .map(k => parseInt(k.slice(1), 10))
    .filter(n => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  const edgeMax = Object.keys(dag.edges)
    .map(k => parseInt(k.slice(1), 10))
    .filter(n => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  nodeCounter = Math.max(nodeCounter, nodeMax)
  edgeCounter = Math.max(edgeCounter, edgeMax)
}
