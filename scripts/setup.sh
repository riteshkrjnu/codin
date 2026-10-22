#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v curl >/dev/null || ! command -v tar >/dev/null; then
  echo 'Install curl, ca-certificates, xz-utils and tar first.' >&2; exit 1
fi
if [[ ! -x .tools/node/bin/node ]]; then
  mkdir -p .tools
  case "$(uname -m)" in x86_64) arch=x64;; aarch64) arch=arm64;; *) echo 'Unsupported CPU architecture' >&2; exit 1;; esac
  scratch=$(mktemp -d)
  trap 'rm -rf "$scratch"' EXIT
  base=https://nodejs.org/dist/latest-v22.x
  curl -fsSL "$base/SHASUMS256.txt" -o "$scratch/SHASUMS256.txt"
  archive=$(awk -v suffix="-linux-$arch.tar.xz" '$2 ~ suffix "$" { print $2 }' "$scratch/SHASUMS256.txt")
  [[ "$archive" =~ ^node-v22\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.xz$ ]] || { echo 'Invalid Node release metadata'; exit 1; }
  curl -fsSL "$base/$archive" -o "$scratch/$archive"
  (cd "$scratch"; awk -v file="$archive" '$2 == file' SHASUMS256.txt | sha256sum --check)
  mkdir -p .tools/node
  tar -xJf "$scratch/$archive" --strip-components=1 -C .tools/node
fi
export PATH="$PWD/.tools/node/bin:$PATH"
node -e 'if (Number(process.versions.node.split(".")[0]) !== 22) process.exit(1)'
if [[ ! -f .env ]]; then
  (umask 077; cp .env.example .env)
  echo 'Created .env. Set MONGODB_URI and MONGODB_DB_NAME=test; then rerun setup.'
  exit 0
fi
npm ci --include=dev --no-audit --no-fund
node scripts/doctor.mjs
node scripts/database.mjs check
npm run build
echo 'Installation complete. Run ./start.sh for the app, or ./start.sh preview for design review only.'
