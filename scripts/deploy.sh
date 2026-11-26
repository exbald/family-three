#!/usr/bin/env bash
# Copies the app to the Sprite and (re)starts it as a service on :8080.
# Usage: scripts/deploy.sh [sprite-name]   (default ft-family)
set -euo pipefail
SPRITE="${1:-ft-family}"
case "$SPRITE" in ft-*) ;; *) echo "Only ft-* Sprites" >&2; exit 1 ;; esac
cd "$(dirname "$0")/.."

# A restart kills builds in progress (that is how "Where my money leaks" lost its first litter).
# Refuse while anything is building, unless FORCE=1.
BUSY=$(sprite exec --no-stdin -s "$SPRITE" -- bash -c 'curl -s http://127.0.0.1:8080/api/families' 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).data.reduce((n,f)=>n+(f.building||0),0))}catch{console.log(0)}})')
if [ "${BUSY:-0}" != "0" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "Not deploying: $BUSY kid(s) are building right now. Wait, or run with FORCE=1." >&2
  exit 1
fi

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
