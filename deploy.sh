#!/usr/bin/env bash
#
# deploy.sh — run this EVERY time you ship. Safe to re-run.
# Pulls, installs, builds, health-checks, then hot-reloads PM2 with zero downtime.
# Rolls back automatically if the new code fails to boot.
#
#   cd /var/www/ateco-wqt && ./deploy.sh
#
set -Eeuo pipefail

APP_NAME="ateco-wqt"
APP_DIR="/var/www/${APP_NAME}"
BRANCH="main"
APP_PORT="3000"
HEALTH_PATH="/healthz"        # endpoint that returns 200 (see README)
HEALTH_RETRIES=15

cd "$APP_DIR"

log()  { echo -e "\n\033[1;36m==>\033[0m \033[1m$*\033[0m"; }
fail() { echo -e "\033[1;31m[FAIL]\033[0m $*"; exit 1; }

PREV_SHA="$(git rev-parse HEAD)"
trap 'echo -e "\033[1;31mDeploy aborted.\033[0m Previous release still running (${PREV_SHA:0:8})."' ERR

# ── 1. Pull ──────────────────────────────────────────────────
log "Fetching ${BRANCH}"
git fetch --all --prune
git reset --hard "origin/${BRANCH}"
NEW_SHA="$(git rev-parse HEAD)"
echo "    ${PREV_SHA:0:8} -> ${NEW_SHA:0:8}"

if [[ "$PREV_SHA" == "$NEW_SHA" ]]; then
  echo "    No new commits. Continuing anyway (use ./deploy.sh to force rebuild)."
fi

# ── 2. Dependencies (only if lockfile changed — keeps deploys fast) ──
if ! git diff --quiet "$PREV_SHA" "$NEW_SHA" -- package-lock.json package.json 2>/dev/null \
   || [[ ! -d node_modules ]]; then
  log "Installing production dependencies"
  npm ci --omit=dev --no-audit --no-fund
else
  log "Dependencies unchanged — skipping npm ci"
fi

# ── 3. Build step (assets, tailwind, sass, esbuild, etc.) ────
if npm run | grep -qE '^\s+build'; then
  log "Running build"
  NODE_ENV=production npm run build
else
  echo "    No build script defined — skipping."
fi

# ── 4. Migrations (uncomment what applies) ───────────────────
# log "Running migrations"
# npx prisma migrate deploy
# npx sequelize-cli db:migrate

# ── 5. Start or hot-reload ───────────────────────────────────
export NODE_ENV=production

if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  log "Reloading ${APP_NAME} (zero downtime)"
  pm2 reload ecosystem.config.js --env production --update-env
else
  log "Starting ${APP_NAME} for the first time"
  pm2 start ecosystem.config.js --env production
fi

# ── 6. Health check with automatic rollback ──────────────────
log "Health check on http://127.0.0.1:${APP_PORT}${HEALTH_PATH}"
OK=0
for i in $(seq 1 $HEALTH_RETRIES); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
          "http://127.0.0.1:${APP_PORT}${HEALTH_PATH}" || echo 000)"
  if [[ "$CODE" == "200" ]]; then OK=1; break; fi
  printf '    attempt %d/%d -> %s\n' "$i" "$HEALTH_RETRIES" "$CODE"
  sleep 2
done

if [[ "$OK" -ne 1 ]]; then
  echo -e "\033[1;31m[!] New release is unhealthy — rolling back to ${PREV_SHA:0:8}\033[0m"
  pm2 logs "$APP_NAME" --lines 40 --nostream || true
  git reset --hard "$PREV_SHA"
  npm ci --omit=dev --no-audit --no-fund
  npm run build 2>/dev/null || true
  pm2 reload ecosystem.config.js --env production --update-env
  fail "Rolled back. Fix the error above and redeploy."
fi

# ── 7. Persist + report ──────────────────────────────────────
pm2 save
log "Deployed ${NEW_SHA:0:8} successfully"
pm2 status "$APP_NAME"
