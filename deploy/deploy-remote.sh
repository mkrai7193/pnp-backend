#!/usr/bin/env bash
# Runs ON the server (invoked over SSH by .github/workflows/backend-deploy.yml).
# Builds a new release, migrates the DB, then atomically swaps `current` to
# point at it and restarts the service. Exits before the symlink swap if any
# step fails, so a bad deploy never takes down the running release.
set -euo pipefail

RELEASE_ID="$1"
APP_DIR="/opt/pnp-backend"
RELEASE_DIR="$APP_DIR/releases/$RELEASE_ID"
KEEP_RELEASES=5

echo "== npm install =="
# Installs against the package-lock.json shipped with the release.
cd "$RELEASE_DIR"
npm install

echo "== build =="
npm run build

echo "== link shared .env =="
ln -sfn "$APP_DIR/shared/.env" "$RELEASE_DIR/.env"

echo "== run migrations =="
npm run migration:run

echo "== swap current -> $RELEASE_ID =="
ln -sfn "releases/$RELEASE_ID" "$APP_DIR/current"

echo "== restart service =="
sudo -n systemctl restart pnp-backend

echo "== health check =="
for i in $(seq 1 10); do
  if curl -fsS -o /dev/null "http://127.0.0.1:4000/api/schools"; then
    echo "service healthy"
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "service did not become healthy in time" >&2
    exit 1
  fi
  sleep 2
done

echo "== prune old releases (keep last $KEEP_RELEASES) =="
cd "$APP_DIR/releases"
ls -1t | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

echo "DEPLOY_OK release=$RELEASE_ID"
