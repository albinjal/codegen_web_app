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
| **5** | **Anthropic Integration & Streaming** – Implement `AnthropicClient.ts`; stream tokens to client via SSE.                     |
| **6** | **BuildService & Edit Parsing** – Parse `<edit>` XML, write files, debounce, execute `vite build`, emit `preview‑ready`.                     |
| **7** | **Persist Messages & UI Polish** – Prisma message table, chat auto‑scroll, iframe reload on ready, README & `.env.example`.                  |
| **8** | **Testing Harness** – Vitest for units, Supertest + nock for API, Playwright opt‑in E2E.                                                     |
| **9** | **Build Script & Docs** – Frontend `npm run build`, backend copies `frontend/dist`, update production README.                                |
