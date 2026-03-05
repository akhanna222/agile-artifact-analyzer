# Agile Artifact Analyzer

## Overview
AI-powered Agile Artifact Analyzer for evaluating Epics, Features, User Stories, and Tasks against industry-standard agile methodologies (Scrum, SAFe, Kanban). Uses OpenAI GPT-5.2 via Replit AI Integrations with rigorous methodology guardrails.

## Architecture
- **Frontend**: React + TypeScript + Vite with shadcn/ui, TanStack Query, wouter routing
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (no API key needed)

## Key Features
- Analyze Epics, Features, User Stories, and Tasks
- Quality scoring (0-100) with category breakdowns
- INVEST criteria checking for user stories
- AI-generated improvement suggestions
- Rewritten/improved version of the artifact
- Analysis history with persistence

## File Structure
- `shared/schema.ts` - Database schema and types (analyses table)
- `server/routes.ts` - API endpoints with OpenAI analysis logic
- `server/storage.ts` - Database CRUD operations
- `server/db.ts` - PostgreSQL connection
- `client/src/pages/home.tsx` - Main page with layout
- `client/src/components/analysis-form.tsx` - Analysis input form
- `client/src/components/analysis-results.tsx` - Results display with score ring
- `client/src/components/analysis-history.tsx` - Sidebar history list

## API Endpoints
- `GET /api/analyses` - List all analyses
- `GET /api/analyses/:id` - Get single analysis
- `POST /api/analyses` - Create and run analysis
- `DELETE /api/analyses/:id` - Delete analysis

## Database
- PostgreSQL with `analyses` table
- Uses Drizzle ORM with `drizzle-kit push` for schema management

## Analysis Methodology Guardrails
Each artifact type is evaluated against strict agile methodology standards (Scrum, SAFe):
- **Epic**: Business Value & Strategic Alignment, Scope & Boundaries, Success Criteria & KPIs, Feature Decomposition Readiness, Risk/Dependencies & Sizing. Checks for Lean Business Case, OKR alignment, anti-patterns.
- **Feature**: Benefit Hypothesis & User Value, Strategic Alignment (Epic linkage), Acceptance Criteria & DoD, Story Decomposition Readiness, NFRs & Dependencies. Checks for proper hierarchy placement.
- **Story**: Story Format (As a/I want/So that), INVEST criteria (all 6: Independent, Negotiable, Valuable, Estimable, Small, Testable), Given/When/Then acceptance criteria, edge cases, DoD. Flags anti-patterns like technical tasks disguised as stories.
- **Task**: Clarity & Technical Specification, Parent Story Linkage, Effort Estimation (hours-based), Binary Completion Criteria, Dependencies & Technical Approach. Recognizes task types (dev, test, devops, spike).
