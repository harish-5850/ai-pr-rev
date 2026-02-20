# AI-Powered Intelligent Pull Request Review System

An automated code review system that integrates with GitHub as a GitHub App, using Large Language Models (Claude) and static analysis tools (ESLint, Semgrep) to provide structured, actionable feedback on Pull Requests.

## Architecture

```
GitHub → Webhook → Backend (NestJS) → Queue (BullMQ/Redis) → AI Engine (Claude) + Static Analysis → GitHub Comments
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS (Node.js) |
| **Frontend** | Next.js |
| **Database** | PostgreSQL + Prisma ORM |
| **Queue** | BullMQ + Redis |
| **AI** | Anthropic Claude API |
| **Static Analysis** | ESLint, Semgrep |
| **Integration** | GitHub App API (Octokit) |

## Project Structure

```
ai-pr-reviewer/
├── apps/
│   ├── api/                  # NestJS Backend
│   │   ├── prisma/           # Database schema & migrations
│   │   └── src/
│   │       ├── ai/           # LLM integration (Claude)
│   │       ├── analysis/     # Static analysis (ESLint, Semgrep)
│   │       ├── config/       # Environment configuration
│   │       ├── github/       # GitHub App & webhooks
│   │       ├── health/       # Health check endpoint
│   │       ├── onboarding/   # Repo cloning & tech detection
│   │       ├── prisma/       # Database service
│   │       ├── queue/        # BullMQ job processing
│   │       └── review/       # Review orchestration & comments
│   └── web/                  # Next.js Frontend (Dashboard)
├── docker-compose.yml        # Local dev services (Postgres, Redis)
└── package.json              # Monorepo root
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- A GitHub App (for webhook integration)
- Anthropic API key (for Claude)

### Setup

1. **Clone & install dependencies**
   ```bash
   git clone <repo-url>
   cd ai-pr-reviewer
   npm install
   ```

2. **Start local services**
   ```bash
   docker-compose up -d
   ```

3. **Configure environment**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit .env with your GitHub App, Anthropic API key, etc.
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   npm run dev:api    # Backend on :3000
   npm run dev:web    # Frontend on :3001
   ```

### GitHub App Configuration

1. Create a new GitHub App at https://github.com/settings/apps
2. Set webhook URL to your server's `POST /api/webhooks/github`
3. Subscribe to **Pull Request** events
4. Generate and download the private key
5. Add credentials to `.env`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhooks/github` | GitHub webhook receiver |
| `GET` | `/api/health` | Health check |

## How It Works

1. A PR is opened/updated on GitHub
2. GitHub sends a webhook to the backend
3. The backend responds 200 immediately and enqueues a job
4. The background worker:
   - Fetches the PR diff and file list
   - Loads repository context (tech stack)
   - Runs AI analysis via Claude
   - Runs static analysis (ESLint + Semgrep)
   - Merges and prioritizes issues
   - Posts a structured review comment on the PR

## License

MIT
