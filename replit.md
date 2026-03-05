# Story Quality Analyzer

## Overview
AI-powered Story Quality Analyzer for evaluating agile artifacts (Epics, Features, User Stories, Tasks) against best practices. Uses OpenAI GPT-5.2 via Replit AI Integrations.

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

## Analysis Categories by Type
- **Epic**: Business Value, Scope, Success Criteria, Decomposability, Risk & Dependencies
- **Feature**: Capability Description, User Value, Acceptance Criteria, Decomposability, NFRs
- **Story**: Format & Structure, Independence, Value Proposition, Estimability, Testability
- **Task**: Clarity, Actionability, Estimation, Completion Criteria, Dependencies
