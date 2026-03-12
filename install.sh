#!/bin/bash
set -e

# ================================================================
#  Agile Artifact Analyzer - Local Linux Setup Script
#  Works on: Ubuntu 20.04+, Debian 11+, CentOS/RHEL 8+
#
#  Usage:
#    bash install.sh
#
#  What this does:
#    1. Installs Node.js 20 (via nvm if needed)
#    2. Installs PostgreSQL (if not already installed)
#    3. Creates the database and database user
#    4. Creates a .env file with all required settings
#    5. Installs npm dependencies
#    6. Creates all database tables
#    7. Seeds admin user (admin@mastercard.com / admin123)
#    8. Processes all reference PDF documents for AI search
#    9. Builds the app and starts it
# ================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo ""
  echo -e "${BLUE}======================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}======================================================${NC}"
  echo ""
}

print_step() {
  echo -e "${GREEN}▶ $1${NC}"
}

print_warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ ERROR: $1${NC}"
}

print_ok() {
  echo -e "${GREEN}✓ $1${NC}"
}

# ---------------------------------------------------------------
# Detect OS
# ---------------------------------------------------------------
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_LIKE=$ID_LIKE
  else
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  fi
}

# ---------------------------------------------------------------
# Install Node.js 20 via nvm
# ---------------------------------------------------------------
install_node() {
  print_step "Checking Node.js..."

  if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ] 2>/dev/null; then
      print_ok "Node.js $(node -v) already installed"
      return
    else
      print_warn "Node.js $(node -v) is too old. Installing Node.js 20..."
    fi
  fi

  # Install via nvm
  print_step "Installing Node.js 20 via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  nvm install 20
  nvm use 20
  nvm alias default 20

  print_ok "Node.js $(node -v) installed"
}

# ---------------------------------------------------------------
# Install PostgreSQL
# ---------------------------------------------------------------
install_postgres() {
  print_step "Checking PostgreSQL..."

  if command -v psql &>/dev/null; then
    print_ok "PostgreSQL already installed: $(psql --version)"
    return
  fi

  print_step "Installing PostgreSQL..."

  if [[ "$OS" == "ubuntu" || "$OS" == "debian" || "$OS_LIKE" == *"debian"* ]]; then
    sudo apt-get update -qq
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql

  elif [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "fedora" || "$OS_LIKE" == *"rhel"* ]]; then
    sudo dnf install -y postgresql-server postgresql-contrib
    sudo postgresql-setup --initdb
    sudo systemctl start postgresql
    sudo systemctl enable postgresql

  else
    print_error "Unsupported OS: $OS. Please install PostgreSQL manually:"
    echo "  https://www.postgresql.org/download/"
    exit 1
  fi

  print_ok "PostgreSQL installed"
}

# ---------------------------------------------------------------
# Create PostgreSQL database and user
# ---------------------------------------------------------------
setup_database() {
  print_step "Setting up database..."

  DB_NAME="artifact_analyzer"
  DB_USER="artifact_user"
  DB_PASS=$(openssl rand -hex 16)

  # Check if DB already exists
  if sudo -u postgres psql -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "$DB_NAME"; then
    print_warn "Database '$DB_NAME' already exists — skipping creation"
    # Try to read existing .env for the password
    if [ -f .env ]; then
      DB_URL=$(grep DATABASE_URL .env | cut -d'=' -f2-)
      print_ok "Using existing DATABASE_URL from .env"
      return
    fi
  fi

  # Create user if not exists
  sudo -u postgres psql -c "DO \$\$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
    END IF;
  END \$\$;" 2>/dev/null || true

  # Create database
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME" 2>/dev/null || true

  DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
  print_ok "Database created: $DB_NAME"
}

# ---------------------------------------------------------------
# Create .env file
# ---------------------------------------------------------------
create_env() {
  print_step "Creating .env file..."

  if [ -f .env ]; then
    print_warn ".env already exists — not overwriting"
    print_warn "Make sure it has: DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY"

    # Load existing .env
    export $(grep -v '^#' .env | xargs) 2>/dev/null || true
    return
  fi

  SESSION_SECRET=$(openssl rand -hex 32)

  cat > .env <<EOF
# Agile Artifact Analyzer - Environment Configuration
# Generated by install.sh on $(date)

# PostgreSQL database connection
DATABASE_URL=${DB_URL}

# Secret key for session encryption (keep this safe!)
SESSION_SECRET=${SESSION_SECRET}

# OpenAI API key - REQUIRED for AI analysis
# Get yours at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-YOUR-OPENAI-API-KEY-HERE

# Server port (optional, default: 5000)
PORT=5000

# Environment
NODE_ENV=production
EOF

  print_ok ".env file created"
  echo ""
  print_warn "IMPORTANT: Edit .env and add your OpenAI API key before starting!"
  echo "  nano .env"
  echo ""
}

# ---------------------------------------------------------------
# Load .env into environment
# ---------------------------------------------------------------
load_env() {
  if [ -f .env ]; then
    set -o allexport
    source .env
    set +o allexport
  fi
}

# ---------------------------------------------------------------
# Check OpenAI key
# ---------------------------------------------------------------
check_openai() {
  if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-YOUR-OPENAI-API-KEY-HERE" ]; then
    echo ""
    print_warn "OpenAI API key not set in .env"
    echo ""
    read -p "  Enter your OpenAI API key (or press Enter to skip): " USER_OPENAI_KEY
    if [ -n "$USER_OPENAI_KEY" ]; then
      sed -i "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=${USER_OPENAI_KEY}|" .env
      export OPENAI_API_KEY="$USER_OPENAI_KEY"
      print_ok "OpenAI API key saved to .env"
    else
      print_warn "Skipping — AI analysis will not work until you add your key"
    fi
    echo ""
  else
    print_ok "OpenAI API key found"
  fi
}

# ---------------------------------------------------------------
# Install npm dependencies
# ---------------------------------------------------------------
install_deps() {
  print_step "Installing npm dependencies..."
  npm install
  print_ok "Dependencies installed"
}

# ---------------------------------------------------------------
# Run database setup (schema + seed + documents)
# ---------------------------------------------------------------
run_setup() {
  print_step "Setting up database schema, admin user, and reference documents..."
  npx tsx scripts/setup.ts
}

# ---------------------------------------------------------------
# Build the app
# ---------------------------------------------------------------
build_app() {
  print_step "Building app for production..."
  npm run build
  print_ok "App built"
}

# ---------------------------------------------------------------
# Create systemd service (optional)
# ---------------------------------------------------------------
create_service() {
  echo ""
  read -p "Create a systemd service to auto-start on reboot? (y/N): " CREATE_SERVICE
  if [[ "$CREATE_SERVICE" =~ ^[Yy]$ ]]; then
    APP_DIR=$(pwd)
    APP_USER=$(whoami)

    sudo tee /etc/systemd/system/artifact-analyzer.service > /dev/null <<EOF
[Unit]
Description=Agile Artifact Analyzer
After=network.target postgresql.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/dist/index.cjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable artifact-analyzer
    sudo systemctl start artifact-analyzer

    print_ok "Systemd service created and started"
    echo "  Manage with:"
    echo "    sudo systemctl status artifact-analyzer"
    echo "    sudo systemctl restart artifact-analyzer"
    echo "    sudo journalctl -u artifact-analyzer -f"
  fi
}

# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------
print_header "Agile Artifact Analyzer - Local Linux Setup"

detect_os
install_node
install_postgres
setup_database
create_env
load_env
check_openai
install_deps
run_setup
build_app

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""
echo "Login credentials:"
echo "  Email:    admin@mastercard.com"
echo "  Password: admin123"
echo ""
echo "Start the app anytime with:"
echo -e "  ${BLUE}npm start${NC}          (production)"
echo -e "  ${BLUE}npm run dev${NC}        (development with hot reload)"
echo ""

create_service

echo ""
PORT_NUM=${PORT:-5000}
echo -e "App URL: ${BLUE}http://localhost:${PORT_NUM}${NC}"
echo ""

# Ask if user wants to start now
read -p "Start the app now? (Y/n): " START_NOW
if [[ ! "$START_NOW" =~ ^[Nn]$ ]]; then
  echo ""
  print_step "Starting app..."
  npm start
fi
