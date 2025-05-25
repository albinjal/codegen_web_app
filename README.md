# Codegen Web App

A web application that allows users to generate websites using AI.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (version >=22.0.0)
- npm (comes with Node.js)

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd codegen-web-app
    ```

2.  **Install dependencies:**
    This project uses npm workspaces. Install dependencies from the root directory:

    ```bash
    npm install
    ```

3.  **Set up the development environment:**
    This command will generate the Prisma client and run database migrations:

    ```bash
    npm run setup:dev
    ```

4.  **Run the development servers:**
    This will start both the backend and frontend development servers concurrently:
    ```bash
    npm run dev
    ```
    - Frontend will be available at `http://localhost:5173`
    - Backend API will be available at `http://localhost:3000` (proxied from the frontend)

## Available Scripts

From the root directory:

- `npm run dev`: Starts both backend and frontend development servers.
- `npm run dev:backend`: Starts the backend development server.
- `npm run dev:frontend`: Starts the frontend development server.
- `npm run build`: Builds both backend and frontend for production.
- `npm run start`: Starts the backend server (expects a production build).
- `npm run test`: Runs tests for both backend and frontend.
- `npm run lint`: Lints both backend and frontend.
- `npm run setup:dev`: Generates Prisma client and runs development database migrations.
- `npm run prisma:generate`: Generates Prisma client (delegates to backend workspace).
- `npm run prisma:migrate:dev`: Runs Prisma development migrations (delegates to backend workspace).
- `npm run prisma:migrate:deploy`: Runs Prisma deployment migrations (delegates to backend workspace).
- `npm run prisma:db:push`: Pushes Prisma schema to the database (delegates to backend workspace, use with caution).
- `npm run prisma:studio`: Opens Prisma Studio (delegates to backend workspace).

Refer to `backend/package.json` and `frontend/package.json` for workspace-specific scripts.

## Docker Development

If you prefer running the project with Docker, a compose file is included. Start everything with:

```bash
docker-compose up
```

This command installs dependencies, runs database setup, and launches both the backend and frontend.

The app will be available at `http://localhost:5173` and the API at `http://localhost:3000`.

Copy `.env.example` to `.env` and set your secrets. Docker Compose loads this file automatically, but you can also export variables before running `docker-compose up`.

## Running in Production Mode (Locally)

To run the application as it would be in a production environment (single server serving all assets):

1.  **Ensure dependencies are installed:**

    ```bash
    npm install
    ```

2.  **Build the application:**
    This command builds both the frontend and backend into their respective `dist` folders.

    ```bash
    npm run build
    ```

3.  **Set up for production deployment (if applicable):
    ** For a production deployment, you would typically use `prisma:migrate:deploy` instead of `prisma:migrate:dev`. Ensure your `.env` file is configured correctly for the production environment.
    `bash
    npm run prisma:migrate:deploy
    `

4.  **Start the production server:**
    This command starts the Fastify backend, which will serve the built frontend SPA, handle API requests, and serve project previews.

    ```bash
    npm run start
    ```

5.  **Access the application:**
    Open your browser and navigate to `http://localhost:3000`.

## Project Structure

This is a monorepo with the following workspaces:

- `backend`: Fastify server handling API requests and preview serving
  - `src`: Source code with modular architecture
  - `template`: React template used for new projects
  - `workspace`: Runtime storage for user-generated projects
- `frontend`: React SPA using Vite, Tailwind, and shadcn/ui
- `prisma`: Database models and migrations

## Environment Variables

Create a `.env` file in the root directory (you can copy `.env.example`) with the following variables:

```
# Required: Anthropic API key
ANTHROPIC_API_KEY=your_api_key_here

# Optional: Claude model selection (defaults to claude-3-5-sonnet-20240620 if not specified)
# Options: claude-3-opus-20240229, claude-3-5-sonnet-20240620, claude-3-haiku-20240307, etc.
CLAUDE_MODEL=claude-3-5-sonnet-20240620
```

## Architecture

For detailed architecture information, see the [architecture documentation](./project_description/architecture.md).

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
