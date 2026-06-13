#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/andhrapatrika-epaper}"
COMPOSE="docker compose"

echo "==> Deploying Andhra Patrika Epaper in ${APP_DIR}"

cd "${APP_DIR}"

if [[ ! -f .env.production ]]; then
  echo "ERROR: .env.production not found in ${APP_DIR}"
  echo "Copy .env.example to .env.production and fill in values first."
  exit 1
fi

git pull origin main

${COMPOSE} build --no-cache
${COMPOSE} up -d --remove-orphans
${COMPOSE} ps

echo "==> Deploy complete. App should be on http://127.0.0.1:3001"
