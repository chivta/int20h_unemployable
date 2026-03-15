# Project Plan — BetterMe INT20H

---

## 1. Project Overview

Web platform opened in an in-app browser (Instagram/Facebook ads). Users complete a DAG-based questionnaire; the system builds a personalized fitness offer. No app install required.

---

## 2. System Components

### 2.1 Admin FE — Visual DAG Editor
- Create/edit **Question nodes** (single-choice, multi-choice, input) and **Info page nodes** (message-only, no data collection)
- Create/delete edges between nodes
- Configure transition conditions/rules (visible branching logic)
- Save/load config via Admin BE API

### 2.2 Admin BE — Config Management
- Store and (optionally) version the DAG configuration
- Expose raw config (structure, texts, options, rules) — no page rendering
- Endpoints: `POST /api/admin/config`, `GET /api/admin/config`, `GET /api/admin/config/versions`

### 2.3 Content Delivery API
- `GET /api/config` — returns current active DAG config for User FE to render
- Stateless; just serves raw content

### 2.4 User FE — Quiz Rendering & Flow
- Opens in in-app browser
- Fetches DAG config from Content Delivery API
- Renders Question nodes and Info page nodes
- Collects answers, navigates graph according to transition rules
- Displays final personalized offer (offer + short "why" + CTA)

### 2.5 User BE — Session, Parameters & Offer Selection
- Stores per-user session/context
- Stores answers to questions
- Each answer can set or mutate user parameters (attributes) via edge actions (e.g. `goal = weight_loss`, `context = home`)
- By the end of the question graph, a full user parameter profile has been built
- On completion: runs the Decision Engine — applies rules/scoring to select the best-matching offer(s) from the catalog
- Returns the primary offer (+ optional addons like Offer 6 stress module) to User FE
- A single user path can result in **one or multiple offers** simultaneously

---

## 2.X Two-Phase Offer Decision Architecture

The process of determining the offer for a user is split into two phases:

**Phase 1 — Question Graph**
- Starts with broad, general questions
- Subsequent questions are context-sensitive — they branch based on previous answers
- Each answer can set or mutate user parameters (attributes) on the backend (e.g. `goal = weight_loss`, `context = home`)
- By the end of the graph, a full user parameter profile has been built

**Phase 2 — Decision Engine**
- Takes the accumulated user parameters as input
- Applies rules/scoring to select the best-matching offer(s) from the catalog
- Outputs the primary offer (+ optional addons like Offer 6 stress module) to User FE

---

## 3. DAG Model Requirements

- Directed Acyclic Graph — nodes + edges, no cycles
- Node types: **Question** (single/multi-choice/input) and **Info page** (message)
- Branching based on **multiple attributes simultaneously** (e.g. male, 25–40, running, knee injury)
- Answer options for the same question can differ based on prior answers
- Unlimited number of nodes and branches
- **Stress interceptor** pattern: cross-cutting rule (e.g. high stress → append Offer 6 to any final offer)

---

## 4. User Attributes (signals to collect)

| Attribute | Notes |
|-----------|-------|
| Age | age or age range |
| Gender | include "prefer not to say" option |
| Goal | weight loss / strength / endurance / flexibility / stress reduction |
| Context | home / gym / outdoor; equipment availability |
| Constraints | time available, schedule, injuries/limitations |
| Level | beginner / intermediate / advanced |
| Motivation & barriers | "why now", what's blocking (stress, fatigue, lack of time/discipline) |
| Preferences | intensity, format (short sessions, yoga, running, strength) |
| Self-reported wellbeing | stress / sleep / energy |

---

## 5. Offer Catalog

| # | Offer | Digital | Physical Kit |
|---|-------|---------|--------------|
| 1 | Weight Loss Starter (Home) — 4 weeks | Home weight loss plan (20–30 min) | Home Fat-Burn Kit (resistance bands, jump rope, shaker, electrolytes + snack) |
| 2 | Lean Strength Builder (Gym) | Gym strength + progression program | Gym Support Kit (wrist wraps, mini loop band, towel, electrolytes/protein snack) |
| 3 | Low-Impact Fat Burn | Low-impact plan (knee/back friendly) | Joint-Friendly Kit (knee sleeve, massage ball, mini loop bands, cooling patch) |
| 4 | Run Your First 5K (Outdoor) | 5K training (3×/week) | Runner Starter Kit (electrolytes, reflective armband, blister kit, running belt) |
| 5 | Yoga & Mobility (Home) | Yoga/mobility 10–25 min | Mobility Kit (travel yoga mat or strap, massage ball, mini foam roller) |
| 6 | Stress Reset Program | Breathing/meditation/anti-stress routines | Calm-Now Kit (eye mask, aroma roll-on, tea sticks, stress ball, reset card) |
| 7 | Quick Fit Micro-Workouts | 10–15 min daily workouts | Micro-Workout Kit (slider discs, mini loop bands, shaker, mini routine card) |

Multiple paths can lead to the same offer; one path can produce multiple offers (e.g. Offer 1 + Offer 6).

---

## 7. Evaluation Criteria

| Criterion | Weight | Focus |
|-----------|--------|-------|
| Functional requirements | 30% | DAG renders, branching works, offer selection works, data persistence, config delivered via API |
| Complex logic & universality | 20% | Nested branching, unlimited data points |
| UX/UI (Admin FE + User FE) | 20% | Intuitive graph editor, clear branch/rule visualization |
| Business value | 20% | Creative user paths that build narrative and increase conversion; not just form data collection |
| Code quality | 10% | Typing, structure, readability, rule engine tests, error handling, docs |

---

## 8. Delivery Requirements

- GitHub repo with code + detailed local run instructions (mandatory)
- README with problem description and decision rationale (big plus)
- Heroku deploy (optional but desired)

---
---

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
