# Monitoring and SLO Runbook

## 1. 目标与当前基线

本手册为上海单机、邀请制沙箱定义初始 SLI/SLO、人工巡检阈值和升级责任。这里的目标从本手册生效后用于运营判断，不代表历史已经达标，也不构成 24×7 商业 SLA。

当前仓库没有 Prometheus、Grafana、OpenTelemetry、Sentry、日志聚合、外部探针或 Alertmanager；没有已配置的短信、电话、邮件、Slack 或飞书告警渠道。Compose 没有日志轮转，Caddyfile 没有访问日志。因此大部分 SLI 暂时不能自动计算，必须标记为“未知”，不能用一次人工检查宣称 SLO 达标。

## 2. Owner

| 范围                      | 当前 Owner                        | 职责                                             |
| ------------------------- | --------------------------------- | ------------------------------------------------ |
| 生产、应用、数据与安全    | 仓库 CODEOWNERS 中的 `@Lling0000` | 确认阈值、声明事件、决定停写/恢复、保存运营记录  |
| 当次发布                  | 发布记录中的 `OPERATOR`           | 发布后观察、执行人工采集、把异常升级给生产 Owner |
| 云、域名、证书和 Provider | 对应账号的实名持有人              | 通过已签约支持入口升级；联系人和凭据不写入 Git   |

当前没有第二维护者或轮值表。一个人可以在沙箱阶段兼任多个角色，但必须记录 UTC 时间、判断依据和操作；响应时限从“发现或收到报告”开始计算。

## 3. SLI 与 SLO

| SLI 与计算方式                                                                       | 初始目标             | 窗口                         | 当前可观测性                           |
| ------------------------------------------------------------------------------------ | -------------------- | ---------------------------- | -------------------------------------- |
| API 就绪可用性：成功的 `GET /health/ready` 探测数 / 总探测数                         | `>= 99.0%`           | 滚动 30 天                   | 无自动探针，只能人工留档               |
| 业务请求成功率：非健康请求中非 5xx 数 / 总请求数                                     | `>= 99.0%`           | 滚动 30 天                   | 无访问日志/指标，暂不可计算            |
| API 延迟：非流式游戏 API 的 p95 服务端响应时间                                       | `<= 1s`              | 滚动 30 天                   | 无直方图或聚合，暂不可计算             |
| Worker 心跳及时率：`projection-heartbeat` 在计划时间后 2 分钟内完成的次数 / 计划次数 | `>= 99.0%`           | 滚动 30 天                   | 仅可人工查 BullMQ                      |
| Outbox 发布及时率：5 分钟内设置 `published_at` 的事件数 / 新增事件数                 | `>= 99.0%`（未激活） | publisher 上线后的滚动 30 天 | 当前无 publisher；首次事件后必然不达标 |
| 备份恢复目标                                                                         | RPO 24h、RTO 2h      | 每次事件                     | 有手册，无自动告警；以成功恢复记录为准 |

`/health/live` 只证明 API 进程响应；`/health/ready` 当前只执行 PostgreSQL `select 1` 并返回上游模式，不检查 Redis、Worker 或真实上游。Worker 的 4100 接口只检查 `worker.isRunning()`，不检查积压；任何单一健康接口都不能代表完整业务健康。

## 4. 告警阈值与窗口

以下是邀请制沙箱的初始触发策略；在自动采集上线前由人工检查或用户报告触发：

| 信号                     | 触发条件与观察窗口                                 | 级别/动作                                       |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------- |
| 公网/API 就绪            | 5 分钟内连续 3 次失败                              | SEV-1；停止邀请，检查 Caddy、API 和 PostgreSQL  |
| 5xx                      | 5 分钟内超过 5%，或同一关键流程连续失败            | SEV-1；当前无自动分母，按日志样本和用户报告判断 |
| API p95                  | 连续 15 分钟超过 2s                                | SEV-2；当前无自动统计，记录人工样本             |
| Worker/BullMQ            | 3 分钟无 heartbeat，或 `failed > 0` 持续 5 分钟    | SEV-2；保存队列计数，不清空 Redis               |
| Outbox                   | publisher 上线后，最老未发布事件超过 5 分钟        | SEV-2；当前阶段属于上线阻断，不重复制造无解告警 |
| PostgreSQL               | `pg_isready` 失败或发生数据完整性疑点              | SEV-1；停止 API/Worker 写入                     |
| Redis                    | `PING` 失败 3 次或 AOF/卷丢失                      | SEV-2；若影响经济一致性则升为 SEV-1             |
| 内存/Swap                | 内存持续超过 85% 或 Swap 持续增长 15 分钟          | 停止扩邀请并扩容                                |
| 磁盘                     | 使用率超过 80%                                     | 停止扩邀请；不足 15GB 时阻止发布                |
| 备份                     | 超过 24 小时无成功备份、离机复制或恢复验证失败     | SEV-2，并阻止生产迁移                           |
| TLS                      | 剩余有效期少于 14 天且未续期；少于 3 天仍未恢复    | 前者 SEV-2，后者 SEV-1                          |
| Secret、认证、账本或支付 | 任何确认或合理怀疑的泄露、绕过、重复入账或余额异常 | 直接 SEV-1，不等待窗口                          |

资源阈值与发布门禁沿用 [`deployment.md`](deployment.md)，备份判定沿用 [`backup-restore.md`](backup-restore.md)。

## 5. 人工采集流程

开放邀请期间每天至少一次；发布后 30 分钟内每 5 分钟一次，随后 2 小时内每 30 分钟一次。记录 UTC 时间、Release SHA、操作者和原始退出码。

```bash
cd /opt/token-farmer/repo
compose() {
  docker compose --env-file /opt/token-farmer/.env.production \
    -f infra/docker-compose.prod.yml "$@"
}
date -u
compose ps
docker stats --no-stream
df -h /
free -h
compose exec -T postgres sh -lc \
  'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
compose exec -T redis redis-cli ping
```

备案门禁未完成时不得把域名入口公开。按 [`deployment.md`](deployment.md) 第 11 节从本机建立隧道，并用域名 URL 保留 Host、SNI 和证书校验：

```powershell
ssh -i $Key -N -L 8443:127.0.0.1:443 $Server
curl.exe --fail --show-error `
  --resolve "tokenfarmer.online:8443:127.0.0.1" `
  "https://tokenfarmer.online:8443/health/live"
curl.exe --fail --show-error `
  --resolve "api.tokenfarmer.online:8443:127.0.0.1" `
  "https://api.tokenfarmer.online:8443/health/ready"
```

只有备案、DNS 和公开 HTTPS 门禁全部通过后，才从服务器或受控外部主机运行公网探针。保留 HTTP 状态和耗时，不保存响应正文中的用户数据：

```bash
curl --fail --silent --show-error -o /dev/null \
  -w 'live code=%{http_code} total=%{time_total}\n' \
  https://tokenfarmer.online/health/live
curl --fail --silent --show-error -o /dev/null \
  -w 'ready code=%{http_code} total=%{time_total}\n' \
  https://api.tokenfarmer.online/health/ready
echo | openssl s_client -connect tokenfarmer.online:443 \
  -servername tokenfarmer.online 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

队列、Outbox、日志和资源的详细命令见 [`operations.md`](operations.md)。巡检结果只写入权限受控的运营记录；不得附环境文件、认证 Header、Cookie、Prompt、支付签名或完整 API Key。

## 6. 告警渠道与升级

| 能力                 | 当前状态 | 人工替代流程                                             |
| -------------------- | -------- | -------------------------------------------------------- |
| Metrics/仪表盘       | 暂无     | 操作人运行第 5 节并记录结果                              |
| 日志聚合/错误追踪    | 暂无     | 按服务和时间读取 Docker 日志，脱敏后附事件记录           |
| 合成探针             | 暂无     | 发布操作人和每日巡检手工执行两个 HTTPS 探针              |
| 自动短信/电话/群告警 | 暂无     | 发现者通过现有直接联系路径通知生产 Owner，并记录通知时间 |
| 24×7 值班            | 暂无     | 不承诺发现前响应；收到报告后按事件手册的目标执行         |

任何 SEV-1 直接进入 [`incident-response.md`](incident-response.md)。SEV-2 在人工检查中确认后 30 分钟内通知生产 Owner；无法判断数据完整性时按更高级别处理。

## 7. 当前缺口与变更门禁

在以下能力落地并通过部署验证前，不得把本手册中的人工目标描述为自动监控：

- 指标采集、持久化、Dashboard 和 SLO 计算均不存在。
- Caddy 访问日志和集中式应用日志不存在；容器日志也没有轮转策略。
- 自动告警路由、接收确认、静默和升级链不存在。
- Outbox publisher/重放和 Redis 业务任务重建不存在。
- API readiness 未覆盖 Redis、Worker 和上游；Worker readiness 未覆盖队列延迟。
- 备份脚本没有仓库内可核验的调度、加密离机复制与自动恢复验证闭环。

新增监控组件会改变生产基础设施时，应独立评审、最小权限部署，并更新 [`architecture.md`](../architecture.md)、安全要求和部署/恢复手册。

Outbox SLO 在 publisher 落地前不激活；当前任何 Outbox 事件都会永久未发布，因此该缺口直接阻止扩大邀请规模，而不是可通过人工确认关闭的常规告警。

## 8. 月度复核记录

每月记录窗口起止、邀请规模、各 SLI 的“达标/不达标/未知”、阈值事件、备份恢复结果、容量趋势、未关闭缺口和 Owner。没有原始数据的 SLI 必须写“未知”，不得补估算值；连续两个月未知的关键 SLI 应阻止扩大邀请规模。
