# Agile Artifact Analyzer — System Design

> **Version:** 1.0  
> **Last Updated:** March 2026  
> **Stack:** Node.js · TypeScript · React · PostgreSQL · GPT-4o

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                           │
│                                                                     │
│   React + Vite + TanStack Query + Wouter + Shadcn/UI               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│   │  Login   │  │  Home    │  │  Admin   │  │  Jira Connect    │  │
│   │  Page    │  │  Page    │  │  Panel   │  │  Page (stub)     │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTPS  (port 5000)
                           │  REST API + Session Cookie
┌──────────────────────────▼──────────────────────────────────────────┐
│                       SERVER (Express + Node.js)                    │
│                                                                     │
│  ┌───────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Auth     │  │   Analysis   │  │   Admin    │  │  Static    │  │
│  │  Routes   │  │   Routes     │  │   Routes   │  │  Assets    │  │
│  └───────────┘  └──────┬───────┘  └────────────┘  └────────────┘  │
│                         │                                           │
│  ┌──────────────────────▼────────────────────────────────────────┐ │
│  │                    Storage Layer (IStorage)                    │ │
│  │          DatabaseStorage implements IStorage                   │ │
│  └──────────────────────┬────────────────────────────────────────┘ │
│                          │ Drizzle ORM                              │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
          ┌────────────────┴─────────────────┐
          │                                  │
┌─────────▼────────┐              ┌──────────▼──────────┐
│   PostgreSQL DB  │              │   OpenAI API (GPT-4o)│
│                  │              │                      │
│  • users         │              │  • Chat Completions  │
│  • analyses      │              │  • JSON mode         │
│  • reference_    │              │  • max 4096 tokens   │
│    documents     │              │  • 90s timeout       │
└──────────────────┘              └─────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI framework |
| **Frontend Build** | Vite | Dev server + production bundler |
| **Routing** | Wouter | Lightweight client-side routing |
| **State / Data** | TanStack Query v5 | Server state, caching, polling |
| **Forms** | React Hook Form + Zod | Form handling + validation |
| **UI Components** | Shadcn/UI + Tailwind CSS | Design system |
| **Icons** | Lucide React | UI icons |
| **Backend** | Express.js + TypeScript | REST API server |
| **Runtime** | Node.js 20 + tsx | TypeScript execution |
| **ORM** | Drizzle ORM | Type-safe database queries |
| **Database** | PostgreSQL 14+ | Primary data store |
| **Auth** | express-session + bcrypt | Session auth + password hashing |
| **AI Model** | OpenAI GPT-4o | Artifact analysis |
| **PDF Parsing** | pdf-parse | Reference document extraction |
| **Search** | PostgreSQL FTS (tsvector) | Document chunk retrieval |
| **Build** | esbuild | Server-side production bundler |

---

## 3. Frontend Architecture

```
client/src/
├── App.tsx                  # Router + Auth guard + Query provider
├── main.tsx                 # React entry point
├── pages/
│   ├── login.tsx            # Login form page
│   ├── home.tsx             # Main analysis dashboard
│   ├── admin.tsx            # Admin panel (analytics/users/docs)
│   ├── jira-connect.tsx     # Jira integration stub
│   └── not-found.tsx        # 404 page
├── components/
│   └── ui/                  # Shadcn component library
├── hooks/
│   └── use-toast.ts         # Toast notification hook
└── lib/
    └── queryClient.ts       # TanStack Query client + apiRequest()
```

### Data Fetching Pattern
```
Component
  → useQuery({ queryKey: ['/api/...'] })    ← READ
  → useMutation({ mutationFn: apiRequest }) ← WRITE
  → queryClient.invalidateQueries(...)      ← CACHE INVALIDATION
```

### Async Polling Flow (Analysis)
```
User submits form
  → POST /api/analyses  →  returns { id, status: "pending" }
  → Poll GET /api/analyses/:id every 2s
  → AbortController fires after 90s (timeout)
  → On status "completed" → render results
  → On status "failed"    → show error state
```

---

## 4. Backend Architecture

```
server/
├── index.ts          # App bootstrap, middleware setup, session config
├── routes.ts         # All REST API route handlers
├── auth.ts           # requireAuth / requireAdmin middleware
├── storage.ts        # IStorage interface + DatabaseStorage class
├── db.ts             # Drizzle ORM + PostgreSQL connection
├── pdf-processor.ts  # PDF extraction + chunk storage
└── seed.ts           # Admin user seeding on startup
```

### Request Lifecycle
```
HTTP Request
  → express-session (attach session)
  → requireAuth middleware (check session.userId)
  → Route handler
    → Zod validation (request body)
    → storage.method() (Drizzle ORM query)
    → JSON response
```

### Storage Interface (IStorage)
```typescript
// Analyses
getAnalyses()                    → Analysis[]
getAnalysis(id)                  → Analysis
createAnalysis(data, userId)     → Analysis
updateAnalysisResults(id, ...)   → Analysis
deleteAnalysis(id)               → void

// Users
getUserByEmail(email)            → User
getUserById(id)                  → User
getUsers()                       → User[]
createUser(data)                 → User
deleteUser(id)                   → void

// Reference Documents (RAG)
getReferenceDocuments()          → ReferenceDocument[]
addReferenceDocument(doc)        → ReferenceDocument
deleteReferenceDocumentsByName() → void
searchReferenceDocumentsByText() → ReferenceDocument[]
getReferenceDocumentSummary()    → { docName, pageCount }[]

// Analytics
getUsageStats()                  → UsageStats
```

---

## 5. Database Design

```
┌──────────────────────────────────────────┐
│                  users                   │
├──────────┬──────────────────────────────┤
│ id       │ serial PRIMARY KEY           │
│ email    │ text UNIQUE NOT NULL         │
│ password │ text NOT NULL (bcrypt hash)  │
│ is_admin │ boolean DEFAULT false        │
│ created_at│ timestamp DEFAULT NOW()     │
└──────────────────────────────────────────┘
                     │ 1
                     │
                     │ N
┌──────────────────────────────────────────┐
│                 analyses                 │
├──────────────┬───────────────────────────┤
│ id           │ serial PRIMARY KEY        │
│ title        │ text NOT NULL             │
│ type         │ text NOT NULL             │
│              │  (epic/feature/story/task)│
│ content      │ text NOT NULL             │
│ overall_score│ integer (0–100)           │
│ results      │ jsonb (AnalysisResult)    │
│ status       │ text DEFAULT 'pending'    │
│              │  (pending/completed/failed│
│ user_id      │ integer → users.id        │
│ prompt_tokens│ integer                   │
│ completion_  │ integer                   │
│   tokens     │                           │
│ total_tokens │ integer                   │
│ model        │ text (e.g. gpt-4o)        │
│ created_at   │ timestamp DEFAULT NOW()   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│           reference_documents            │
├──────────────┬───────────────────────────┤
│ id           │ serial PRIMARY KEY        │
│ doc_name     │ text NOT NULL             │
│ page_number  │ integer NOT NULL          │
│ content      │ text NOT NULL             │
│ embedding    │ vector(1536) (reserved)   │
│ created_at   │ timestamp DEFAULT NOW()   │
└──────────────────────────────────────────┘
```

### Analysis Result JSON Schema (stored in `results` JSONB column)
```json
{
  "overallScore": 78,
  "summary": "The user story is well-structured...",
  "categories": [
    {
      "name": "Clarity",
      "score": 85,
      "status": "pass",
      "findings": ["Role clearly defined", "Goal is specific"],
      "suggestions": ["Add measurable success criteria"]
    }
  ],
  "improvedVersion": "As a product manager, I want to...",
  "investScores": {
    "independent": 90, "negotiable": 75, "valuable": 85,
    "estimable": 70,   "small": 80,      "testable": 65
  },
  "clarity": 85,
  "completeness": 72,
  "acceptanceCriteriaPresent": true,
  "userRoleDefined": true,
  "businessValueClear": true,
  "complexity": "Medium",
  "riskLevel": "Low",
  "references": [
    {
      "docName": "Epic-Standards",
      "pageNumber": 4,
      "excerpt": "An epic should represent...",
      "relevance": "Directly defines epic scope requirements"
    }
  ]
}
```

---

## 6. AI Analysis Pipeline

```
                        ┌─────────────────────────────────┐
                        │     POST /api/analyses           │
                        │  { title, type, content }        │
                        └────────────┬────────────────────┘
                                     │
                        ┌────────────▼────────────────────┐
                        │  1. Save to DB (status: pending) │
                        │  2. Return { id, status } → 201 │
                        └────────────┬────────────────────┘
                                     │ (async, non-blocking)
                        ┌────────────▼────────────────────┐
                        │  3. RAG: Search reference docs   │
                        │     searchReferenceDocumentsByText│
                        │     (artifact content, limit=3)  │
                        │     → top 3 chunks, 800 chars ea │
                        └────────────┬────────────────────┘
                                     │
                        ┌────────────▼────────────────────┐
                        │  4. Build AI Prompt              │
                        │  ┌─────────────────────────────┐│
                        │  │ SYSTEM: You are an Agile     ││
                        │  │ quality analyst. Evaluate    ││
                        │  │ against Scrum/SAFe/INVEST.   ││
                        │  │ Return valid JSON only.      ││
                        │  ├─────────────────────────────┤│
                        │  │ CONTEXT: [RAG chunks]        ││
                        │  ├─────────────────────────────┤│
                        │  │ ARTIFACT TYPE: {type}        ││
                        │  │ TITLE: {title}               ││
                        │  │ CONTENT: {content}           ││
                        │  └─────────────────────────────┘│
                        └────────────┬────────────────────┘
                                     │
                        ┌────────────▼────────────────────┐
                        │  5. Call OpenAI GPT-4o           │
                        │     model: gpt-4o                │
                        │     response_format: json_object │
                        │     max_completion_tokens: 4096  │
                        │     AbortController: 90s timeout │
                        └────────────┬────────────────────┘
                                     │
                        ┌────────────▼────────────────────┐
                        │  6. Parse + Validate JSON        │
                        │     Zod schema: analysisResult   │
                        └────────────┬────────────────────┘
                                     │
                        ┌────────────▼────────────────────┐
                        │  7. Update DB                    │
                        │     status: completed            │
                        │     overallScore: N              │
                        │     results: { ... }             │
                        │     token usage, model name      │
                        └────────────┬────────────────────┘
                                     │
                        ┌────────────▼────────────────────┐
                        │  Frontend polls every 2s         │
                        │  GET /api/analyses/:id           │
                        │  → status: completed → render    │
                        └─────────────────────────────────┘
```

### AI Prompt Categories by Artifact Type

| Artifact | Categories Evaluated |
|----------|---------------------|
| **Epic** | Business Value, Scope Definition, Outcome Clarity, Strategic Alignment, Measurability |
| **Feature** | User Value, Scope, Dependencies, Testability, Definition of Done |
| **User Story** | INVEST (all 6 dimensions), Acceptance Criteria, Role/Goal/Benefit, Clarity |
| **Task** | Specificity, Estimability, Dependencies, Completeness, Technical Clarity |

---

## 7. RAG (Retrieval-Augmented Generation) System

```
┌─────────────────────────────────────────────────────────────────┐
│                     INGESTION PIPELINE                          │
│                                                                 │
│  PDF Files (attached_assets/ or seeds/pdfs/)                   │
│      │                                                          │
│      ▼                                                          │
│  pdf-parse  →  Raw text per page                               │
│      │                                                          │
│      ▼                                                          │
│  Split into page-level chunks (max 800 tokens)                 │
│      │                                                          │
│      ▼                                                          │
│  PostgreSQL: reference_documents                               │
│    { doc_name, page_number, content }                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     RETRIEVAL PIPELINE                          │
│                                                                 │
│  Artifact content (query text)                                  │
│      │                                                          │
│      ▼                                                          │
│  PostgreSQL Full-Text Search                                    │
│  SELECT *, ts_rank(to_tsvector(content), query) AS rank        │
│  FROM reference_documents                                       │
│  WHERE to_tsvector(content) @@ to_tsquery(query)               │
│  ORDER BY rank DESC LIMIT 3                                     │
│      │                                                          │
│      ▼                                                          │
│  Top 3 chunks (truncated to 800 chars each)                    │
│      │                                                          │
│      ▼                                                          │
│  Injected into GPT-4o prompt as grounding context              │
│  → AI cites doc name + page number in output                   │
└─────────────────────────────────────────────────────────────────┘
```

### Reference Documents (Pre-loaded)

| Document | Chunks | Purpose |
|----------|--------|---------|
| Epic-Standards | 8 | Epic quality standards |
| Feature-Standard | 4 | Feature definition standards |
| The_Lighthouse | 300 | Company Agile methodology guide |

---

## 8. Authentication & Authorization Flow

```
┌──────────┐         ┌──────────────┐        ┌────────────────┐
│  Client  │         │    Server    │        │   PostgreSQL   │
└────┬─────┘         └──────┬───────┘        └───────┬────────┘
     │                      │                         │
     │  POST /api/login      │                         │
     │  { email, password }  │                         │
     │──────────────────────►│                         │
     │                       │  getUserByEmail(email)  │
     │                       │────────────────────────►│
     │                       │◄────────────────────────│
     │                       │  bcrypt.compare(pw, hash)│
     │                       │  req.session.userId = id │
     │  { user, isAdmin }    │                         │
     │◄──────────────────────│                         │
     │                       │                         │
     │  GET /api/analyses    │                         │
     │  Cookie: session=xxx  │                         │
     │──────────────────────►│                         │
     │                       │  requireAuth middleware  │
     │                       │  session.userId → valid  │
     │                       │  getAnalyses(userId)     │
     │                       │────────────────────────►│
     │  [ analyses ]         │◄────────────────────────│
     │◄──────────────────────│                         │
```

### Middleware Guards
```
Public routes:     POST /api/login, POST /api/register
Protected routes:  requireAuth  → checks session.userId
Admin routes:      requireAdmin → checks session.userId + user.isAdmin
```

---

## 9. API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | Public | Login with email + password |
| POST | `/api/logout` | Public | Destroy session |
| GET | `/api/user` | Auth | Get current user info |

### Analyses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analyses` | Auth | List current user's analyses |
| POST | `/api/analyses` | Auth | Submit artifact for analysis |
| GET | `/api/analyses/:id` | Auth | Get analysis by ID (used for polling) |
| DELETE | `/api/analyses/:id` | Auth | Delete an analysis |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users` | Admin | Create a new user |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user |
| GET | `/api/admin/usage` | Admin | Get platform usage analytics |
| GET | `/api/admin/documents` | Admin | List reference document summaries |
| POST | `/api/admin/documents/process-all` | Admin | Process all PDFs into chunks |
| DELETE | `/api/admin/documents` | Admin | Delete all document chunks |

---

## 10. Deployment Architecture

### Development (Replit / Local)
```
npm run dev
    │
    ├── Vite dev server (HMR, frontend)
    └── tsx server/index.ts (Express, backend)
         └── Both served on port 5000
```

### Production Build
```
npm run build
    │
    ├── Vite → dist/public/  (static frontend assets)
    └── esbuild → dist/index.cjs  (bundled Express server)
         ├── pdf-parse  ─┐
         └── bcrypt     ─┴─ excluded from bundle (native modules)

npm start
    └── node dist/index.cjs
         ├── Serves API routes
         └── Serves dist/public/ as static files
```

### Infrastructure Options

#### Option A — Replit (Current)
```
Replit Container
  ├── Node.js 20 (managed)
  ├── PostgreSQL (Replit DB addon)
  ├── OpenAI (Replit AI Integration)
  └── SESSION_SECRET (Replit Secrets)
```

#### Option B — Linux VM / VPS
```
Linux Server (Ubuntu/Debian/CentOS)
  ├── Node.js 20 (via nvm)
  ├── PostgreSQL 14+ (apt/yum)
  ├── systemd service (auto-restart)
  └── Environment: .env file
       ├── DATABASE_URL
       ├── SESSION_SECRET
       └── OPENAI_API_KEY
```

#### Option C — Docker
```
Docker Container
  ├── FROM node:20-alpine
  ├── COPY . /app
  ├── RUN npm ci && npm run build
  └── CMD ["node", "dist/index.cjs"]

External:
  ├── PostgreSQL (Docker service or managed DB)
  └── Environment variables via -e flags or .env
```

---

## 11. Security Considerations

| Concern | Implementation |
|---------|---------------|
| Password storage | bcrypt with salt rounds = 10 |
| Session security | express-session with signed cookies, SESSION_SECRET |
| Auth enforcement | requireAuth middleware on all protected routes |
| Admin enforcement | requireAdmin middleware on all admin routes |
| Input validation | Zod schemas on all API request bodies |
| SQL injection | Drizzle ORM with parameterized queries |
| Self-deletion prevention | Admin cannot delete their own account |
| Token exposure | OpenAI key server-side only, never exposed to client |
| AI timeout | 90s AbortController prevents runaway requests |

---

## 12. Scalability Considerations

| Area | Current Approach | Scale Path |
|------|-----------------|------------|
| Analysis processing | In-process async (setImmediate) | Job queue (BullMQ / Redis) |
| Document search | PostgreSQL FTS (tsvector) | pgvector embeddings for semantic search |
| Session storage | In-memory (express-session default) | Redis session store |
| File uploads | Local filesystem (attached_assets/) | S3 / object storage |
| AI rate limits | Single OpenAI key | Key rotation / rate limiting middleware |
| Multi-tenancy | userId filter on analyses | Row-level security in PostgreSQL |
