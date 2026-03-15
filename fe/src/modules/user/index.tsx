import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Button } from '../../shared/components/Button'
import type { BackendConfig } from '../admin/utils/apiTransform'

const API_URL = import.meta.env.VITE_API_URL ?? ''

interface BackendAction {
  type: string
  field_name: string
  value: string | number
}

interface BackendEdge {
  match_value: string
  to_node_id: string
  actions: BackendAction[]
  weights?: Record<string, number>
}

interface BackendNode {
  id: string
  type: string
  content: string
  edges: BackendEdge[]
}

interface OfferResult {
  ID: string
  Name: string
  Description: string
  Score: number
}

// Map raw backend JSON (lowercase keys) to OfferResult
function mapBackendResults(raw: unknown[]): OfferResult[] {
  return raw.map((r: unknown) => {
    const o = r as Record<string, unknown>
    return {
      ID: (o.id ?? o.ID ?? '') as string,
      Name: (o.name ?? o.Name ?? '') as string,
      Description: (o.description ?? o.Description ?? '') as string,
      Score: (o.score ?? o.Score ?? 0) as number,
    }
  })
}

type Phase = 'loading' | 'quiz' | 'results' | 'error'

// ---------------------------------------------------------------------------
// Local (in-memory) quiz logic
// ---------------------------------------------------------------------------

interface UserData {
  age: number
  gender: string
  goal: string
  context: string
  constraints: string
  level: string
  motivation: string
  preferences: string
  wellbeing: string
  age_group: string
  equipment: string
  session_duration: string
  schedule: string
  barrier: string
  stress_level: string
  sleep_quality: string
  body_goal: string
  readiness_score: number
  [key: string]: string | number
}

function emptyUserData(): UserData {
  return {
    age: 0,
    gender: '',
    goal: '',
    context: '',
    constraints: '',
    level: '',
    motivation: '',
    preferences: '',
    wellbeing: '',
    age_group: '',
    equipment: '',
    session_duration: '',
    schedule: '',
    barrier: '',
    stress_level: '',
    sleep_quality: '',
    body_goal: '',
    readiness_score: 0,
  }
}

function applyActions(userData: UserData, actions: BackendAction[]): UserData {
  const next = { ...userData }
  for (const action of actions) {
    const field = action.field_name
    if (action.type === 'set') {
      next[field] = action.value
    } else if (action.type === 'delta') {
      const current = next[field]
      if (typeof current === 'number') {
        next[field] = current + Number(action.value)
      }
      // skip delta on non-numeric fields
    }
  }
  return next
}

function scoreOffers(
  localConfig: BackendConfig,
  userData: UserData,
  accumulatedScores: Record<string, number>,
): OfferResult[] {
  const results: OfferResult[] = []
  for (const offer of Object.values(localConfig.offers)) {
    // Prefer accumulated edge-weight scores; fall back to requirement-based scoring
    const hasWeightScores = Object.keys(accumulatedScores).length > 0
    if (hasWeightScores) {
      results.push({
        ID: offer.id,
        Name: offer.name,
        Description: offer.description ?? '',
        Score: accumulatedScores[offer.id] ?? 0,
      })
    } else {
      let score = 0
      let disqualified = false
      for (const req of offer.requirements ?? []) {
        const matched = String(userData[req.field_name] ?? '') === String(req.match_value)
        if (matched) {
          score += req.score
        } else if (req.is_obligatory) {
          disqualified = true
          break
        }
      }
      results.push({
        ID: offer.id,
        Name: offer.name,
        Description: offer.description ?? '',
        Score: disqualified ? -Infinity : score,
      })
    }
  }

  results.sort((a, b) => b.Score - a.Score)

  const qualifying = results.filter(r => r.Score > 0)
  return qualifying.length > 0 ? qualifying : results
}

// ---------------------------------------------------------------------------
// Local quiz hook
// ---------------------------------------------------------------------------

function useLocalQuiz(localConfig: BackendConfig) {
  const [node, setNode] = useState<BackendNode | null>(null)
  const [userData, setUserData] = useState<UserData>(emptyUserData())
  const [scores, setScores] = useState<Record<string, number>>({})
  const [results, setResults] = useState<OfferResult[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')

  const startQuiz = useCallback(() => {
    setPhase('loading')
    setError('')
    setResults([])
    setScores({})
    const rootId = localConfig.root
    if (!rootId) {
      setError('No root node configured in the admin panel.')
      setPhase('error')
      return
    }
    const rootNode = localConfig.nodes[rootId]
    if (!rootNode) {
      setError(`Root node "${rootId}" not found in config.`)
      setPhase('error')
      return
    }
    setUserData(emptyUserData())
    setNode(rootNode)
    setPhase('quiz')
  }, [localConfig])

  useEffect(() => {
    startQuiz()
  }, [startQuiz])

  function handleAnswer(answer: string) {
    if (!node) return

    // Find matching edge: first exact match, then fallback (empty match_value)
    const edge =
      node.edges.find(e => e.match_value === answer) ??
      node.edges.find(e => e.match_value === '')

    if (!edge) return

    const nextUserData = applyActions(userData, edge.actions ?? [])
    setUserData(nextUserData)

    // Accumulate edge weights into scores
    const nextScores = { ...scores }
    for (const [offerId, weight] of Object.entries(edge.weights ?? {})) {
      nextScores[offerId] = (nextScores[offerId] ?? 0) + weight
    }
    setScores(nextScores)

    const nextNodeId = edge.to_node_id
    if (!nextNodeId || (localConfig.end && nextNodeId === localConfig.end)) {
      // Terminal — compute recommendations
      setResults(scoreOffers(localConfig, nextUserData, nextScores))
      setPhase('results')
      return
    }

    const nextNode = localConfig.nodes[nextNodeId]
    if (!nextNode) {
      setError(`Node "${nextNodeId}" not found in config.`)
      setPhase('error')
      return
    }
    setNode(nextNode)
  }

  function handleMultiAnswer(selectedAnswers: string[]) {
    if (!node || selectedAnswers.length === 0) return

    // Accumulate actions and weights from all selected edges, then navigate via the first selected edge
    let nextUserData = { ...userData }
    const nextScores = { ...scores }
    let firstNextNodeId: string | null = null

    for (const answer of selectedAnswers) {
      // Exact match only for multi-choice — no wildcard fallback (each answer has its own edge)
      const edge = node.edges.find(e => e.match_value === answer)
      if (!edge) continue
      nextUserData = applyActions(nextUserData, edge.actions ?? [])
      for (const [offerId, weight] of Object.entries(edge.weights ?? {})) {
        nextScores[offerId] = (nextScores[offerId] ?? 0) + weight
      }
      if (firstNextNodeId === null) firstNextNodeId = edge.to_node_id || null
    }

    setUserData(nextUserData)
    setScores(nextScores)

    if (!firstNextNodeId || (localConfig.end && firstNextNodeId === localConfig.end)) {
      setResults(scoreOffers(localConfig, nextUserData, nextScores))
      setPhase('results')
      return
    }

    const nextNode = localConfig.nodes[firstNextNodeId]
    if (!nextNode) {
      setError(`Node "${firstNextNodeId}" not found in config.`)
      setPhase('error')
      return
    }
    setNode(nextNode)
  }

  return { phase, node, userData, scores, results, error, handleAnswer, handleMultiAnswer, startQuiz }
}

// ---------------------------------------------------------------------------
// Test quiz hook — uses backend test endpoints with local fallback
// ---------------------------------------------------------------------------

function useTestQuiz(localConfig: BackendConfig) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionId, setSessionId] = useState('')
  const [node, setNode] = useState<BackendNode | null>(null)
  const [userData, setUserData] = useState<UserData>(emptyUserData())
  const [scores, setScores] = useState<Record<string, number>>({})
  const [results, setResults] = useState<OfferResult[]>([])
  const [error, setError] = useState('')
  const [answering, setAnswering] = useState(false)
  const [usingLocal, setUsingLocal] = useState(false)

  // Local fallback state ref — we delegate to useLocalQuiz when backend fails
  const localQuiz = useLocalQuiz(localConfig)

  const startQuiz = useCallback(async () => {
    setPhase('loading')
    setError('')
    setNode(null)
    setResults([])
    setScores({})
    setUserData(emptyUserData())
    setUsingLocal(false)
    try {
      const res = await fetch(`${API_URL}/api/user/test/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: localConfig }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data.node?.id) throw new Error('No start node returned by backend.')
      setSessionId(data.session_id)
      setNode(data.node)
      if (data.user) setUserData(data.user as UserData)
      setPhase('quiz')
    } catch {
      // Backend unavailable — fall back to local quiz
      setUsingLocal(true)
    }
  }, [localConfig])

  useEffect(() => {
    startQuiz()
  }, [startQuiz])

  async function handleAnswer(answer: string) {
    if (usingLocal) {
      localQuiz.handleAnswer(answer)
      return
    }
    if (!node || answering) return
    setAnswering(true)
    try {
      const res = await fetch(`${API_URL}/api/user/test/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: node.id, answer, session_id: sessionId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.user) setUserData(data.user as UserData)

      // Accumulate edge weights locally for UserDataPanel scores
      const currentNode = node
      const edge =
        currentNode.edges.find(e => e.match_value === answer) ??
        currentNode.edges.find(e => e.match_value === '')
      if (edge) {
        setScores(prev => {
          const next = { ...prev }
          for (const [offerId, weight] of Object.entries(edge.weights ?? {})) {
            next[offerId] = (next[offerId] ?? 0) + weight
          }
          return next
        })
      }

      if (!data.node?.id) {
        const recRes = await fetch(`${API_URL}/api/user/test/recommendations?session_id=${sessionId}`)
        if (!recRes.ok) throw new Error(`HTTP ${recRes.status}`)
        const recData = await recRes.json()
        setResults(mapBackendResults(recData.results ?? []))
        setPhase('results')
      } else {
        setNode(data.node)
      }
    } catch (e) {
      setError((e as Error).message)
      setPhase('error')
    } finally {
      setAnswering(false)
    }
  }

  async function handleMultiAnswer(selectedAnswers: string[]) {
    if (usingLocal) {
      localQuiz.handleMultiAnswer(selectedAnswers)
      return
    }
    if (!node || answering || selectedAnswers.length === 0) return

    // Accumulate edge weights locally (exact match only for multi-choice)
    const nextScores = { ...scores }
    for (const answer of selectedAnswers) {
      const edge = node.edges.find(e => e.match_value === answer)
      if (edge) {
        for (const [offerId, weight] of Object.entries(edge.weights ?? {})) {
          nextScores[offerId] = (nextScores[offerId] ?? 0) + weight
        }
      }
    }
    setScores(nextScores)

    // Send answers sequentially — first answer drives the session
    setAnswering(true)
    try {
      let lastData: { node?: BackendNode | null; user?: UserData } = {}
      for (const answer of selectedAnswers) {
        const res = await fetch(`${API_URL}/api/user/test/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_id: node.id, answer, session_id: sessionId }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        lastData = await res.json()
      }
      if (lastData.user) setUserData(lastData.user as UserData)
      if (!lastData.node?.id) {
        const recRes = await fetch(`${API_URL}/api/user/test/recommendations?session_id=${sessionId}`)
        if (!recRes.ok) throw new Error(`HTTP ${recRes.status}`)
        const recData = await recRes.json()
        setResults(mapBackendResults(recData.results ?? []))
        setPhase('results')
      } else {
        setNode(lastData.node as BackendNode)
      }
    } catch (e) {
      setError((e as Error).message)
      setPhase('error')
    } finally {
      setAnswering(false)
    }
  }

  if (usingLocal) {
    return {
      phase: localQuiz.phase,
      node: localQuiz.node,
      userData: localQuiz.userData,
      scores: localQuiz.scores,
      results: localQuiz.results,
      error: localQuiz.error,
      handleAnswer: localQuiz.handleAnswer,
      handleMultiAnswer: localQuiz.handleMultiAnswer,
      startQuiz: localQuiz.startQuiz,
      answering: false,
    }
  }

  return { phase, node, userData, scores, results, error, handleAnswer, handleMultiAnswer, startQuiz, answering }
}

// ---------------------------------------------------------------------------
// Server quiz hook (unchanged logic, extracted into a hook)
// ---------------------------------------------------------------------------

function useServerQuiz() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionId, setSessionId] = useState('')
  const [node, setNode] = useState<BackendNode | null>(null)
  const [results, setResults] = useState<OfferResult[]>([])
  const [error, setError] = useState('')
  const [answering, setAnswering] = useState(false)
  const [step, setStep] = useState(0)
  const [total, setTotal] = useState(0)

  const startQuiz = useCallback(async () => {
    setPhase('loading')
    setError('')
    setNode(null)
    setResults([])
    setStep(0)
    setTotal(0)
    try {
      const res = await fetch(`${API_URL}/api/user/reset`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data.node?.id) throw new Error('No start node configured in the admin panel.')
      setSessionId(data.session_id)
      setNode(data.node)
      if (data.total_questions) setTotal(data.total_questions)
      setPhase('quiz')
    } catch (e) {
      setError((e as Error).message)
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    startQuiz()
  }, [startQuiz])

  async function handleAnswer(answer: string) {
    if (!node || answering) return
    setAnswering(true)
    try {
      const res = await fetch(`${API_URL}/api/user/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: node.id, answer, session_id: sessionId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStep(s => s + 1)

      if (!data.node?.id) {
        const recRes = await fetch(`${API_URL}/api/user/recommendations?session_id=${sessionId}`)
        if (!recRes.ok) throw new Error(`HTTP ${recRes.status}`)
        const recData = await recRes.json()
        setResults(mapBackendResults(recData.results ?? []))
        setPhase('results')
      } else {
        setNode(data.node)
      }
    } catch (e) {
      setError((e as Error).message)
      setPhase('error')
    } finally {
      setAnswering(false)
    }
  }

  return { phase, node, results, error, handleAnswer, startQuiz, answering, step, total }
}

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
    </div>
  )
}

function ErrorScreen({ error, onRetry, isLocal }: { error: string; onRetry: () => void; isLocal: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        {isLocal && (
          <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Local test mode</p>
        )}
        <p className="text-sm text-red-600">{error}</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </div>
  )
}

function ResultsScreen({ results, onRestart, isLocal }: { results: OfferResult[]; onRestart: () => void; isLocal: boolean }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Your Recommendations</h1>
        {isLocal && (
          <p className="text-xs text-blue-500 font-medium text-center uppercase tracking-wide">Local test mode</p>
        )}
        <p className="text-sm text-gray-500 text-center mb-2">
          Based on your answers, here are the best matching offers.
        </p>

        {results.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No matching offers found.</p>
        ) : (
          results.map((offer, i) => (
            <div
              key={offer.ID}
              className={[
                'rounded-xl border bg-white p-5 shadow-sm transition-shadow',
                i === 0
                  ? 'border-blue-400 ring-1 ring-blue-200'
                  : 'border-gray-200',
              ].join(' ')}
            >
              {i === 0 && (
                <span className="inline-block mb-2 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-600 bg-blue-50">
                  Best match
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-800">{offer.Name}</h2>
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  Score {offer.Score}
                </span>
              </div>
              {offer.Description && (
                <p className="mt-1 text-sm text-gray-600">{offer.Description}</p>
              )}
            </div>
          ))
        )}

        <Button variant="outline" size="lg" className="w-full mt-2" onClick={onRestart}>
          Start over
        </Button>
      </div>
    </div>
  )
}

function QuizScreen({
  node,
  onAnswer,
  onMultiAnswer,
  onRestart,
  answering,
  isLocal,
}: {
  node: BackendNode
  onAnswer: (answer: string) => void
  onMultiAnswer?: (answers: string[]) => void
  onRestart: () => void
  answering?: boolean
  isLocal: boolean
}) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])

  // Reset selection when node changes
  useEffect(() => {
    setSelectedAnswers([])
  }, [node.id])

  const isInfo = node.type === 'info' || node.type === 'message'
  const isMulti = node.type === 'multi_choice'

  // For info nodes, auto-render a single "Continue" button that follows the first edge
  const edges = isInfo
    ? [{ match_value: 'Continue', to_node_id: node.edges[0]?.to_node_id ?? '', actions: node.edges[0]?.actions ?? [] }]
    : node.edges

  function toggleAnswer(value: string) {
    setSelectedAnswers(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-5">
        {isLocal && (
          <p className="text-xs text-blue-500 font-medium text-center uppercase tracking-wide">Local test mode</p>
        )}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {isMulti && (
            <p className="mb-2 text-xs font-medium text-indigo-500 uppercase tracking-wide">Select all that apply</p>
          )}
          <p className="text-lg font-medium leading-snug text-gray-800">{node.content}</p>
        </div>

        {isMulti ? (
          <>
            <div className="space-y-3">
              {edges.map((edge, idx) => {
                const isSelected = selectedAnswers.includes(edge.match_value)
                return (
                  <button
                    key={idx}
                    disabled={answering}
                    onClick={() => toggleAnswer(edge.match_value)}
                    className={[
                      'w-full rounded-lg border px-5 py-3.5 text-left text-sm font-medium',
                      'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={[
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white',
                        ].join(' ')}
                      >
                        {isSelected && (
                          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white" fill="currentColor">
                            <path d="M1.5 5.5L4 8l4.5-5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {edge.match_value || 'Option'}
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              disabled={answering || selectedAnswers.length === 0}
              onClick={() => onMultiAnswer?.(selectedAnswers)}
              className={[
                'w-full rounded-lg px-5 py-3.5 text-sm font-semibold text-white transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'bg-indigo-600 hover:bg-indigo-700',
              ].join(' ')}
            >
              Continue
            </button>
          </>
        ) : (
          <div className="space-y-3">
            {edges.map((edge, idx) => (
              <button
                key={isInfo ? idx : edge.match_value}
                disabled={answering}
                onClick={() => onAnswer(isInfo ? (node.edges[0]?.match_value ?? '') : edge.match_value)}
                className={[
                  'w-full rounded-lg border border-gray-200 bg-white px-5 py-3.5 text-left text-sm font-medium text-gray-700',
                  'transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                ].join(' ')}
              >
                {edge.match_value || 'Continue'}
              </button>
            ))}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={onRestart}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UserData live panel (local mode only)
// ---------------------------------------------------------------------------

const USER_DATA_FIELDS: (keyof UserData)[] = [
  'age',
  'gender',
  'goal',
  'context',
  'constraints',
  'level',
  'motivation',
  'preferences',
  'wellbeing',
  'age_group',
  'equipment',
  'session_duration',
  'schedule',
  'barrier',
  'stress_level',
  'sleep_quality',
  'body_goal',
  'readiness_score',
]

function UserDataPanel({
  userData,
  scores,
  offers,
}: {
  userData: UserData
  scores: Record<string, number>
  offers: Record<string, { id: string; name: string }>
}) {
  const offerScores = Object.values(offers ?? {})
    .map(offer => ({ id: offer.id, name: offer.name, score: scores[offer.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="fixed top-4 right-4 z-50 w-56 rounded-xl border border-blue-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-blue-50 px-3 py-2 border-b border-blue-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">UserData</p>
      </div>
      <ul className="divide-y divide-gray-100">
        {USER_DATA_FIELDS.map(field => {
          const value = userData[field]
          const isEmpty = value === '' || value === 0
          return (
            <li key={field} className="flex items-start justify-between gap-2 px-3 py-1.5">
              <span className="text-xs font-medium text-gray-500 shrink-0">{field}</span>
              <span
                className={[
                  'text-xs text-right break-all',
                  isEmpty ? 'text-gray-300 italic' : 'text-gray-800 font-semibold',
                ].join(' ')}
              >
                {isEmpty ? '—' : String(value)}
              </span>
            </li>
          )
        })}
      </ul>

      {offerScores.length > 0 && (
        <>
          <div className="bg-blue-50 px-3 py-2 border-t border-b border-blue-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Offer Scores</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {offerScores.map(({ id, name, score }) => (
              <li key={id} className="flex items-start justify-between gap-2 px-3 py-1.5">
                <span className="text-xs font-medium text-gray-500 shrink-0 truncate max-w-[120px]" title={name}>
                  {name}
                </span>
                <span
                  className={[
                    'text-xs text-right shrink-0',
                    score === 0 ? 'text-gray-300 italic' : 'text-gray-800 font-semibold',
                  ].join(' ')}
                >
                  {score}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Local quiz page wrapper
// ---------------------------------------------------------------------------

function LocalQuizPage({ localConfig }: { localConfig: BackendConfig }) {
  const navigate = useNavigate()
  const { phase, node, userData, scores, results, error, handleAnswer, handleMultiAnswer, startQuiz } = useLocalQuiz(localConfig)

  const backButton = (
    <button
      onClick={() => navigate({ to: '/admin' })}
      className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
    >
      ← Back to Editor
    </button>
  )

  if (phase === 'loading') return <>{backButton}<LoadingScreen /></>
  if (phase === 'error') return <>{backButton}<ErrorScreen error={error} onRetry={startQuiz} isLocal /></>
  if (phase === 'results')
    return (
      <>
        {backButton}
        <UserDataPanel userData={userData} scores={scores} offers={localConfig.offers} />
        <ResultsScreen results={results} onRestart={startQuiz} isLocal />
      </>
    )
  if (!node) return <>{backButton}<LoadingScreen /></>

  return (
    <>
      {backButton}
      <UserDataPanel userData={userData} scores={scores} offers={localConfig.offers} />
      <QuizScreen node={node} onAnswer={handleAnswer} onMultiAnswer={handleMultiAnswer} onRestart={startQuiz} isLocal />
    </>
  )
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Production quiz UI — progress bar + polished layout
// ---------------------------------------------------------------------------

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((step / total) * 100)) : 0
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-indigo-600">
          {total > 0 ? `Question ${step + 1} of ${total}` : `Question ${step + 1}`}
        </span>
        {total > 0 && (
          <span className="text-xs text-gray-400">{pct}%</span>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ProductionQuizScreen({
  node,
  onAnswer,
  onMultiAnswer,
  answering,
  step,
  total,
}: {
  node: BackendNode
  onAnswer: (answer: string) => void
  onMultiAnswer?: (answers: string[]) => void
  answering?: boolean
  step: number
  total: number
}) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])

  useEffect(() => {
    setSelectedAnswers([])
  }, [node.id])

  const isInfo = node.type === 'info' || node.type === 'message'
  const isMulti = node.type === 'multi_choice'

  const edges = isInfo
    ? [{ match_value: 'Continue', to_node_id: node.edges[0]?.to_node_id ?? '', actions: node.edges[0]?.actions ?? [] }]
    : node.edges

  function toggleAnswer(value: string) {
    setSelectedAnswers(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-center border-b border-white/60 bg-white/70 backdrop-blur-sm">
        <span className="text-base font-bold tracking-tight text-indigo-700">BetterMe</span>
      </header>

      {/* Progress */}
      <div className="w-full max-w-lg mx-auto px-6 pt-6">
        <ProgressBar step={step} total={total} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg space-y-5">
          {/* Question card */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 px-8 py-7">
            {isMulti && (
              <p className="mb-2 text-xs font-semibold text-indigo-500 uppercase tracking-widest">
                Select all that apply
              </p>
            )}
            <p className="text-xl font-semibold leading-snug text-gray-900">{node.content}</p>
          </div>

          {/* Answers */}
          {isMulti ? (
            <>
              <div className="space-y-3">
                {edges.map((edge, idx) => {
                  const isSelected = selectedAnswers.includes(edge.match_value)
                  return (
                    <button
                      key={idx}
                      disabled={answering}
                      onClick={() => toggleAnswer(edge.match_value)}
                      className={[
                        'w-full rounded-xl border-2 px-5 py-4 text-left text-sm font-medium transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                          : 'border-slate-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-3">
                        <span className={[
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                          isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white',
                        ].join(' ')}>
                          {isSelected && (
                            <svg viewBox="0 0 10 10" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1.5 5.5L4 8l4.5-5.5" />
                            </svg>
                          )}
                        </span>
                        {edge.match_value || 'Option'}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                disabled={answering || selectedAnswers.length === 0}
                onClick={() => onMultiAnswer?.(selectedAnswers)}
                className="w-full rounded-xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {answering ? 'Loading…' : 'Continue →'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              {edges.map((edge, idx) => (
                <button
                  key={isInfo ? idx : edge.match_value}
                  disabled={answering}
                  onClick={() => onAnswer(isInfo ? (node.edges[0]?.match_value ?? '') : edge.match_value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-left text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {edge.match_value || 'Continue →'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProductionResultsScreen({ results, onRestart }: { results: OfferResult[]; onRestart: () => void }) {
  const top = results[0]
  const rest = results.slice(1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-center border-b border-white/60 bg-white/70 backdrop-blur-sm">
        <span className="text-base font-bold tracking-tight text-indigo-700">BetterMe</span>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-lg space-y-5">
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Your results</p>
            <h1 className="text-3xl font-bold text-gray-900">Your perfect fit</h1>
            <p className="text-sm text-gray-500">Based on your answers, here are the programs matched for you.</p>
          </div>

          {results.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No matching programs found.</p>
          ) : (
            <>
              {/* Top result */}
              {top && (
                <div className="rounded-2xl bg-indigo-600 text-white p-6 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-2">Best match</p>
                  <h2 className="text-lg font-bold leading-snug mb-1">{top.Name}</h2>
                  {top.Description && (
                    <p className="text-sm text-indigo-100 leading-relaxed whitespace-pre-line">{top.Description}</p>
                  )}
                  <button className="mt-5 w-full rounded-xl bg-white text-indigo-700 py-3 text-sm font-bold hover:bg-indigo-50 transition-colors active:scale-[0.98]">
                    Get started →
                  </button>
                </div>
              )}

              {/* Other matches */}
              {rest.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Also a great fit</p>
                  {rest.map(offer => (
                    <div key={offer.ID} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="text-sm font-semibold text-gray-800">{offer.Name}</h2>
                      {offer.Description && (
                        <p className="mt-1 text-xs text-gray-500 leading-relaxed whitespace-pre-line">{offer.Description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            onClick={onRestart}
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            Retake quiz
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Server quiz page wrapper
// ---------------------------------------------------------------------------

function ServerQuizPage() {
  const { phase, node, results, error, handleAnswer, startQuiz, answering, step, total } = useServerQuiz()

  if (phase === 'loading') return <LoadingScreen />
  if (phase === 'error') return <ErrorScreen error={error} onRetry={startQuiz} isLocal={false} />
  if (phase === 'results') return <ProductionResultsScreen results={results} onRestart={startQuiz} />
  if (!node) return <LoadingScreen />

  return (
    <ProductionQuizScreen
      node={node}
      onAnswer={handleAnswer}
      answering={answering}
      step={step}
      total={total}
    />
  )
}

// ---------------------------------------------------------------------------
// Top-level exported component
// ---------------------------------------------------------------------------

export function QuizPage() {
  const location = useLocation()
  const state = location.state as { localConfig?: BackendConfig } | undefined
  const localConfig = state?.localConfig

  if (localConfig) {
    return <LocalQuizPage localConfig={localConfig} />
  }

  return <ServerQuizPage />
}
