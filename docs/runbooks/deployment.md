# Production Deployment Runbook

## 1. 目标与边界

目标服务器为 `1.15.179.90`，应用目录为 `/opt/token-farmer`，正式 Web/API 域名分别为 `tokenfarmer.online` 和 `api.tokenfarmer.online`。生产 Compose 文件是 `infra/docker-compose.prod.yml`，镜像必须使用通过 CI 的完整 Git commit SHA，不能使用未固定的 `latest`。

本手册不代替 ICP/公安备案、域名实名认证、上游转售授权、正式支付宝商户开通或需要本人完成的人脸/短信核验。相应门禁未完成时，只通过 SSH 隧道验收邀请制沙箱。

以下命令中的占位符必须先替换并核对。任何删除旧服务/卷、迁移、DNS 切换都需要操作人明确确认当前目标。

## 2. 本地连接

Windows PowerShell：

```powershell
$Server = "root@1.15.179.90"
$Key = "$env:USERPROFILE\.ssh\id_ed25519_server_20260711"
ssh -i $Key $Server
```

私钥只留在本机，不复制到仓库或服务器应用目录。首次连接核对云控制台显示的主机指纹，不盲目接受变化后的指纹。

首次部署完成后应创建独立 `tokenfarmer-deploy` sudo 用户、安装其专用公钥、禁用 SSH 密码和 Root 密码登录；在确认新会话可登录前不能关闭现有入口。

## 3. 发布前门禁

记录本次发布：

```text
RELEASE_SHA=<40-character commit SHA>
PREVIOUS_SHA=<currently deployed SHA, first deploy uses none>
OPERATOR=<name>
CHANGE=<PR/release URL>
BACKUP_ID=<filled after backup>
```

必须全部满足：

- `RELEASE_SHA` 位于受保护的 `main`，CI 所有必需检查成功。
- GHCR 存在 `token-farmer-web/api/worker:$RELEASE_SHA` 三个镜像。
- 变更经过 Spec、迁移和安全评审；发布说明包含回滚路径。
- 本地和 CI `pnpm verify` 通过，四种桌面视口截图通过。
- 生产 Secret 已通过安全渠道准备；`.env.production` 不在 Git。
- 最近备份成功，且本次迁移前会再创建一个备份。
- 若准备公网切域名，ICP 等所需备案、DNS 控制权、Provider 授权和支付门禁均已有可核验证据。

## 4. 只读服务器盘点

先执行只读命令，不清理：

```bash
set -eu
uname -a
cat /etc/os-release
df -h /
free -h
docker version
docker compose version
docker compose ls
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker system df -v
ss -lntup
```

要求：

- Ubuntu/Docker/Compose 健康，服务器时间同步。
- 清理和部署后根分区至少剩 15GB；不足时停止并扩盘，不能靠删除未知数据继续。
- 预期生产容量至少 8GiB RAM/80GB 磁盘；若仍为约 4GiB/40GB，只允许低并发邀请沙箱并设置严格容器限制。
- 找出所有监听 `80/443` 的服务，确认切换 Caddy 不会中断未迁移站点。
- PostgreSQL、Redis、API、New API/Mock 不得绑定公网。

把盘点输出保存在发布工单的脱敏附件中，不上传环境变量或 Docker inspect 的 Secret。

## 5. 处理现有 agent-mailer

不能凭名称猜 Compose 文件、数据库或卷。先确定项目：

```bash
docker compose ls
docker ps --filter label=com.docker.compose.project=agent-mailer \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

从容器 label 确认 `com.docker.compose.project.config_files` 和 `working_dir`，由操作人设置 `MAILER_COMPOSE_FILE`。随后：

1. 按 [`backup-restore.md`](backup-restore.md) 的“旧服务下线备份”备份数据库、上传卷、Compose 和权限 `600` 的环境文件。
2. 生成 SHA-256 校验和，把加密备份下载到本机/离机位置。
3. 在隔离数据库和临时卷完成恢复演练，记录行数/文件数。
4. 只有恢复通过并获得明确下线确认后，执行：

```bash
docker compose -p agent-mailer -f "$MAILER_COMPOSE_FILE" stop
docker compose -p agent-mailer -f "$MAILER_COMPOSE_FILE" down
```

`down` 不加 `-v`。先观察确认 Token Farmer 所需端口释放。原卷至少保留到新系统验收和旧服务保留期结束；删除时逐个核对完整卷名与备份 ID。

## 6. 安全清理 Docker

先重新执行 `docker system df -v`。只允许清理由 Docker 判定未引用的构建缓存、悬空镜像和已退出容器：

```bash
docker container prune
docker image prune
docker builder prune
```

每条命令阅读候选和确认提示后单独执行。不使用 `docker system prune --volumes`，不全局执行 `docker volume prune`。孤立卷先通过容器 label、Compose 文件、挂载点和备份记录确认，再使用完整字面卷名逐个删除。

清理后运行 `df -h /`。可用空间仍小于 15GB则停止部署并扩盘。

## 7. 目录和生产环境

```bash
install -d -m 0750 /opt/token-farmer
install -d -m 0750 /opt/token-farmer/repo
install -d -m 0700 /opt/token-farmer/backups
install -d -m 0700 /opt/token-farmer/release-state
touch /opt/token-farmer/.env.production
chmod 0600 /opt/token-farmer/.env.production
```

将私有仓库以只读 Deploy Key 克隆到 `repo`，或上传经过校验的 `RELEASE_SHA` 源码归档。服务器不能保存个人 GitHub Token。Checkout 后验证：

```bash
git -C /opt/token-farmer/repo rev-parse HEAD
git -C /opt/token-farmer/repo status --short
```

HEAD 必须精确等于 `RELEASE_SHA`，工作区必须干净。

`.env.production` 至少配置 Compose 所需数据库、Redis、Auth、加密、API Key Pepper、邮件、Mock/Provider、域名和镜像变量。要求：

- `IMAGE_TAG=$RELEASE_SHA`，不能在部署中使用 `main`。
- `MODEL_PROVIDER=mock`、`PAYMENT_PROVIDER=mock` 是未过门禁的默认值。
- 生成独立高熵 `AUTH_SECRET`、`API_KEY_PEPPER`、TOTP 加密 Key 和数据库密码。
- Web 公开变量不包含 Secret。
- 文件 Owner 是部署用户，Mode 为 `600`；不运行 `cat` 将 Secret 输出到录屏/日志。

校验 Compose，不启动：

```bash
cd /opt/token-farmer/repo
export IMAGE_TAG="$RELEASE_SHA"
docker compose \
  --env-file /opt/token-farmer/.env.production \
  -f infra/docker-compose.prod.yml config --quiet
```

## 8. 防火墙与网络

云安全组和 UFW 只允许：

- `22/tcp`：优先限制到管理来源 IP。
- `80/tcp`：Caddy HTTP 到 HTTPS/ACME。
- `443/tcp`：Caddy HTTPS。

明确移除 `3000`、`3001`、`5432`、`6379`、`8000`、`8081`、`8301` 等公网规则。修改 SSH 防火墙前保持第二个已验证会话，避免锁死。

Compose 中 Postgres、Redis、Web、API、Worker、Mock/New API 使用内部网络；只有 Caddy 发布 `80/443`。使用以下命令复查：

```bash
docker compose --env-file /opt/token-farmer/.env.production \
  -f infra/docker-compose.prod.yml ps
ss -lntup
```

## 9. 数据库备份与迁移

在任何迁移前执行 [`backup-restore.md`](backup-restore.md) 的生产备份，填入 `BACKUP_ID` 并验证 `pg_restore --list`。

拉取固定镜像并记录 digest：

```bash
export IMAGE_TAG="$RELEASE_SHA"
compose() {
  docker compose --env-file /opt/token-farmer/.env.production \
    -f infra/docker-compose.prod.yml "$@"
}
compose pull web api worker migrate
compose images --format json > "/opt/token-farmer/release-state/$RELEASE_SHA-images.json"
```

先启动数据库依赖并等待健康：

```bash
compose up -d postgres redis
compose ps
```

迁移必须是 expand/backfill 兼容迁移：

```bash
compose run -T --rm migrate
compose run -T --rm migrate pnpm db:check
```

任何命令失败立即停止，不启动新应用。不要手工修迁移表；先查日志和迁移 Spec，必要时按备份恢复。

## 10. 启动与健康检查

```bash
compose up -d --remove-orphans
compose ps
compose logs --since 10m --no-color api worker web caddy
```

所有声明 Healthcheck 的容器必须 healthy。日志不得出现迁移失败、持续重启、余额/Outbox 不变量错误或 Secret。

在服务器内部验证：

```bash
compose exec -T api node -e \
  "fetch('http://127.0.0.1:3001/health/live').then(r=>{if(!r.ok)process.exit(1)})"
compose exec -T api node -e \
  "fetch('http://127.0.0.1:3001/health/ready').then(r=>{if(!r.ok)process.exit(1)})"
```

如果镜像没有 Node 运行时，使用一次性 curl 容器在同一 Compose 网络执行等价检查，不临时公开内部端口。

记录成功发布状态：

```bash
printf '%s\n' "$RELEASE_SHA" > /opt/token-farmer/release-state/current-sha
printf '%s\n' "$PREVIOUS_SHA" > /opt/token-farmer/release-state/previous-sha
```

## 11. 备案前 SSH 隧道验收

不要为了验收绕过备案直接把未备案域名公开。可在本机 PowerShell 建立只绑定本机的隧道，端口按 Compose 的 loopback 预览入口调整：

```powershell
ssh -i $Key -N -L 8443:127.0.0.1:8443 $Server
```

通过 `https://localhost:8443` 或运行手册配置的本地 Host 映射完成：邀请注册、邮箱验证、四模型首次赠送、2FA、Key 创建、Mock 模型普通/流式调用、购买、播种、维护、成熟、偷取、收获、激活和三类榜单。

## 12. DNS、备案和 HTTPS

公开切换前由域名所有人确认：

1. 阿里云域名订单成功、实名认证主体正确、域名状态正常、NS 委派已生效。
2. 大陆服务器接入服务商要求的 ICP 备案完成，主体与域名实名一致；需要的公安备案/专项审查完成。
3. Provider 转售和支付门禁满足；否则正式环境仍保持 Mock 功能开关。

DNS 目标：

| Name  | Type  | Value                | TTL |
| ----- | ----- | -------------------- | --: |
| `@`   | A     | `1.15.179.90`        | 600 |
| `api` | A     | `1.15.179.90`        | 600 |
| `www` | CNAME | `tokenfarmer.online` | 600 |

先用 `nslookup`/`dig` 从至少两个公共 Resolver 确认。Caddy 配置应令 `www` 跳转主域名、HTTP 强制 HTTPS，并为主域名和 API 自动申请证书。

上线验证：

```bash
curl -I http://tokenfarmer.online
curl --fail --show-error https://tokenfarmer.online/health
curl --fail --show-error https://api.tokenfarmer.online/health/ready
openssl s_client -connect tokenfarmer.online:443 -servername tokenfarmer.online </dev/null
```

检查证书主机名/有效期、HTTP 跳转、HSTS/CSP 等安全头和 Caddy 续期日志。

## 13. 线上冒烟

使用专用测试邀请和测试账号，不使用管理员日常账号：

1. 注册、验证、登录、TOTP。
2. 首次进入只发四笔 `20,000`；刷新不重复。
3. 创建 Key，一次展示后列表只见前缀；撤销立即失效。
4. Mock OpenAI/Anthropic 普通和流式请求正确结算，断线进入预期结算状态。
5. Mock/Alipay 沙箱订单回调重放十次只入账一次。
6. 播种、事件、成熟 commit/reveal、好友偷取、主人收获、Package 激活守恒。
7. 三榜单快照、持有榜隐私、管理员审计正常。
8. 重启应用容器和整机后恢复，Outbox 重试不重复业务。
9. 执行一次独立恢复演练并验证证书续期配置。

同时监控 CPU、内存、Swap、磁盘、容器重启、PostgreSQL 连接、Redis、队列滞后、5xx、Provider 错误和账本告警。内存持续超过 85%、Swap 持续增长或磁盘超过 80% 时停止扩邀请并扩容。

## 14. 回滚

应用错误且迁移向后兼容时：

```bash
export IMAGE_TAG="$PREVIOUS_SHA"
compose pull web api worker
compose up -d --remove-orphans
compose ps
```

运行完整健康和冒烟后才更新 `current-sha`。不要自动回滚已提交的账本业务，也不要运行向下迁移删除数据。

如果新迁移破坏旧版本兼容、写入错误经济数据或数据库损坏：

1. 立即进入维护模式，停止 API/Worker 写入。
2. 保存故障日志、数据库快照和错误业务引用。
3. 按 [`backup-restore.md`](backup-restore.md) 恢复到新实例，不能覆盖唯一可用备份。
4. 评估备份点之后的合法账本/订单，使用审计补偿或 Provider 对账恢复，不能静默丢弃。
5. 完成事故复盘、回归测试和审批后再开放。

## 15. 发布完成记录

发布工单保存 SHA、镜像 digest、备份 ID、迁移版本、操作人、UTC 时间、健康结果、冒烟结果、资源基线和回滚 SHA。不得包含 Secret、Prompt、支付签名原文或完整 API Key。
