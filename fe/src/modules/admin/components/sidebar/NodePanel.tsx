import { useRef } from 'react'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { useAppContext } from '../../state/context'
import { Button } from '../../../../shared/components/Button'
import { Input } from '../../../../shared/components/Input'
import { Label } from '../../../../shared/components/Label'

export function NodePanel({ nodeId }: { nodeId: string }) {
  const { state, dispatch } = useAppContext()
  const node = state.app.dag.nodes[nodeId]
  const offers = Object.values(state.app.offers)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  if (!node) return null

  const hasIncoming = Object.values(state.app.dag.edges).some(e => e.next === nodeId)

  const handleDragStart = (i: number) => { dragItem.current = i }
  const handleDragEnter = (i: number) => { dragOver.current = i }
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return
    if (dragItem.current === dragOver.current) return
    const newAnswers = [...node.answers]
    const [moved] = newAnswers.splice(dragItem.current, 1)
    newAnswers.splice(dragOver.current, 0, moved)
    dispatch({ type: 'REORDER_ANSWERS', nodeId, answers: newAnswers })
    dragItem.current = null
    dragOver.current = null
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Question text</Label>
        <textarea
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
          rows={3}
          value={node.text}
          onChange={e => dispatch({ type: 'UPDATE_NODE_TEXT', nodeId, text: e.target.value })}
          placeholder="Enter question text…"
        />
      </div>

      <div>
        <Label>Question type</Label>
        <div className="mt-1 flex rounded border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_QUESTION_TYPE', nodeId, questionType: 'single' })}
            className={[
              'flex-1 py-1 text-xs font-medium transition-colors',
              (node.questionType ?? 'single') === 'single'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            Single choice
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_QUESTION_TYPE', nodeId, questionType: 'multi' })}
            className={[
              'flex-1 py-1 text-xs font-medium transition-colors border-l border-gray-300',
              (node.questionType ?? 'single') === 'multi'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            Multi choice
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label>Answers</Label>
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'ADD_ANSWER', nodeId })}>
            <Plus size={12} /> Add
          </Button>
        </div>

        {/* Next question selector for multi-choice nodes */}
        {(node.questionType ?? 'single') === 'multi' && (
          <div className="mb-2">
            <label className="text-[10px] text-gray-500">Next question</label>
            <select
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              value={node.nextNodeId ?? ''}
              onChange={e => dispatch({ type: 'SET_NODE_NEXT', nodeId, nextNodeId: e.target.value || null })}
            >
              <option value="">— terminal —</option>
              {Object.values(state.app.dag.nodes)
                .filter(n => n.id !== nodeId)
                .map(n => (
                  <option key={n.id} value={n.id}>{n.id}: {n.text.slice(0, 30)}</option>
                ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          {node.answers.map((edgeId, i) => {
            const edge = state.app.dag.edges[edgeId]
            if (!edge) return null
            return (
              <div
                key={edgeId}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragEnd={handleDragEnd}
                onDragOver={e => e.preventDefault()}
                className="rounded border border-gray-200 bg-gray-50 p-2 cursor-grab"
              >
                <div className="mb-1 flex items-center gap-1">
                  <GripVertical size={12} className="text-gray-400 shrink-0" />
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">Answer {i + 1}</span>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_ANSWER', edgeId })}
                    className="ml-auto text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                <Input
                  value={edge.label}
                  onChange={e => dispatch({ type: 'UPDATE_ANSWER_LABEL', edgeId, label: e.target.value })}
                  placeholder="Answer label"
                  className="mb-1"
                />

                {/* Next node selector — hidden for multi-choice (uses node-level nextNodeId instead) */}
                {(node.questionType ?? 'single') === 'single' && (
                  <div className="mb-1">
                    <label className="text-[10px] text-gray-500">Next node</label>
                    <select
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      value={edge.next ?? ''}
                      onChange={e => dispatch({ type: 'SET_ANSWER_NEXT', edgeId, next: e.target.value || null })}
                    >
                      <option value="">— terminal —</option>
                      {Object.values(state.app.dag.nodes)
                        .filter(n => n.id !== nodeId)
                        .map(n => (
                          <option key={n.id} value={n.id}>{n.id}: {n.text.slice(0, 30)}</option>
                        ))}
                    </select>
                  </div>
                )}

                {offers.length > 0 && (
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-gray-500">Weights</label>
                    {offers.map(offer => (
                      <div key={offer.id} className="flex items-center gap-2">
                        <span className="w-24 truncate text-[10px] text-gray-600">{offer.name}</span>
                        <input
                          type="number"
                          className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                          value={edge.weights[offer.id] ?? 0}
                          onChange={e => dispatch({ type: 'SET_ANSWER_WEIGHT', edgeId, offerId: offer.id, weight: parseInt(e.target.value, 10) || 0 })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-1 border-t border-gray-200 pt-3">
        {!hasIncoming && state.app.dag.root !== nodeId && state.app.dag.end !== nodeId && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => dispatch({ type: 'SET_ROOT', nodeId })}
          >
            Set as root
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="w-full text-red-600 hover:bg-red-50 border-red-200"
          onClick={() => dispatch({ type: 'DELETE_NODE', nodeId })}
          disabled={hasIncoming || nodeId === state.app.dag.root || nodeId === state.app.dag.end}
          title={
            nodeId === state.app.dag.root
              ? 'Cannot delete: this is the root node'
              : nodeId === state.app.dag.end
                ? 'Cannot delete: this is the end node'
                : hasIncoming
                  ? 'Cannot delete: other answers point to this node'
                  : undefined
          }
        >
          <Trash2 size={12} /> Delete node
        </Button>
      </div>
    </div>
  )
}
