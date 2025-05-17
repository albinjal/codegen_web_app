# Implementation Plan (Static‑Build, Split Repos, **npm workspaces**)

> **Scope:** Local MVP, no auth, single origin. Backend & frontend live in separate workspaces. Managed with **npm**.

---

## Ordered Task Sequence

| Step  | Task                                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Workspace Bootstrap** – `npm init -y`, declare workspaces, add ESLint/Prettier, Vitest.                                             |
| **2** | **Database & Fastify Skeleton** – Prisma schema, Fastify hello‑world in `backend/src/index.ts`, health route.                                |
| **3** | **Frontend Scaffold** – Vite React app in `frontend/`; dev proxy `/api` and `/preview` to `localhost:3000`.                                  |
| **4** | **Create‑Project Endpoint** – `POST /api/projects`: copy template, run `npm i` in workspace, perform initial `vite build`, stream dummy SSE. |
| **5** | **Anthropic Integration & Streaming** – Implement `packages/shared/AnthropicClient.ts`; stream tokens to client via SSE.                     |
| **6** | **BuildService & Edit Parsing** – Parse `<edit>` XML, write files, debounce, execute `vite build`, emit `preview‑ready`.                     |
| **7** | **Persist Messages & UI Polish** – Prisma message table, chat auto‑scroll, iframe reload on ready, README & `.env.example`.                  |
| **8** | **Testing Harness** – Vitest for units, Supertest + nock for API, Playwright opt‑in E2E.                                                     |
| **9** | **Build Script & Docs** – Frontend `npm run build`, backend copies `frontend/dist`, update production README.                                |

---

## Scripts

### Root `package.json`

```jsonc
{
  "workspaces": ["backend", "frontend", "packages/*"],
  "scripts": {
    "dev": "npm-run-all -p dev:**",          // runs backend & frontend concurrently
    "dev:backend": "npm --workspace backend run dev",
    "dev:frontend": "npm --workspace frontend run dev",
    "build": "npm --workspace frontend run build && npm --workspace backend run build",
    "test": "npm-run-all test:**"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5"
  }
}
```

### Backend `package.json` (excerpt)

```jsonc
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && cpy ../frontend/dist ./public --cwd=$(pwd) --recursive"
  },
  "dependencies": {
    "fastify": "^4.23.0",
    "@fastify/static": "^6.12.0",
    "@prisma/client": "latest"
  }
}
```

### Frontend `package.json` (excerpt)

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

---

## Fastify Endpoints

```txt
POST /api/projects                 (SSE)
POST /api/projects/:id/messages    (SSE)
GET  /api/projects/:id             (JSON)
```

Static previews live at `/preview/<id>/index.html`.

---

## Environment Variables

| Key             | Example                  | Purpose           |
| --------------- | ------------------------ | ----------------- |
| `PORT`          | 3000                     | Backend port      |
| `ANTHROPIC_KEY` | sk‑live‑…                | Anthropic API key |
| `CLAUDE_MODEL`  | claude-3-5-sonnet-latest | Model name        |

Create `.env` in `backend/` and load with `dotenv`.

---

## Testing Strategy

* **Unit:** Vitest for shared utils, BuildService, path sanitizer.
* **API:** Supertest + nock; stub `vite build` with `execaCommandSync('true')`.
* **E2E (opt‑in):** Playwright against real model when `ANTHROPIC_E2E=1`.

---

## Local Run

```bash
npm install           # install all workspaces
npx prisma db push    # init SQLite
npm run dev           # backend + frontend concurrently
```

SPA served at **`http://localhost:5173`**; `/api` & `/preview` proxy to **3000**.

---

## Risks & Mitigations

| Risk                                | Mitigation                                                 |
| ----------------------------------- | ---------------------------------------------------------- |
| **Build latency** on large projects | Debounce edits; show spinner; off‑thread builds if needed. |
| **Token costs**                     | Cap `max_tokens`; summarise chat history.                  |
| **Path traversal**                  | Reject edit paths containing `..` or absolute `/`.         |

---

## Post‑MVP Ideas

* GitHub OAuth & remote deploy.
* Build queue with BullMQ.
* Store diffs instead of full directories.
