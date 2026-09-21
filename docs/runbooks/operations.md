# Day-2 Operations Runbook

## 1. 目标与边界

本手册用于上海单机服务器 `1.15.179.90` 上邀请制沙箱的日常运维。生产目录是 `/opt/token-farmer`，入口是 Caddy，PostgreSQL 是业务事实来源，Redis 只承载 BullMQ 和可重建的短期状态。

本手册假设 [`deployment.md`](deployment.md) 中标记为“部署阻断”的已知偏差已经修复并通过发布门禁；不能用临时复制 Secret、改镜像名或跳过迁移的方式绕过。发布、迁移和回滚仍按部署手册执行，备份与恢复按 [`backup-restore.md`](backup-restore.md) 执行。

## 2. 服务清单

| 服务       | 当前职责                              | 运行特征                                         |
| ---------- | ------------------------------------- | ------------------------------------------------ |
| `postgres` | 唯一业务事实来源                      | 有健康检查，bind mount 到 `data/postgres`        |
| `redis`    | BullMQ 队列和短期状态                 | AOF 开启，有健康检查，bind mount 到 `data/redis` |
| `migrate`  | 一次性执行 `pnpm db:deploy`           | `restart: no`，不是常驻服务                      |
| `api`      | Fastify 游戏与模型 API，内部端口 4000 | 有 `/health/live`、`/health/ready` 容器健康检查  |
| `worker`   | BullMQ Worker，内部健康端口 4100      | Compose 尚未声明 healthcheck                     |
| `web`      | Next.js 桌面 Web，内部端口 3000       | Compose 尚未声明 healthcheck                     |
| `caddy`    | 唯一公网入口                          | 发布 `80/tcp`、`443/tcp`、`443/udp`              |

## 3. 操作前准备

登录后先建立本次 Shell 的固定 Compose 包装函数，不输出环境文件内容：

```bash
set -eu
cd /opt/token-farmer/repo
compose() {
  docker compose --env-file /opt/token-farmer/.env.production \
    -f infra/docker-compose.prod.yml "$@"
}
```

所有变更操作先记录操作编号、操作人、UTC 开始时间、当前 SHA、原因和预期回退方式。先运行只读检查：

```bash
date -u
cat /opt/token-farmer/release-state/current-sha
compose ps
df -h /
free -h
docker system df -v
```

根分区不足 15GB、生产 Secret 文件权限不是 `600`、目标 SHA 不明确或最近备份状态未知时，停止变更并升级给生产 Owner。

## 4. 启停与重启

Day-2 只启动部署时已经创建的现有容器，避免 `up api` 经 `depends_on` 意外运行一次性 `migrate`（其 `pnpm db:deploy` 还包含 Seed）：

```bash
compose start postgres redis
compose ps postgres redis
for attempt in $(seq 1 30); do
  if compose exec -T postgres sh -lc \
    'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' && \
    compose exec -T redis redis-cli ping; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo 'postgres or redis did not become healthy' >&2
    exit 1
  fi
  sleep 2
done
compose ps --all migrate
compose start api worker web caddy
compose ps
```

`migrate` 必须保持上次发布完成后的退出状态。任何容器缺失、`migrate` 状态不明、新镜像、迁移或环境变量变更都不属于普通启动，必须停止并回到部署手册。随后执行第 5 节健康检查。

计划内完整停止先切断入口和写入，再停数据依赖：

```bash
compose stop caddy
compose stop api worker
compose stop web
compose stop redis postgres
```

普通进程卡死且数据完整性没有疑点时，只重启最小服务并立即复检：

```bash
compose restart api
compose ps api
compose logs --since 5m --tail 200 --no-color api
```

`restart` 不会加载新镜像或新环境变量。需要重建容器时按部署或 Secret 轮换手册操作，不用 `docker compose down -v`，不删除 bind mount 数据目录。

## 5. 日常巡检

开放邀请期间每天至少一次，发布后和故障恢复后额外执行一次：

```bash
compose ps
docker stats --no-stream
df -h /
free -h
docker system df -v
compose exec -T postgres sh -lc \
  'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
compose exec -T redis redis-cli ping
compose exec -T api node -e \
  "fetch('http://127.0.0.1:4000/health/ready').then(async r=>{console.log(await r.text());if(!r.ok)process.exit(1)})"
compose exec -T worker node -e \
  "fetch('http://127.0.0.1:'+(process.env.WORKER_HEALTH_PORT||4100)).then(async r=>{console.log(await r.text());if(!r.ok)process.exit(1)})"
```

同时核对最近一次成功备份、离机副本和恢复验证记录。仓库没有已配置的 cron/systemd 备份调度，不能把脚本存在等同于日备份成功。

## 6. 日志查看与脱敏

先缩小服务、时间和行数，避免把整套日志打包：

```bash
compose logs --since 15m --tail 200 --no-color api worker web caddy postgres redis
compose logs --since 15m --tail 500 --no-color api 2>&1 \
  | grep -E 'request failed|5[0-9][0-9]|timeout|ECONN|error' || true
```

日志证据只保留请求 ID、UTC 时间、服务、错误类别和受影响业务 ID。不得运行或分享 `cat .env.production`、容器 `env` 或包含环境变量的 `docker inspect`；不得保存 Authorization、Cookie、Prompt、模型响应、支付签名、数据库 URL 或完整 API Key。发现日志含 Secret 时立即按 [`secrets-rotation.md`](secrets-rotation.md) 处置。

当前 Compose 没有日志轮转，Caddyfile 也没有访问日志配置。每日观察 Docker 日志占用；需要清理时先保全事故证据并通过受审查的日志策略变更处理，不直接截断容器日志文件。

## 7. BullMQ 队列与 Outbox

当前 Worker 只有 `token-farmer-maintenance` 队列，并每 60 秒调度一次 `projection-heartbeat`，并发为 2。检查 Worker 和队列计数：

```bash
compose exec -T -w /app/apps/worker worker node --input-type=module <<'NODE'
import { Queue } from "bullmq";
const url = new URL(process.env.REDIS_URL ?? "redis://redis:6379");
const queue = new Queue("token-farmer-maintenance", {
  connection: {
    host: url.hostname,
    port: Number(url.port || "6379"),
    username: url.username || undefined,
    password: url.password || undefined,
  },
});
const counts = await queue.getJobCounts("wait", "active", "delayed", "failed", "completed");
const recent = await queue.getCompleted(0, 49);
const heartbeat = recent.find((job) => job.name === "projection-heartbeat");
console.log({
  counts,
  latestHeartbeat: heartbeat
    ? {
        id: heartbeat.id,
        finishedAt: heartbeat.finishedOn ? new Date(heartbeat.finishedOn).toISOString() : null,
      }
    : null,
});
await queue.close();
NODE
```

`failed > 0`、`latestHeartbeat.finishedAt` 距当前时间超过 3 分钟，或等待数持续增长时，保存计数和 Worker 日志，先修复 Redis 连接、资源或代码原因。当前任务没有配置 `removeOnComplete`，`completed` 会持续增长；同时观察 Redis/AOF 大小，但不要直接编辑 Redis key，也不要执行 `FLUSHDB`、`drain` 或 `obliterate`。失败任务只能在确认名称、幂等性和影响后，通过受审查的 BullMQ 工具按精确 Job ID 重试。

Outbox 只做只读盘点：

```bash
compose exec -T postgres sh -lc \
  'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT topic, count(*) AS pending, min(created_at) AS oldest
      FROM outbox_events
      WHERE published_at IS NULL
      GROUP BY topic
      ORDER BY oldest;"'
```

当前仓库没有 Outbox publisher、重放命令或从 Outbox 重建 BullMQ 的实现，因此 `published_at` 不推进不是可用运维命令能修复的问题。发现积压时记录最老事件、Topic、数量和业务影响，停止依赖该投影的扩量并创建事件；不得删除事件、手工填写 `published_at` 或伪造消费成功。

## 8. Redis 丢失恢复

Redis 不是余额、订单、成熟或收获的事实来源，但当前自动重建只覆盖 Worker 启动时创建的 heartbeat 调度器，不能宣称业务任务已从 Outbox 恢复。

1. 声明事件，停止 `api` 和 `worker`，记录最后健康时间与当前 SHA。
2. 保留 `/opt/token-farmer/data/redis` 的只读取证副本或云盘快照；不在唯一副本上直接运行 AOF 修复。
3. 核对 PostgreSQL 备份和 Outbox 只读盘点，不修改余额、账本或 `published_at`。
4. 恢复原 Redis AOF；若确认数据不可恢复，按部署手册的属主与权限创建空目录后启动 Redis。
5. 执行 `compose exec -T redis redis-cli ping`，再启动 Worker，确认健康端口和 heartbeat。
6. 在受审查的业务任务重建/对账工具完成前，保持受影响写入关闭；当前没有通用重建命令。
7. 按 [`incident-response.md`](incident-response.md) 完成数据核对、冒烟、观察和复盘后再恢复邀请。

## 9. 常见故障

| 现象                          | 首要检查                                      | 处理边界                                           |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `/health/live` 失败           | `compose ps api`、API 最近日志                | 最小重启；重复崩溃则停止重启循环并升级             |
| `/health/ready` 失败          | PostgreSQL 健康、连接数、磁盘                 | 先恢复数据库；该探针不覆盖 Redis、Worker 或上游    |
| 页面可开但 API 报错           | Caddy 路由、API 状态、浏览器请求 ID           | 不把 Web 可用当作业务可用                          |
| Worker 停止或 heartbeat 缺失  | Redis `PING`、Worker 日志、队列计数           | 不清队列；确认幂等后再重试                         |
| Outbox 最老事件持续增长       | Topic、最老时间、关联业务功能                 | 当前无 publisher；声明事件并推动实现修复           |
| 磁盘超过 80%                  | Docker、日志、备份、PostgreSQL 分别占用       | 停止扩邀请；不使用 `docker system prune --volumes` |
| 内存持续超过 85% 或 Swap 增长 | `docker stats`、`free -h`、容器重启           | 停止扩邀请并扩容，不以频繁重启掩盖                 |
| 证书或 HTTPS 异常             | Caddy 日志、证书有效期、80/443 TCP 与 443 UDP | 不关闭证书校验；按 Secret 轮换和事故手册处理       |

## 10. 操作记录与升级

每次操作记录操作编号、操作人、UTC 起止时间、Release SHA、命令类别、脱敏结果、健康/冒烟结果、备份 ID 和回退状态。触发资源阈值、数据完整性疑点、Secret 暴露、超过 24 小时无成功备份或无法解释的队列/Outbox 积压时，按监控阈值声明事件，不继续试错。
