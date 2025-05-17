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
   1. Makes workspace dir from the backend/template.
   2. Saves user message in DB.
   3. Sends prompt to Anthropic; streams assistant tokens ↦ SSE.
   4. Runs initial `vite build` → `workspace/{id}/dist`.
3. Backend registers static route
4. Frontend iframe points at `/preview/${id}/index.html`. On `preview‑ready` SSE it reloads.

---

## 6  HTTP Surface

| Method | Path                         | Purpose                               |
| ------ | ---------------------------- | ------------------------------------- |
| `GET`  | `/api/health`                | Health check endpoint                 |
| `POST` | `/api/projects`              | Create project & first AI round (SSE) |
| `GET`  | `/api/projects/:id`          | Get project metadata + messages       |
| `POST` | `/api/projects/:id/messages` | Send user message and get AI response |
| `GET`  | `/preview/:id/*`             | Static preview files                  |

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
