import { useState } from 'react'
import { Trash2, Plus, Pencil, Check, X } from 'lucide-react'
import { useAppContext } from '../state/context'
import { Button } from '../../../shared/components/Button'

export function OffersPanel() {
  const { state, dispatch } = useAppContext()
  const offers = Object.values(state.app.offers)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    dispatch({ type: 'ADD_OFFER', name: newName.trim() })
    setNewName('')
  }

  const startEdit = (id: string, name: string) => {
    setEditing(id)
    setEditValue(name)
  }

  const commitEdit = (id: string) => {
    if (editValue.trim()) dispatch({ type: 'UPDATE_OFFER_NAME', offerId: id, name: editValue.trim() })
    setEditing(null)
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2">
      <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Offers:</span>

      <div className="flex flex-1 flex-wrap gap-2">
        {offers.map(offer => (
          <div key={offer.id} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs">
            {editing === offer.id ? (
              <>
                <input
                  className="w-24 text-xs border-none outline-none"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(offer.id); if (e.key === 'Escape') setEditing(null) }}
                  autoFocus
                />
                <button onClick={() => commitEdit(offer.id)} className="text-green-600 hover:text-green-700"><Check size={11} /></button>
                <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
              </>
            ) : (
              <>
                <span className="text-gray-700">{offer.name}</span>
                <span className="text-gray-400 font-mono text-[9px]">({offer.id})</span>
                <button onClick={() => startEdit(offer.id, offer.name)} className="text-gray-400 hover:text-blue-500"><Pencil size={10} /></button>
                <button onClick={() => dispatch({ type: 'DELETE_OFFER', offerId: offer.id })} className="text-gray-400 hover:text-red-500"><Trash2 size={10} /></button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <input
          className="rounded border border-gray-300 px-2 py-0.5 text-xs w-32 focus:border-blue-500 focus:outline-none"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="New offer name"
        />
        <Button size="sm" variant="ghost" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus size={12} />
        </Button>
      </div>
    </div>
  )
}
