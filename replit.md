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
- INVEST criteria checking for user stories
- AI-generated improvement suggestions
- Rewritten/improved version of the artifact
- Analysis history with persistence

## File Structure
- `shared/schema.ts` - Database schema and types (users, analyses tables with token tracking)
- `server/auth.ts` - Session setup, auth middleware, auth & admin API routes (incl. usage stats)
- `server/seed.ts` - Seeds initial admin user on first startup
- `server/routes.ts` - Analysis API endpoints with OpenAI logic and token capture (auth-protected)
- `server/storage.ts` - Database CRUD operations for users, analyses, and usage stats
- `server/db.ts` - PostgreSQL connection
- `client/src/App.tsx` - Auth-gated router
- `client/src/components/usage-dashboard.tsx` - Usage analytics dashboard component
- `client/src/pages/login.tsx` - Login page
- `client/src/pages/admin.tsx` - Admin user management page
- `client/src/pages/home.tsx` - Main page with sidebar layout
- `client/src/components/analysis-form.tsx` - Analysis input form
- `client/src/components/analysis-results.tsx` - Results display with score ring, original content tab
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

### Analyses (auth-required)
- `GET /api/analyses` - List all analyses
- `GET /api/analyses/:id` - Get single analysis
- `POST /api/analyses` - Create and run analysis
- `DELETE /api/analyses/:id` - Delete analysis

## Database
- PostgreSQL with `users` and `analyses` tables
- Session store via connect-pg-simple (auto-creates session table)
- Uses Drizzle ORM with `drizzle-kit push` for schema management

## Auth System
- Session-based auth with SESSION_SECRET env var (required)
- Passwords hashed with bcrypt (cost 10)
- Admin user seeded on first startup with random 12-char password (logged once)
- Admin can create new users via the admin panel; passwords are auto-generated and shown once
- Secure cookies in production (httpOnly, secure when NODE_ENV=production)

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
