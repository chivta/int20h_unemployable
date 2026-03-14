import type { AppState } from '../types/dag'
import type { Position } from '../types/ui'

export type Action =
  | { type: 'SET_ROOT'; nodeId: string }
  | { type: 'LOAD_STATE'; state: AppState }
  | { type: 'RESET' }
  | { type: 'ADD_NODE'; position?: { x: number; y: number } }
  | { type: 'UPDATE_NODE_TEXT'; nodeId: string; text: string }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'ADD_ANSWER'; nodeId: string }
  | { type: 'UPDATE_ANSWER_LABEL'; edgeId: string; label: string }
  | { type: 'SET_ANSWER_NEXT'; edgeId: string; next: string | null }
  | { type: 'DELETE_ANSWER'; edgeId: string }
  | { type: 'REORDER_ANSWERS'; nodeId: string; answers: string[] }
  | { type: 'INSERT_NODE_ON_EDGE'; edgeId: string; text: string }
  | { type: 'SET_ANSWER_WEIGHT'; edgeId: string; offerId: string; weight: number }
  | { type: 'ADD_OFFER'; name: string }
  | { type: 'UPDATE_OFFER_NAME'; offerId: string; name: string }
  | { type: 'DELETE_OFFER'; offerId: string }
  | { type: 'SET_NODE_POSITION'; nodeId: string; position: Position }
  | { type: 'RECOMPUTE_LAYOUT' }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'SELECT_EDGE'; edgeId: string }
  | { type: 'DESELECT' }
  | { type: 'SET_VALIDATION'; warnings: string[] }
  | { type: 'DISMISS_VALIDATION' }
