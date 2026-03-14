export interface Position {
  x: number
  y: number
}

export type SelectionState =
  | { type: 'none' }
  | { type: 'node'; nodeId: string }
  | { type: 'edge'; edgeId: string }
