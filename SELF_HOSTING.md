# Agile Artifact Analyzer - Self-Hosting Guide

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** 14+ database
- **OpenAI API Key** (GPT-4 or GPT-4o model access required)

## Quick Start

### 1. Clone / Download the Project

Download or copy the entire project directory to your VM.

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file in the project root (or export these variables):

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/artifact_analyzer
SESSION_SECRET=your-random-secret-string-here
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional (defaults shown)
NODE_ENV=production
PORT=5000
```

**Generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set Up the Database

Create the PostgreSQL database:

```bash
createdb artifact_analyzer
```

Push the schema:

```bash
npm run db:push
```

### 5. Build the Application

```bash
npm run build
```

### 6. Start the Application

```bash
npm start
```

The app will be available at `http://localhost:5000`.

### 7. First Login

On first startup, an admin account is automatically created:
- **Email:** `admin@mastercard.com`
- **Password:** Check the server console output - a random password is generated and logged once

### 8. Process Reference Documents

After logging in as admin:
1. Go to the **Admin** page
2. Click the **Reference Docs** tab
3. Click **Process All** to index the PDF documents for RAG

The PDF files should be in the `attached_assets/` directory.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `NODE_ENV` | No | Set to `production` for production mode |
| `PORT` | No | Server port (default: 5000) |

---

## Running with Docker (Optional)

If you prefer Docker:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
```

```bash
docker build -t artifact-analyzer .
docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e SESSION_SECRET=your-secret \
  -e OPENAI_API_KEY=sk-your-key \
  artifact-analyzer
```

---

## Running with PM2 (Recommended for VMs)

```bash
npm install -g pm2

# Start the app
pm2 start npm --name "artifact-analyzer" -- start

# Auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs artifact-analyzer
```

---

## Troubleshooting

**"relation does not exist" errors:**
Run `npm run db:push` to create/sync database tables.

**Admin password lost:**
Delete the admin user from the database and restart the app:
```sql
DELETE FROM users WHERE email = 'admin@mastercard.com';
```
A new password will be generated on next startup.

**PDF processing fails:**
Ensure PDF files are in the `attached_assets/` directory and have the expected filenames (check `server/pdf-processor.ts` for the file list).
