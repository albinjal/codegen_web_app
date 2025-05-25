# Codegen Web App

**An AI-powered website generator that creates fully functional React applications through natural language conversation.**

Users can describe what they want to build, and the AI generates complete websites with modern React, TypeScript, and Tailwind CSS. The application features real-time preview, intelligent code editing, and seamless project management.

## ✨ Key Features

- **Conversational Website Generation**: Describe your vision in plain English, get a working website
- **Real-time Preview**: See your website update instantly as the AI makes changes
- **Intelligent Code Editing**: AI understands context and makes precise modifications using advanced tool parsing
- **Modern Tech Stack**: Built with React, TypeScript, Tailwind CSS, and Vite
- **Project Management**: Save, revisit, and continue working on multiple projects
- **Streaming Responses**: Real-time AI responses using Server-Sent Events (SSE)
- **Production Ready**: Modular architecture with comprehensive testing and Docker support

## 🏗️ Technical Overview

This application demonstrates sophisticated full-stack development with:

- **Modular Backend Architecture**: Clean separation of concerns with feature modules, services, and controllers
- **AI Integration**: Advanced XML tool parsing for intelligent code generation and modification
- **Real-time Communication**: Server-Sent Events for streaming AI responses and build notifications
- **Workspace Management**: Dynamic project creation, building, and serving with security controls
- **Database Design**: Efficient data modeling with Prisma ORM and SQLite
- **Development Experience**: Hot reloading, TypeScript throughout, comprehensive testing with Vitest
- **Deployment Options**: Both npm and Docker workflows with production optimization

For detailed technical documentation, see [`project_description/architecture.md`](./project_description/architecture.md).

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

**For both Docker and npm routes:**
- Git (for cloning the repository)

**For npm route only:**
- Node.js (version >=22.0.0)
- npm (comes with Node.js)

**For Docker route only:**
- Docker and Docker Compose

### Initial Setup (Required for Both Routes)

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/albinjal/codegen_web_app
    cd codegen-web-app
    ```

2.  **Set up environment variables:**
    Copy the example environment file and configure your secrets:

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file and set the following variables:
    - `PORT=3000` (default port for the backend)
    - `ANTHROPIC_API_KEY` (your Anthropic API key for AI functionality)
    - `CLAUDE_MODEL=claude-3-5-sonnet-latest` (Claude model to use)

### Option A: Installation & Setup with npm

3.  **Install dependencies:**
    This project uses npm workspaces. Install dependencies from the root directory:

    ```bash
    npm install
    ```

4.  **Set up the development environment:**
    This command will generate the Prisma client and run database migrations:

    ```bash
    npm run setup:dev
    ```

5.  **Run the development servers:**
    This will start both the backend and frontend development servers concurrently:
    ```bash
    npm run dev
    ```
    - Frontend will be available at `http://localhost:5173`
    - Backend API will be available at `http://localhost:3000` (proxied from the frontend)

### Option B: Installation & Setup with Docker

3.  **Start with Docker Compose:**
    This command installs dependencies, runs database setup, and launches both the backend and frontend:

    ```bash
    docker-compose up
    ```

    The app will be available at `http://localhost:5173` and the API at `http://localhost:3000`.


## 📁 Project Structure

This is a professionally organized monorepo using npm workspaces:

```
codegen_web_app/
├── backend/                 # Fastify TypeScript server
│   ├── src/
│   │   ├── config/         # Environment & configuration
│   │   ├── core/           # Server & database core
│   │   ├── modules/        # Feature modules (health, projects)
│   │   ├── routes/         # Route registration
│   │   └── services/       # AI integration & build services
│   ├── template/           # React template for new projects
│   └── workspace/          # Generated user projects (runtime)
├── frontend/               # React SPA with modern tooling
│   └── src/
│       ├── components/     # shadcn/ui components
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities
│       └── pages/          # Landing & Project pages
├── prisma/                 # Database schema & migrations
└── project_description/    # Comprehensive documentation
```

**Key Design Decisions:**
- **Monorepo**: Simplified dependency management and deployment
- **TypeScript Throughout**: Type safety across the entire stack
- **Modular Architecture**: Each feature is self-contained with clear boundaries
- **Workspace Isolation**: User projects are sandboxed and securely managed

## 🚀 Current Status

**✅ Fully Functional MVP Complete**

All core features have been implemented and tested:

- ✅ **AI Website Generation**: Complete integration with Anthropic's Claude API
- ✅ **Real-time Streaming**: Server-Sent Events for live AI responses
- ✅ **Project Management**: Full CRUD operations with database persistence
- ✅ **Code Editing**: Advanced XML tool parsing for file creation and modification
- ✅ **Live Preview**: Automatic building and serving of generated websites
- ✅ **Modern UI**: Responsive design with shadcn/ui components
- ✅ **Development Workflow**: Hot reloading, TypeScript, testing with Vitest
- ✅ **Production Ready**: Docker support and optimized builds
- ✅ **Documentation**: Comprehensive architecture and implementation docs

The application is ready for demonstration and further development.

## 📚 Architecture

For detailed architecture information, see the [architecture documentation](./project_description/architecture.md).
