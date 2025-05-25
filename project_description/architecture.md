# Architecture Documentation

## Executive Summary

This document outlines the technical architecture of the Codegen Web App, an AI-powered website generator. The system demonstrates sophisticated full-stack development practices with a modular, scalable design.

**Key Architectural Highlights:**
- **Single-Origin Design**: Eliminates CORS complexity and simplifies deployment
- **Real-time Communication**: Server-Sent Events for streaming AI responses
- **Modular Backend**: Clean separation of concerns with feature-based modules
- **AI Tool Integration**: Advanced XML parsing for intelligent code generation
- **Workspace Management**: Secure, isolated project environments
- **Production Ready**: Docker support, comprehensive testing, and optimized builds

> **Current Status:** Fully functional MVP with local-only deployment, no authentication required.

## 1. System Architecture Overview

### Development Environment
In development, we run separate servers for optimal developer experience:

```
┌──────────────────────┐  http://localhost:5173
│  Vite Dev Server     │  ─────────────────────────────────┐
│  (React Frontend)    │                                   │
│  • Hot reloading     │                                   │
│  • Fast builds       │                                   │
└──────────┬───────────┘                                   │
           │  Proxies /api & /preview requests             │
           ▼                                               │
┌──────────────────────┐   SSE Streaming   (port 3000)     │
│  Fastify Backend     │◄──────────────────────────────────┘
│  • REST API          │
│  • Project previews  │
│  • AI integration    │
└──────────────────────┘
```

### Production Deployment
In production, everything runs as a single optimized server:

```
                    http://localhost:3000
┌─────────────────────────────────────────────────────────┐
│              Fastify Backend (Single Process)           │
│  • Serves built React SPA from /                        │
│  • Handles /api/* endpoints                             │
│  • Serves /preview/<id>/* for generated websites        │
│  • Real-time SSE streaming                              │
└─────────────────────────────────────────────────────────┘
```

**Key Benefits:**
- **Single Origin**: No CORS issues, simplified security model
- **Unified Deployment**: One process to manage in production
- **Optimal Performance**: Static assets served efficiently

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

## 3. System Components & Responsibilities

The application is built with clearly defined components, each handling specific responsibilities:

| Component           | Purpose                                                                     | Technology Stack                 |
| ------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| **Frontend SPA**    | User interface for chat, project management, and live preview              | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend API**     | RESTful endpoints, real-time streaming, static file serving                | Fastify 4, TypeScript, Zod validation |
| **AI Service**      | Integration with Anthropic Claude, streaming responses, tool call parsing  | Anthropic SDK, custom XML parser |
| **Build Service**   | Project creation, file management, automated building                      | Node.js, Vite, custom tooling   |
| **Database Layer**  | Persistent storage for projects and conversation history                   | Prisma ORM, SQLite              |
| **Workspace Manager** | Isolated project environments with security controls                      | File system operations, sandboxing |

### Key Technical Innovations

- **AI Tool Protocol**: Custom XML parsing system for intelligent code generation
- **Real-time Streaming**: Server-Sent Events for live AI responses and build notifications
- **Modular Architecture**: Feature-based modules with clear separation of concerns
- **Workspace Isolation**: Secure project environments with automated cleanup

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

## 6. AI Tooling Protocol

### Overview
One of the most sophisticated features of this system is the AI tooling protocol - a custom XML-based system that allows the AI to perform precise code modifications.

### How It Works

**1. AI Response Generation**
- The AI receives user requests and generates responses with embedded XML tool calls
- Multiple tool calls can be included in a single response
- The AI understands project context and makes intelligent modifications

**2. Tool Call Parsing**
- Backend parses XML tags from AI responses using custom parser
- Validates tool calls and parameters
- Executes file operations safely within project workspace

**3. Automatic Rebuilding**
- After tool execution, the system automatically rebuilds the project
- Emits `preview-ready` events via SSE
- Frontend reloads preview iframe to show changes

### Supported Tools

```xml
<!-- Create a new file with content -->
<create_file path="src/components/Button.tsx">
export const Button = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
</create_file>

<!-- Replace specific content in existing file -->
<str_replace path="src/App.tsx" old_str="Hello World" new_str="Welcome to My App">
</str_replace>
```

### Technical Benefits

- **Precision**: AI can make exact modifications without affecting unrelated code
- **Safety**: Operations are sandboxed within project workspaces
- **Efficiency**: Multiple changes can be batched in a single response
- **Reliability**: Robust error handling and validation

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
