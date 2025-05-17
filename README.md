# Codegen Web App

AI‑powered website generator: describe a site in chat, watch it build & preview live.

---

## Features

* 🖥️ **Single‑origin UX** – backend (Fastify) & frontend (React + Vite) served under the same host.
* 🛠 **Static preview pipeline** – each project lives in `workspace/<id>`; a fresh `vite build` serves via `/preview/<id>`.
* 💬 **Streaming chat** – Claude 3 Messages API, surfaced to the browser via Server‑Sent Events.
* ⚙️ **npm workspaces** – isolated `backend/`, `frontend/`, and `packages/` share deps.

---

## Getting Started

```bash
# Clone & install all workspaces
git clone <repo>
cd codegen-web-app
npm install

# Initialise the SQLite DB
npx prisma db push

# Copy your Anthropic key into backend/.env
cp backend/.env.example backend/.env
# then edit backend/.env and set ANTHROPIC_KEY=sk‑...

# Run development servers (backend 3000, frontend 5173 w/ proxy)
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)**. The SPA proxies **/api** and **/preview** to the backend so everything shares one origin.

---

## Scripts

| Command         | What it does                                                           |
| --------------- | ---------------------------------------------------------------------- |
| `npm run dev`   | `backend` (Fastify) & `frontend` (Vite) in watch mode                  |
| `npm run build` | Builds `frontend` then `backend` (copies SPA into backend/public)      |
| `npm run test`  | Unit + API tests (Vitest + Supertest); E2E only when `ANTHROPIC_E2E=1` |

---

## Directory Layout

```txt
backend/    Fastify API, BuildService, Prisma
frontend/   React SPA (Vite) – chat UI, iframe preview
packages/
  ├─ shared/   TS types, Anthropic wrapper
  └─ template/ Seed project copied into workspace/
workspace/  Runtime‑created project directories (git‑ignored)
prisma/     schema.prisma & migrations
project_description/  Architecture & implementation docs
```

---

## Contributing

1. Follow the **Agentic Rules** in `project_description/agentic_rules.md`.
2. Run *format → lint → test* locally before committing.
3. Use Conventional Commits (`feat(api): stream SSE`).
4. Open a PR and wait for CI to go green.

---

## License

MIT
