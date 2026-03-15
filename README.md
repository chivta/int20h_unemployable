# Fitness DAG Application

A full-stack fitness questionnaire application powered by a DAG (Directed Acyclic Graph) decision engine. Users answer adaptive questions and receive personalized fitness program recommendations based on their profile.

## How It Works

1. User is guided through a branching questionnaire (modelled as a DAG)
2. Each answer sets user-profile fields (goal, level, constraints, etc.)
3. After completing the quiz, a scoring engine ranks available fitness offers against the user profile
4. The best-matching offer is presented as a recommendation

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Language | Go 1.21 |
| Web Framework | [Fiber v2](https://gofiber.io/) |
| ORM | [GORM v2](https://gorm.io/) |
| Database | PostgreSQL 16 |
| UUID | google/uuid |
| CLI | Cobra |

### Frontend

| Layer | Technology |
|---|---|
| Language | TypeScript 5.9 |
| Framework | React 19 |
| Bundler | Vite 7 |
| Routing | TanStack Router |
| State | Zustand |
| Graph editor | React Flow (XYFlow) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker | Container images for backend and frontend |
| Docker Compose | Multi-service orchestration |
| PostgreSQL 16 | Persistent session & config storage |

---

## Project Structure

```
.
├── be/                   # Go backend
│   ├── cmd/server/       # HTTP server entry point (main.go)
│   ├── cmd/cli/          # CLI simulator (main.go + simulate.go)
│   └── internal/
│       ├── actions/      # User-state mutation actions (e.g. "set")
│       ├── database/     # DB interface + GORM/PostgreSQL implementation
│       ├── engine/       # Recommendation scoring algorithm
│       ├── handlers/     # HTTP request handlers (user, admin, test)
│       ├── models/       # Domain models (DAG, User, Offer, Config)
│       └── store/        # Thread-safe in-memory store
├── fe/                   # React/TypeScript frontend
│   └── src/
│       ├── modules/admin/  # DAG editor (node/edge/offer management)
│       └── modules/user/   # User-facing quiz interface
├── docker-compose.yml
├── test.json             # Example DAG + offer configuration
└── parameters.md         # User fields and offer scoring rules
```

---

## API Reference

### User Endpoints (`/api/user`)

| Method | Path | Description |
|---|---|---|
| GET | `/process` | Get current node and accumulated user data |
| POST | `/process` | Submit answer, advance to next node |
| POST | `/reset` | Reset session to start |
| GET | `/recommendations` | Get ranked offer recommendations |
| POST | `/purchase` | Mark session as purchased |

### Admin Endpoints (`/api/admin`)

| Method | Path | Description |
|---|---|---|
| GET | `/nodes` | List DAG nodes |
| POST | `/nodes` | Create or update a node |
| DELETE | `/nodes?id=X` | Delete a node |
| GET | `/offers` | List offers |
| POST | `/offers` | Create or update an offer |
| DELETE | `/offers?id=X` | Delete an offer |
| GET | `/config` | Export full config (nodes + offers) |
| POST | `/config` | Import full config |
| GET | `/config/versions` | List config version history |
| GET | `/config/versions/:version` | Retrieve specific version |
| GET | `/field-schema` | Get user-field schema for dynamic UI |
| GET | `/action-types` | List available action types |

### Test Session Endpoints (`/api/user/test`)

| Method | Path | Description |
|---|---|---|
| POST | `/reset` | Start an in-memory test session |
| POST | `/process` | Advance test session |
| GET | `/recommendations` | Get recommendations for test session |

---

## Configuration Format

The entire DAG + offer catalog is stored as a single JSON document:

```json
{
  "root": "start",
  "nodes": {
    "start": {
      "id": "start",
      "type": "question",
      "content": "What is your main fitness goal?",
      "edges": [
        {
          "match_value": "Lose weight",
          "to_node_id": "next_node",
          "actions": [{ "type": "set", "field_name": "goal", "value": "weight_loss" }]
        }
      ]
    }
  },
  "offers": {
    "offer_1": {
      "id": "offer_1",
      "name": "Fat Burner Program",
      "description": "...",
      "requirements": [
        { "field_name": "goal", "match_value": "weight_loss", "is_obligatory": true, "score": 10 }
      ]
    }
  }
}
```

See `test.json` for a full working example and `parameters.md` for all available user fields and scoring rules.

---

## Running the Project

### With Docker Compose (recommended)

The entire application (Backend API, PostgreSQL database, and Vite React frontend) is containerized and can be started with a single command.

1. Ensure Docker and Docker Compose are installed.
2. In the root directory, run:

```bash
docker compose up --build
```

3. Wait for the containers to start. Services will be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080

> The frontend automatically proxies `/api` requests to the backend over the internal Docker network.

### Without Docker

**Backend:**

```bash
cd be
DATABASE_URL="postgres://app:secret@localhost:5432/fitness?sslmode=disable" \
CONFIG_PATH="../test.json" \
go run ./cmd/server
```

**Frontend:**

```bash
cd fe
npm install
npm run dev
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | _(none)_ | PostgreSQL DSN. If unset, DB features are disabled. |
| `CONFIG_PATH` | _(none)_ | Path to JSON config file loaded on startup. |

> The server always listens on port `8080`.

---

## CLI Simulator

The project includes a built-in CLI tool written in Go to simulate user behavior and traverse the DAG automatically. It interacts directly with the backend REST API — answering questions randomly, retrieving recommendations, and optionally "purchasing" offers.

Useful for load testing, QA, and verifying DAG configuration logic.

### Running the Simulator

Run against a live backend via `docker compose exec`:

```bash
docker compose exec backend go run ./cmd/cli --help
```

Example — simulate 100 users with 5 concurrent workers (silent output):

```bash
docker compose exec backend go run ./cmd/cli -n 100 -c 5 --silent
```

### CLI Flags

| Flag | Default | Description |
|---|---|---|
| `-n`, `--count` | `1` | Number of simulated users to run |
| `-c`, `--concurrent` | `1` | Number of concurrent workers |
| `-u`, `--url` | `http://localhost:8080` | Base URL of the backend API |
| `-d`, `--delay` | `500` | Think-time delay between steps (ms) |
| `-s`, `--silent` | `false` | Suppress step-by-step output; print only final metrics |
