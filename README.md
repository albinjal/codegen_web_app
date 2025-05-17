# Codegen Web App

A web application that allows users to generate websites using AI.

## Project Structure

This is a monorepo with the following workspaces:

- `backend`: Fastify server handling API requests and preview serving
- `frontend`: React SPA using Vite, Tailwind, and shadcn/ui
- `prisma`: Database models and migrations
- `workspace`: Runtime storage for user-generated projects (gitignored)

## Getting Started

### Prerequisites

- Node.js ≥ 22.0.0
- npm

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run generate --workspace=prisma

# Push the schema to the database
npm run db:push --workspace=prisma
```

### Development

```bash
# Start both backend and frontend in development mode
npm run dev

# Or start them individually
npm run dev:backend
npm run dev:frontend
```

### Production

```bash
# Build all workspaces
npm run build

# Start the production server
npm run start
```

## Architecture

