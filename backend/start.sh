#!/bin/bash
# Source user's shell profile to get full environment
source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null || true

cd "$(dirname "$0")"
exec node dist/cli/node.js --claude-path /opt/homebrew/bin/claude "$@"
