#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/.tools/node/bin:$PATH"
command -v node >/dev/null || { echo 'Node is unavailable. Run ./install.sh first.' >&2; exit 1; }
case "${1:-dev}" in
  dev)
    export NODE_ENV=development
    node scripts/doctor.mjs
    [[ -d node_modules/tsx ]] || { echo 'Dependencies are missing. Run ./install.sh first.' >&2; exit 1; }
    app_port=$(node scripts/doctor.mjs --port-only)
    printf '\nCoDIN app: http://localhost:%s\nDesign review: http://localhost:%s/designs/\nPress Ctrl+C to stop.\n\n' "$app_port" "$app_port"
    exec node --import tsx server.ts;;
  preview) exec node scripts/preview.mjs;;
  doctor) exec node scripts/doctor.mjs;;
  build) exec npm run build;;
  start)
    export NODE_ENV=production
    node scripts/doctor.mjs
    [[ -f dist/server.cjs ]] || { echo 'Build is missing. Run ./start.sh build.' >&2; exit 1; }
    exec node dist/server.cjs;;
  test) exec npm test;;
  help|--help|-h) printf 'Usage: ./start.sh [dev|preview|doctor|build|start|test]\nDefault: dev. Preview serves designs without Atlas.\n';;
  *) echo 'Unknown command. Run ./start.sh help.' >&2; exit 1;;
esac
