# Architecture (Static Build, Split Repos)

> **Target:** Local‑only MVP, no authentication, single‑origin UX.

---

## 1  High‑Level Topology

### Development

```
┌──────────────────────┐  http://localhost:5173
│  Vite dev server     │  ─────────────────────────────────┐
│  (frontend)          │                                   │
└──────────┬───────────┘                                   │
           │  /api  /preview (proxy)                       │
           ▼                                               │
┌──────────────────────┐   SSE streams     (port 3000)     │
│  Fastify backend     │◄──────────────────────────────────┘
│  – REST /api         │
│  – /preview/static   │
└──────────────────────┘
```

### Production / Bundle

```
                    http://localhost:3000
┌─────────────────────────────────────────────────────────┐
│              Fastify backend (single process)           │
│  • Serves built SPA from /                              │
│  • /api/* endpoints                                     │
│  • /preview/<id>/index.html  (built project previews)   │
└─────────────────────────────────────────────────────────┘
```

The browser therefore always talks to **one origin**; CORS and cookie headaches are avoided.

---


`backend/` and `frontend/` are independent npm workspaces with their own package.json files and .gitignore files.

---

## 3  Components & Responsibilities

| Layer               | Responsibility                                                              | Key Tech                         |
| ------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| **Frontend**        | Chat UI, project list, iframe preview; dev‑time proxy                       | React, Vite, Tailwind, shadcn/ui |
| **Backend API**     | `/api/*` routes, SSE, static preview + SPA serving                          | Fastify 4, @fastify/static, zod  |
| **BuildService**    | Parse `<edit>` XML, write files, execute `vite build`, emit `preview‑ready` | `execa`, chokidar (optional)     |
| **AnthropicClient** | Wrap TS SDK, stream tokens                                                  | `@anthropic-ai/sdk`              |
| **Database**        | Store Project & Message rows                                                | Prisma + SQLite                  |
| **Workspace FS**    | `./workspace/{project_id}` with `template/` source + `dist/` build          | Local filesystem                 |

---

## 4  Data Model (Prisma excerpt)

```prisma
model Project {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  messages  Message[]
}

model Message {
  id        String   @id @default(cuid())
  projectId String
  role      String   // 'user' | 'assistant'
  content   String
  createdAt DateTime @default(now())
  Project   Project  @relation(fields: [projectId], references: [id])
}
```

---

## 5  Runtime Flow

1. **Create project** – Frontend `POST /api/projects` with `{ initialPrompt }`.
2. Backend:

   1. Makes workspace dir from template.
   2. Saves user message in DB.
   3. Sends prompt to Anthropic; streams assistant tokens ↦ SSE.
   4. Runs initial `vite build` → `workspace/{id}/dist`.
3. Backend registers static route
4. Frontend iframe points at `/preview/${id}/index.html`. On `preview‑ready` SSE it reloads.

---

## 6  HTTP Surface

| Method | Path                         | Purpose                               |
| ------ | ---------------------------- | ------------------------------------- |
| `POST` | `/api/projects`              | Create project & first AI round (SSE) |
| `POST` | `/api/projects/:id/messages` | Subsequent user message (SSE)         |
| `GET`  | `/api/projects/:id`          | Metadata + messages                   |
| `GET`  | `/preview/:id/*`             | Static preview files                  |


---

## 7  Security & Resource Considerations

* **Path traversal:** reject `<edit>` paths containing `..` or absolute `/`.
* **Build timeouts:** kill `vite build` >30 s and emit error event.
* **Token cost:** cap `max_tokens`; summarise history after N messages.

---

## 8  Extensibility Hooks

* Swap SQLite → Postgres by tweaking Prisma datasource.
* Remote deploy: containerise backend; previews already static.
* Worker queue for off‑thread `vite build` when parallel usage grows.
