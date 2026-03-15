import type { AppState } from '../types/dag'

export function validate(state: AppState): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const { dag } = state

  if (!dag.root) {
    errors.push('No root node set.')
  } else if (!dag.nodes[dag.root]) {
    errors.push(`Root node "${dag.root}" does not exist.`)
  }

  for (const node of Object.values(dag.nodes)) {
    if (node.id === dag.root || node.nodeType === 'finish' || node.nodeType === 'info') continue
    if (node.answers.length === 0) {
      warnings.push(`Node "${node.id}" ("${node.text || 'untitled'}") has no answers.`)
    }
  }

  for (const edge of Object.values(dag.edges)) {
    if (edge.next && !dag.nodes[edge.next]) {
      errors.push(`Answer "${edge.id}" ("${edge.label}") points to missing node "${edge.next}".`)
    }
  }

  return { errors, warnings }
}
