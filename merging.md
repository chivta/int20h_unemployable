# FE/BE Integration Guide

Frontend: React + XYFlow DAG editor (`fe/`)
Backend: Go/Fiber REST API (`be/`) running on `:8080`

---

## 1. Prerequisites

| What | Where |
|------|-------|
| Backend running | `cd be && go run ./cmd/server` |
| VITE_API_URL set | `fe/.env.local` → `VITE_API_URL=http://localhost:8080` |
| Frontend running | `cd fe && npm run dev` |

---

## 2. Data Model Mapping

### Node

| Frontend (`DagNode`) | Backend (`Node`) | Notes |
|----------------------|------------------|-------|
| `id` | `id` | same |
| `text` | `content` | |
| `"question"` | `type` | hardcoded |
| `answers[]` edge IDs | `edges[]` | exploded from node |

### Edge

| Frontend (`DagEdge`) | Backend (`Edge`) | Notes |
|----------------------|------------------|-------|
| `label` | `match_value` | answer text used for matching |
| `next` | `to_node_id` | target node ID |
| `actions[]` | `actions[]` | UserData mutations |

### EdgeAction

| Frontend (`EdgeAction`) | Backend (`Action`) | Notes |
|-------------------------|--------------------|-------|
| `type` | `type` | `"set"` or `"delta"` |
| `fieldName` (camelCase) | `field_name` (snake_case) | auto-converted |
| `value` | `value` | string or number |

### Offer

| Frontend (`Offer`) | Backend (`Offer`) |
|--------------------|-------------------|
| `id` | `id` |
| `name` | `name` |
| _(none)_ | `description`, `requirements[]` |

> **Note:** The frontend `weights` map on edges (used for scoring) and the backend `requirements[]` on offers represent a different scoring model. The current transformer does **not** convert weights → requirements. That mapping is left for a future iteration.

### UserData fields (backend)

| Field | Type | Allowed values |
|-------|------|----------------|
| `Age` | int | any integer |
| `Gender` | enum | `male`, `female`, `unspecified` |
| `Goal` | enum | `weight_loss`, `strength`, `endurance`, `flexibility`, `stress_relief` |
| `Context` | enum | `home`, `gym`, `outdoor` |
| `Constraints` | enum | `time`, `injury`, `none` |
| `Level` | enum | `beginner`, `intermediate`, `advanced` |
| `Motivation` | enum | `health`, `appearance`, `energy` |
| `Preferences` | enum | `cardio`, `strength`, `yoga` |
| `Wellbeing` | enum | `high`, `mid`, `low` |

Field schema is served live by `GET /api/admin/field-schema`.

---

## 3. Admin Panel — Save & Load via API

### 3a. Conversion utilities

File: `fe/src/modules/admin/utils/apiTransform.ts`

```ts
// Convert frontend state → backend config (for POST /api/admin/config)
toBackendConfig(state: AppState, positions: Record<string, Position>): BackendConfig

// Convert backend config → frontend state (for GET /api/admin/config)
fromBackendConfig(config: BackendConfig): { state: AppState; positions: Record<string, Position> }
```

### 3b. Save flow

**Toolbar button → Save**

```
AppState + positions
  ↓ toBackendConfig()
BackendConfig { nodes, offers, layout }
  ↓ POST /api/admin/config
{ status: "success", config_version: N }
```

The backend overwrites all nodes and offers, then stores a version snapshot in Postgres (if `DATABASE_URL` is set).

### 3c. Load flow

**Toolbar button → Load**

```
GET /api/admin/config
  ↓ fromBackendConfig()
AppState + positions
  ↓ dispatch LOAD_STATE + SET_NODE_POSITION per node
UI re-renders
```

### 3d. File import/export (local fallback)

The **Import** button accepts either:
- A raw `AppState` JSON (legacy `flow.json` format, has `dag` key)
- A `BackendConfig` JSON (has `nodes` key — the same format as what `Export` produces)

The **Export** button downloads the current state as a `BackendConfig` JSON (same format sent to the server).

---

## 4. Edge Actions — Attaching UserData Mutations

When a user selects an answer (traverses an edge), the backend applies the edge's `actions` array to the user's `UserData` object before advancing to the next node.

### 4a. Frontend type

```ts
// fe/src/modules/admin/types/dag.ts
interface EdgeAction {
  type: 'set' | 'delta'
  fieldName: string       // camelCase in FE
  value: string | number
}

interface DagEdge {
  // ...existing fields...
  actions: EdgeAction[]
}
```

### 4b. Redux-style action

```ts
// fe/src/modules/admin/state/actions.ts
{ type: 'SET_EDGE_ACTIONS'; edgeId: string; actions: EdgeAction[] }
```

Handled in `reducer.ts` — replaces the full `actions` array on the edge.

### 4c. Edge action editor UI

When an edge is selected in the sidebar, the **EdgePanel** component appears showing:
- List of existing actions
- **Add action** button (disabled when field schema is unavailable)
- Per action row: field selector (from `/api/admin/field-schema`), type toggle (`set`/`delta`), value input (dropdown for enum fields, number input for int fields)
- Delete button per row

Field schema is fetched once on panel mount from `GET /api/admin/field-schema`.

### 4d. Serialization

`toBackendConfig()` maps `EdgeAction.fieldName` (camelCase) → `Action.field_name` (snake_case) automatically. `fromBackendConfig()` does the reverse.

### 4e. Backend action semantics

| type | behaviour |
|------|-----------|
| `set` | `userData.FieldName = value` (direct assignment) |
| `delta` | `userData.FieldName += value` (numeric add; booleans toggle) |

---

## 5. API Reference Cheatsheet

All endpoints are prefixed with `VITE_API_URL` (default `http://localhost:8080`).

### Admin endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/config` | Export full config (nodes + offers + layout) |
| `POST` | `/api/admin/config` | Import/overwrite full config |
| `GET` | `/api/admin/config/versions` | List all saved config versions |
| `GET` | `/api/admin/config/versions/:n` | Get specific version |
| `GET` | `/api/admin/field-schema` | UserData field names + allowed values |
| `GET` | `/api/admin/action-types` | Registered action type names (`set`, `delta`) |
| `GET` | `/api/admin/nodes` | List all nodes |
| `POST` | `/api/admin/nodes` | Create/update a node |
| `DELETE` | `/api/admin/nodes?id=<id>` | Delete a node |
| `GET` | `/api/admin/offers` | List all offers |
| `POST` | `/api/admin/offers` | Create/update an offer |
| `DELETE` | `/api/admin/offers?id=<id>` | Delete an offer |

### User endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/user/process` | Get current question + user state |
| `POST` | `/api/user/process` | Submit answer `{ "answer": "<match_value>" }` |
| `POST` | `/api/user/reset` | Reset session to root node |
| `GET` | `/api/user/recommendations` | Get scored/filtered offers |
| `POST` | `/api/user/purchase` | Mark offer as purchased |

### Config JSON shape (POST /api/admin/config)

```json
{
  "nodes": {
    "q1": {
      "id": "q1",
      "type": "question",
      "content": "What is your primary fitness goal?",
      "edges": [
        {
          "match_value": "Lose weight",
          "to_node_id": "q2",
          "actions": [
            { "type": "set", "field_name": "goal", "value": "weight_loss" }
          ]
        }
      ]
    }
  },
  "offers": {
    "starter": {
      "id": "starter",
      "name": "Starter Plan",
      "description": "",
      "requirements": []
    }
  },
  "layout": {
    "q1": { "x": 80, "y": 80 }
  }
}
```

---

## 6. Testing Checklist

### Admin save/load
- [ ] Click **Save** → `POST /api/admin/config` returns `200` with `status: "success"`
- [ ] Click **Load** → `GET /api/admin/config` returns the same data that was saved
- [ ] Canvas re-renders with correct node positions from `layout`
- [ ] **Export** downloads a valid JSON matching the backend config shape
- [ ] **Import** accepts the exported JSON and loads it without errors

### Edge actions
- [ ] Select an edge in the canvas (click the + button on a node answer)
- [ ] EdgePanel loads field schema from `/api/admin/field-schema`
- [ ] Adding an action row persists via `SET_EDGE_ACTIONS` dispatch
- [ ] Enum fields show a dropdown; int fields show a number input
- [ ] Saving config includes `actions` in the posted edge objects

### User flow with actions
- [ ] `POST /api/user/process` with an answer that has `set` actions → `UserData` fields change in the response
- [ ] `POST /api/user/process` with a `delta` action on `Age` → age increments
- [ ] `GET /api/user/recommendations` returns offers scored/filtered against the mutated `UserData`
