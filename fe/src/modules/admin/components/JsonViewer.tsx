import { useAppContext } from '../state/context'

export function JsonViewer() {
  const { state } = useAppContext()
  return (
    <div className="h-48 border-t border-gray-200 overflow-auto">
      <pre className="p-3 text-[11px] leading-relaxed text-gray-700">
        {JSON.stringify(state.app, null, 2)}
      </pre>
    </div>
  )
}
