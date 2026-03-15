import { ArrowRight } from 'lucide-react'
import { useAppContext } from '../../state/context'

export function EdgePanel({ edgeId }: { edgeId: string }) {
  const { state } = useAppContext()
  const edge = state.app.dag.edges[edgeId]

  if (!edge) return null

  return (
    <div className="space-y-5">
      {/* Edge info */}
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
        <span className="text-sm font-medium text-slate-700 truncate">{edge.label || edgeId}</span>
        <ArrowRight size={14} className="shrink-0 text-slate-400" />
        <span className="text-sm text-slate-500 truncate">{edge.next ?? 'terminal'}</span>
      </div>
    </div>
  )
}
