import type { Node, Edge } from '@xyflow/react'

// ── Node data ──────────────────────────────────────────────────────────────

export interface OptionData {
  id: string
  text: string
  value: string
}

export interface QuestionNodeData extends Record<string, unknown> {
  label: string
  variable: string
  options: OptionData[]
}

export interface OfferNodeData extends Record<string, unknown> {
  label: string
  offer_id: string
}

// ── Visual graph ───────────────────────────────────────────────────────────

export type AppNode = Node<QuestionNodeData, 'question'> | Node<OfferNodeData, 'offer'>

export interface VisualGraph {
  nodes: AppNode[]
  edges: Edge[]
}

// ── Compiled manifest ──────────────────────────────────────────────────────

export interface ManifestOption {
  label: string
  value: string
  next_id: string | null
}

export interface QuestionStep {
  type: 'QUESTION'
  question: string
  variable: string
  options: ManifestOption[]
}

export interface OfferStep {
  type: 'OFFER'
  offer_id: string
}

export type ClientStep = QuestionStep | OfferStep

export type ClientManifest = Record<string, ClientStep>
