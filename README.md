# EJS + Node.js deployment on Hostinger VPS

## Files

| File | When you use it |
|---|---|
| `setup-server.sh` | Once, as root, on a fresh VPS |
| `ecosystem.config.js` | Committed to your repo root |
| `app-production-snippet.js` | Reference — paste the pieces into your `app.js` |
| `deploy.sh` | Every deploy, as the `deploy` user |

## First run

```bash
# on your VPS, as root
scp deploy/setup-server.sh root@YOUR_IP:/root/     # or paste it with nano
nano setup-server.sh          # edit the 8 CONFIG lines at the top
chmod +x setup-server.sh
./setup-server.sh
```

Then:

```bash
nano /var/www/myapp/.env      # add DB URL, SESSION_SECRET, API keys
su - deploy
cd /var/www/myapp
chmod +x deploy.sh
./deploy.sh
```

Every deploy after that is just `cd /var/www/myapp && ./deploy.sh`.

## Before the first deploy — 3 edits to your app

1. Add `/healthz` route (deploy.sh rolls back if it doesn't return 200)
2. Add `process.send('ready')` inside your `app.listen` callback
3. Add the `SIGTERM`/`SIGINT` graceful shutdown handlers

All three are in `app-production-snippet.js`.

## Why it was crashing on PM2

In order of how often it's the actual cause:

**Out of memory.** Hostinger's cheaper VPS plans ship 1–2 GB RAM with no swap. Node grows its heap until the kernel OOM-killer kills it — which looks like a random crash with nothing in the logs. The setup script adds a 2 GB swapfile and `max_memory_restart: '450M'` so PM2 recycles the worker before the kernel does.

**Unhandled rejections.** Node 15+ terminates the process on an unhandled promise rejection. One missing `.catch()` on a DB call takes the whole server down. The snippet logs them instead.

**`watch: true` left on.** PM2 restarts on every log file write, which cascades into a restart loop. Explicitly off in the config.

**Fork mode + `pm2 restart`.** That drops connections. Cluster mode + `pm2 reload` doesn't.

**PM2 not saved.** After a VPS reboot the app is just gone. `pm2 startup` + `pm2 save` fixes it — both are in the scripts.

## Why it'll be fast

- nginx serves everything in `/public` directly — CSS, JS, images, fonts never reach Node, with a 1-year immutable cache header.
- `view cache: true` compiles each EJS template once instead of re-reading from disk per request. This is usually the single biggest EJS speedup.
- gzip at the nginx layer, cluster mode across all vCPUs, keepalive to the upstream.
- `deploy.sh` skips `npm ci` when the lockfile hasn't changed, so most deploys take a few seconds.

## Handy commands

```bash
pm2 status                # what's running
pm2 logs myapp --lines 100
pm2 monit                 # live CPU/memory
pm2 reload myapp          # zero-downtime restart
pm2 flush                 # clear logs
free -h                   # confirm swap is active
sudo nginx -t && sudo systemctl reload nginx
```

## Remote production updates

If you want to update the app from the server directly, use the helper script:

```bash
cd /var/www/ateco-wqt
./update-prod.sh
```

This script will:
- pull the latest code from the `main` branch
- install dependencies
- restart the PM2 process for production

## Cache-busting note

Since `/public` is cached for a year, add a version query to your asset tags in the EJS layout so users get new CSS after a deploy:

```ejs
<link rel="stylesheet" href="/public/css/style.css?v=<%= process.env.BUILD_ID || '1' %>">
```

Set `BUILD_ID` in `.env` to the git SHA, or just bump it manually.
