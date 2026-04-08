module.exports = {
  apps: [
    {
      name: "mybingocard",
      script: "/usr/bin/bash",
      args: "-c 'bun run start -- -p 4000'",
      cwd: "/var/www/mybingocard.com",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,

      // Exponential backoff: wait 100ms, then 200, 400, 800... up to 15s between restarts
      // Prevents tight crash loops from hammering the CPU during builds
      exp_backoff_restart_delay: 100,

      // Restart if memory exceeds 512MB (Next.js 16 + bun typically uses 200-300MB)
      max_memory_restart: "512M",

      // Stop retrying after 15 consecutive failures (e.g. during a long build)
      max_restarts: 15,

      // Reset restart counter after 30s of stable uptime
      min_uptime: "30s",

      // Log configuration
      error_file: "/root/.pm2/logs/mybingocard-error.log",
      out_file: "/root/.pm2/logs/mybingocard-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
