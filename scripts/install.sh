#!/usr/bin/env bash
# Family Three: install on your own Sprite.
#
#   curl -fsSL https://raw.githubusercontent.com/exbald/family-three/main/scripts/install.sh | bash
#
# Model: Family Three's builders are Claude Code. If Claude Code already works on this Sprite
# (you're logged in), nothing else is needed. To use a connector instead (no key on the Sprite),
# make a Custom API connector for an Anthropic-compatible endpoint and pass its gateway URL:
#
#   curl -fsSL …/install.sh | FT_MODEL_BASE_URL=https://api.sprites.dev/v1/gateway/custom_api/<id> FT_MODEL=<model> bash
#
# GitHub (for Adopt) is picked up by itself if you have a GitHub connector this Sprite may use.
set -euo pipefail

REPO="${FT_REPO:-exbald/family-three}"
REF="${FT_REF:-main}"
APP="$HOME/app"
say() { printf '\033[1;32m›\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

[ -S /.sprite/api.sock ] || die "Run this inside a Sprite (sprite console, then paste the command)."
command -v node >/dev/null || die "Node is missing on this Sprite."

say "Getting Family Three ($REPO@$REF)"
tmp="$(mktemp -d)"
if [ -n "${FT_TARBALL:-}" ]; then
  tar xzf "$FT_TARBALL" -C "$tmp"
else
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar xz --strip-components=1 -C "$tmp"
fi
[ -f "$tmp/server/index.mjs" ] || die "The download doesn't look like Family Three."
mkdir -p "$APP"
rm -rf "$APP/server" "$APP/public" "$APP/scripts"
cp -R "$tmp/package.json" "$tmp/server" "$tmp/public" "$tmp/scripts" "$APP/"
rm -rf "$tmp"

if [ ! -x "$HOME/.browsers/chrome" ]; then
  say "Installing headless Chrome (for screenshots and the bug check)"
  mkdir -p "$HOME/.browsers"
  (cd "$HOME/.browsers" && npx -y @puppeteer/browsers install chrome-headless-shell@stable >/dev/null 2>&1)
  bin="$(ls -d "$HOME"/.browsers/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell | head -1)"
  ln -sf "$bin" "$HOME/.browsers/chrome"
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq >/dev/null 2>&1 || true
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libglib2.0-0t64 libnss3 libnspr4 libatk1.0-0t64 \
    libatk-bridge2.0-0t64 libdbus-1-3 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 \
    libxcb1 libxkbcommon0 libasound2t64 libatspi2.0-0t64 libcups2t64 libpango-1.0-0 libcairo2 fonts-liberation \
    fonts-noto-color-emoji >/dev/null 2>&1 || say "Some Chrome libraries didn't install; screenshots may be missing."
fi

say "Checking the model"
model_url="${FT_MODEL_BASE_URL:-}"
model="${FT_MODEL:-}"
if [ -z "$model_url" ]; then
  if (cd /tmp && timeout 90 claude -p "Reply with exactly: ok" --tools "" --output-format json 2>/dev/null | grep -q '"is_error":false'); then
    say "Claude Code on this Sprite works: the builders will use it."
  else
    die "Claude Code can't reach a model here. Either log in (run: claude) or make a Custom API connector for an Anthropic-compatible endpoint and rerun with FT_MODEL_BASE_URL=<its gateway URL>."
  fi
fi

github_url="$(curl -fsS https://api.sprites.dev/v1/gateway/list 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const found = []
    const walk = (v) => { if (v && typeof v === "object") { if (v.provider === "github" && v.gateway_base_url) found.push(v.gateway_base_url); Object.values(v).forEach(walk) } }
    try { walk(JSON.parse(s)) } catch {}
    process.stdout.write(found[0] ?? "")
  })' || true)"
[ -n "$github_url" ] && say "GitHub connector found: Adopt will make repos." || say "No GitHub connector: Adopt still gives a public link, just no repo."

public_url="$(sprite-env info 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).sprite_url||"")}catch{}})')"

mkdir -p "$HOME/.ft"
FT_MODEL_URL="$model_url" FT_MODEL_NAME="$model" FT_GH="$github_url" FT_PUB="$public_url" node -e '
  const fs = require("fs"); const p = process.env.HOME + "/.ft/config.json"
  let c = {}; try { c = JSON.parse(fs.readFileSync(p, "utf8")) } catch {}
  const set = (k, v) => { if (v) c[k] = v }
  set("modelBaseUrl", process.env.FT_MODEL_URL); set("model", process.env.FT_MODEL_NAME)
  set("githubBaseUrl", process.env.FT_GH); set("publicUrl", process.env.FT_PUB)
  c.builder = "claude"
  fs.writeFileSync(p, JSON.stringify(c, null, 2))'

say "Starting the server"
if sprite-env services get family-three >/dev/null 2>&1; then
  sprite-env services restart family-three >/dev/null
else
  sprite-env services create family-three --cmd "$(command -v node)" --args "$APP/server/index.mjs" --dir "$APP" \
    --env "PATH=$HOME/.local/bin:/.sprite/bin:/usr/local/bin:/usr/bin:/bin" --http-port 8080 --no-stream >/dev/null
fi
for _ in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:8080/api/me 2>/dev/null && break; sleep 0.5; done
curl -fsS -o /dev/null http://127.0.0.1:8080/api/me || die "The server didn't start. Logs: /.sprite/logs/services/family-three.log"

sprite-env curl -s -X POST /v1/checkpoint -d '{"comment":"Family Three installed"}' >/dev/null 2>&1 || true

echo
say "Family Three is running on this Sprite."
echo "  Open this once to unlock raising apps in your browser (it's your owner key, keep it private):"
echo "    ${public_url:-https://<your-sprite-url>}/?key=$(cat "$HOME/.ft/owner-key")"
echo "  Everyone else can look but not raise. Your Sprite URL is private to your org until you run, on your own machine:"
echo "    sprite config update --url-auth public -s $(sprite-env info 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).sprite_name||"<sprite>")}catch{}})')"
