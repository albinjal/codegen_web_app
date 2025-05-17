# Architecture (Refactored Modular Backend)

> **Target:** Local‑only MVP, no authentication, single‑origin UX.

---

## 1  High‑Level Topology

### Development

```
┌──────────────────────┐  http://localhost:5173
│  Vite dev server     │  ─────────────────────────────────┐
│  (frontend)          │                                   │
└──────────┬───────────┘                                   │
           │  /api  /preview (proxy)                       │
           ▼                                               │
┌──────────────────────┐   SSE streams     (port 3000)     │
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

## 2  Project Structure

```
📁 backend/               # Backend TypeScript Node.js server
  📁 src/
    📁 config/            # Configuration and environment variables
    📁 core/              # Core server and database components
    📁 modules/           # Feature modules with controller-route pattern
      📁 health/          # Health check module
      📁 projects/        # Project management module
    📁 routes/            # Route registration
    📁 services/          # Core services
      📁 anthropic/       # AI service integration
      📁 build/           # Project build and file management
    📁 utils/             # Shared utility functions
  📁 template/            # React template for new projects
  📁 workspace/           # Generated project workspaces
  📄 index.ts             # Server entry point
  📄 package.json         # Backend dependencies

📁 frontend/              # Frontend React application
  📄 package.json         # Frontend dependencies

📁 prisma/                # Database schema and client
  📄 schema.prisma        # Database model definitions
```

`backend/` and `frontend/` are independent npm workspaces with their own package.json files and .gitignore files.

---

## 3  Components & Responsibilities

| Layer               | Responsibility                                                              | Key Tech                         |
| ------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| **Frontend**        | Chat UI, project list, iframe preview; dev‑time proxy                       | React, Vite, Tailwind, shadcn/ui |
| **Backend API**     | `/api/*` routes, SSE, static preview + SPA serving                          | Fastify 4, @fastify/static, zod  |
| **BuildService**    | Parse `<edit>` XML, write files, execute `vite build`, emit `preview‑ready` | `execa`, chokidar (optional)     |
| **AnthropicClient** | Wrap TS SDK, stream tokens                                                  | `@anthropic-ai/sdk`              |
| **Database**        | Store Project & Message rows                                                | Prisma + SQLite                  |
| **Workspace FS**    | `backend/workspace/{project_id}` with React project files + `dist/` build   | Local filesystem                 |

---

## 4  Data Model (Prisma excerpt)

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

## 5  Runtime Flow

1. **Create project** – Frontend `POST /api/projects` with `{ initialPrompt }`.
2. Backend:
   1. Creates the project and saves the initial user message in the DB.
   2. Responds with `{ projectId }`.
   3. Asynchronously, triggers AI processing for the initial prompt. This involves:
      1. Fetching message history.
      2. Sending prompt to Anthropic.
      3. Receiving AI response (streaming).
      4. Saving the complete assistant message to the DB.
      5. Emitting project-specific events (e.g., `ai_content_<projectId>`, `ai_complete_<projectId>`) via a server-side event emitter.
   4. (BuildService, if active) Makes workspace dir from `backend/template`, runs initial `vite build` → `workspace/{id}/dist`.
3. Frontend, upon receiving `{ projectId }`:
   1. Navigates to the project page (`/project/:id`).
   2. Establishes an SSE connection to `GET /api/projects/:id/stream`.
   3. The stream sends historic messages, then listens for `ai_content_<projectId>` and `ai_complete_<projectId>` events to display the AI response.
   4. The iframe for preview points at `/preview/${projectId}/dist/index.html`. It reloads on `preview-ready` build events (if BuildService is active and emitting these via SSE).

4. **Send subsequent message** - Frontend `POST /api/projects/:id/messages` with `{ content }`.
5. Backend:
   1. Saves the user message in the DB.
   2. Responds with `{ messageId }`.
   3. Asynchronously, triggers AI processing for the new message (similar to step 2.3).
6. Frontend's existing SSE stream (`GET /api/projects/:id/stream`) receives the `ai_content` and `ai_complete` events for the new response.

---

## 6  HTTP Surface

| Method | Path                         | Purpose                                                     | Response Type |
| ------ | ---------------------------- | ----------------------------------------------------------- | ------------- |
| `GET`  | `/api/health`                | Health check endpoint                                       | JSON          |
| `POST` | `/api/projects`              | Create project & initial message, trigger AI processing     | JSON          |
| `GET`  | `/api/projects`              | List all projects                                           | JSON          |
| `GET`  | `/api/projects/:id`          | Get project metadata + messages                             | JSON          |
| `POST` | `/api/projects/:id/messages` | Send user message, trigger AI response                      | JSON          |
| `GET`  | `/api/projects/:id/stream`   | SSE stream for project updates (AI responses, build events) | text/event-stream |
| `GET`  | `/preview/:id/*`             | Static preview files for built project                      | HTML/CSS/JS   |

---

## 7  Module Structure

Each feature module follows this structure:

```
📁 module-name/
  📄 controller.ts    # Business logic and data access
  📄 route.ts         # HTTP route definitions
  📄 schema.ts        # Data validation with Zod
  📄 index.ts         # Exports all module components
```

This structure promotes:
- **Separation of concerns**: Routes handle HTTP, controllers handle business logic
- **Testability**: Controllers can be tested without HTTP overhead
- **Maintainability**: Clear boundaries between different aspects of functionality
- **Scalability**: Easy to add new modules following the same pattern

---
