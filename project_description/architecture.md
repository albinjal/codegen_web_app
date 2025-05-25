# Architecture (Refactored Modular Backend)

> **Target:** Local‑only MVP, no authentication, single‑origin UX.

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
      📁 anthropic/       # AI service integration (includes systemPrompt)
      📁 build/           # Project build and file management
    📄 types.ts           # Shared TypeScript type definitions
    📄 index.ts           # Server entry point
  📁 template/            # React template for new projects
  📁 workspace/           # Generated project workspaces
  📄 package.json         # Backend dependencies

📁 frontend/              # Frontend React application
  📁 src/
    📁 components/        # Reusable UI components (shadcn/ui)
    📁 hooks/             # Custom React hooks
    📁 lib/               # Utility libraries
    📁 pages/             # Page components (LandingPage, ProjectPage)
    📄 App.tsx            # Main application component
    📄 main.tsx           # Application entry point
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
| **BuildService**    | Parse `<edit>`, `<create_file>`, `<str_replace>` XML tool calls, write files, execute `vite build`, emit `preview‑ready` | `execa`, custom tool parser      |
| **AnthropicClient** | Wrap TS SDK, stream tokens, emits tool calls as XML in responses            | `@anthropic-ai/sdk`              |
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
      4. **Parsing tool calls**: The AI can emit tool calls in XML tags (e.g., `<create_file>`, `<str_replace>`) in its response. The backend parses these tool calls, executes them (file creation, string replacement), and rebuilds the project if needed.
      5. Saving the complete assistant message to the DB.
      6. Emitting project-specific events (e.g., `ai_content_<projectId>`, `ai_complete_<projectId>`) via a server-side event emitter.
   4. (BuildService) Makes workspace dir from `backend/template`, runs initial `vite build` → `workspace/{id}/dist`.
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
   4. **Parses and executes tool calls, then rebuilds project as needed.**
6. Frontend's existing SSE stream (`GET /api/projects/:id/stream`) receives the `ai_content` and `ai_complete` events for the new response.

---

## 6  AI Tooling Protocol

> **AI Tooling Protocol:**
> The backend system prompt instructs the AI to use XML tags for tool calls. Supported tools include:
> - `<create_file path="...">...</create_file>`: Create a new file with the given content.
> - `<str_replace path="..." old_str="..." new_str="...">...</str_replace>`: Replace a string in a file.
>
> The backend parses these tags, executes the requested actions, and rebuilds the project as needed. Multiple tool calls can be included in a single response.

---

## 7  HTTP Surface

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

## 8  Module Structure

Each feature module follows this structure:

```
📁 modules/
  📁 health/
    📄 controller.ts    # Business logic and request handlers
    📄 route.ts         # Route definitions and validation
    📄 index.ts         # Module exports
  📁 projects/
    📄 controller.ts    # Business logic and request handlers
    📄 route.ts         # Route definitions and validation
    📄 schema.ts        # Zod validation schemas
    📄 index.ts         # Module exports
    📁 __tests__/       # Module-specific tests
```

### Service Structure

Services are organized by domain and include:

```
📁 services/
  📁 anthropic/
    📄 client.ts        # Anthropic API client wrapper
    📄 systemPrompt.ts  # AI system prompt generation
    📄 index.ts         # Service exports
    📁 __tests__/       # Service tests
  📁 build/
    📄 service.ts       # Main build service
    📄 fileTreeUtil.ts  # File system utilities
    📄 toolConfig.ts    # Tool configuration
    📄 toolParser.ts    # XML tool parsing
    📄 index.ts         # Service exports
```

This modular structure provides:
- **Clear separation of concerns**: Each module handles a specific domain
- **Consistent patterns**: All modules follow the same structure
- **Easy testing**: Each module can be tested independently
- **Maintainability**: Related functionality is co-located
