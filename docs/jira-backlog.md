# Agile Artifact Analyzer — Jira Backlog

> **Hierarchy:** Epic → Feature → Story → Task (Sub-task)
> **Project:** Agile Artifact Analyzer
> **Last Updated:** March 2026

---

# EPIC — agile-artifact-analyzer
> An AI-powered platform that evaluates Agile artifacts (Epics, Features, User Stories, Tasks) against Scrum/SAFe/INVEST standards using GPT-4o, featuring Mastercard-inspired design, user authentication, admin management, usage analytics, and a RAG system built from company standard PDFs with page-level citations.

---

## FEATURE 1 — User Authentication & Access Control
> Enable secure login, session management, and role-based access for all users.

---

### STORY 1.1 — User Login & Session Management
**As a** user,
**I want to** log in securely and maintain my session,
**So that** I can access the analyzer without re-authenticating on every visit.

**Acceptance Criteria:**
- Login form accepts email and password
- Invalid credentials show a clear error message
- Successful login redirects to the analysis dashboard
- Session persists across browser refreshes
- Logout button destroys session and redirects to login

**Tasks:**
- [ ] Build login form UI with email and password fields
- [ ] Implement POST `/api/login` endpoint with bcrypt password verification
- [ ] Create session middleware using express-session with SESSION_SECRET
- [ ] Add form validation with descriptive error messages
- [ ] Redirect already-authenticated users away from login page
- [ ] Add logout button to the top navigation bar
- [ ] Implement POST `/api/logout` endpoint that destroys the session
- [ ] Redirect to login page after successful logout

---

### STORY 1.2 — Protected Routes & Authorization
**As a** system,
**I want to** protect all application routes from unauthorized access,
**So that** only authenticated users can use the app and only admins can access admin features.

**Acceptance Criteria:**
- Unauthenticated users are redirected to login for all pages
- API routes return HTTP 401 if no valid session exists
- Admin-only routes return HTTP 403 for non-admin users
- Admin users see the "Admin Panel" link in the navigation
- Regular users cannot access the `/admin` page

**Tasks:**
- [ ] Create `requireAuth` middleware applied to all protected API routes
- [ ] Create `requireAdmin` middleware applied to admin-only API routes
- [ ] Add frontend auth check that redirects to login if session is absent
- [ ] Add `is_admin` boolean column to users database table
- [ ] Expose `isAdmin` flag in GET `/api/user` response
- [ ] Conditionally render Admin Panel navigation link based on `isAdmin`
- [ ] Guard `/admin` frontend route and return 403 from backend for non-admins

---

## FEATURE 2 — AI-Powered Artifact Analysis
> Analyze Agile artifacts against Scrum/SAFe/INVEST standards using GPT-4o with async processing and real-time polling.

---

### STORY 2.1 — Artifact Submission & Async Processing
**As a** user,
**I want to** submit an Agile artifact and receive AI-powered quality analysis,
**So that** I can understand how well it meets Agile standards.

**Acceptance Criteria:**
- User can enter a title, select artifact type (Epic/Feature/User Story/Task), and paste content
- Submitting the form immediately shows a loading/pending state
- Analysis processes in the background without blocking the UI
- Frontend automatically polls and displays results when ready
- A 90-second timeout shows a clear error if analysis hangs
- Failed analyses show an error state with a retry option

**Tasks:**
- [ ] Build artifact submission form with title input, type dropdown, and content textarea
- [ ] Implement POST `/api/analyses` that saves artifact and returns `status: pending` immediately
- [ ] Process analysis asynchronously after returning the pending response
- [ ] Show loading spinner and pending state in the UI after submission
- [ ] Poll GET `/api/analyses/:id` every 2 seconds until `completed` or `failed`
- [ ] Implement AbortController with 90-second timeout on OpenAI API call
- [ ] Update analysis record with results and `status: completed` on success
- [ ] Set `status: failed` and store error details on failure
- [ ] Store token usage (prompt, completion, total tokens) and model name with each analysis

---

### STORY 2.2 — Analysis Results — Score & Summary
**As a** user,
**I want to** see an overall quality score and plain-language summary for my artifact,
**So that** I can quickly understand its overall quality level.

**Acceptance Criteria:**
- Overall score displayed as a number out of 100
- Score colour-coded: green (≥75), amber (50–74), red (<50)
- AI-generated plain-language summary paragraph displayed below the score
- Score animates in when results first load

**Tasks:**
- [ ] Display overall score with colour-coded badge and circular progress ring
- [ ] Render the AI-generated summary text beneath the score
- [ ] Add animated score reveal transition when results load

---

### STORY 2.3 — Analysis Results — Category Breakdown
**As a** user,
**I want to** see quality scores and findings broken down by category,
**So that** I know exactly which areas of my artifact need improvement.

**Acceptance Criteria:**
- Each category shows: name, score (0–100), status (pass/warning/fail)
- Findings listed per category explaining what was found
- Suggestions listed per category explaining how to improve
- Categories are tailored to the artifact type submitted

**Tasks:**
- [ ] Render category cards with score, status badge, findings list, and suggestions list
- [ ] Define per-artifact-type category sets in the AI prompt (Epic/Feature/Story/Task)
- [ ] Map status values (pass/warning/fail) to colours (green/amber/red)

---

### STORY 2.4 — Analysis Results — INVEST Scoring (User Stories)
**As a** user analyzing a User Story,
**I want to** see scores for each INVEST dimension,
**So that** I can evaluate it against the widely accepted INVEST framework.

**Acceptance Criteria:**
- INVEST section appears only for User Story artifact type
- Six dimensions scored independently: Independent, Negotiable, Valuable, Estimable, Small, Testable
- Each score displayed as a labelled progress bar out of 100

**Tasks:**
- [ ] Add `investScores` object to the analysis result schema
- [ ] Include INVEST scoring instructions in the User Story AI prompt
- [ ] Build INVEST score display component with 6 labelled progress bars
- [ ] Conditionally render INVEST section only when artifact type is User Story

---

### STORY 2.5 — Analysis Results — Enhanced Metadata & Quality Indicators
**As a** user,
**I want to** see additional quality indicators alongside the main score,
**So that** I have a complete and nuanced picture of my artifact's quality.

**Acceptance Criteria:**
- Clarity score (0–100)
- Completeness score (0–100)
- Acceptance criteria present: Yes/No
- User role defined: Yes/No
- Business value clear: Yes/No
- Complexity: Low / Medium / High
- Risk level: Low / Medium / High

**Tasks:**
- [ ] Add all 7 metadata fields to the analysis result schema
- [ ] Include metadata extraction instructions in the AI prompt
- [ ] Build a metadata indicator panel displaying all 7 fields with icons

---

### STORY 2.6 — Analysis Results — AI-Generated Improved Version
**As a** user,
**I want to** see a rewritten version of my artifact produced by the AI,
**So that** I have a concrete example of how to improve it.

**Acceptance Criteria:**
- AI rewrites the artifact applying all suggested improvements
- Improved version shown in a clearly labelled panel
- User can copy the improved version to clipboard with one click

**Tasks:**
- [ ] Add `improvedVersion` field to the analysis result schema
- [ ] Instruct AI to produce a rewritten artifact in the prompt
- [ ] Display improved version in a styled text/code block
- [ ] Add copy-to-clipboard button with visual confirmation

---

### STORY 2.7 — Analysis Results — RAG Citations from Reference Documents
**As a** user,
**I want to** see which company standard document pages informed the analysis,
**So that** I understand the specific standards being applied to my artifact.

**Acceptance Criteria:**
- Up to 3 relevant document excerpts shown per analysis
- Each citation displays: document name, page number, excerpt text, and relevance explanation
- Citations visually distinguished from the main analysis content

**Tasks:**
- [ ] Search reference documents using PostgreSQL full-text search at analysis time
- [ ] Retrieve top 3 most relevant chunks (max 800 characters each)
- [ ] Inject retrieved chunks into the AI prompt as grounding context
- [ ] Add `references` array to the analysis result schema
- [ ] Build citations panel showing doc name, page number, excerpt, and relevance per item

---

### STORY 2.8 — Analysis History
**As a** user,
**I want to** view and manage my previous analyses,
**So that** I can track quality improvements over time and remove old entries.

**Acceptance Criteria:**
- Sidebar lists all analyses for the current user, newest first
- Each item shows title, artifact type, overall score, and date
- Clicking an item loads its full results
- Empty state shown when no analyses exist
- Each item has a delete button with a confirmation step
- Deleting removes the item from the list immediately

**Tasks:**
- [ ] Implement GET `/api/analyses` returning the current user's analyses ordered by date
- [ ] Build analysis history list in the sidebar with title, type badge, score, and date
- [ ] Add click handler on each list item to load and display its results
- [ ] Show empty state illustration and prompt when no analyses exist
- [ ] Implement DELETE `/api/analyses/:id` endpoint
- [ ] Add delete button to each list item with a confirmation dialog
- [ ] Invalidate and refresh the analyses query cache after successful deletion

---

## FEATURE 3 — Admin Panel
> Provide administrators with tools to manage users, monitor platform usage, and control the RAG knowledge base.

---

### STORY 3.1 — Usage Analytics Dashboard
**As an** admin,
**I want to** see aggregated usage statistics for the entire platform,
**So that** I can monitor adoption and track AI API costs.

**Acceptance Criteria:**
- Total number of analyses run shown as a headline metric
- Total token usage broken down by prompt, completion, and total
- Analysis count broken down by artifact type
- Per-user analysis count table
- All data refreshes on each page load

**Tasks:**
- [ ] Implement GET `/api/admin/usage` with aggregation queries across all analyses
- [ ] Display total analyses count as a headline card
- [ ] Display token usage breakdown (prompt / completion / total)
- [ ] Build artifact type breakdown table or chart
- [ ] Build per-user activity table with email and analysis count

---

### STORY 3.2 — User Management
**As an** admin,
**I want to** create, view, and remove user accounts,
**So that** I can control who has access to the platform.

**Acceptance Criteria:**
- Table lists all users with email, admin role indicator, and registration date
- Admin can create a new user with email, password, and optional admin flag
- Duplicate email shows a validation error on creation
- Admin can delete any user except their own account
- Confirmation dialog shown before deletion

**Tasks:**
- [ ] Implement GET `/api/admin/users` endpoint returning all users
- [ ] Build users table with email, isAdmin badge, and createdAt columns
- [ ] Implement POST `/api/admin/users` with email/password/isAdmin validation
- [ ] Hash password with bcrypt before storing on creation
- [ ] Build Create User form in admin panel with validation error display
- [ ] Implement DELETE `/api/admin/users/:id` endpoint
- [ ] Prevent self-deletion with a validation error response
- [ ] Add delete button per row with confirmation dialog
- [ ] Refresh users list automatically after create or delete

---

### STORY 3.3 — Reference Document Management
**As an** admin,
**I want to** view, process, and clear reference documents in the RAG knowledge base,
**So that** I can keep the AI's grounding context up to date.

**Acceptance Criteria:**
- Documents tab lists all processed documents with their chunk counts
- Empty state shown if no documents are loaded
- "Process All" button triggers bulk PDF processing and shows results
- "Delete All" button clears the entire knowledge base after confirmation

**Tasks:**
- [ ] Implement GET `/api/admin/documents` returning document names and chunk counts
- [ ] Build documents list in admin panel Documents tab with empty state
- [ ] Implement POST `/api/admin/documents/process-all` to run PDF extraction and chunking
- [ ] Display per-document processing results (name, chunks, status) after processing
- [ ] Show success/failure toast notification after processing completes
- [ ] Implement DELETE `/api/admin/documents` to clear all chunks from the database
- [ ] Add confirmation dialog before triggering bulk delete
- [ ] Refresh document list after process or delete actions

---

## FEATURE 4 — RAG (Retrieval-Augmented Generation) System
> Build and query a knowledge base from company standards PDFs to ground AI analysis in real documented standards.

---

### STORY 4.1 — PDF Processing Pipeline
**As a** system,
**I want to** extract and store text from company standards PDFs,
**So that** relevant content can be retrieved and used to ground AI analysis.

**Acceptance Criteria:**
- PDFs are parsed page by page using pdf-parse
- Each page stored as a separate chunk with document name and page number
- Processing works correctly in both development and production (CJS/ESM compatible)
- Bulk processing returns a result summary per document

**Tasks:**
- [ ] Integrate `pdf-parse` library using `globalThis.require` for CJS/ESM compatibility
- [ ] Split extracted PDF text into page-level chunks
- [ ] Store each chunk with `doc_name`, `page_number`, and `content` fields in `reference_documents` table
- [ ] Add `pdf-parse` and `bcrypt` to `neverBundle` in the production build config
- [ ] Implement `processAllDocuments()` function returning per-document results

---

### STORY 4.2 — Full-Text Search & Context Retrieval
**As a** system,
**I want to** retrieve the most relevant document chunks for a given artifact,
**So that** the AI prompt is grounded in applicable company standards.

**Acceptance Criteria:**
- Full-text search uses PostgreSQL `tsvector` / `tsquery`
- Top 3 most relevant chunks retrieved per query
- Chunks truncated to 800 characters before prompt injection
- Retrieved chunks included in AI prompt with document name and page number

**Tasks:**
- [ ] Implement `searchReferenceDocumentsByText(query, limit)` using `to_tsvector` and `to_tsquery`
- [ ] Order results by full-text relevance rank (`ts_rank`)
- [ ] Truncate chunk content to 800 characters before use
- [ ] Format retrieved chunks as numbered context blocks in the AI prompt

---

## FEATURE 5 — Infrastructure & Deployment
> Set up development tooling, production build pipeline, and one-command deployment for Linux servers.

---

### STORY 5.1 — Development Environment Setup
**As a** developer,
**I want to** run the entire application with a single command locally,
**So that** I can develop and test features rapidly.

**Acceptance Criteria:**
- `npm run dev` starts Express backend and Vite frontend together on port 5000
- Frontend changes hot-reload without restarting the server
- Environment variables loaded from a `.env` file
- `.env.example` documents all required variables

**Tasks:**
- [ ] Configure Express server with Vite dev middleware for unified serving
- [ ] Create `.env.example` documenting DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY, PORT
- [ ] Verify `tsx` runs TypeScript server directly without a prior build step

---

### STORY 5.2 — Production Build Pipeline
**As a** developer,
**I want to** compile the app into a production-ready bundle,
**So that** it can be deployed to any standard Node.js server.

**Acceptance Criteria:**
- `npm run build` compiles frontend (Vite) and backend (esbuild) together
- Output is a single `dist/index.cjs` file with static assets at `dist/public`
- Native modules (pdf-parse, bcrypt) excluded from bundling and loaded at runtime
- `npm start` runs the production build successfully

**Tasks:**
- [ ] Configure esbuild to bundle Express server into `dist/index.cjs`
- [ ] Add `pdf-parse` and `bcrypt` to `neverBundle` list in `script/build.ts`
- [ ] Configure Vite to output static frontend assets to `dist/public`
- [ ] Verify `npm start` serves both API and frontend correctly in production mode

---

### STORY 5.3 — One-Command Linux Installation Script
**As a** system administrator,
**I want to** run a single shell script on a fresh Linux server to set up the entire application,
**So that** I can deploy without manually configuring dependencies, databases, or environment files.

**Acceptance Criteria:**
- Script supports Ubuntu 20.04+, Debian 11+, CentOS/RHEL 8+
- Installs Node.js 20 via nvm if not present
- Installs and starts PostgreSQL if not present
- Creates a dedicated database and database user with a random password
- Generates a `.env` file with all secrets auto-populated
- Prompts interactively for the OpenAI API key
- Runs schema creation, admin seeding, and document loading automatically
- Offers to create a systemd service for auto-restart on reboot
- Asks whether to start the app immediately after setup

**Tasks:**
- [ ] Write `install.sh` with OS detection for Debian/Ubuntu and CentOS/RHEL
- [ ] Add Node.js 20 installation via nvm with fallback detection
- [ ] Add PostgreSQL installation, initialization, and service startup
- [ ] Create dedicated PostgreSQL user and database with `openssl rand` password
- [ ] Auto-generate `.env` with DATABASE_URL, SESSION_SECRET, and PORT
- [ ] Prompt user to enter OpenAI API key and save it to `.env`
- [ ] Run `npm install`, then `npx tsx scripts/setup.ts` for full DB setup
- [ ] Run `npm run build` to compile production bundle
- [ ] Offer systemd service creation with enable and start
- [ ] Prompt to start app immediately and run `npm start` if confirmed

---

### STORY 5.4 — Database Setup & Seed Script
**As a** developer or administrator,
**I want to** run a single script that creates the schema and loads all seed data,
**So that** I can reproduce a fully working database from scratch on any environment.

**Acceptance Criteria:**
- `npx tsx scripts/setup.ts` creates all tables via Drizzle schema push
- Admin user (`admin@mastercard.com` / `admin123`) created or password reset
- Reference documents loaded from `seeds/reference_documents.sql` if present (fast path)
- Falls back to re-processing PDFs from `seeds/pdfs/` if SQL seed unavailable
- Script exits with a clear success message and login instructions

**Tasks:**
- [ ] Run `drizzle-kit push` to sync schema from TypeScript definitions to the database
- [ ] Upsert admin user: insert if new, reset password if existing
- [ ] Check `reference_documents` table count — skip loading if already populated
- [ ] Load `seeds/reference_documents.sql` (312 chunks) if file exists
- [ ] Copy PDFs from `seeds/pdfs/` to `attached_assets/` and call `processAllDocuments()` as fallback
- [ ] Print login credentials and start commands on successful completion

---

## FEATURE 6 — Jira Integration (Planned)
> Allow users to connect their Jira account and import artifacts directly for analysis without copy-pasting.

---

### STORY 6.1 — Jira OAuth Connection
**As a** user,
**I want to** connect my Jira account to the analyzer via OAuth,
**So that** I can import issues directly without manually copying text.

**Acceptance Criteria:**
- "Connect Jira" button initiates Atlassian OAuth 2.0 authorization flow
- User is redirected to Atlassian to grant access
- On success, connection status is shown in the UI
- On disconnect, stored Jira tokens are removed

**Tasks:**
- [ ] Register an Atlassian OAuth 2.0 app and obtain client credentials
- [ ] Implement OAuth authorization redirect from `/api/jira/authorize`
- [ ] Implement OAuth callback endpoint at `/api/jira/callback` to exchange code for tokens
- [ ] Store Jira access token and refresh token securely per user in the database
- [ ] Build Jira connection status UI on the connect page (connected / disconnected states)
- [ ] Implement disconnect endpoint that removes stored tokens

---

### STORY 6.2 — Import Jira Issue for Analysis
**As a** user,
**I want to** search for a Jira issue by its key and import it into the analyzer,
**So that** I can analyze real backlog items without copy-pasting.

**Acceptance Criteria:**
- User enters a Jira issue key (e.g. `PROJ-123`) in a search field
- Issue summary and description are fetched from the Jira REST API
- Jira issue type is mapped to analyzer artifact type (Epic/Story/Task)
- Fetched data pre-populates the analysis submission form
- Invalid keys or permission errors show a clear error message

**Tasks:**
- [ ] Implement GET `/api/jira/issue/:key` fetching issue details from Jira REST API v3
- [ ] Map Jira issue types (Epic, Story, Sub-task, Task) to analyzer artifact types
- [ ] Pre-populate analysis form title and content fields with fetched issue data
- [ ] Handle API errors gracefully: invalid key, expired token, no permission
- [ ] Trigger token refresh automatically when access token is expired

---

## Summary

| | Count |
|---|---|
| **Epic** | 1 |
| **Features** | 6 |
| **Stories** | 17 |
| **Tasks** | 76 |
| **Total Story Points** | 111 |

### Story Point Estimates (Fibonacci)

| Story | Points |
|-------|--------|
| 1.1 — User Login & Session Management | 3 |
| 1.2 — Protected Routes & Authorization | 3 |
| 2.1 — Artifact Submission & Async Processing | 8 |
| 2.2 — Results: Score & Summary | 3 |
| 2.3 — Results: Category Breakdown | 5 |
| 2.4 — Results: INVEST Scoring | 5 |
| 2.5 — Results: Enhanced Metadata | 3 |
| 2.6 — Results: AI-Improved Version | 3 |
| 2.7 — Results: RAG Citations | 8 |
| 2.8 — Analysis History | 5 |
| 3.1 — Usage Analytics Dashboard | 5 |
| 3.2 — User Management | 5 |
| 3.3 — Reference Document Management | 5 |
| 4.1 — PDF Processing Pipeline | 8 |
| 4.2 — Full-Text Search & Retrieval | 5 |
| 5.1 — Development Environment Setup | 2 |
| 5.2 — Production Build Pipeline | 5 |
| 5.3 — Linux Installation Script | 8 |
| 5.4 — Database Setup & Seed Script | 3 |
| 6.1 — Jira OAuth Connection | 8 |
| 6.2 — Import Jira Issue | 5 |
| **Total** | **111** |
