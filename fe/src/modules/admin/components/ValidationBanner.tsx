import { X, AlertTriangle } from 'lucide-react'
import { useAppContext } from '../state/context'

export function ValidationBanner() {
  const { state, dispatch } = useAppContext()

  if (!state.showValidationBanner || state.validationWarnings.length === 0) return null

  return (
    <div className="shrink-0 border-b border-yellow-200 bg-yellow-50 px-4 py-2">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-yellow-600" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-yellow-800 mb-1">Validation warnings (file saved anyway):</p>
          <ul className="space-y-0.5">
            {state.validationWarnings.map((w, i) => (
              <li key={i} className="text-xs text-yellow-700">{w}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => dispatch({ type: 'DISMISS_VALIDATION' })}
          className="text-yellow-500 hover:text-yellow-700"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
