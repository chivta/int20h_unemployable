export interface DagNode {
  id: string
  text: string
  answers: string[] // ordered array of edge IDs
  questionType: 'single' | 'multi'
  nextNodeId?: string | null // used by multi-choice nodes for the single outgoing edge
}

export interface EdgeAction {
  type: 'set' | 'delta'
  fieldName: string
  value: string | number
}

export interface DagEdge {
  id: string
  label: string
  next: string | null // target node ID, null = terminal
  weights: Record<string, number>
  actions: EdgeAction[]
}

export interface DagData {
  root: string
  end: string
  nodes: Record<string, DagNode>
  edges: Record<string, DagEdge>
}

export interface OfferRequirement {
  field_name: string
  match_value: string
  is_obligatory: boolean
  score: number
}

export interface Offer {
  id: string
  name: string
  description?: string
  requirements?: OfferRequirement[]
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
