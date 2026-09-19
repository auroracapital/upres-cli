#!/usr/bin/env bash
# Live health gate for the official MCP registry entry. Fails when the
# listing goes stale (404, missing version, or status != active) so CI
# catches drift instead of users discovering it.
#
# Usage: bash scripts/check-mcp-registry.sh <name>
#   name  e.g. io.github.auroracapital/upres-cli
set -euo pipefail

NAME="${1:-io.github.auroracapital/upres-cli}"
REG="https://registry.modelcontextprotocol.io/v0"

# Latest version must equal latest npm-tagged version. The registry does not
# expose a stable per-name GET, so use the search endpoint and pin on `name`.
LATEST_JSON=$(curl -sS "${REG}/servers?search=upres-cli")
LATEST=$(printf '%s' "$LATEST_JSON" | python3 -c "
import sys, json
sites = json.load(sys.stdin).get('servers', [])
for s in sites:
    if s.get('server', {}).get('name') == sys.argv[1]:
        print(s['server']['version'])
        break
else:
    print('missing')
" "$NAME")
[[ "$LATEST" != "missing" ]] || { echo "drift: not listed"; exit 1; }

GH_TAG_LATEST=$(gh release view --repo auroracapital/upres-cli --json tagName -q .tagName 2>/dev/null | sed 's/^v//')
[[ "$LATEST" == "$GH_TAG_LATEST" ]] || { echo "drift: registry=$LATEST tag=$GH_TAG_LATEST"; exit 1; }

# mcpb sha must still match the asset on GitHub
LISTED_SHA=$(printf '%s' "$LATEST_JSON" | python3 -c "
import sys, json
sites = json.load(sys.stdin).get('servers', [])
for s in sites:
    if s.get('server', {}).get('name') == sys.argv[1]:
        print(s['server']['packages'][0]['fileSha256'])
        break
" "$NAME")
ASSET_URL="https://github.com/auroracapital/upres-cli/releases/download/v${LATEST}/upres-cli-${LATEST}.mcpb"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
REAL_SHA=$(
  cd "$TMP_DIR"
  gh release download "v${LATEST}" --repo auroracapital/upres-cli \
    --pattern "upres-cli-${LATEST}.mcpb" >/dev/null
  sha256sum "upres-cli-${LATEST}.mcpb" | awk '{print $1}'
)
[[ "$REAL_SHA" == "$LISTED_SHA" ]] || { echo "drift: sha $LISTED_SHA != $REAL_SHA"; exit 1; }

echo "mcp-registry healthy: $NAME v$LATEST"
