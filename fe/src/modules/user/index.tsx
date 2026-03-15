import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../shared/components/Button'

const API_URL = import.meta.env.VITE_API_URL ?? ''

interface BackendEdge {
  match_value: string
  to_node_id: string
  actions: unknown[]
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

type Phase = 'loading' | 'quiz' | 'results' | 'error'

export function QuizPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionId, setSessionId] = useState('')
  const [node, setNode] = useState<BackendNode | null>(null)
  const [results, setResults] = useState<OfferResult[]>([])
  const [error, setError] = useState('')
  const [answering, setAnswering] = useState(false)

  const startQuiz = useCallback(async () => {
    setPhase('loading')
    setError('')
    setNode(null)
    setResults([])
    try {
      const res = await fetch(`${API_URL}/api/user/reset`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data.node?.id) throw new Error('No start node configured in the admin panel.')
      setSessionId(data.session_id)
      setNode(data.node)
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

      if (!data.node?.id) {
        // Reached a terminal node — fetch recommendations
        const recRes = await fetch(`${API_URL}/api/user/recommendations?session_id=${sessionId}`)
        if (!recRes.ok) throw new Error(`HTTP ${recRes.status}`)
        const recData = await recRes.json()
        setResults(recData.results ?? [])
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

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={startQuiz}>Try again</Button>
        </div>
      </div>
    )
  }

  if (phase === 'results') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Your Recommendations</h1>
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

          <Button variant="outline" size="lg" className="w-full mt-2" onClick={startQuiz}>
            Start over
          </Button>
        </div>
      </div>
    )
  }

  // quiz phase
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-medium leading-snug text-gray-800">{node?.content}</p>
        </div>

        <div className="space-y-3">
          {node?.edges.map((edge) => (
            <button
              key={edge.match_value}
              disabled={answering}
              onClick={() => handleAnswer(edge.match_value)}
              className={[
                'w-full rounded-lg border border-gray-200 bg-white px-5 py-3.5 text-left text-sm font-medium text-gray-700',
                'transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                'disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
            >
              {edge.match_value}
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={startQuiz}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  )
}
