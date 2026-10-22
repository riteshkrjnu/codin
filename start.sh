#!/usr/bin/env bash
set -euo pipefail
if [[ $# -eq 0 ]]; then set -- dev; fi
exec "$(dirname "$0")/scripts/run.sh" "$@"
