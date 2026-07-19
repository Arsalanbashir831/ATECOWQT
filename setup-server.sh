#!/usr/bin/env bash
#
# setup-server.sh — ONE-TIME Hostinger VPS provisioning for an EJS/Node.js app.
# Run as root (or with sudo) on a fresh Ubuntu 22.04/24.04 VPS.
#
#   chmod +x setup-server.sh && sudo ./setup-server.sh
#
set -Eeuo pipefail

# ─────────────────────────────────────────────────────────────
# CONFIG — edit these 6 lines only
# ─────────────────────────────────────────────────────────────
APP_NAME="ateco-wqt"                                  # pm2 process name / folder name
APP_USER="deploy"                                 # non-root user that runs the app
REPO_URL="https://github.com/Arsalanbashir831/ATECOWQT.git"   # or https://... 
BRANCH="main"
DOMAIN="https://atecowqt.dotcodesolutions.com"                              # leave blank to skip nginx+SSL
NODE_VERSION="22"                                 # 20 or 22 (LTS)
APP_PORT="3000"                                   # port your Express app listens on
SWAP_SIZE="2G"                                    # set to "" to skip swap
# ─────────────────────────────────────────────────────────────

APP_DIR="/var/www/${APP_NAME}"
log() { echo -e "\n\033[1;32m==>\033[0m \033[1m$*\033[0m"; }
warn() { echo -e "\033[1;33m[warn]\033[0m $*"; }
trap 'echo -e "\n\033[1;31m[FAILED]\033[0m line $LINENO — nothing after this point ran."' ERR

[[ $EUID -eq 0 ]] || { echo "Run this with sudo."; exit 1; }

# ── 1. Base packages ─────────────────────────────────────────
log "Updating system and installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential ufw fail2ban nginx ca-certificates gnupg unzip htop

# ── 2. Swap (THE most common cause of random PM2 crashes on small VPS) ──
if [[ -n "$SWAP_SIZE" ]] && ! swapon --show | grep -q '/swapfile'; then
  log "Creating ${SWAP_SIZE} swap file"
  fallocate -l "$SWAP_SIZE" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
else
  warn "Swap skipped or already present"
fi

# ── 3. Deploy user ───────────────────────────────────────────
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "Creating user ${APP_USER}"
  adduser --disabled-password --gecos "" "$APP_USER"
  usermod -aG sudo "$APP_USER"
  mkdir -p /home/${APP_USER}/.ssh
  # copy root's authorized keys so you can still log in
  [[ -f /root/.ssh/authorized_keys ]] && cp /root/.ssh/authorized_keys /home/${APP_USER}/.ssh/
  chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}/.ssh
  chmod 700 /home/${APP_USER}/.ssh
  chmod 600 /home/${APP_USER}/.ssh/authorized_keys 2>/dev/null || true
fi

# ── 4. Node.js via NodeSource ────────────────────────────────
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  log "Installing Node.js ${NODE_VERSION}.x"
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

# ── 5. PM2 ───────────────────────────────────────────────────
log "Installing PM2 + logrotate module"
npm install -g pm2@latest
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# ── 6. App directory + first clone ───────────────────────────
log "Preparing ${APP_DIR}"
mkdir -p "$APP_DIR" /var/log/${APP_NAME}
chown -R ${APP_USER}:${APP_USER} "$APP_DIR" /var/log/${APP_NAME}

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "Using existing code in place (clone skipped)"
  : # skipped:  -b "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  warn "Repo already cloned, skipping"
fi

# ── 7. Firewall ──────────────────────────────────────────────
log "Configuring UFW"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── 8. Nginx reverse proxy + static asset offloading ─────────
if [[ -n "$DOMAIN" ]]; then
  log "Writing nginx site for ${DOMAIN}"
  cat > /etc/nginx/sites-available/${APP_NAME} <<NGINX
upstream ${APP_NAME}_upstream {
    server 127.0.0.1:${APP_PORT};
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 25M;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml font/woff2;

    # Static files served by nginx directly — never touches Node.
    # This is what makes the app feel "static" and fast.
    location /public/ {
        alias ${APP_DIR}/public/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location ~* \.(?:css|js|jpg|jpeg|png|gif|ico|svg|webp|woff2?|ttf|map)\$ {
        root ${APP_DIR}/public;
        access_log off;
        expires 30d;
        add_header Cache-Control "public";
        try_files \$uri @node;
    }

    location / {
        proxy_pass http://${APP_NAME}_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }

    location @node {
        proxy_pass http://${APP_NAME}_upstream;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

  ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  log "Installing SSL certificate (Let's Encrypt)"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" --non-interactive --agree-tos \
          --register-unsafely-without-email --redirect || \
    warn "Certbot failed — check that ${DOMAIN} DNS A record points at this VPS, then rerun: certbot --nginx -d ${DOMAIN}"
fi

# ── 9. .env scaffold ─────────────────────────────────────────
if [[ ! -f "${APP_DIR}/.env" ]]; then
  log "Creating .env template"
  cat > "${APP_DIR}/.env" <<ENVFILE
NODE_ENV=production
PORT=${APP_PORT}
ENVFILE
  chown ${APP_USER}:${APP_USER} "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
  warn "Fill in ${APP_DIR}/.env (DB URL, session secret, API keys) BEFORE deploying."
fi

# ── 10. PM2 boot persistence ─────────────────────────────────
log "Enabling PM2 on boot for ${APP_USER}"
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp /home/${APP_USER} | tail -n 1 | bash || true

log "Server ready."
cat <<DONE

Next steps:
  1. nano ${APP_DIR}/.env          # add your secrets
  2. Copy ecosystem.config.js and deploy.sh into ${APP_DIR}
  3. su - ${APP_USER}
     cd ${APP_DIR} && ./deploy.sh

DONE
