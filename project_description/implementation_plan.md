# Step-by-Step Implementation Plan

**Clarification**: Below is a step-by-step implementation outline for the Codegen Web App (the site that generates _user_generated_project_ websites). Each task is independent and references the repository documentation. No changes are made to existing design decisions or the functional description.

---

## Step‑by‑Step Implementation Plan

> **Note**: Keep this plan updated as tasks are completed.

- [x] **Monorepo Setup**

  - [x] Create `backend/`, `frontend/`, `prisma/`, and `workspace/` folders as npm workspaces.
  - [x] Configure `package.json` at the repo root with workspace references and basic scripts (`dev`, `build`, `test`) as outlined in the architecture document's split repo approach.
  - [x] Add `.gitignore` for `/workspace` as runtime storage.

- [ ] **Prisma Data Models**

  - [ ] In `prisma/schema.prisma`, define `Project` and `Message` models according to the data model excerpt.
  - [ ] Run `npx prisma format` to ensure schema style consistency (as instructed by the AGENTS rules).

- [ ] **Backend Skeleton (Fastify)**

  - [ ] Initialize a Fastify server in `backend/` with TypeScript.
  - [ ] Implement routes from the HTTP surface table.
  - [ ] Provide an SSE endpoint for streaming chat responses.

- [ ] **BuildService for Workspace Management**

  - [ ] Create `backend/services/build-service.ts`.
  - Responsibilities:
    - [ ] Copy the template project into `workspace/{project_id}` when a project is created.
    - [ ] Run `npm install` and `vite build`; abort after 30 s as per security checklist.
    - [ ] After each `<edit>` round, rebuild and serve files from `/preview/{id}/dist`.

- [ ] **Anthropic Integration**

  - [ ] Implement `AnthropicClient` wrapping the Typescript SDK and centralize model configuration.
  - [ ] Stream assistant tokens over SSE to the frontend.

- [ ] **Frontend SPA**

  - [ ] Set up a React/Vite project in `frontend/` using Tailwind and shadcn/ui (as per design decisions).
  - [ ] Provide a landing page with chat input and project list; embed preview iframe pointing at `/preview/{id}/index.html`.
  - [ ] Use fetch and `EventSource` to interact with the backend API and stream responses.

- [ ] **Database & API Flow**

  - [ ] On `POST /api/projects`:
    - [ ] Create DB entries for the new project and first user message.
    - [ ] Start BuildService to set up workspace and run initial build.
    - [ ] Stream AI responses (SSE) while saving assistant messages.
  - [ ] On `POST /api/projects/:id/messages`:
    - [ ] Save user message, send prompt to AI, apply code edits, rebuild, and stream results.

- [ ] **Static Preview Serving**

  - [ ] After each build, ensure Fastify serves `workspace/{id}/dist` under `/preview/{id}`.
  - [ ] Frontend reloads iframe when receiving `preview-ready` events during SSE flow.

- [ ] **Testing & Pre‑commit Setup**

  - [ ] Configure Prettier and ESLint according to rules in `AGENTS.md`.
  - [ ] Write unit tests for BuildService and API endpoints using Vitest.
  - [ ] Add pre‑commit hooks: `format → lint → test`.

- [ ] **Documentation**
  - [ ] Keep README minimal and place detailed docs in `docs/` as per agentic rules.
  - [ ] Document API usage, how to run dev servers, and how to extend template projects.
