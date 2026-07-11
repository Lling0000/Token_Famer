#!/usr/bin/env bash
set -euo pipefail

root=/opt/token-farmer
compose_dir="$root/current/infra"
backup_root="$root/backups"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
daily_dir="$backup_root/daily"
weekly_dir="$backup_root/weekly"
dump="$daily_dir/token-farmer-$timestamp.dump"

install -d -m 700 "$daily_dir" "$weekly_dir"
cd "$compose_dir"
docker compose -f docker-compose.prod.yml exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dump"
chmod 600 "$dump"
test -s "$dump"
cat "$dump" | docker compose -f docker-compose.prod.yml exec -T postgres pg_restore --list \
  >/dev/null
sha256sum "$dump" > "$dump.sha256"
chmod 600 "$dump.sha256"

if [ "$(date -u +%u)" = "7" ]; then
  cp --preserve=mode,timestamps "$dump" "$weekly_dir/"
  cp --preserve=mode,timestamps "$dump.sha256" "$weekly_dir/"
fi

find "$daily_dir" -type f -mtime +7 -delete
find "$weekly_dir" -type f -mtime +28 -delete
echo "$dump"
