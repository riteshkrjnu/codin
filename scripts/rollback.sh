#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run with sudo'; exit 1; }
previous=$(cat /opt/codin/previous-release)
[[ "$previous" == /opt/codin/releases/* && -f "$previous/dist/server.cjs" ]] || { echo 'No valid previous release'; exit 1; }
ln -sfn "$previous" /opt/codin/current
systemctl restart codin.service
echo 'Code rolled back. Data migrations are not automatically reversed; use the documented recovery procedure.'
