# Russable 🚗💨
![Welcome to Russable](frontend/assets/welcome.png)

**The billionaire's choice for AI-powered web development. This guy fucks... at coding!**

*"I'm just gonna say it. This guy fucks. Am I right? 'Cause I'm looking at the rest of you guys, and this is the guy in the house doing all the fucking."* - Russ Hanneman, Three Comma Club Member

Welcome to **Russable**, the most exclusive AI-powered website generator in Silicon Valley! Just like how I put radio on the internet and made my billions, Russable puts your ideas on the internet and makes them fucking amazing.

Users can describe what they want to build, and my AI (with my personality, obviously) generates complete websites with modern React, TypeScript, and Tailwind CSS. It's like having a billion-dollar development team in your pocket!

## 💰 Key Features (Three Comma Club Approved)

- **Conversational Website Generation**: Tell me your vision, I'll make it reality - ROI, baby!
- **Real-time Preview**: Watch your website update faster than my McLaren accelerates
- **Intelligent Code Editing**: My AI understands context better than most VCs understand innovation
- **Modern Tech Stack**: Built with React, TypeScript, Tailwind CSS, and Vite - only the best shit
- **Project Management**: Manage multiple billion-dollar ideas like I manage my portfolio
- **Streaming Responses**: Real-time AI responses using Server-Sent Events (faster than my Bugatti)
- **Production Ready**: Modular architecture that's more organized than my car collection

## 🏗️ Technical Overview (For the Nerds)

This application demonstrates sophisticated full-stack development that would make even Gavin Belson jealous:

- **Modular Backend Architecture**: Clean separation like my business and personal lawsuits
- **AI Integration**: Advanced XML tool parsing that's more precise than my investment strategies
- **Real-time Communication**: Server-Sent Events for streaming responses faster than insider trading
- **Workspace Management**: Dynamic project creation with more security than my offshore accounts
- **Database Design**: Efficient data modeling that's cleaner than my money laundering... I mean, legitimate business operations
- **Development Experience**: Hot reloading, TypeScript throughout, comprehensive testing
- **Deployment Options**: Both npm and Docker workflows because I believe in diversification

For detailed technical documentation, see [`project_description/architecture.md`](./project_description/architecture.md) - it's like my business plan but actually readable.

## Getting Started (Let's Make Some Money!)

These instructions will get you a copy of the project up and running faster than you can say "Three Comma Club."

### Prerequisites

**For both Docker and npm routes:**
- Git (for cloning the repository - even billionaires use version control)

**For npm route only:**
- Node.js (version >=22.0.0 - only the latest and greatest)
- npm (comes with Node.js - like how success comes with being me)

**For Docker route only:**
- Docker and Docker Compose (containerization is like diversification for code)

### Initial Setup (Required for Both Routes)

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/albinjal/codegen_web_app
    cd russable
    ```

2.  **Set up environment variables:**
    Copy the example environment file and configure your secrets (like my offshore accounts):

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file and set the following variables:
    - `PORT=3000` (default port - like my default McLaren)
    - `ANTHROPIC_API_KEY` (your Anthropic API key - this is where the magic happens)
    - `CLAUDE_MODEL=claude-3-5-sonnet-latest` (only the best AI model, obviously)

### Option A: Installation & Setup with npm (The Classic Route)

3.  **Install dependencies:**
    This project uses npm workspaces (organized like my business empire):

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
    - Frontend will be available at `http://localhost:5173` (your new money-making machine)
    - Backend API will be available at `http://localhost:3000` (the engine of success)

### Option B: Installation & Setup with Docker (The Fancy Route)

3.  **Start with Docker Compose:**
    This command installs dependencies, runs database setup, and launches both the backend and frontend:

    ```bash
    docker-compose up
    ```

    The app will be available at `http://localhost:5173` and the API at `http://localhost:3000`.

## 📁 Project Structure (Organized Like My Portfolio)

This is a professionally organized monorepo using npm workspaces (because organization = profitability):

```
russable/
├── backend/                 # Fastify TypeScript server (the money maker)
│   ├── src/
│   │   ├── config/         # Environment & configuration (like my investment strategy)
│   │   ├── core/           # Server & database core (the foundation of success)
│   │   ├── modules/        # Feature modules (health, projects - diversification!)
│   │   ├── routes/         # Route registration (the roadmap to success)
│   │   └── services/       # AI integration & build services (the magic happens here)
│   ├── template/           # React template for new projects (the blueprint for billions)
│   └── workspace/          # Generated user projects (where dreams become reality)
├── frontend/               # React SPA with modern tooling (the face of success)
│   └── src/
│       ├── components/     # shadcn/ui components (beautiful like my car collection)
│       ├── hooks/          # Custom React hooks (reusable like my pickup lines)
│       ├── lib/            # Utilities (tools for success)
│       └── pages/          # Landing & Project pages (the user experience)
├── prisma/                 # Database schema & migrations (data organization)
└── project_description/    # Comprehensive documentation (the manual for billions)
```

**Key Design Decisions (Approved by the Three Comma Club):**
- **Monorepo**: Simplified dependency management like my simplified tax structure
- **TypeScript Throughout**: Type safety across the entire stack (precision like my McLaren)
- **Modular Architecture**: Each feature is self-contained with clear boundaries (like my business ventures)
- **Workspace Isolation**: User projects are sandboxed and securely managed (security like my offshore accounts)

## 🚀 Current Status (Fucking Amazing!)

**✅ Fully Functional MVP Complete (Like My First Billion)**

All core features have been implemented and tested (more thoroughly than my background checks):

- ✅ **AI Website Generation**: Complete integration with Anthropic's Claude API (the brain of the operation)
- ✅ **Real-time Streaming**: Server-Sent Events for live AI responses (faster than my car collection)
- ✅ **Project Management**: Full CRUD operations with database persistence (organized like my empire)
- ✅ **Code Editing**: Advanced XML tool parsing for file creation and modification (precision engineering)
- ✅ **Live Preview**: Automatic building and serving of generated websites (instant gratification)
- ✅ **Modern UI**: Responsive design with shadcn/ui components (beautiful like my lifestyle)
- ✅ **Development Workflow**: Hot reloading, TypeScript, testing with Vitest (professional grade)
- ✅ **Production Ready**: Docker support and optimized builds (enterprise level)
- ✅ **Documentation**: Comprehensive architecture and implementation docs (more detailed than my tax returns)

The application is ready for demonstration and further development. It's basically the Tesla of web development tools!

## 📚 Architecture (The Blueprint for Success)

For detailed architecture information, see the [architecture documentation](./project_description/architecture.md) - it's like my business plan but actually useful.

## 🎯 ROI (Return on Investment... or Radio on Internet)

*"You know what ROI stands for? Radio on Internet. That's how I made my first billion, and that's how you'll make yours with Russable!"*

---

**Remember: This guy fucks... at web development!** 🚗💨💰

*Built with love, money, and a lot of fucking attitude by the Three Comma Club.*
