# Plan: Create merging.md — FE/BE Integration Guide

## Context
The frontend is a React + XYFlow DAG editor (admin panel) and the backend is a Go/Fiber REST API. Currently the frontend saves/loads via local JSON file (no API calls). The backend has full CRUD for config and a user quiz flow engine. This doc will bridge the gap by documenting integration steps.

The user specifically wants:
1. Instructions to integrate the **admin panel** with the backend
2. Instructions for **edge logic** — attaching actions to edges that `set` or `delta`-mutate the global `UserData` object on the backend

---

## What merging.md will cover

### 1. Data Model Mapping

Show how frontend types map to backend types:

**Frontend `DagNode` → Backend `Node`**
```
DagNode.id         → Node.ID
DagNode.text       → Node.Content
"question"         → Node.Type  (hardcoded)
DagNode.answers[]  → Node.Edges[]  (mapped via edges map)
```

**Frontend `DagEdge` → Backend `Edge`**
```
DagEdge.label      → Edge.MatchValue  (answer text = match value)
DagEdge.next       → Edge.ToNodeID
(new) DagEdge.actions[] → Edge.Actions[]
```

**Backend `UserData` fields:**
`age, gender, goal, context, constraints, level, motivation, preferences, wellbeing`

---

### 2. Admin Panel — Save & Load via API

**Save flow (`POST /api/admin/config`)**
- Convert `AppState` (frontend) → `Config` (backend format)
- Replace the `saveJson()` call in `Toolbar.tsx` with a `fetch` POST
- Body: `{ nodes: {...}, offers: {...}, layout: {...positions} }`

Conversion function (new util: `src/modules/admin/utils/apiTransform.ts`):
```ts
function toBackendConfig(state: AppState, positions): Config
function fromBackendConfig(config: Config): AppState
```

**Load flow (`GET /api/admin/config`)**
- On page load (or toolbar button), fetch config and dispatch `LOAD_STATE`
- Replace file-input handler in `Toolbar.tsx`

**Config versioning (`GET /api/admin/config/versions`)**
- Optional: list versions in toolbar dropdown

---

### 3. Edge Actions — Attaching UserData Mutations to Edges

The backend `Edge` has `Actions: []Action` where each action is:
```json
{ "type": "set" | "delta", "field_name": "goal", "value": "weight_loss" }
```

**Step A: Extend frontend type**
In `src/modules/admin/types/dag.ts`, add to `DagEdge`:
```ts
actions: Array<{ type: 'set' | 'delta'; fieldName: string; value: string | number }>
```

**Step B: Extend reducer**
In `src/modules/admin/state/actions.ts`, add action:
```ts
{ type: 'SET_EDGE_ACTIONS'; edgeId: string; actions: EdgeAction[] }
```
Handle in `reducer.ts` under the edges update path.

**Step C: Fetch field schema**
`GET /api/admin/field-schema` returns the list of valid `UserData` field names and their allowed values.
Fetch this on admin page load; store in context or local state.

**Step D: Add UI in `EdgePanel` (sidebar)**
When an edge is selected in the sidebar:
- Show list of existing actions
- "Add action" button → picks `field_name` from schema dropdown, `type` (set/delta), `value`
- Each action row: field selector + type toggle + value input + delete button

**Step E: Include actions in config export**
The `toBackendConfig()` transformer must include `actions` array in each edge.

---

### 4. API Base URL

Add `VITE_API_URL` env variable. All fetch calls prefix with `import.meta.env.VITE_API_URL`.

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/modules/admin/utils/apiTransform.ts` | New — conversion utils FE↔BE config formats |
| `src/modules/admin/types/dag.ts` | Add `actions` field to `DagEdge` |
| `src/modules/admin/state/actions.ts` | Add `SET_EDGE_ACTIONS` action |
| `src/modules/admin/state/reducer.ts` | Handle `SET_EDGE_ACTIONS` |
| `src/modules/admin/components/Toolbar.tsx` | Replace fileio with API calls |
| `src/modules/admin/components/sidebar/EdgePanel.tsx` | New or extend — action editor UI |
| `.env.local` (root) | Add `VITE_API_URL=http://localhost:3000` |

---

## The merging.md file itself

Will be written to the project root or `fe/` directory at:
`/home/dmytro/Desktop/int20h/int20h_unemployable/merging.md`

It will be structured as:
1. Prerequisites
2. Data model mapping tables
3. Step-by-step: Admin panel save/load integration
4. Step-by-step: Edge actions (set/mutate UserData)
5. API reference cheatsheet
6. Testing checklist

---

## Verification
- Admin save: POST /api/admin/config returns 200, GET /api/admin/config returns same data
- Edge actions: POST /api/user/process applies actions and UserData fields change in response
- Recommendations: GET /api/user/recommendations returns scored/filtered offers based on UserData
