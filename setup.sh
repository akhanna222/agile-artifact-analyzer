#!/bin/bash

echo ""
echo "========================================"
echo "  Agile Artifact Analyzer - Full Setup"
echo "========================================"
echo ""

# Check required env vars
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo ""
  echo "Create a .env file or export the variable:"
  echo "  export DATABASE_URL=postgresql://user:pass@host:5432/dbname"
  echo "  export SESSION_SECRET=your-random-secret"
  echo "  export OPENAI_API_KEY=sk-your-openai-key"
  echo ""
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo "ERROR: npm install failed"
  exit 1
fi
echo ""

# Run the full setup script (schema + seed + documents)
echo "Running database setup..."
npx tsx scripts/setup.ts
