# Backup and Restore Runbook

## 1. 目标

- PostgreSQL 日备份保留 7 份，周备份保留 4 份。
- 发布、迁移、支付/退款或账本逻辑变化前额外创建发布备份。
- 初始目标 RPO 为 24 小时、RTO 为 2 小时；若业务需要更低 RPO，先引入 WAL/PITR 并完成 ADR 与恢复演练。
- 备份只有在校验、加密、离机复制和恢复验证后才算成功。

生产 Compose：

```bash
cd /opt/token-farmer/repo
compose() {
  docker compose --env-file /opt/token-farmer/.env.production \
    -f infra/docker-compose.prod.yml "$@"
}
BACKUP_ROOT=/opt/token-farmer/backups
```

命令输出不得包含 `.env.production` 内容。

## 2. PostgreSQL 备份

创建只允许 root/部署用户访问的目录和 UTC Backup ID：

```bash
set -eu
umask 077
BACKUP_ID="$(date -u +%Y%m%dT%H%M%SZ)-$(cat /opt/token-farmer/release-state/current-sha 2>/dev/null || echo predeploy)"
BACKUP_DIR="$BACKUP_ROOT/$BACKUP_ID"
install -d -m 0700 "$BACKUP_DIR"
```

使用容器中的环境变量执行一致性 custom-format dump：

```bash
compose exec -T postgres sh -lc \
  'pg_dump --format=custom --compress=9 --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > "$BACKUP_DIR/postgres.dump"

compose exec -T postgres sh -lc \
  'pg_dumpall --globals-only --no-role-passwords -U "$POSTGRES_USER"' \
  > "$BACKUP_DIR/globals.sql"

pg_restore --list "$BACKUP_DIR/postgres.dump" > "$BACKUP_DIR/postgres.list"
test -s "$BACKUP_DIR/postgres.dump"
test -s "$BACKUP_DIR/postgres.list"
```

若主机没有与容器匹配的 `pg_restore`，用固定 PostgreSQL 镜像只读挂载验证。验证工具主版本应等于或高于数据库版本。

保存不含 Secret 的 Manifest：Backup ID、UTC 时间、数据库/工具版本、Release SHA、迁移版本、dump 字节数、用途（daily/weekly/pre-release）和操作人。不要把连接串或环境变量写入 Manifest。

```bash
sha256sum "$BACKUP_DIR/postgres.dump" "$BACKUP_DIR/globals.sql" \
  > "$BACKUP_DIR/SHA256SUMS"
chmod -R go-rwx "$BACKUP_DIR"
```

## 3. 加密和离机复制

生产备份离开服务器前使用团队离线保存的 age 公钥加密：

```bash
tar -C "$BACKUP_ROOT" -czf "$BACKUP_ROOT/$BACKUP_ID.tar.gz" "$BACKUP_ID"
age -r "$BACKUP_AGE_RECIPIENT" \
  -o "$BACKUP_ROOT/$BACKUP_ID.tar.gz.age" \
  "$BACKUP_ROOT/$BACKUP_ID.tar.gz"
sha256sum "$BACKUP_ROOT/$BACKUP_ID.tar.gz.age" \
  > "$BACKUP_ROOT/$BACKUP_ID.tar.gz.age.sha256"
rm -f "$BACKUP_ROOT/$BACKUP_ID.tar.gz"
```

如果 age、公钥或离机目标不可用，备份状态为失败；不要上传未加密归档。把 `.age` 与 checksum 复制到访问权限独立的对象存储或本机离线目录，并在目标端重新校验 SHA-256。

加密私钥不放在生产服务器。定期验证恢复负责人能够取得私钥，但不要在普通发布中暴露它。

## 4. 恢复演练

恢复演练不得覆盖生产数据库。使用隔离实例或同集群中唯一、经过字面校验的临时数据库：

```bash
RESTORE_DB="token_farmer_restore_$(date -u +%Y%m%d%H%M%S)"
case "$RESTORE_DB" in
  token_farmer_restore_*) ;;
  *) echo 'unsafe restore database name' >&2; exit 1 ;;
esac

compose exec -T postgres sh -lc \
  'createdb -U "$POSTGRES_USER" "$1"' sh "$RESTORE_DB"

cat "$BACKUP_DIR/postgres.dump" | compose exec -T postgres sh -lc \
  'pg_restore --exit-on-error --no-owner --no-acl -U "$POSTGRES_USER" -d "$1"' sh "$RESTORE_DB"
```

用只读验证命令连接临时库：

1. 当前迁移版本存在且与 Manifest 一致。
2. 所有模块关键表可读取，行数与备份时记录的统计一致。
3. Wallet 余额投影与 Ledger 聚合一致，可用/预留非负。
4. Welcome Grant、Token Package、Payment Provider Event 和 Steal Attempt 唯一约束存在。
5. Planting 果实守恒，Outbox 没有损坏 payload。
6. 使用该恢复库启动一次 API/Worker 只读健康检查，不连接真实 Provider/邮件/支付。

保存验证结果后删除临时数据库：

```bash
case "$RESTORE_DB" in
  token_farmer_restore_*)
    compose exec -T postgres sh -lc \
      'dropdb --if-exists -U "$POSTGRES_USER" "$1"' sh "$RESTORE_DB"
    ;;
esac
```

演练失败时保留备份，创建事故/技术债 Issue，下一次发布前修复。不能因为 dump 命令成功就忽略恢复失败。

## 5. 灾难恢复

1. 宣布维护，停止 API 和 Worker 写入；保留 Caddy 状态页。
2. 记录故障时间、最后健康时间、当前 SHA、Provider 订单游标和可能受影响的业务 ID。
3. 不覆盖损坏卷；创建磁盘/卷快照作为取证副本。
4. 选择最后一个 checksum、解密和恢复演练均成功的 Backup ID。
5. 在新 PostgreSQL 实例恢复 globals（人工审查后）与 custom dump。
6. 运行迁移版本、账本守恒、果实守恒、订单、Outbox 和权限检查。
7. 配置应用连接新实例，保持真实 Provider 写入关闭，执行完整冒烟。
8. 对备份点后订单向支付 Provider 查单；对模型 usage 查上游审计。通过补偿 Ledger 恢复，禁止直接改余额。
9. 两人核对（单人项目至少保留命令和结果记录）后切换流量。
10. 监控至少一个完整备份周期并完成事故复盘。

## 6. 保留与删除

自动任务只删除满足全部条件的本项目备份：路径解析后位于 `/opt/token-farmer/backups`、名称符合 Backup ID、已经有离机副本、超过保留期且不被事故/发布保留标记引用。

- Daily：最近 7 份成功备份。
- Weekly：每周指定一份，最近 4 份。
- Pre-release/incident：至少保留到对应发布稳定和复盘完成，不能被普通轮转删除。

不要通过 PowerShell 枚举服务器路径再交给另一 Shell 删除；服务器端在单一 Shell 内解析并字面校验目标。不要全局清理 Docker 卷作为备份轮转方式。

## 7. 旧 agent-mailer 下线备份

停止旧服务前额外备份：

- 数据库：使用其自身 PostgreSQL/MySQL 官方一致性 dump，不能复制运行中的数据库数据目录代替 dump。
- 上传：识别 Compose 命名卷或 bind mount，短暂停写后打包并保存 Unix 权限、所有者和符号链接。
- 配置：Compose、反向代理配置、部署版本和脱敏 Manifest。
- Secret：环境文件单独加密，权限 `600`；不得加入 Token Farmer 备份或 Git。

恢复演练使用隔离网络和临时卷，验证数据库核心表行数、上传文件数量/抽样哈希和服务只读启动。只有加密离机副本与恢复记录都存在，才允许按部署 Runbook 停止/移除旧 Compose。`docker compose down` 不加 `-v`，旧卷在保留期后逐个字面确认删除。

## 8. 定期验证与告警

- 每日：任务退出码、dump 大小异常、checksum、离机复制和磁盘使用率。
- 每周：`pg_restore --list` 和随机表统计。
- 每月：完整隔离恢复、应用健康与账本/果实不变量。
- 每季度或重大迁移前：计时灾难恢复演练，验证 RTO/RPO。

备份失败、连续大小骤降、离机复制失败、磁盘超过 80% 或超过一个 RPO 无成功备份必须告警，并阻止生产迁移。
