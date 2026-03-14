import type { VisualGraph, ClientManifest } from '../shared/types'
import flowsMock from './mocks/flows.json'
import manifestMock from './mocks/manifest.json'

const USE_MOCKS = import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.DEV

// ── Types matching the backend API ─────────────────────────────────────────

export interface FlowRecord {
  id: string
  name: string
  graph: VisualGraph
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getFlows(): Promise<FlowRecord[]> {
  if (USE_MOCKS) {
    return flowsMock.flows as FlowRecord[]
  }
  return apiFetch<FlowRecord[]>('/flows')
}

export async function saveFlow(graph: VisualGraph): Promise<FlowRecord> {
  if (USE_MOCKS) {
    return { id: 'mock-' + Date.now(), name: 'Saved Flow', graph }
  }
  return apiFetch<FlowRecord>('/flows', {
    method: 'POST',
    body: JSON.stringify(graph),
  })
}

export async function publishFlow(id: string): Promise<ClientManifest> {
  if (USE_MOCKS) {
    return manifestMock as ClientManifest
  }
  return apiFetch<ClientManifest>(`/flows/${id}/publish`, { method: 'POST' })
}
