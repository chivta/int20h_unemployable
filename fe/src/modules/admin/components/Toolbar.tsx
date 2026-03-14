import { useRef } from 'react'
import { PlusCircle, Upload, Download, RotateCcw, RefreshCw } from 'lucide-react'
import { useAppContext } from '../state/context'
import { Button } from '../../../shared/components/Button'
import { loadJson, saveJson } from '../utils/fileio'
import { validate } from '../utils/validation'

export function Toolbar() {
  const { state, dispatch } = useAppContext()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const loaded = await loadJson(file)
      dispatch({ type: 'LOAD_STATE', state: loaded })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load file')
    }
    e.target.value = ''
  }

  const handleSave = () => {
    const warnings = validate(state.app)
    dispatch({ type: 'SET_VALIDATION', warnings })
    const saved = {
      ...state.app,
      meta: { ...state.app.meta, updatedAt: new Date().toISOString() },
    }
    saveJson(saved)
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
      <h1 className="text-base font-semibold text-gray-800 mr-2">Flow Editor</h1>

      <Button size="sm" onClick={() => dispatch({ type: 'ADD_NODE' })}>
        <PlusCircle size={14} /> Add Node
      </Button>

      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
        <Upload size={14} /> Load JSON
      </Button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleLoad} />

      <Button size="sm" variant="outline" onClick={handleSave}>
        <Download size={14} /> Save JSON
      </Button>

      <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'RECOMPUTE_LAYOUT' })} title="Re-run layout">
        <RefreshCw size={14} />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="ml-auto text-red-600 hover:bg-red-50"
        onClick={() => { if (confirm('Reset to default? All changes will be lost.')) dispatch({ type: 'RESET' }) }}
      >
        <RotateCcw size={14} /> Reset
      </Button>
    </div>
  )
}
