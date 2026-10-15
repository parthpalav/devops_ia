#!/usr/bin/env bash
# Shortcut for ./scripts/demo.sh  (e.g. ./demo.sh full)
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts/demo.sh" "$@"
