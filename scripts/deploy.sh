#!/usr/bin/env bash
# Copies the app to the Sprite and (re)starts it as a service on :8080.
# Usage: scripts/deploy.sh [sprite-name]   (default ft-family)
set -euo pipefail
SPRITE="${1:-ft-family}"
case "$SPRITE" in ft-*) ;; *) echo "Only ft-* Sprites" >&2; exit 1 ;; esac
cd "$(dirname "$0")/.."

COPYFILE_DISABLE=1 tar --no-xattrs -czf - package.json server public scripts/fix-child.mjs 2>/dev/null | \
  sprite exec -s "$SPRITE" -- bash -c 'mkdir -p ~/app && rm -rf ~/app/server ~/app/public && tar xzf - -C ~/app'

sprite exec --no-stdin -s "$SPRITE" -- bash -c '
  if sprite-env services get family-three >/dev/null 2>&1; then
    sprite-env services restart family-three
  else
    sprite-env services create family-three --cmd "$(command -v node)" --args "$HOME/app/server/index.mjs" \
      --dir "$HOME/app" --env "PATH=$HOME/.local/bin:/.sprite/bin:/usr/local/bin:/usr/bin:/bin" --http-port 8080 --duration 3s
  fi
  sleep 1; curl -s -o /dev/null -w "local check: %{http_code}\n" http://127.0.0.1:8080/'
