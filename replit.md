# Agile Artifact Analyzer

## Overview
AI-powered Agile Artifact Analyzer for evaluating Epics, Features, User Stories, and Tasks against industry-standard agile methodologies (Scrum, SAFe, Kanban). Uses OpenAI GPT-5.2 via Replit AI Integrations with rigorous methodology guardrails. Mastercard-inspired color theme (dark grey sidebar, orange accents).

## Architecture
- **Frontend**: React + TypeScript + Vite with shadcn/ui, TanStack Query, wouter routing
- **Backend**: Express.js with PostgreSQL (Drizzle ORM), express-session with connect-pg-simple
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (no API key needed)
- **Auth**: Session-based with bcrypt password hashing, admin/user roles

## Key Features
- User authentication (login/logout, session-based)
- Admin user management (create users with auto-generated passwords, delete users)
- **Usage analytics dashboard** (total analyses, token usage, per-user stats, daily activity, recent analyses)
- Token tracking per analysis (prompt tokens, completion tokens, total tokens, model)
- Analyze Epics, Features, User Stories, and Tasks
- Quality scoring (0-100) with category breakdowns
- **Individual INVEST scores** for stories (Independent, Negotiable, Valuable, Estimable, Small, Testable) with progress bars
- **Quality checks**: Clarity score, Completeness score, boolean checks (AC Present, User Role Defined, Business Value Clear)
- **Complexity & Risk Level** tags (Low/Medium/High)
- AI-generated improvement suggestions
- Rewritten/improved version of the artifact
- Analysis history with persistence
- **Jira Connect** page (UI-ready stub) for Jira integration config, import, sync toggles, writeback settings

## File Structure
- `shared/schema.ts` - Database schema and types (users, analyses, reference_documents tables)
- `server/auth.ts` - Session setup, auth middleware, auth & admin API routes (incl. usage stats, document management)
- `server/seed.ts` - Seeds initial admin user on first startup
- `server/routes.ts` - Analysis API endpoints with OpenAI logic, RAG integration, and token capture
- `server/storage.ts` - Database CRUD operations for users, analyses, usage stats, and reference documents
- `server/pdf-processor.ts` - PDF text extraction, chunking, embedding generation, and storage for RAG
- `server/db.ts` - PostgreSQL connection
- `client/src/App.tsx` - Auth-gated router
- `client/src/components/usage-dashboard.tsx` - Usage analytics dashboard component
- `client/src/pages/login.tsx` - Login page
- `client/src/pages/admin.tsx` - Admin user management page
- `client/src/pages/home.tsx` - Main page with sidebar layout
- `client/src/components/analysis-form.tsx` - Analysis input form
- `client/src/components/analysis-results.tsx` - Results display with score ring, INVEST bars, quality checks, complexity/risk
- `client/src/pages/jira-connect.tsx` - Jira integration configuration page
- `client/src/components/analysis-history.tsx` - Sidebar history list

## API Endpoints
### Auth
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Admin (admin-only)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user (auto-generates 12-char password)
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/usage` - Usage analytics (total analyses, token stats, per-user/type/daily breakdowns)
- `GET /api/admin/documents` - List reference document summaries (name, chunk count, date)
- `POST /api/admin/process-documents` - Trigger processing of all PDF documents (async)
- `POST /api/admin/process-document/:docName` - Process a single document (async)
- `DELETE /api/admin/documents/:docName` - Delete all chunks for a document

### Analyses (auth-required)
- `GET /api/analyses` - List all analyses
- `GET /api/analyses/:id` - Get single analysis
- `POST /api/analyses` - Create and run analysis
- `DELETE /api/analyses/:id` - Delete analysis

## Database
- PostgreSQL with `users`, `analyses`, and `reference_documents` tables
- Session store via connect-pg-simple (auto-creates session table)
- Uses Drizzle ORM with `drizzle-kit push` for schema management

## RAG System
- **PDF Processing**: Extracts text from PDFs using `pdf-parse` v2 (PDFParse class with `load()` + `getPage().getTextContent()` API), splits by page markers into chunks
- **Documents**: Epic-Standards (8 chunks), Feature-Standard (4 chunks), The_Lighthouse (300 chunks) stored in `attached_assets/`
- **Text Search**: Uses PostgreSQL full-text search (`tsvector/tsquery` with `ts_rank_cd`) instead of vector embeddings (Replit AI Integrations don't support the embeddings endpoint)
- **Analysis Integration**: Before each analysis, relevant reference chunks are retrieved via text search and included in the prompt as "Company Reference Standards" with document name and page citations
- **Output**: Analysis results include optional `references` array with docName, pageNumber, excerpt, and relevance
- **Admin UI**: Reference Docs tab in admin dashboard to process, view, and delete documents
- **CommonJS Compatibility**: `pdf-parse` v2 uses `createRequire(import.meta.url)` pattern for ESM compatibility

## Auth System
- Session-based auth with SESSION_SECRET env var (required)
- Passwords hashed with bcrypt (cost 10)
- Admin user seeded on first startup with random 12-char password (logged once)
- Admin can create new users via the admin panel; passwords are auto-generated and shown once
- Secure cookies in production (httpOnly, secure when NODE_ENV=production)

## OpenAI Configuration
- On Replit: uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` (auto-provided)
- Standalone/VM: uses `OPENAI_API_KEY` env var (set your own key)
- Falls back gracefully: `AI_INTEGRATIONS_OPENAI_API_KEY || OPENAI_API_KEY`

## Jira Integration
- Jira Connect page exists as a UI stub (client/src/pages/jira-connect.tsx)
- Replit Jira connector available (`connector:ccfg_jira_8D0B4B1730F64429A4FC3ACB88`) but user dismissed OAuth flow
- For standalone deployment, Jira connection would need manual API token configuration

## Self-Hosting
- See `SELF_HOSTING.md` for complete VM deployment instructions
- Build: `npm run build` -> Production: `npm start`
- Requires: Node.js 20+, PostgreSQL 14+, OPENAI_API_KEY

## Theme
- Mastercard-inspired: dark charcoal grey sidebar, orange (#FF5F00) accent buttons/icons
- Navy blue primary in light mode, orange primary in dark mode
- Warm neutral backgrounds

## Analysis Methodology Guardrails
Each artifact type is evaluated against strict agile methodology standards (Scrum, SAFe):
- **Epic**: Business Value & Strategic Alignment, Scope & Boundaries, Success Criteria & KPIs, Feature Decomposition Readiness, Risk/Dependencies & Sizing
- **Feature**: Benefit Hypothesis & User Value, Strategic Alignment (Epic linkage), Acceptance Criteria & DoD, Story Decomposition Readiness, NFRs & Dependencies
- **Story**: Story Format, INVEST criteria (all 6), Given/When/Then acceptance criteria, edge cases, DoD
- **Task**: Clarity & Technical Specification, Parent Story Linkage, Effort Estimation, Binary Completion Criteria, Dependencies & Technical Approach
