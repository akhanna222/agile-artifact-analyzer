# Agile Artifact Analyzer — Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [OpenAI API Key Setup](#openai-api-key-setup)
3. [Option A — Docker Compose (Recommended)](#option-a--docker-compose-recommended)
4. [Option B — Docker Only (Bring Your Own Database)](#option-b--docker-only-bring-your-own-database)
5. [Option C — Bare Metal / VM](#option-c--bare-metal--vm)
6. [Option D — New Replit Account](#option-d--new-replit-account)
7. [Environment Variables Reference](#environment-variables-reference)
8. [First Login & Admin Setup](#first-login--admin-setup)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Docker + Docker Compose | 24+ / v2+ |
| Node.js (bare metal only) | 20 LTS+ |
| PostgreSQL (bare metal only) | 14+ |
| OpenAI API Key | gpt-4o access required |

---

## OpenAI API Key Setup

The app uses OpenAI **gpt-4o** to analyze agile artifacts. You need your own API key for any deployment outside of Replit.

### Step 1 — Create an OpenAI account
Go to **https://platform.openai.com** and sign up or log in.

### Step 2 — Generate an API key
1. Click your profile → **API keys**
2. Click **Create new secret key**
3. Give it a name (e.g. `agile-analyzer`)
4. Copy the key — it starts with `sk-` and is shown only once

### Step 3 — Ensure gpt-4o access
Your account must have access to `gpt-4o`. If you see a model access error:
- Visit **https://platform.openai.com/account/limits**
- Add a payment method and add some credit (even $5 is enough for extensive use)

### Step 4 — Set the key in your deployment
See the relevant option below. In all cases, the variable name is:
```
OPENAI_API_KEY=sk-your-key-here
```

---

## Option A — Docker Compose (Recommended)

This is the simplest full deployment — spins up the app and a PostgreSQL database together.

### 1. Create project directory and files

```bash
mkdir agile-analyzer && cd agile-analyzer
```

Create `docker-compose.yml`:

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: artifact_analyzer
      POSTGRES_USER: analyzer
      POSTGRES_PASSWORD: changeme_db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U analyzer -d artifact_analyzer"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: node:20-alpine
    restart: unless-stopped
    working_dir: /app
    volumes:
      - ./app:/app
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://analyzer:changeme_db_password@db:5432/artifact_analyzer
      SESSION_SECRET: replace_this_with_a_long_random_string
      OPENAI_API_KEY: sk-your-openai-key-here
      PORT: 5000
    depends_on:
      db:
        condition: service_healthy
    command: sh -c "npm ci && npm run build && npm run db:push && npx tsx server/seed.ts && npm start"

volumes:
  postgres_data:
```

### 2. Add the application code

Copy or extract the project into an `app/` subdirectory:

```bash
mkdir app
# Then extract the project zip into app/, or:
# cp -r /path/to/agile-artifact-analyzer/* app/
```

Your directory should look like:
```
agile-analyzer/
├── docker-compose.yml
└── app/
    ├── package.json
    ├── server/
    ├── client/
    ├── shared/
    └── attached_assets/   ← required for RAG documents
```

### 3. Set your secrets

Edit `docker-compose.yml` and replace:
- `changeme_db_password` — any secure password
- `replace_this_with_a_long_random_string` — generate with: `openssl rand -hex 32`
- `sk-your-openai-key-here` — your OpenAI API key

### 4. Start everything

```bash
docker compose up -d
```

Check it's running:
```bash
docker compose logs -f app
```

The app will be at **http://localhost:5000**

### 5. Stop / Update

```bash
# Stop
docker compose down

# Stop and remove all data (including database)
docker compose down -v

# Update app code and restart
docker compose down && docker compose up -d --build
```

---

## Option B — Docker Only (Bring Your Own Database)

Use this if you already have a PostgreSQL database running.

### 1. Create a Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/attached_assets ./attached_assets
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
```

### 2. Build the image

```bash
docker build -t agile-analyzer:latest .
```

### 3. Prepare the database

Run schema setup once (creates all tables):
```bash
docker run --rm \
  -e DATABASE_URL="postgresql://user:password@your-db-host:5432/artifact_analyzer" \
  -e SESSION_SECRET="any-temporary-value" \
  -e OPENAI_API_KEY="sk-your-key" \
  agile-analyzer:latest \
  sh -c "npm run db:push && npx tsx server/seed.ts"
```

### 4. Run the container

```bash
docker run -d \
  --name agile-analyzer \
  --restart unless-stopped \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@your-db-host:5432/artifact_analyzer" \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e OPENAI_API_KEY="sk-your-key-here" \
  -e NODE_ENV=production \
  agile-analyzer:latest
```

### 5. Process RAG Documents (first run)

After the container starts, trigger PDF processing via the admin panel:
1. Log in as `admin@mastercard.com` / `admin123`
2. Go to **Admin → Reference Docs**
3. Click **Process All Documents**

Or run it via the API:
```bash
curl -X POST http://localhost:5000/api/admin/process-documents \
  -H "Cookie: your-session-cookie"
```

---

## Option C — Bare Metal / VM

### 1. Install dependencies

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs postgresql

# Start PostgreSQL
sudo systemctl enable --now postgresql
```

### 2. Create database

```bash
sudo -u postgres psql -c "CREATE USER analyzer WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE artifact_analyzer OWNER analyzer;"
```

### 3. Clone / extract the project

```bash
# Extract the zip, then:
cd agile-artifact-analyzer
```

### 4. Create `.env` file

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://analyzer:yourpassword@localhost:5432/artifact_analyzer
SESSION_SECRET=replace_with_64_char_random_string
OPENAI_API_KEY=sk-your-openai-api-key-here
NODE_ENV=production
PORT=5000
EOF
```

Generate a secure SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Install, build, and initialize

```bash
npm ci
npm run build
npm run db:push
npx tsx server/seed.ts
```

### 6. Start the app

**Development:**
```bash
npm run dev
```

**Production (with PM2 for auto-restart):**
```bash
npm install -g pm2
pm2 start npm --name "agile-analyzer" -- start
pm2 startup   # generates the command to run on reboot
pm2 save
```

**Check logs:**
```bash
pm2 logs agile-analyzer
```

The app will be at **http://localhost:5000**

### 7. Optional — Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Option D — New Replit Account

1. Create a new Repl (Node.js template)
2. Upload the project zip (drag & drop into the Files panel)
3. Add the **OpenAI AI Integration** from the Integrations panel — no API key needed, it's managed automatically
4. Add a **PostgreSQL** database from the Database panel
5. Add `SESSION_SECRET` to the Secrets panel (generate with `openssl rand -hex 32`)
6. Open the Shell and run:
   ```bash
   bash setup.sh
   ```
7. Click **Run**

> On Replit, `OPENAI_API_KEY` is **not** needed — the AI Integration provides it automatically.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string — `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | Yes | 32+ character random secret for session encryption |
| `OPENAI_API_KEY` | Yes (standalone) | Your OpenAI API key (`sk-...`). Not needed on Replit. |
| `NODE_ENV` | No | Set to `production` for production deployments |
| `PORT` | No | Server port (default: `5000`) |

> **Replit only**: `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` are auto-injected when the OpenAI AI Integration is active. The app uses these if present, falling back to `OPENAI_API_KEY`.

---

## First Login & Admin Setup

After deployment, the default admin account is created automatically:

| Field | Value |
|-------|-------|
| Email | `admin@mastercard.com` |
| Password | `admin123` |

> The password is **reset to `admin123` on every server restart** in the current build. Create additional users via the admin panel and use those for day-to-day access.

**After first login:**
1. Go to **Admin → Reference Docs → Process All** to enable the RAG system (if not already done via setup script)
2. Go to **Jira Connect** in the sidebar to connect your Jira instance

---

## Reference Documents (RAG)

The RAG system retrieves relevant passages from these PDFs to enhance analysis quality:

| Document | Chunks | Purpose |
|----------|--------|---------|
| Epic-Standards | 8 | Epic evaluation standards |
| Feature-Standard | 4 | Feature evaluation standards |
| The_Lighthouse | 300 | Company agile methodology guide |

PDFs must be present in `attached_assets/`. Process them via **Admin → Reference Docs → Process All**.

To add your own company standards:
1. Place your PDF in `attached_assets/`
2. Admin panel → Reference Docs → select and process

---

## Troubleshooting

**"relation does not exist" errors:**
```bash
npm run db:push
```

**Admin password forgotten / need to reset:**
The server resets the admin password to `admin123` on every restart. Simply restart the server.

**OpenAI errors (model access):**
- Ensure your API key has access to `gpt-4o`
- Check usage limits at https://platform.openai.com/account/limits
- Add billing at https://platform.openai.com/account/billing

**Jira 401 errors:**
- **Cloud**: email + API token from https://id.atlassian.com/manage-profile/security/api-tokens
- **Data Center**: Personal Access Token from your Jira profile → Personal Access Tokens (not from Atlassian ID)

**Jira 410 errors (search):**
- The app uses `/rest/api/3/search/jql` (Atlassian CHANGE-2046 compliant). If you see 410, ensure you are on the latest version of the app.

**PDF processing fails:**
```
attached_assets/Epic-Standards_1773058422357.pdf
attached_assets/Feature-Standard_1773058422357.pdf
attached_assets/The_Lighthouse-v21-20260305_114446_1773058422357.pdf
```
Ensure these files are present. Re-process via Admin → Reference Docs → Process All.

**Container won't start — port already in use:**
```bash
docker ps -a   # find the conflicting container
docker stop <container_id>
```
Or change the host port: `-p 8080:5000` to run on port 8080.
