export interface DagNode {
  id: string
  text: string
  answers: string[] // ordered array of edge IDs
}

export interface DagEdge {
  id: string
  label: string
  next: string | null // target node ID, null = terminal
  weights: Record<string, number> // offer id -> score delta
}

export interface Offer {
  id: string
  name: string
}

export interface DagData {
  root: string
  nodes: Record<string, DagNode>
  edges: Record<string, DagEdge>
}

export interface AppState {
  dag: DagData
  offers: Record<string, Offer>
  meta: {
    version: number
    updatedAt: string
    updatedBy: string
  }
}
