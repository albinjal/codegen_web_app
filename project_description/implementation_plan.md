# Step-by-Step Implementation Plan

**Clarification**: Below is a step-by-step implementation outline for the Codegen Web App (the site that generates _user_generated_project_ websites). Each task is independent and references the repository documentation. No changes are made to existing design decisions or the functional description.

---

## Step‑by‑Step Implementation Plan

> **Note**: Keep this plan updated as tasks are completed.

- [x] **Monorepo Setup**

  - [x] Create `backend/`, `frontend/`, `prisma/`, and `workspace/` folders as npm workspaces.
  - [x] Configure `package.json` at the repo root with workspace references and basic scripts (`dev`, `build`, `test`) as outlined in the architecture document's split repo approach.
  - [x] Add `.gitignore` for `/workspace` as runtime storage.

- [x] **Prisma Data Models**

  - [x] In `prisma/schema.prisma`, define `Project` and `Message` models according to the data model excerpt.
  - [x] Run `npx prisma format` to ensure schema style consistency (as instructed by the AGENTS rules).

- [x] **Backend Skeleton (Fastify)**

  - [x] Initialize a Fastify server in `backend/` with TypeScript.
  - [x] Implement routes from the HTTP surface table.
  - [x] Provide an SSE endpoint for streaming chat responses.

- [x] **BuildService for Workspace Management**

  - [x] Create `backend/services/build/service.ts`.
  - Responsibilities:
    - [x] Copy the React template from `backend/template` into `workspace/{project_id}` when a project is created.
    - [x] Run `npm install` and `vite build`; abort after 30 s as per security checklist.
    - [x] After each `<edit>` round, rebuild and serve files from `/preview/{id}/dist`.

- [x] **Anthropic Integration**

  - [x] Implement `AnthropicClient` wrapping the Typescript SDK and centralize model configuration.
  - [x] Stream assistant tokens over SSE to the frontend.

- [ ] **Frontend SPA**

  - [ ] Set up a React/Vite project in `frontend/` using Tailwind and shadcn/ui (as per design decisions).
  - [ ] Provide a landing page with chat input and project list; embed preview iframe pointing at `/preview/{id}/index.html`.
  - [ ] Use fetch and `EventSource` to interact with the backend API and stream responses.

- [x] **Database & API Flow**

  - [x] On `POST /api/projects`:
    - [x] Create DB entries for the new project and first user message.
    - [x] Start BuildService to set up workspace and run initial build.
    - [x] Stream AI responses (SSE) while saving assistant messages.
  - [x] On `POST /api/projects/:id/messages`:
    - [x] Save user message, send prompt to AI, apply code edits, rebuild, and stream results.

- [x] **Static Preview Serving**

  - [x] After each build, ensure Fastify serves `workspace/{id}/dist` under `/preview/{id}`.
  - [x] Frontend reloads iframe when receiving `preview-ready` events during SSE flow.

- [x] **Backend Refactoring**

  - [x] Implement modular architecture with proper separation of concerns.
  - [x] Create core modules for server and database management.
  - [x] Organize endpoints into feature modules (health, projects).
  - [x] Move services into dedicated directories with proper structure.
  - [x] Update tests to work with new module structure.

- [x] **Testing & Pre‑commit Setup**

  - [x] Configure Prettier and ESLint according to rules in `AGENTS.md`.
  - [x] Write unit tests for BuildService and API endpoints using Vitest.
  - [ ] Add pre‑commit hooks: `format → lint → test`.

- [x] **Documentation**
  - [x] Keep README minimal and place detailed docs in project_description.
  - [x] Update architecture documentation to reflect the current project structure.
  - [ ] Document API usage, how to run dev servers, and how to extend template projects.
