import { useState, useEffect } from 'react'
import { Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../../../shared/components/Button'

const API_URL = import.meta.env.VITE_API_URL ?? ''

interface Requirement {
  field_name: string
  match_value: string
  is_obligatory: boolean
  score: number
}

interface Offer {
  id: string
  name: string
  description: string
  requirements: Requirement[]
}

type FieldSchema = Record<string, { type: string; options?: string[] }>

function emptyOffer(): Offer {
  return { id: '', name: '', description: '', requirements: [] }
}

function emptyReq(): Requirement {
  return { field_name: '', match_value: '', is_obligatory: false, score: 5 }
}

interface OfferFormProps {
  offer: Offer
  schema: FieldSchema
  onChange: (o: Offer) => void
  onSave: () => void
  onCancel: () => void
  isNew: boolean
  saving: boolean
}

function OfferForm({ offer, schema, onChange, onSave, onCancel, isNew, saving }: OfferFormProps) {
  function setField<K extends keyof Offer>(k: K, v: Offer[K]) {
    onChange({ ...offer, [k]: v })
  }

  function setReq(i: number, r: Requirement) {
    const reqs = offer.requirements.map((x, j) => (j === i ? r : x))
    onChange({ ...offer, requirements: reqs })
  }

  function addReq() {
    onChange({ ...offer, requirements: [...offer.requirements, emptyReq()] })
  }

  function removeReq(i: number) {
    onChange({ ...offer, requirements: offer.requirements.filter((_, j) => j !== i) })
  }

  const fieldNames = Object.keys(schema)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ID</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            value={offer.id}
            onChange={e => setField('id', e.target.value)}
            disabled={!isNew}
            placeholder="offer_1"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={offer.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="Offer name"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          value={offer.description}
          onChange={e => setField('description', e.target.value)}
          placeholder="Describe this offer…"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Requirements</span>
          <button
            onClick={addReq}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <Plus size={12} /> Add
          </button>
        </div>

        {offer.requirements.length === 0 && (
          <p className="text-xs text-gray-400 italic">No requirements — offer always matches.</p>
        )}

        <div className="flex flex-col gap-2">
          {offer.requirements.map((req, i) => {
            const fieldOpts = fieldNames
            const valueOpts = schema[req.field_name]?.options ?? []
            return (
              <div key={i} className="rounded border border-gray-200 bg-gray-50 p-3 grid grid-cols-[1fr_1fr_80px_60px_28px] gap-2 items-center">
                <select
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={req.field_name}
                  onChange={e => setReq(i, { ...req, field_name: e.target.value, match_value: '' })}
                >
                  <option value="">Field…</option>
                  {fieldOpts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                {valueOpts.length > 0 ? (
                  <select
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={req.match_value}
                    onChange={e => setReq(i, { ...req, match_value: e.target.value })}
                  >
                    <option value="">Value…</option>
                    {valueOpts.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={req.match_value}
                    onChange={e => setReq(i, { ...req, match_value: e.target.value })}
                    placeholder="value"
                  />
                )}

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={req.score}
                    min={0}
                    onChange={e => setReq(i, { ...req, score: Number(e.target.value) })}
                  />
                </div>

                <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none justify-center">
                  <input
                    type="checkbox"
                    checked={req.is_obligatory}
                    onChange={e => setReq(i, { ...req, is_obligatory: e.target.checked })}
                    className="rounded"
                  />
                  Req
                </label>

                <button onClick={() => removeReq(i)} className="text-gray-400 hover:text-red-500 flex items-center justify-center">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
        {offer.requirements.length > 0 && (
          <p className="mt-1 text-xs text-gray-400">Columns: Field · Value · Score · Required · Delete</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} disabled={saving || !offer.id.trim() || !offer.name.trim()}>
          {saving ? 'Saving…' : isNew ? 'Create' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}

interface Props {
  onClose: () => void
}

export function OffersModal({ onClose }: Props) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [schema, setSchema] = useState<FieldSchema>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Offer | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/admin/offers`).then(r => r.json()),
      fetch(`${API_URL}/api/admin/field-schema`).then(r => r.json()),
    ])
      .then(([offersData, schemaData]) => {
        setOffers(Array.isArray(offersData) ? offersData : [])
        setSchema(schemaData ?? {})
      })
      .catch(() => setError('Failed to load offers'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setOffers(prev =>
        isNew
          ? [...prev, editing]
          : prev.map(o => (o.id === editing.id ? editing : o))
      )
      setEditing(null)
    } catch (e) {
      setError(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete offer "${id}"?`)) return
    try {
      const res = await fetch(`${API_URL}/api/admin/offers?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setOffers(prev => prev.filter(o => o.id !== id))
      if (editing?.id === id) setEditing(null)
    } catch (e) {
      setError(`Delete failed: ${(e as Error).message}`)
    }
  }

  function startNew() {
    setEditing(emptyOffer())
    setIsNew(true)
  }

  function startEdit(offer: Offer) {
    setEditing({ ...offer, requirements: offer.requirements ? [...offer.requirements] : [] })
    setIsNew(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[88vh] flex overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Left: offer list */}
        <div className="w-72 shrink-0 border-r border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="font-semibold text-gray-800 text-sm">Offers</span>
            <button onClick={startNew} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              <Plus size={13} /> New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <p className="p-4 text-xs text-gray-400">Loading…</p>}
            {!loading && offers.length === 0 && (
              <p className="p-4 text-xs text-gray-400 italic">No offers yet.</p>
            )}
            {offers.map(offer => (
              <div
                key={offer.id}
                className={[
                  'border-b border-gray-100 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
                  editing?.id === offer.id && !isNew ? 'bg-blue-50 border-l-2 border-l-blue-400' : '',
                ].join(' ')}
                onClick={() => startEdit(offer)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{offer.name || offer.id}</p>
                    <p className="text-xs text-gray-400">{offer.id}</p>
                    {offer.requirements?.length > 0 && (
                      <p className="text-xs text-gray-400">{offer.requirements.length} req{offer.requirements.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(offer.id) }}
                    className="shrink-0 text-gray-300 hover:text-red-500 mt-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: edit form */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="font-semibold text-gray-800 text-sm">
              {editing ? (isNew ? 'New offer' : `Edit — ${editing.id}`) : 'Select an offer'}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-100">{error}</p>
            )}
            {editing ? (
              <OfferForm
                offer={editing}
                schema={schema}
                onChange={setEditing}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
                isNew={isNew}
                saving={saving}
              />
            ) : (
              <p className="text-sm text-gray-400 italic mt-8 text-center">
                Select an offer from the list to edit it, or click <strong>New</strong> to create one.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
