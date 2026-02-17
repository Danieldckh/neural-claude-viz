#!/bin/bash
# Setup Claude Code hooks for neural-claude-viz
# Usage:
#   Local mode:  ./setup-hooks.sh
#   Remote mode: ./setup-hooks.sh --remote --url https://neural-viz.proagrihub.com --key YOUR_KEY

MODE="local"
URL="http://localhost:4800"
KEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote) MODE="remote"; shift ;;
    --url) URL="$2"; shift 2 ;;
    --key) KEY="$2"; shift 2 ;;
    *) shift ;;
  esac
done

SETTINGS_FILE="$HOME/.claude/settings.local.json"

# Backup existing settings
if [ -f "$SETTINGS_FILE" ]; then
  cp "$SETTINGS_FILE" "${SETTINGS_FILE}.bak"
  echo "Backed up existing settings to ${SETTINGS_FILE}.bak"
fi

# Build auth header
AUTH_HEADER=""
if [ -n "$KEY" ]; then
  AUTH_HEADER=" -H 'Authorization: Bearer $KEY'"
fi

# Build hook commands
HOOK_CMD="curl -s -X POST ${URL}/api/hook/HOOKTYPE -H 'Content-Type: application/json'${AUTH_HEADER} -d @- > /dev/null 2>&1"

# Create or merge hooks config
# Uses node to safely merge JSON
node -e "
const fs = require('fs');
const file = '$SETTINGS_FILE';
let config = {};
try { config = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
if (!config.hooks) config.hooks = {};
const types = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'];
for (const t of types) {
  const cmd = '${HOOK_CMD}'.replace('HOOKTYPE', t);
  if (!config.hooks[t]) config.hooks[t] = [];
  // Remove existing neural-viz hooks
  config.hooks[t] = config.hooks[t].filter(h => !h.command?.includes('/api/hook/'));
  config.hooks[t].push({ type: 'command', command: cmd });
}
fs.writeFileSync(file, JSON.stringify(config, null, 2));
console.log('Hooks configured for ${MODE} mode → ${URL}');
"
