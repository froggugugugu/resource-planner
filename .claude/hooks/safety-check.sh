#!/usr/bin/env bash
# ==============================================================================
# safety-check.sh — PreToolUse hook for Bash commands
#
# Blocks dangerous shell commands that could cause irreversible damage.
# Works even with --dangerously-skip-permissions (hooks are NOT bypassed).
#
# Input:  JSON via stdin  {"tool_name":"Bash","tool_input":{"command":"..."}}
# Output: exit 0 = allow, exit 2 = block (stderr message fed back to Claude)
#
# Policy: fail-open (if parsing fails, the command is allowed)
# ==============================================================================

set -uo pipefail

# --- Extract the command string from stdin JSON ---
INPUT="$(cat)"

if command -v jq &>/dev/null; then
    CMD="$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
else
    # Fallback: rough extraction without jq
    CMD="$(echo "$INPUT" | sed -n 's/.*"command"\s*:\s*"\(.*\)"/\1/p' | head -1)"
fi

# Fail-open: if we couldn't extract a command, allow it
if [[ -z "$CMD" ]]; then
    exit 0
fi

# --- Dangerous pattern definitions ---

# Fixed-string patterns (matched with grep -F)
FIXED_PATTERNS=(
    "rm -rf /"
    "rm -fr /"
    "rm -rf --no-preserve-root"
    "rm -fr --no-preserve-root"
    "git push --force"
    "git push -f "
    "git push -f	"
    "git reset --hard"
    "git clean -fd"
    "git clean -fx"
    "git clean -f "
    "git clean -f	"
    "git checkout -- ."
    "git checkout ."
    "git restore ."
    "chmod 777"
)

# Regex patterns (matched with grep -E)
REGEX_PATTERNS=(
    '(curl|wget)\s+.*\|\s*(bash|sh|zsh)'
    '\bsudo\b'
    '\bmkfs\b'
    '\bdd\s+if='
    '--no-verify'
)

# --- Check fixed-string patterns ---
for pattern in "${FIXED_PATTERNS[@]}"; do
    if echo "$CMD" | grep -qF "$pattern"; then
        echo "BLOCKED: Command contains dangerous pattern: '$pattern'" >&2
        echo "If you believe this is safe, ask the user for explicit approval." >&2
        exit 2
    fi
done

# --- Check regex patterns ---
for pattern in "${REGEX_PATTERNS[@]}"; do
    if echo "$CMD" | grep -qE -- "$pattern"; then
        echo "BLOCKED: Command matches dangerous pattern: '$pattern'" >&2
        echo "If you believe this is safe, ask the user for explicit approval." >&2
        exit 2
    fi
done

# --- All checks passed ---
exit 0
