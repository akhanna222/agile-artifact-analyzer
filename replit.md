# Agile Artifact Analyzer

## Overview
AI-powered Agile Artifact Analyzer for evaluating Epics, Features, User Stories, and Tasks against industry-standard agile methodologies (Scrum, SAFe, INVEST). Uses OpenAI **gpt-4o** via Replit AI Integrations (or a self-supplied `OPENAI_API_KEY` on standalone deployments). Mastercard-inspired color theme — dark charcoal sidebar, orange accents.

## Architecture
- **Frontend**: React + TypeScript + Vite with shadcn/ui, TanStack Query, wouter routing
- **Backend**: Express.js with PostgreSQL (Drizzle ORM), express-session with connect-pg-simple
- **AI**: OpenAI gpt-4o — `max_completion_tokens: 4096`, `response_format: json_object`, 90 s timeout
- **Auth**: Session-based with bcrypt password hashing, admin/user roles
- **Jira**: Full read/write integration — Cloud (REST v3, Basic auth) and Data Center (REST v2, Bearer PAT)

## Key Features
- User authentication (login/logout, session-based)
- Admin user management (create users with auto-generated passwords, delete users)
- **Usage analytics dashboard** (total analyses, token usage, per-user stats, daily activity, recent analyses)
- Token tracking per analysis (prompt tokens, completion tokens, total tokens, model)
- Analyze Epics, Features, User Stories, and Tasks against Scrum/SAFe/INVEST guardrails
- Quality scoring (0–100) with per-category breakdowns
- **Individual INVEST scores** for stories (Independent, Negotiable, Valuable, Estimable, Small, Testable) with progress bars
- **Quality checks**: Clarity score, Completeness score, boolean checks (AC Present, User Role Defined, Business Value Clear)
- **Complexity & Risk Level** tags (Low/Medium/High)
- AI-generated improvement suggestions and full rewritten improved version
- Analysis history with persistence
- **RAG system** — 312 chunks from 3 reference PDFs, PostgreSQL full-text search
- **Full Jira integration**: browse issues, import to analyzer, write rich quality reports back as comments, update issue description with improved version, quality labels

## File Structure
- `shared/schema.ts` — Database schema and types (users, analyses, reference_documents, jira_connections tables)
- `server/auth.ts` — Session setup, auth middleware, auth & admin API routes (incl. usage stats, document management)
- `server/seed.ts` — Seeds initial admin user on startup; resets password to `admin123` on every start
- `server/routes.ts` — Analysis, Jira, and admin API endpoints with OpenAI logic, RAG integration, token capture
- `server/jira.ts` — JiraClient class (Cloud + Data Center), search, comment, updateIssue, updateIssueLabel
- `server/storage.ts` — Database CRUD for users, analyses, usage stats, reference documents, jira connections
- `server/pdf-processor.ts` — PDF text extraction, chunking, full-text storage for RAG
- `server/db.ts` — PostgreSQL connection (Drizzle)
- `client/src/App.tsx` — Auth-gated router
- `client/src/pages/home.tsx` — Main analysis page with sidebar layout and Jira import flow
- `client/src/pages/login.tsx` — Login page
- `client/src/pages/admin.tsx` — Admin panel: user management, usage analytics, reference docs
- `client/src/pages/jira-connect.tsx` — Full Jira connect/browse/import page (Cloud + Data Center)
- `client/src/components/analysis-form.tsx` — Analysis input form with Jira pre-fill support
- `client/src/components/analysis-results.tsx` — Results: score ring, INVEST bars, category findings, improved version, Write to Jira dialog
- `client/src/components/analysis-history.tsx` — Sidebar history list
- `client/src/components/usage-dashboard.tsx` — Usage analytics dashboard

## API Endpoints

### Auth
- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user

### Admin (admin-only)
- `GET /api/admin/users` — List all users
- `POST /api/admin/users` — Create user (auto-generates 12-char password)
- `DELETE /api/admin/users/:id` — Delete user
- `GET /api/admin/usage` — Usage analytics (total analyses, token stats, per-user/type/daily breakdowns)
- `GET /api/admin/documents` — List reference document summaries
- `POST /api/admin/process-documents` — Trigger processing of all PDF documents (async)
- `POST /api/admin/process-document/:docName` — Process a single document (async)
- `DELETE /api/admin/documents/:docName` — Delete all chunks for a document

### Analyses (auth-required)
- `GET /api/analyses` — List all analyses
- `GET /api/analyses/:id` — Get single analysis
- `POST /api/analyses` — Create and run analysis (polls async job)
- `DELETE /api/analyses/:id` — Delete analysis

### Jira (auth-required)
- `GET /api/jira/status` — Current connection status and saved credentials
- `POST /api/jira/connect` — Test and save Jira credentials (Cloud or Data Center)
- `DELETE /api/jira/connect` — Remove Jira connection
- `GET /api/jira/test` — Test existing saved connection
- `GET /api/jira/issues` — Fetch issues from connected project
- `PUT /api/jira/issue/:key` — Update issue summary/description in Jira
- `POST /api/jira/issue/:key/writeback` — Post full quality report as comment + optional label + optional description update

## Database
- PostgreSQL with `users`, `analyses`, `reference_documents`, and `jira_connections` tables
- Session store via connect-pg-simple (auto-creates `session` table)
- Uses Drizzle ORM with `drizzle-kit push` for schema management
- `jira_connections.jiraType` column: `'cloud'` (default) or `'datacenter'`

## Jira Integration Details
- **Cloud**: Basic auth — `base64(email:apiToken)`, REST API v3, tokens from `id.atlassian.com`
- **Data Center / Server**: Bearer PAT auth, REST API v2, tokens from Jira profile → Personal Access Tokens
- **Write-back comment** includes: overall score + label, AI summary, per-category findings & suggestions, and full improved version text — all formatted as ADF (Cloud) or plain text (Data Center)
- **Search endpoint**: Cloud uses `/rest/api/3/search/jql` (Atlassian CHANGE-2046 compliant); Data Center uses `/rest/api/2/search`
- Credentials saved to DB only after a successful connection test

## RAG System
- **PDF Processing**: Extracts text from PDFs using `pdf-parse` v2, splits by page markers into chunks
- **Documents**: Epic-Standards (8 chunks), Feature-Standard (4 chunks), The_Lighthouse (300 chunks) in `attached_assets/`
- **Text Search**: PostgreSQL full-text search (`tsvector/tsquery` with `ts_rank_cd`) — vector embeddings not used (not available on Replit AI proxy)
- **Analysis Integration**: Relevant chunks retrieved and included in prompt as "Company Reference Standards" with citations
- **CommonJS Compatibility**: `pdf-parse` v2 loaded via `createRequire(import.meta.url)` for ESM compatibility

## Auth System
- Session-based auth with `SESSION_SECRET` env var (required)
- Passwords hashed with bcrypt (cost 10)
- Default admin: `admin@mastercard.com` / `admin123` — reset on every server start via `seed.ts`
- Admin can create new users via the admin panel; passwords are auto-generated and shown once
- Secure cookies in production (`httpOnly`, `secure` when `NODE_ENV=production`)

## OpenAI Configuration
- **On Replit**: uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` (auto-provided by AI Integration)
- **Standalone / VM / Container**: set `OPENAI_API_KEY=sk-...` in environment — no other changes needed
- Falls back gracefully: `AI_INTEGRATIONS_OPENAI_API_KEY || OPENAI_API_KEY`
- Model: `gpt-4o`, `max_completion_tokens: 4096`, `response_format: { type: "json_object" }`, 90 s AbortController timeout

## Self-Hosting / Deployment
- See `SELF_HOSTING.md` for VM, Docker, and Docker Compose deployment instructions
- Build: `npm run build` → Production: `npm start` (port 5000)
- Requires: Node.js 20+, PostgreSQL 14+, `OPENAI_API_KEY`

## Theme
- Mastercard-inspired: dark charcoal grey sidebar (`hsl(0,0%,15%)`), orange accent (`hsl(22,100%,50%)`)
- Responsive layout with collapsible sidebar

## Analysis Methodology Guardrails
Each artifact type is evaluated against strict agile methodology standards (Scrum, SAFe, INVEST):
- **Epic**: Business Value & Strategic Alignment, Scope & Boundaries, Success Criteria & KPIs, Feature Decomposition Readiness, Risk/Dependencies & Sizing
- **Feature**: Benefit Hypothesis & User Value, Strategic Alignment (Epic linkage), Acceptance Criteria & DoD, Story Decomposition Readiness, NFRs & Dependencies
- **Story**: Story Format (As a/I want/So that), INVEST criteria (all 6 scored individually), Given/When/Then acceptance criteria, edge cases, DoD
- **Task**: Clarity & Technical Specification, Parent Story Linkage, Effort Estimation, Binary Completion Criteria, Dependencies & Technical Approach
