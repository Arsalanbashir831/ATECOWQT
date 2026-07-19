// ecosystem.config.js — place in your project root, commit it.
// Tuned to stop the "randomly dies in production" problem.

const APP_NAME = 'ateco-wqt';

module.exports = {
  apps: [
    {
      name: APP_NAME,
      script: './app.js',          // or ./server.js / ./bin/www
      cwd: '/var/www/' + APP_NAME,

      // --- Clustering -------------------------------------------------
      // The app uses in-memory sessions, so keep a single worker in production
      // to prevent sessions from being lost between requests.
      exec_mode: 'fork',
      instances: 1,

      // --- Crash resilience -------------------------------------------
      autorestart: true,
      max_memory_restart: '450M',      // restart BEFORE the OOM killer fires
      min_uptime: '15s',               // under this = counted as a crash loop
      max_restarts: 10,                // then PM2 stops flapping and errors out
      exp_backoff_restart_delay: 200,  // 200ms, 400ms, 800ms... no thrashing
      restart_delay: 1000,

      // --- Graceful reload (no dropped requests) ----------------------
      wait_ready: false,
      listen_timeout: 10000,
      kill_timeout: 6000,      // time to drain in-flight requests on SIGINT
      shutdown_with_message: false,

      // --- Watch OFF in production (watch mode is a classic crash cause) ---
      watch: false,

      // --- Logs -------------------------------------------------------
      merge_logs: true,
      time: true,
      out_file: '/var/log/' + APP_NAME + '/out.log',
      error_file: '/var/log/' + APP_NAME + '/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // --- Runtime ----------------------------------------------------
      node_args: '--max-old-space-size=400',

      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        UV_THREADPOOL_SIZE: 8,
      },
    },
  ],
};
