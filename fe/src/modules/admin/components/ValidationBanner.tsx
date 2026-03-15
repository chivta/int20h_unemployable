import { X, AlertTriangle, XCircle } from 'lucide-react'
import { useAppContext } from '../state/context'

export function ValidationBanner() {
  const { state, dispatch } = useAppContext()

  if (!state.showValidationBanner || state.validationWarnings.length === 0) return null

  // Errors block save; warnings are informational. We distinguish by whether save was blocked.
  const isBlocked = state.validationWarnings.some(w =>
    w.includes('stuck') || w.includes('Cycle') || w.includes('doesn\'t exist') ||
    w.includes('duplicate') || w.includes('empty label') || w.includes('unknown field') ||
    w.includes('No root') || w.includes('no nodes')
  )

  return (
    <div className={`shrink-0 border-b px-4 py-2 ${isBlocked ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
      <div className="flex items-start gap-2">
        {isBlocked
          ? <XCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
          : <AlertTriangle size={14} className="mt-0.5 shrink-0 text-yellow-600" />
        }
        <div className="flex-1">
          <p className={`text-xs font-semibold mb-1 ${isBlocked ? 'text-red-800' : 'text-yellow-800'}`}>
            {isBlocked ? 'Save blocked — fix these errors:' : 'Warnings (saved anyway):'}
          </p>
          <ul className="space-y-0.5">
            {state.validationWarnings.map((w, i) => (
              <li key={i} className={`text-xs ${isBlocked ? 'text-red-700' : 'text-yellow-700'}`}>{w}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => dispatch({ type: 'DISMISS_VALIDATION' })}
          className={isBlocked ? 'text-red-400 hover:text-red-600' : 'text-yellow-500 hover:text-yellow-700'}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
