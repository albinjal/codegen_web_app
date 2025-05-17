<!--- AGENT INGORE THIS FILE, USED ONLY FOR HUMAN READING --->
# Design Decisions

To me, one of the most intersting parts of a coding project is the design decisions.

I wanted to note down some of the decisions I made along the way and why.


## Programming Language
- [ ] Python - I have a lot of experience with it and it's fast for prototyping.
- [x] Typescript - Fast for prototyping and will also be used for the frontend. Suggested.
- [ ] Go - Not as fast for prototyping but better for production/performance. Suggested.


## Frontend
I will just use the lovable stack. As I don't have a strong preference and LLM's are good at generating in it.
- [x] React
- [x] Tailwind CSS
- [x] Shadcn UI
- [x] Typescript
- [x] Vite

## Backend
- [x] Typescript
- [x] Fastify
- [x] Node.js 22
- [x] Prisma + SQLite
- [x] Vitest
- [x] Anthropic Typescript SDK


## Storing User Projects
- [x] Saving full directory
- [ ] Saving as single text file
- [ ] Saving only diff


## Addtional Features
- [ ] Give chatbot a funny personality or let the user choose. Example Russ Hanneman from Silicon Valley.
- [ ] Adding a spin the wheel feature if the user gives ambiguous instructions (they get a random choice).
- [ ] Integrating into an existing chat application. What if we could just message a whatsapp number/telegram bot with a website prompt and it send us back a link with the preview? Would be pretty cool.
