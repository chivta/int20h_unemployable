# DAG Question Flow Editor — Implementation TODO

## Data Structure
```json
{
  "dag": {
    "root": "q1",
    "nodes": { "q1": { "id": "q1", "text": "...", "answers": ["a1"] } },
    "edges": { "a1": { "id": "a1", "label": "...", "next": "q2", "weights": { "offer_starter": 1 } } }
  },
  "offers": { "offer_starter": { "id": "offer_starter", "name": "Starter plan" } },
  "meta": { "version": 1, "updatedAt": "...", "updatedBy": "admin@example.com" }
}
```

---

## Phase 1 — File Structure & Types

- [ ] Create `src/types/dag.ts` — define `DagNode`, `DagEdge`, `Offer`, `DagState`, `AppState`
- [ ] Create `src/types/ui.ts` — define `Position`, `SelectionState`, `SidebarMode`
- [ ] Create `src/utils/id.ts` — incrementing ID counter (`nextNodeId`, `nextEdgeId`)
- [ ] Create `src/utils/layout.ts` — BFS top-down layout returning `Record<string, Position>`
- [ ] Create `src/utils/validation.ts` — pre-save checks returning warning strings[]
- [ ] Create `src/utils/fileio.ts` — `loadJson(file): AppState`, `saveJson(state): void` (Blob download)

---

## Phase 2 — Reducer

- [ ] Create `src/state/actions.ts` — define discriminated union for all action types:
  - `SET_ROOT`, `LOAD_STATE`, `RESET`
  - `ADD_NODE`, `UPDATE_NODE_TEXT`, `DELETE_NODE`
  - `ADD_ANSWER`, `UPDATE_ANSWER_LABEL`, `SET_ANSWER_NEXT`, `SET_ANSWER_WEIGHT`, `DELETE_ANSWER`
  - `REORDER_ANSWERS` (drag-drop reorder of `node.answers` array)
  - `INSERT_NODE_ON_EDGE` (split edge: create qNew + aNew, rewire)
  - `ADD_OFFER`, `UPDATE_OFFER_NAME`, `DELETE_OFFER`
  - `SET_NODE_POSITION`, `RECOMPUTE_LAYOUT`
- [ ] Create `src/state/reducer.ts` — implement all action handlers
  - On `ADD_OFFER` → inject weight `0` into every existing edge
  - On `DELETE_OFFER` → remove key from every edge's weights
  - On `DELETE_NODE` → guard: reject if any edge points to this node
  - On `INSERT_NODE_ON_EDGE` → create qNew + aNew, rewire clicked edge, recompute layout
  - On `LOAD_STATE` / `RESET` → recompute layout
- [ ] Create `src/state/context.tsx` — `AppContext` + `AppProvider` wrapping `useReducer`

---

## Phase 3 — Canvas Renderer

- [ ] Create `src/components/Canvas.tsx`
  - `useEffect` to redraw on state change
  - Draw node rectangles (highlight selected)
  - Draw bezier curves node-bottom → next-node-top for each edge
  - Draw "+" button at bezier midpoint (circle overlay via absolute-positioned `<div>` or second canvas layer)
  - Hit-test on `mousedown`: node click → dispatch `SELECT_NODE`, edge "+" click → dispatch `SELECT_EDGE`, background → dispatch `DESELECT`
  - Derive positions from `state.positions` map

---

## Phase 4 — Sidebar Components

- [ ] Create `src/components/Sidebar.tsx` — container, conditionally renders one of three panels
- [ ] Create `src/components/sidebar/NodePanel.tsx`
  - Text input → `UPDATE_NODE_TEXT`
  - Answer list with drag handles → `REORDER_ANSWERS` on drop
  - Per-answer: label input, "next node" dropdown, weight inputs per offer
  - "Add answer" button → `ADD_ANSWER`
  - "Delete answer" button → `DELETE_ANSWER`
  - "Delete node" button (disabled if has incoming edges) → `DELETE_NODE`
- [ ] Create `src/components/sidebar/EdgeInsertPanel.tsx`
  - Text input for new node text
  - "Confirm" → `INSERT_NODE_ON_EDGE`
  - "Cancel" → `DESELECT`
- [ ] Collapsed state — sidebar hidden, canvas takes full width

---

## Phase 5 — Offers Panel

- [ ] Create `src/components/OffersPanel.tsx` (top bar or tab)
  - List all offers with inline name edit → `UPDATE_OFFER_NAME`
  - "Add offer" button (slug from name) → `ADD_OFFER`
  - "Delete offer" button → `DELETE_OFFER`

---

## Phase 6 — Toolbar

- [ ] Create `src/components/Toolbar.tsx`
  - "New" → `RESET`
  - "Load JSON" → file input → `LOAD_STATE`
  - "Save JSON" → validate → show warning banner if issues → download via `saveJson`
  - "Add node" → `ADD_NODE` at free canvas position

---

## Phase 7 — Validation Banner

- [ ] Create `src/components/ValidationBanner.tsx`
  - Dismissible banner shown after save attempt
  - Runs `validate(state)` checks:
    - Every node has ≥ 1 answer
    - `dag.root` exists in `nodes`
    - No edge `next` references a missing node ID

---

## Phase 8 — Wiring & Layout

- [ ] Create `src/App.tsx` — compose `AppProvider`, `Toolbar`, `OffersPanel`, `Canvas`, `Sidebar`
- [ ] Verify layout algorithm: BFS from root, assign `(col, depth)`, evenly space per row
- [ ] Ensure `positions` map updates after `ADD_NODE`, `INSERT_NODE_ON_EDGE`, `LOAD_STATE`, `RESET`
- [ ] "Add node" positions new node at a free offset (e.g. `{ x: 50, y: 50 + n*120 }`)

---

## Phase 9 — Polish & Edge Cases

- [ ] Terminal edges (`next: null`) — draw edge with no arrow or a terminal indicator
- [ ] Node with no incoming edges shows "Set as root" button in NodePanel
- [ ] Ensure ID counter never resets within session (store `nextId` in reducer state)
- [ ] IDs stable once created — never reassigned on load (load preserves existing IDs, counter starts above max found)
- [ ] `meta.updatedAt` set to `new Date().toISOString()` on save
- [ ] `meta.updatedBy` editable field (or hardcoded / prompt on first save)
