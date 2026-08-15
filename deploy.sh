#!/bin/bash
# Deploy script for mybingocard.com
# Stops the systemd service, builds, then restarts to avoid crash loops.
# Usage: ./deploy.sh

set -e

APP_DIR="/var/www/mybingocard.com"
cd "$APP_DIR"

echo "[deploy] Starting deploy at $(date)"

# Stop the running service first to prevent crash loops during build.
# next build deletes .next, so the running server would lose its build artifacts
# and crash while the build is still in progress.
echo "[deploy] Stopping mybingocard.service..."
systemctl stop mybingocard.service || true

# Build
echo "[deploy] Running next build..."
if bun run build; then
  echo "[deploy] Build succeeded"
else
  echo "[deploy] Build FAILED - restarting with previous build"
  systemctl start mybingocard.service
  exit 1
fi

# Restart
echo "[deploy] Starting mybingocard.service..."
systemctl start mybingocard.service

# Wait for the app to be ready
echo "[deploy] Waiting for app to be ready..."
for i in $(seq 1 30); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[deploy] App is ready (HTTP 200). Deploy complete at $(date)"
    exit 0
  fi
  sleep 1
done

echo "[deploy] WARNING: App did not respond with 200 after 30s"
echo "[deploy] Check: journalctl -u mybingocard.service -n 100 --no-pager"
exit 1
