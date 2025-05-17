# Agentic Rules

*Single source of truth for AI‑assistant and automated agent behaviour*

---

## 0 Strict Rules — Stop‑Everything‐If‑Violated

1. **NEVER mutate `git` history (rebase, reset, force‑push) or run any `git` command without an explicit, written confirmation.**
2. **NEVER edit this file (`agentic_rules.md`) unless explicitly instructed.**

---

## 1 General Principles

* **Clarity > cleverness** — readable & maintainable first.
* **Single responsibility** — one concern per module/function.
* **Fail fast & loudly** — surface invalid input/state early.
* **Automate the boring** — formatter, linter, tests in pre‑commit.
* **Document intent, not implementation** — code shows *how*; docs explain *why*.
* **Consistency is king** — when changing behaviour, update code, tests & docs together.

---

## 2 Project Context

* **Package manager:** `npm` workspaces.
* **Folders:**
  ```txt
  backend/   – Fastify API, Prisma, BuildService
  frontend/  – React SPA (Vite), dev proxy to backend
  workspace/ – runtime project directories (git‑ignored)
  prisma/    – schema.prisma & migrations
  template/  – seed user‑generated site
  project_description/ – architecture & implementation docs
  .env – environment variables
  ```
* **Preview serving:** static `dist/` under `/preview/<project_id>/`.
* **Single browser origin:** In dev, Vite (5173) proxies `/api` & `/preview` to backend (3000); in prod backend serves built SPA.

---

## 3 Workflows & Automation

| Stage           | Command         | Guards                                      |
| --------------- | --------------- | ------------------------------------------- |
| **Dev servers** | `npm run dev`   | runs backend & frontend concurrently        |
| **Build**       | `npm run build` | builds frontend then backend (copies dist)  |
| **Test**        | `npm run test`  | unit + API; E2E only when `ANTHROPIC_E2E=1` |

* Pre‑commit hook chain: `format → lint → test`.
* Commit messages follow **Conventional Commits** (`type(scope): subject`).
* CI pipeline mirrors pre‑commit, plus integration tests.

---

## 4 Quality & Assurance

* Write tests next to code (`__tests__` or `*.test.ts`).
* Target meaningful coverage rather than a % number.
* Code reviews focus on correctness, clarity, future maintainability.

---

## 5 Style & Formatting

* **Formatter:** Prettier (JS/TS/JSON/MD) — run via `prettier --write`.
* **Linter:** ESLint with TypeScript plugin & Airbnb base; React rules in frontend.
* Max line length **100 chars**; no semicolons (standard style) unless required.
* One exported symbol per file where practical.
* Remove dead code; if kept intentionally, add `// keep:…` comment.

---

## 6 Naming Conventions (TypeScript)

| Item               | Convention             | Example                 |
| ------------------ | ---------------------- | ----------------------- |
| Files              | kebab‑case             | `build-service.ts`      |
| Types & Interfaces | PascalCase with suffix | `interface ChatMessage` |
| Functions          | camelCase              | `streamCompletion()`    |
| Constants          | SCREAMING\_SNAKE\_CASE | `MAX_TOKENS`            |

---

## 7 Language‑Specific Guidelines

### TypeScript / Node (backend)

* Use `import type` for type‑only imports.
* Prefer `zod` for runtime validation.
* Never catch an error without re‑throwing or handling.

### React (frontend)

* Components are functions; suffix filename `*.tsx`.
* Use hooks for state; custom hooks in `/hooks` folder.
* Tailwind utility classes first, then custom CSS modules if needed.

### Prisma / SQL

* One model per file in `prisma/schema.prisma`.
* Run `npx prisma format` before commit.

---

## 8 Security & Safety Checklist

* Reject `<edit>` paths containing `..` or leading `/`.
* Abort `vite build` after **30 s**; emit `build-error` SSE.
* Cap Anthropic `max_tokens` and summarise long histories.

---

## 9 Recorded Knowledge

* Keep the README minimal; deep docs live in `/docs` (Markdown).
* Public APIs/classes require JSDoc or TSDoc blocks.
* Update docs & examples in the same PR that changes behaviour.

---

## 10 Contribution Flow (for AI agents)

1. **Analyse task** → decide affected workspace(s).
2. **Modify code** → run *format → lint → test* locally.
3. **Ask for git confirmation** → commit & push (or await human approval).
4. **Open PR** → ensure description links to docs/tests.
5. **CI green** → merge.


## Other rules
- Refer to the files in project_description/ and update as we go along but DON'T update design_decisions.md or functional_description.md.
