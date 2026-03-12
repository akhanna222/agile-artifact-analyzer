# Agile Artifact Analyzer — Jira Backlog

> **Format:** Epic → Feature → User Story → Task  
> **Project:** Agile Artifact Analyzer  
> **Last Updated:** March 2026

---

## EPIC 1 — User Authentication & Access Control
> Enable secure login, session management, and role-based access for all users.

---

### Feature 1.1 — User Login & Session Management

#### Story 1.1.1 — Login with Email & Password
**As a** user,  
**I want to** log in with my email and password,  
**So that** I can securely access the Agile Artifact Analyzer.

**Acceptance Criteria:**
- Login form accepts email and password
- Invalid credentials show a clear error message
- Successful login redirects to the analysis dashboard
- Session persists across browser refreshes

**Tasks:**
- [ ] Build login form UI with email and password fields
- [ ] Implement POST `/api/login` endpoint with bcrypt password check
- [ ] Create session middleware using express-session
- [ ] Add form validation with error messages
- [ ] Redirect authenticated users away from login page

---

#### Story 1.1.2 — Logout
**As a** logged-in user,  
**I want to** log out of the application,  
**So that** my session is terminated securely.

**Acceptance Criteria:**
- Logout button visible in the header
- Session is destroyed on logout
- User is redirected to the login page after logout

**Tasks:**
- [ ] Add logout button to the top navigation bar
- [ ] Implement POST `/api/logout` endpoint that destroys session
- [ ] Redirect to login page after successful logout

---

#### Story 1.1.3 — Protected Routes
**As a** system,  
**I want to** protect all pages from unauthenticated access,  
**So that** only logged-in users can use the application.

**Acceptance Criteria:**
- Unauthenticated users are redirected to login
- API routes return 401 if no valid session
- Admin-only routes return 403 for non-admin users

**Tasks:**
- [ ] Create `requireAuth` middleware for all API routes
- [ ] Create `requireAdmin` middleware for admin-only routes
- [ ] Add frontend auth check redirecting to login if no session

---

### Feature 1.2 — Role-Based Access Control

#### Story 1.2.1 — Admin vs. Regular User Roles
**As an** admin,  
**I want to** have elevated access to the admin panel,  
**So that** I can manage users, view analytics, and manage documents.

**Acceptance Criteria:**
- Admin users see "Admin Panel" link in navigation
- Regular users cannot access `/admin` page
- Admin flag stored in the user record in the database

**Tasks:**
- [ ] Add `is_admin` boolean field to users table
- [ ] Expose `isAdmin` flag in GET `/api/user` response
- [ ] Conditionally render Admin Panel navigation link
- [ ] Guard `/admin` route at both frontend and backend

---

## EPIC 2 — AI-Powered Artifact Analysis
> Analyze Agile artifacts (Epics, Features, User Stories, Tasks) against Scrum/SAFe/INVEST standards using GPT-4o.

---

### Feature 2.1 — Artifact Submission

#### Story 2.1.1 — Submit Artifact for Analysis
**As a** user,  
**I want to** paste an Agile artifact and select its type,  
**So that** the AI can evaluate it against quality standards.

**Acceptance Criteria:**
- User can enter a title for the artifact
- User can select type: Epic, Feature, User Story, or Task
- User can paste the artifact content in a text area
- Submit button triggers analysis
- Loading state shown while analysis is processing

**Tasks:**
- [ ] Build artifact submission form with title, type selector, and content textarea
- [ ] Add type dropdown with options: Epic, Feature, User Story, Task
- [ ] Implement POST `/api/analyses` returning `status: pending`
- [ ] Show loading spinner / pending state after submission
- [ ] Poll GET `/api/analyses/:id` every 2 seconds until status is `completed` or `failed`
- [ ] Show 90-second timeout with error message if analysis hangs

---

#### Story 2.1.2 — Async Analysis Processing
**As a** user,  
**I want to** see analysis results as soon as they are ready,  
**So that** the UI remains responsive while the AI processes my artifact.

**Acceptance Criteria:**
- API immediately returns after submission with `status: pending`
- AI processing happens in the background
- Frontend polls and updates automatically when results arrive
- Failed analyses show a clear error state

**Tasks:**
- [ ] Process analysis asynchronously after returning `pending` response
- [ ] Update analysis record with results, score, and `status: completed`
- [ ] Handle errors by setting `status: failed` with error details
- [ ] Implement AbortController with 90s timeout on OpenAI API call
- [ ] Return token usage data (prompt, completion, total) with results

---

### Feature 2.2 — Analysis Results Display

#### Story 2.2.1 — Overall Score and Summary
**As a** user,  
**I want to** see an overall quality score and summary for my artifact,  
**So that** I can quickly understand its quality level.

**Acceptance Criteria:**
- Overall score shown as a number out of 100
- Color-coded indicator: green (≥75), amber (50–74), red (<50)
- Plain-language summary paragraph displayed
- Score updates in real-time as analysis completes

**Tasks:**
- [ ] Display overall score with colour-coded badge/ring
- [ ] Render AI-generated summary text
- [ ] Add animated score reveal when results load

---

#### Story 2.2.2 — Category Breakdown
**As a** user,  
**I want to** see scores and findings broken down by quality category,  
**So that** I know specifically what areas need improvement.

**Acceptance Criteria:**
- Each category shows name, score, and pass/warning/fail status
- Findings listed per category
- Suggestions listed per category
- Categories vary by artifact type (Epic, Feature, Story, Task)

**Tasks:**
- [ ] Render category cards with score, status badge, findings, and suggestions
- [ ] Define category sets per artifact type in the AI prompt
- [ ] Map status values (pass/warning/fail) to colours (green/amber/red)

---

#### Story 2.2.3 — INVEST Scoring for User Stories
**As a** user analyzing a User Story,  
**I want to** see individual INVEST dimension scores,  
**So that** I can evaluate it against the INVEST framework.

**Acceptance Criteria:**
- INVEST breakdown shown only for User Story type
- Six dimensions scored individually: Independent, Negotiable, Valuable, Estimable, Small, Testable
- Each score shown as a progress bar out of 100

**Tasks:**
- [ ] Add `investScores` object to analysis result schema
- [ ] Include INVEST scoring instructions in User Story AI prompt
- [ ] Build INVEST score display component with 6 progress bars
- [ ] Show INVEST section only when artifact type is User Story

---

#### Story 2.2.4 — Enhanced Metadata Fields
**As a** user,  
**I want to** see additional quality indicators beyond the main score,  
**So that** I have a complete picture of my artifact's quality.

**Acceptance Criteria:**
- Clarity score (0–100)
- Completeness score (0–100)
- Acceptance criteria presence (yes/no)
- User role defined (yes/no)
- Business value clear (yes/no)
- Complexity level (Low/Medium/High)
- Risk level (Low/Medium/High)

**Tasks:**
- [ ] Add metadata fields to analysis result schema
- [ ] Include metadata extraction instructions in AI prompt
- [ ] Build metadata display panel showing all 7 indicators

---

#### Story 2.2.5 — AI-Generated Improved Version
**As a** user,  
**I want to** see a rewritten version of my artifact,  
**So that** I have an example of how to improve it.

**Acceptance Criteria:**
- AI rewrites the artifact applying all suggestions
- Improved version shown in a collapsible or separate panel
- User can copy the improved version to clipboard

**Tasks:**
- [ ] Add `improvedVersion` field to analysis result schema
- [ ] Instruct AI to rewrite the artifact in the prompt
- [ ] Display improved version in a styled code/text block
- [ ] Add copy-to-clipboard button

---

#### Story 2.2.6 — RAG Document References with Page Citations
**As a** user,  
**I want to** see which reference documents informed the analysis,  
**So that** I can understand the standards being applied.

**Acceptance Criteria:**
- Up to 3 relevant document excerpts shown per analysis
- Each citation shows: document name, page number, excerpt, and relevance explanation
- Citations link to the document source name

**Tasks:**
- [ ] Search reference documents using full-text search (tsvector/tsquery)
- [ ] Retrieve top 3 most relevant chunks (max 800 chars each)
- [ ] Inject retrieved chunks into AI prompt as context
- [ ] Add `references` array to analysis result schema
- [ ] Build citations display component with doc name, page, excerpt, and relevance

---

### Feature 2.3 — Analysis History

#### Story 2.3.1 — View Past Analyses
**As a** user,  
**I want to** see a list of all my previous analyses,  
**So that** I can review and track quality improvements over time.

**Acceptance Criteria:**
- List shows all analyses for the current user
- Each item shows: title, artifact type, overall score, date
- Clicking an item loads the full results
- Analyses sorted newest first

**Tasks:**
- [ ] Implement GET `/api/analyses` returning user's analyses
- [ ] Build analysis history list in the sidebar or left panel
- [ ] Add click handler to load selected analysis results
- [ ] Show empty state when no analyses exist yet

---

#### Story 2.3.2 — Delete an Analysis
**As a** user,  
**I want to** delete an analysis I no longer need,  
**So that** my history stays clean and relevant.

**Acceptance Criteria:**
- Delete button on each analysis list item
- Confirmation before deletion
- Analysis removed from the list immediately after deletion

**Tasks:**
- [ ] Implement DELETE `/api/analyses/:id` endpoint
- [ ] Add delete button to each list item with confirmation dialog
- [ ] Invalidate query cache after successful deletion

---

## EPIC 3 — Admin Panel
> Provide administrators with tools to manage users, monitor usage, and control reference documents.

---

### Feature 3.1 — Usage Analytics Dashboard

#### Story 3.1.1 — View Platform Usage Statistics
**As an** admin,  
**I want to** see aggregated usage statistics across all users,  
**So that** I can monitor platform adoption and AI costs.

**Acceptance Criteria:**
- Total number of analyses run
- Total tokens consumed (prompt, completion, total)
- Breakdown by artifact type
- Per-user analysis counts
- Data refreshes on page load

**Tasks:**
- [ ] Implement GET `/api/admin/usage` aggregation query
- [ ] Show total analyses count card
- [ ] Show token usage breakdown (prompt / completion / total)
- [ ] Build chart or table for analyses by artifact type
- [ ] Build per-user breakdown table

---

### Feature 3.2 — User Management

#### Story 3.2.1 — View All Users
**As an** admin,  
**I want to** see a list of all registered users,  
**So that** I can monitor who has access to the platform.

**Acceptance Criteria:**
- Table lists all users with email, role, and registration date
- Admin users are visually distinguished

**Tasks:**
- [ ] Implement GET `/api/admin/users` endpoint
- [ ] Build users table with email, isAdmin badge, and createdAt columns

---

#### Story 3.2.2 — Create New User
**As an** admin,  
**I want to** create user accounts for team members,  
**So that** I can provision access without self-registration.

**Acceptance Criteria:**
- Admin can enter email, password, and select admin role
- New user appears in the users list immediately
- Duplicate email shows validation error

**Tasks:**
- [ ] Implement POST `/api/admin/users` endpoint with validation
- [ ] Build "Create User" form in admin panel
- [ ] Hash password with bcrypt before storing
- [ ] Refresh users list after successful creation

---

#### Story 3.2.3 — Delete User
**As an** admin,  
**I want to** remove a user account,  
**So that** I can revoke access when needed.

**Acceptance Criteria:**
- Delete button on each user row
- Admin cannot delete their own account
- Confirmation dialog before deletion

**Tasks:**
- [ ] Implement DELETE `/api/admin/users/:id` endpoint
- [ ] Prevent self-deletion with validation error
- [ ] Add delete button with confirmation dialog to user table rows

---

### Feature 3.3 — Reference Document Management

#### Story 3.3.1 — View Processed Reference Documents
**As an** admin,  
**I want to** see a list of all uploaded reference documents and their chunk counts,  
**So that** I can verify the RAG knowledge base is populated correctly.

**Acceptance Criteria:**
- List shows document name and number of processed chunks
- Empty state message if no documents are loaded

**Tasks:**
- [ ] Implement GET `/api/admin/documents` endpoint returning doc names and chunk counts
- [ ] Build documents list in admin panel Documents tab

---

#### Story 3.3.2 — Process All Reference Documents
**As an** admin,  
**I want to** trigger processing of all PDF documents in bulk,  
**So that** the RAG knowledge base is populated from the source PDFs.

**Acceptance Criteria:**
- "Process All" button triggers PDF processing
- Progress or success message shown after completion
- Chunk counts update after processing

**Tasks:**
- [ ] Implement POST `/api/admin/documents/process-all` endpoint
- [ ] Run PDF text extraction and chunking for each PDF
- [ ] Store chunks in `reference_documents` table
- [ ] Return processing results (doc name, page count, status) per document
- [ ] Show success/failure toast in the UI

---

#### Story 3.3.3 — Delete All Reference Documents
**As an** admin,  
**I want to** clear the entire document knowledge base,  
**So that** I can re-process documents from scratch if needed.

**Acceptance Criteria:**
- "Delete All" button removes all document chunks from the database
- Confirmation dialog before deletion
- Document list shows empty state after deletion

**Tasks:**
- [ ] Implement DELETE `/api/admin/documents` endpoint clearing all chunks
- [ ] Add confirmation dialog before triggering delete
- [ ] Refresh document list after deletion

---

## EPIC 4 — RAG (Retrieval-Augmented Generation) System
> Build a knowledge base from uploaded company standards PDFs to ground AI analysis in real standards.

---

### Feature 4.1 — PDF Processing Pipeline

#### Story 4.1.1 — Extract and Chunk PDF Content
**As a** system,  
**I want to** extract text from uploaded PDFs and split it into page-level chunks,  
**So that** relevant content can be retrieved during AI analysis.

**Acceptance Criteria:**
- PDFs parsed page by page using pdf-parse
- Each page stored as a separate chunk in the database
- Document name and page number stored with each chunk

**Tasks:**
- [ ] Integrate `pdf-parse` library for text extraction
- [ ] Split extracted text into page-level chunks
- [ ] Store each chunk with `doc_name`, `page_number`, and `content` fields
- [ ] Handle CJS/ESM compatibility for production builds

---

#### Story 4.1.2 — Full-Text Search Over Document Chunks
**As a** system,  
**I want to** search document chunks using full-text search,  
**So that** the most relevant excerpts are retrieved for each analysis.

**Acceptance Criteria:**
- Text search uses PostgreSQL `tsvector/tsquery`
- Top 3 most relevant chunks retrieved per query
- Each chunk limited to 800 characters for prompt efficiency

**Tasks:**
- [ ] Implement `searchReferenceDocumentsByText` using PostgreSQL `to_tsvector` and `to_tsquery`
- [ ] Return top 3 results ordered by relevance rank
- [ ] Truncate chunk content to 800 characters before injection into prompt

---

## EPIC 5 — Infrastructure & Deployment
> Set up the development, build, and production deployment pipeline.

---

### Feature 5.1 — Development Environment

#### Story 5.1.1 — Local Development Setup
**As a** developer,  
**I want to** run the application locally with a single command,  
**So that** I can develop and test features quickly.

**Acceptance Criteria:**
- `npm run dev` starts both backend (Express) and frontend (Vite) on port 5000
- Hot reload works for frontend changes
- Environment variables loaded from `.env` file

**Tasks:**
- [ ] Configure Express server with Vite middleware for dev mode
- [ ] Set up `.env.example` with all required variables documented
- [ ] Ensure `tsx` runs TypeScript server directly without build step

---

### Feature 5.2 — Production Build & Deployment

#### Story 5.2.1 — Production Build Script
**As a** developer,  
**I want to** build the app into a single production bundle,  
**So that** it can be deployed to any Node.js server.

**Acceptance Criteria:**
- `npm run build` compiles frontend (Vite) and backend (esbuild)
- Output is a single `dist/index.cjs` file
- Static frontend assets served by Express in production

**Tasks:**
- [ ] Configure esbuild to bundle server into `dist/index.cjs`
- [ ] Add `pdf-parse` and `bcrypt` to `neverBundle` (native modules)
- [ ] Configure Vite to output static assets to `dist/public`
- [ ] Serve static assets from Express in production mode

---

#### Story 5.2.2 — One-Command Linux Installation
**As a** system administrator,  
**I want to** set up the entire application with a single shell script,  
**So that** I can deploy it on any fresh Linux server without manual steps.

**Acceptance Criteria:**
- Script installs Node.js 20 if not present
- Script installs and configures PostgreSQL if not present
- Script creates database and database user automatically
- Script generates `.env` file with secure random secrets
- Script prompts for OpenAI API key
- Script runs database schema creation, admin seeding, and document loading
- Script builds app and optionally creates a systemd service

**Tasks:**
- [ ] Write `install.sh` for Ubuntu/Debian/CentOS support
- [ ] Add Node.js 20 installation via nvm
- [ ] Add PostgreSQL installation and database creation
- [ ] Add `.env` auto-generation with `openssl rand` for secrets
- [ ] Add OpenAI key prompt
- [ ] Call `scripts/setup.ts` for schema + seed + documents
- [ ] Add optional systemd service creation

---

#### Story 5.2.3 — Database Schema Setup Script
**As a** developer,  
**I want to** run a single script that creates the schema and seeds all data,  
**So that** I can recreate a fully working database from scratch.

**Acceptance Criteria:**
- `npx tsx scripts/setup.ts` creates all tables
- Admin user created or password reset to `admin123`
- Reference documents loaded from SQL seed file (fast path)
- Falls back to PDF re-processing if seed file unavailable

**Tasks:**
- [ ] Run `drizzle-kit push` to create schema from TypeScript definitions
- [ ] Upsert admin user with bcrypt-hashed password
- [ ] Load `seeds/reference_documents.sql` if present (312 chunks)
- [ ] Fall back to `processAllDocuments()` if SQL seed not found
- [ ] Exit cleanly with success/failure status

---

## EPIC 6 — Jira Integration (Planned)
> Allow users to import Agile artifacts directly from Jira for analysis.

---

### Feature 6.1 — Jira OAuth Connection

#### Story 6.1.1 — Connect Jira Account
**As a** user,  
**I want to** connect my Jira account to the analyzer,  
**So that** I can import user stories and epics directly without copy-pasting.

**Acceptance Criteria:**
- "Connect Jira" button initiates OAuth 2.0 flow
- User is redirected to Atlassian to authorize access
- On success, connection status shown in the UI
- On disconnect, Jira tokens are removed

**Tasks:**
- [ ] Set up Atlassian OAuth 2.0 app credentials
- [ ] Implement OAuth callback endpoint `/api/jira/callback`
- [ ] Store Jira access token securely per user
- [ ] Build Jira connection status UI on connect page

---

#### Story 6.1.2 — Import Jira Issue for Analysis
**As a** user,  
**I want to** search for a Jira issue by key and import it,  
**So that** I can analyze it without manually copying the text.

**Acceptance Criteria:**
- User enters a Jira issue key (e.g. `PROJ-123`)
- Issue summary and description fetched from Jira API
- Issue type mapped to analyzer type (Epic/Story/Task)
- Imported artifact pre-fills the analysis form

**Tasks:**
- [ ] Implement GET `/api/jira/issue/:key` fetching issue from Jira REST API
- [ ] Map Jira issue type to analyzer artifact type
- [ ] Pre-populate analysis form with fetched issue data
- [ ] Handle Jira API errors gracefully (invalid key, no access)

---

## Summary Table

| Epic | Features | Stories | Tasks |
|------|----------|---------|-------|
| 1 — Authentication & Access Control | 2 | 4 | 11 |
| 2 — AI-Powered Artifact Analysis | 3 | 8 | 27 |
| 3 — Admin Panel | 3 | 5 | 13 |
| 4 — RAG System | 1 | 2 | 5 |
| 5 — Infrastructure & Deployment | 2 | 3 | 13 |
| 6 — Jira Integration (Planned) | 1 | 2 | 7 |
| **Total** | **12** | **24** | **76** |

---

## Story Point Estimates (Fibonacci)

| Story | Points |
|-------|--------|
| Login & Session | 3 |
| Logout | 1 |
| Protected Routes | 2 |
| Role-Based Access | 3 |
| Artifact Submission Form | 5 |
| Async Analysis Processing | 8 |
| Overall Score Display | 3 |
| Category Breakdown | 5 |
| INVEST Scoring | 5 |
| Enhanced Metadata Fields | 3 |
| AI-Generated Improved Version | 3 |
| RAG Document Citations | 8 |
| Analysis History | 3 |
| Delete Analysis | 2 |
| Usage Analytics Dashboard | 5 |
| User Management (View/Create/Delete) | 5 |
| Reference Document Management | 5 |
| PDF Processing Pipeline | 8 |
| Full-Text Search | 5 |
| Local Dev Setup | 2 |
| Production Build | 5 |
| Linux Installation Script | 8 |
| Database Setup Script | 3 |
| Jira OAuth Connection | 8 |
| Jira Issue Import | 5 |
