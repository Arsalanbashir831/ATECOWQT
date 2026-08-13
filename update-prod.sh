#!/usr/bin/env bash
# Safely update the production checkout and reload the PM2 application.
# Usage: cd /var/www/ateco-wqt && ./update-prod.sh

set -Eeuo pipefail

APP_NAME="${APP_NAME:-ateco-wqt}"
APP_DIR="${APP_DIR:-/var/www/ateco-wqt}"
BRANCH="${BRANCH:-main}"
APP_PORT="${PORT:-3000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${APP_PORT}/healthz}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-15}"
LOCK_FILE="${LOCK_FILE:-/tmp/${APP_NAME}-deploy.lock}"

log() { printf '\n[deploy] %s\n' "$*"; }
die() { printf '\n[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

for command in git npm pm2 curl flock; do
  command -v "$command" >/dev/null 2>&1 || die "Required command not found: $command"
done

[[ -d "$APP_DIR/.git" ]] || die "$APP_DIR is not a Git checkout"
cd "$APP_DIR"

# Prevent two deployments from changing the same checkout simultaneously.
exec 9>"$LOCK_FILE"
flock -n 9 || die "Another deployment is already running"

CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || \
  die "Expected branch '$BRANCH', but '$CURRENT_BRANCH' is checked out"

# Never overwrite production hotfixes or other tracked local changes.
git diff --quiet && git diff --cached --quiet || \
  die "Tracked files have local changes; commit or stash them before deploying"

PREVIOUS_SHA="$(git rev-parse HEAD)"
UPDATED=0

rollback() {
  local exit_code=$?
  trap - ERR
  set +e

  if [[ "$UPDATED" -eq 1 ]]; then
    printf '\n[deploy] Update failed; rolling back to %s\n' "${PREVIOUS_SHA:0:8}" >&2
    git reset --hard "$PREVIOUS_SHA"
    npm ci --omit=dev --no-audit --no-fund
    pm2 reload ecosystem.config.js --env production --update-env || \
      pm2 start ecosystem.config.js --env production
  fi

  exit "$exit_code"
}
trap rollback ERR

log "Fetching origin/$BRANCH"
git fetch --prune origin "$BRANCH"

# Refuse rewritten history; production updates must be fast-forward deployments.
git merge-base --is-ancestor HEAD "origin/$BRANCH" || \
  die "origin/$BRANCH is not a fast-forward from this checkout"

git merge --ff-only "origin/$BRANCH"
NEW_SHA="$(git rev-parse HEAD)"
[[ "$NEW_SHA" == "$PREVIOUS_SHA" ]] || UPDATED=1

log "Installing locked production dependencies"
npm ci --omit=dev --no-audit --no-fund

if npm run | grep -qE '^  build($|:)'; then
  log "Building production assets"
  NODE_ENV=production npm run build
fi

log "Reloading $APP_NAME with PM2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --env production --update-env
else
  pm2 start ecosystem.config.js --env production
fi

log "Checking $HEALTH_URL"
healthy=0
for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++)); do
  status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
    --max-time 5 "$HEALTH_URL" || true)"

  if [[ "$status" == "200" ]]; then
    healthy=1
    break
  fi

  printf '[deploy] Health attempt %d/%d returned %s\n' \
    "$attempt" "$HEALTH_ATTEMPTS" "${status:-no response}"
  sleep 2
done

[[ "$healthy" -eq 1 ]] || false

pm2 save
trap - ERR
log "Successfully deployed ${NEW_SHA:0:8}"
