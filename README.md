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

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Required: Anthropic API key
ANTHROPIC_API_KEY=your_api_key_here

# Optional: Claude model selection (defaults to claude-3-5-sonnet-20240620 if not specified)
# Options: claude-3-opus-20240229, claude-3-5-sonnet-20240620, claude-3-haiku-20240307, etc.
CLAUDE_MODEL=claude-3-5-sonnet-20240620
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
