#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/ateco-wqt"
BRANCH="main"

cd "$APP_DIR"

echo "[prod] Pulling latest changes from $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "[prod] Installing dependencies"
npm ci --omit=dev --no-audit --no-fund

echo "[prod] Restarting app"
pm2 reload ecosystem.config.js --env production --update-env || pm2 start ecosystem.config.js --env production
pm2 save

echo "[prod] Done"
