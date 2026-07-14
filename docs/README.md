# Token Farmer 文档索引

文档按约束强度排列：

1. [`../AGENTS.md`](../AGENTS.md)：不可违反的仓库规则和验证矩阵。
2. [`architecture.md`](architecture.md)：模块所有权、依赖方向和事务边界。
3. [`engineering.md`](engineering.md)：实现模式、复杂度门槛、迁移和评审流程。
4. [`security.md`](security.md)：身份、密钥、支付、日志和服务器安全要求。
5. [`product-scope.md`](product-scope.md)：第一版能做、受条件限制和明确不做的功能。
6. [`specs/`](specs/)：玩法、经济与 API 的可观察行为。
7. [`runbooks/`](runbooks/)：部署、备份恢复、日常运维、监控、事故响应、Secret 轮换和 GitHub 分支保护操作手册。
8. [`adr/`](adr/)：已经接受的架构决策。

Day-2 运维入口：

- [`runbooks/operations.md`](runbooks/operations.md)：服务启停、巡检、队列、Outbox 与 Redis 恢复。
- [`runbooks/monitoring.md`](runbooks/monitoring.md)：SLI/SLO、阈值、人工采集和告警缺口。
- [`runbooks/incident-response.md`](runbooks/incident-response.md)：SEV 分级、响应、沟通和复盘。
- [`runbooks/secrets-rotation.md`](runbooks/secrets-rotation.md)：生产 Secret 轮换与泄露处置。

实现与文档冲突时，以可观察功能 Spec 和不可违反的 `AGENTS.md` 为准；如果两者冲突，必须先通过 ADR 和同一 PR 修正文档，不能只改代码。
