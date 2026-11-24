#!/usr/bin/env bash
# Creates (or updates) the Custom API connector for Z.ai's Anthropic endpoint,
# limited to Sprites named ft-*, and points the Sprite's builders at its gateway URL.
# The key is read from $ZAI_API_KEY and never printed or passed on a command line.
# Usage: scripts/connect-zai.sh [sprite-name]   (default ft-family)
set -euo pipefail
SPRITE="${1:-ft-family}"
case "$SPRITE" in ft-*) ;; *) echo "Only ft-* Sprites" >&2; exit 1 ;; esac
[ -n "${ZAI_API_KEY:-}" ] || { echo "ZAI_API_KEY is not set (add it to ~/.zshenv)" >&2; exit 1; }

body=$(jq -n '{
  name: "ft-zai-anthropic",
  description: "Family Three builders: Z.ai GLM coding plan (Anthropic-compatible)",
  base_api_url: "https://api.z.ai/api/anthropic",
  access_token: env.ZAI_API_KEY,
  auth_method: "header",
  auth_header_prefix: "Bearer",
  access_policy: { name_prefix: "ft-" }
}')

resp=$(printf '%s' "$body" | sprite api /v1/oauth/connections/custom_api -- -s -X POST -H 'content-type: application/json' --data-binary @- 2>/dev/null)
echo "$resp" | jq 'del(.access_token, .token, .credential) | {id, provider, name, status, gateway_base_url, access_policy}' 2>/dev/null || { echo "Unexpected reply" >&2; exit 1; }

id=$(echo "$resp" | jq -r '.id // .connection.id // empty')
gw=$(echo "$resp" | jq -r '.gateway_base_url // .connection.gateway_base_url // empty')
[ -n "$gw" ] || gw="https://api.sprites.dev/v1/gateway/custom_api/$id"
[ -n "$id" ] || { echo "No connection id in the reply" >&2; exit 1; }

sprite exec --no-stdin -s "$SPRITE" -- bash -c "mkdir -p ~/.ft && node -e '
  const fs=require(\"fs\"),p=process.env.HOME+\"/.ft/config.json\";
  let c={}; try{c=JSON.parse(fs.readFileSync(p,\"utf8\"))}catch{}
  fs.writeFileSync(p, JSON.stringify({...c, modelBaseUrl: \"$gw\"}, null, 2));
  console.log(\"builders now use\", \"$gw\")'"
