# Agile Artifact Analyzer - Self-Hosting Guide

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** 14+ database
- **OpenAI API Key** (GPT-4o model access required)

---

## Quick Start (Single Command)

### 1. Download / Clone the Project

Download the project zip and extract it, or clone from GitHub.

### 2. Set Environment Variables

Create a `.env` file in the project root:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/artifact_analyzer
SESSION_SECRET=your-random-secret-string-here
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create the Database

```bash
createdb artifact_analyzer
```

### 4. Run the Setup Script

```bash
bash setup.sh
```

This single command will:
- Install all npm dependencies
- Create all database tables (schema)
- Create the admin user (`admin@mastercard.com` / `admin123`)
- Process all 3 reference PDF documents for RAG (312 chunks total)

### 5. Start the App

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The app will be available at `http://localhost:5000`

---

## Login Credentials (Default)

| Field | Value |
|-------|-------|
| Email | `admin@mastercard.com` |
| Password | `admin123` |

Change the password after first login via the admin panel.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `OPENAI_API_KEY` | Yes (standalone) | Your OpenAI API key |
| `NODE_ENV` | No | Set to `production` for production |
| `PORT` | No | Server port (default: 5000) |

> **On Replit**: `OPENAI_API_KEY` is not needed — the built-in AI integration handles it automatically.

---

## Reference Documents (RAG)

The setup script automatically processes 3 PDFs from the `attached_assets/` folder:

| Document | Chunks | Purpose |
|----------|--------|---------|
| Epic-Standards | 8 | Epic evaluation standards |
| Feature-Standard | 4 | Feature evaluation standards |
| The_Lighthouse | 300 | Company methodology guide |

If you want to add your own documents later, log in as admin → Reference Docs tab → Upload & Process.

---

## Running with Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
```

**Build and run:**
```bash
docker build -t artifact-analyzer .

docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e SESSION_SECRET=your-secret \
  -e OPENAI_API_KEY=sk-your-key \
  artifact-analyzer
```

**First-time setup inside Docker:**
```bash
docker run --rm \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e SESSION_SECRET=your-secret \
  -e OPENAI_API_KEY=sk-your-key \
  artifact-analyzer bash setup.sh
```

---

## Running with PM2 (Recommended for VMs)

```bash
npm install -g pm2

# Build first
npm run build

# Start
pm2 start npm --name "artifact-analyzer" -- start

# Auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs artifact-analyzer
```

---

## Recreating in a New Replit Account

1. Create a new Repl (Node.js template)
2. Upload the project zip (drag & drop into the Files panel)
3. Add the **OpenAI AI Integration** from the Integrations panel
4. Add a **PostgreSQL** database from the Database panel
5. Add `SESSION_SECRET` to the Secrets panel
6. Open the Shell and run:
   ```bash
   bash setup.sh
   ```
7. Click **Run**

---

## Troubleshooting

**"relation does not exist" errors:**
```bash
npm run db:push
```

**Admin password forgotten:**
```bash
npx tsx scripts/setup.ts
```
This resets the admin password back to `admin123`.

**PDF processing fails:**
Ensure PDFs are in `attached_assets/` with these exact names:
- `Epic-Standards_1773058422357.pdf`
- `Feature-Standard_1773058422357.pdf`
- `The_Lighthouse-v21-20260305_114446_1773058422357.pdf`

Or re-process manually via admin panel → Reference Docs → Process All.
