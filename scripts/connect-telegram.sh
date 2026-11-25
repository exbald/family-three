#!/usr/bin/env bash
# Creates (or updates) the Custom API connector for the Telegram Bot API, limited to Sprites named ft-*.
# The bot token goes in the URL path (/bot<token>/…) and is never printed or put on a command line.
# Usage: TELEGRAM_CHANNEL=@yourchannel TELEGRAM_OWNER=yourusername scripts/connect-telegram.sh [sprite]
set -euo pipefail
SPRITE="${1:-ft-family}"
case "$SPRITE" in ft-*) ;; *) echo "Only ft-* Sprites" >&2; exit 1 ;; esac
[ -n "${TELEGRAM_BOT_TOKEN:-}" ] || { echo "TELEGRAM_BOT_TOKEN is not set (add it to ~/.zshenv)" >&2; exit 1; }
[ -n "${TELEGRAM_CHANNEL:-}" ] || { echo "Set TELEGRAM_CHANNEL=@yourchannel" >&2; exit 1; }
[ -n "${TELEGRAM_OWNER:-}" ] || { echo "Set TELEGRAM_OWNER=yourusername" >&2; exit 1; }

body=$(jq -n '{
  name: "ft-telegram",
  description: "Family Three: crowd family channel, votes and owner commands",
  base_api_url: "https://api.telegram.org",
  access_token: env.TELEGRAM_BOT_TOKEN,
  auth_method: "url_path",
  auth_url_path_template: "/bot{token}",
  access_policy: { name_prefix: "ft-" }
}')
resp=$(printf '%s' "$body" | sprite api /v1/oauth/connections/custom_api -- -s -X POST -H 'content-type: application/json' --data-binary @- 2>/dev/null)
id=$(echo "$resp" | jq -r '.id // .connection.id // empty')
[ -n "$id" ] || { echo "Unexpected reply from the connector API" >&2; echo "$resp" | jq 'del(.access_token)' >&2 || true; exit 1; }
gw="https://api.sprites.dev/v1/gateway/custom_api/$id"
echo "Telegram connector: $id"

sprite exec --no-stdin -s "$SPRITE" -- env GW="$gw" CH="$TELEGRAM_CHANNEL" OW="${TELEGRAM_OWNER#@}" bash -c 'node -e "
  const fs=require(\"fs\"),p=process.env.HOME+\"/.ft/config.json\";
  let c={}; try{c=JSON.parse(fs.readFileSync(p,\"utf8\"))}catch{}
  fs.writeFileSync(p, JSON.stringify({...c, telegramBaseUrl: process.env.GW, telegramChannel: process.env.CH, telegramOwner: process.env.OW}, null, 2));
  console.log(\"Sprite config updated: telegramBaseUrl, telegramChannel, telegramOwner\")"'
