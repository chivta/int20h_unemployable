import { useState, useEffect, useRef } from 'react'
import { FileJson, Save, Play, ClipboardPaste, Tag, Loader2, Copy, Check } from 'lucide-react'
import { useNavigate, useBlocker } from '@tanstack/react-router'
import { useAppContext } from '../state/context'
import { Button } from '../../../shared/components/Button'
import { toBackendConfig, fromBackendConfig } from '../utils/apiTransform'
import initConfig from '../../../../init.json'
import { validate } from '../utils/validation'
import { OffersModal } from './OffersModal'

const API_URL = import.meta.env.VITE_API_URL ?? ''

function CopyJsonButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(getText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export function Toolbar() {
  const { state, dispatch } = useAppContext()
  const navigate = useNavigate()
  const isDirty = state.isDirty
  const [showJson, setShowJson] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [showOffers, setShowOffers] = useState(false)
  const [versions, setVersions] = useState<{ version: number; created_at: string }[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [navigating, setNavigating] = useState(false)
  const skipBlockerRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  useBlocker({
    blockerFn: (args) => {
      if (skipBlockerRef.current) return false
      if (!args?.next?.location?.pathname) return window.confirm('You have unsaved changes. Leave anyway?')
      if (args.next.location.pathname === '/quiz') return false
      return window.confirm('You have unsaved changes. Leave anyway?')
    },
    condition: isDirty,
  })

  useEffect(() => {
    async function init() {
      if (initialLoadDoneRef.current) return
      initialLoadDoneRef.current = true
      if (Object.keys(state.app.dag.nodes).length > 0) return
      let loadedFromBackend = false
      try {
        const r = await fetch(`${API_URL}/api/admin/config/versions`)
        if (r.ok) {
          const data = await r.json()
          const list: { version: number; created_at: string }[] = Array.isArray(data) ? data : []
          setVersions(list)
          if (list.length > 0) {
            const latest = list[0]
            setSelectedVersion(String(latest.version))
            await handleLoadVersion(String(latest.version))
            loadedFromBackend = true
          }
        }
      } catch {}
      if (!loadedFromBackend) {
        const { state: loaded, positions } = fromBackendConfig(initConfig as Parameters<typeof fromBackendConfig>[0])
        dispatch({ type: 'LOAD_STATE', state: loaded })
        for (const [nodeId, pos] of Object.entries(positions)) {
          dispatch({ type: 'SET_NODE_POSITION', nodeId, position: pos })
        }
      }
    }
    init()
  }, [])

  async function handleLoadVersion(version: string) {
    if (!version) return
    try {
      const res = await fetch(`${API_URL}/api/admin/config/versions/${version}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // versions endpoint returns { version, config, created_at } where config is the raw config object
      const cfg = data.config ?? data
      const { state: loaded, positions } = fromBackendConfig(cfg)
      dispatch({ type: 'LOAD_STATE', state: loaded })
      for (const [nodeId, pos] of Object.entries(positions)) {
        dispatch({ type: 'SET_NODE_POSITION', nodeId, position: pos })
      }
      flash(`Loaded version ${version}`)
    } catch (e) {
      flash(`Failed to load version: ${(e as Error).message}`)
    }
  }

  function flash(msg: string) {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(null), 3000)
  }

  async function handleSave() {
    const { errors, warnings } = validate(state.app)
    if (errors.length > 0) {
      dispatch({ type: 'SET_VALIDATION', warnings: errors })
      flash(`Save blocked — ${errors.length} error${errors.length > 1 ? 's' : ''} found`)
      return
    }
    if (warnings.length > 0) {
      dispatch({ type: 'SET_VALIDATION', warnings })
    }
    setSaving(true)
    try {
      const body = toBackendConfig(state.app, state.positions)
      const res = await fetch(`${API_URL}/api/admin/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      dispatch({ type: 'MARK_SAVED' })
      flash('Saved to backend')
      // refresh version list
      fetch(`${API_URL}/api/admin/config/versions`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setVersions(Array.isArray(data) ? data : []))
        .catch(() => {})
    } catch (e) {
      flash(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }


  async function handlePasteImport() {
    setPasteError('')
    let parsed: unknown
    try {
      parsed = JSON.parse(pasteText)
    } catch {
      setPasteError('Invalid JSON — check syntax and try again.')
      return
    }
    if (typeof parsed !== 'object' || parsed === null || !('nodes' in parsed)) {
      setPasteError('JSON must have a "nodes" field at the root.')
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const cfg = parsed as Parameters<typeof fromBackendConfig>[0]
      const { state: loaded, positions } = fromBackendConfig(cfg)
      dispatch({ type: 'LOAD_STATE', state: loaded })
      for (const [nodeId, pos] of Object.entries(positions)) {
        dispatch({ type: 'SET_NODE_POSITION', nodeId, position: pos })
      }
      setShowPaste(false)
      setPasteText('')
      flash('Config imported and saved')
    } catch (e) {
      setPasteError(`Save failed: ${(e as Error).message}`)
    }
  }



  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <h1 className="text-base font-semibold text-gray-800 mr-2">Flow Editor</h1>

        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save'}
        </Button>

        {versions.length > 0 && (
          <select
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedVersion}
            onChange={e => { setSelectedVersion(e.target.value); handleLoadVersion(e.target.value) }}
          >
            <option value="">Version…</option>
            {versions.map(v => (
              <option key={v.version} value={String(v.version)}>
                v{v.version} — {new Date(v.created_at).toLocaleString()}
              </option>
            ))}
          </select>
        )}

        <Button size="sm" variant="outline" onClick={() => setShowJson(true)}>
          <FileJson size={14} /> View JSON
        </Button>

        <Button size="sm" variant="outline" onClick={() => { setPasteText(''); setPasteError(''); setShowPaste(true) }}>
          <ClipboardPaste size={14} /> Paste JSON
        </Button>

        <Button size="sm" variant="outline" onClick={() => setShowOffers(true)}>
          <Tag size={14} /> Offers
        </Button>

        <Button
          size="sm"
          variant="default"
          disabled={navigating}
          onClick={() => {
            skipBlockerRef.current = true
            setNavigating(true)
            navigate({ to: '/quiz', state: { localConfig: toBackendConfig(state.app, state.positions) } })
            setTimeout(() => setNavigating(false), 500)
          }}
        >
          {navigating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {navigating ? 'Opening…' : 'Test Quiz'}
        </Button>

        {statusMsg && (
          <span className="ml-2 text-xs text-gray-500 italic">{statusMsg}</span>
        )}
      </div>

      {showPaste && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPaste(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-800">Paste JSON Config</span>
              <button
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                onClick={() => setShowPaste(false)}
              >×</button>
            </div>
            <textarea
              className="flex-1 p-4 text-xs font-mono text-gray-700 resize-none focus:outline-none min-h-[400px]"
              placeholder='{ "root": "q1", "nodes": { ... }, "offers": { ... } }'
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteError('') }}
              spellCheck={false}
            />
            {pasteError && (
              <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{pasteError}</p>
            )}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowPaste(false)}>Cancel</Button>
              <Button onClick={handlePasteImport} disabled={!pasteText.trim()}>
                Import & Save to DB
              </Button>
            </div>
          </div>
        </div>
      )}

      {showOffers && <OffersModal onClose={() => setShowOffers(false)} />}

      {showJson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowJson(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-800">Current App JSON</span>
              <div className="flex items-center gap-2">
                <CopyJsonButton getText={() => JSON.stringify(toBackendConfig(state.app, state.positions), null, 2)} />
                <button
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  onClick={() => setShowJson(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <pre className="overflow-auto p-4 text-xs text-gray-700 font-mono flex-1">
              {JSON.stringify(toBackendConfig(state.app, state.positions), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  )
}
