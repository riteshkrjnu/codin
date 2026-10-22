#!/usr/bin/env bash
# Run on the production host from a reviewed checkout. No MongoDB service is installed.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run with sudo on the production server'; exit 1; }
source_dir=$(cd "$(dirname "$0")/.." && pwd)
[[ -s /etc/codin.env ]] || { echo 'Create /etc/codin.env from deploy/production.env.example first (mode 600).'; exit 1; }
grep -qx 'MONGODB_DB_NAME=codin' /etc/codin.env || { echo '/etc/codin.env must select codin'; exit 1; }
grep -qx 'NODE_ENV=production' /etc/codin.env || { echo '/etc/codin.env must select production'; exit 1; }
command -v mongodump >/dev/null || { echo 'Install MongoDB Database Tools first; the existing database server need not change.'; exit 1; }
id codin >/dev/null 2>&1 || useradd --system --home /opt/codin --shell /usr/sbin/nologin codin
install -d -o codin -g codin /opt/codin/releases /var/backups/codin
release=/opt/codin/releases/$(date -u +%Y%m%dT%H%M%SZ)
[[ ! -e "$release" ]] || { echo 'Release already exists'; exit 1; }
install -d -o codin -g codin "$release"
tar -C "$source_dir" --exclude=.git --exclude=node_modules --exclude=.tools --exclude=.env --exclude='.env.*' --exclude=backups --exclude=dist -cf - . | tar -C "$release" -xf -
chown -R codin:codin "$release"
install -m 600 -o codin -g codin /etc/codin.env "$release/.env"
runuser -u codin -- bash -c 'cd "$1"; ./scripts/setup.sh' _ "$release"
# Back up production before changing the active release. URI stays in the environment file.
runuser -u codin -- bash -c 'cd "$1"; BACKUP_DIR=/var/backups/codin .tools/node/bin/node scripts/database.mjs backup --production' _ "$release"
app_port=$("$release/.tools/node/bin/node" "$release/scripts/doctor.mjs" --port-only)
previous=$(readlink -f /opt/codin/current || true)
ln -sfn "$release" /opt/codin/next
mv -Tf /opt/codin/next /opt/codin/current
install -m 644 "$release/deploy/codin.service" /etc/systemd/system/codin.service
install -m 644 "$release/deploy/codin-backup.service" /etc/systemd/system/codin-backup.service
install -m 644 "$release/deploy/codin-backup.timer" /etc/systemd/system/codin-backup.timer
systemctl daemon-reload
systemctl enable --now codin-backup.timer
systemctl enable codin.service
systemctl restart codin.service
ready=false
for attempt in {1..15}; do
  if curl -fsS "http://127.0.0.1:$app_port/health/ready" >/dev/null; then ready=true; break; fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  if [[ -n "$previous" ]]; then ln -sfn "$previous" /opt/codin/current; systemctl restart codin.service; fi
  echo 'New release failed readiness; previous release restored where available.' >&2; exit 1
fi
printf '%s\n' "$previous" > /opt/codin/previous-release
printf 'Production ready. Configure the reviewed nginx example for your domain.\n'
