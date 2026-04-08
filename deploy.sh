#!/bin/bash
# Deploy script for mybingocard.com
# Stops the app, builds, then restarts to avoid crash loops
# Usage: ./deploy.sh
#
# The #1 cause of crash loops is running `next build` while the app is running.
# `next build` deletes .next, so the running server loses its build artifacts
# and crashes. PM2 immediately restarts it, but the build is still in progress,
# so it crashes again, creating a tight restart loop.
#
# This script prevents that by stopping the server first.

set -e

APP_DIR="/var/www/mybingocard.com"
cd "$APP_DIR"

echo "[deploy] Starting deploy at $(date)"

# Stop the running app first to prevent crash loops during build
echo "[deploy] Stopping mybingocard..."
pm2 stop mybingocard 2>/dev/null || true

# Build
echo "[deploy] Running next build..."
if bun run build; then
  echo "[deploy] Build succeeded"
else
  echo "[deploy] Build FAILED - restarting with previous build"
  pm2 start mybingocard 2>/dev/null || pm2 start ecosystem.config.cjs
  exit 1
fi

# Restart
echo "[deploy] Starting mybingocard..."
pm2 start mybingocard 2>/dev/null || pm2 start ecosystem.config.cjs

# Wait for the app to be ready
echo "[deploy] Waiting for app to be ready..."
for i in $(seq 1 30); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[deploy] App is ready (HTTP 200). Deploy complete at $(date)"
    pm2 save
    exit 0
  fi
  sleep 1
done

echo "[deploy] WARNING: App did not respond with 200 after 30s"
echo "[deploy] Check: pm2 logs mybingocard --err --lines 50"
exit 1
