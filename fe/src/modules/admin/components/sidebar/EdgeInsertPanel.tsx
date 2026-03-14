import { useState } from 'react'
import { useAppContext } from '../../state/context'
import { Button } from '../../../../shared/components/Button'
import { Label } from '../../../../shared/components/Label'

export function EdgeInsertPanel({ edgeId }: { edgeId: string }) {
  const { state, dispatch } = useAppContext()
  const [text, setText] = useState('')
  const edge = state.app.dag.edges[edgeId]

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Insert a new question node on answer <strong>{edge?.label ?? edgeId}</strong>.
      </p>
      <div>
        <Label>New node question text</Label>
        <textarea
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
          rows={3}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter question text…"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => {
            dispatch({ type: 'INSERT_NODE_ON_EDGE', edgeId, text })
            setText('')
          }}
        >
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => dispatch({ type: 'DESELECT' })}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
