# Engineering Guide

## 目标

本规范让业务变化落在可预测位置，并由工具阻止边界破坏。它不追求最多抽象；出现三处稳定、语义相同的重复前，不创建公共框架。

## 领域实现模式

### 纯规则函数

核心经济和概率规则必须是同步、确定性的纯函数。建议公开形状如下，具体字段以 Contracts 和 Domain 类型为准：

```ts
type HarvestInput = Readonly<{
  planting: PlantingSnapshot;
  land: LandRuleSnapshot;
  events: readonly CropEventSnapshot[];
  rules: HarvestRuleVersion;
  now: UtcInstant;
  random: DeterministicRandomInput;
}>;

function calculateHarvest(input: HarvestInput): HarvestResult;
function calculateStealAttempt(input: StealAttemptInput): StealResult;
function calculateApiCharge(input: ApiChargeInput): TokenAmount;
function canPlant(input: PlantDecisionInput): PlantDecision;
```

纯函数不得读取数据库、缓存、队列、网络、环境变量、`Date.now()`、无参 `new Date()` 或 `Math.random()`。Application Service 负责从 Port 取得快照、时钟和随机材料，将其显式传入 Domain。

不要让 Domain 返回 HTTP 状态。它返回稳定的业务结果或错误码，例如 `PLOT_OCCUPIED`、`INSUFFICIENT_AVAILABLE_BALANCE`、`STEAL_ALREADY_ATTEMPTED`；HTTP 层负责映射。

### Application Service

一个 Use Case 应当：

1. 验证调用身份与输入 Contract。
2. 打开幂等和事务边界。
3. 通过 Port 读取权威状态并锁定需要竞争的行。
4. 调用一个或多个纯 Domain 规则。
5. 通过本模块 Repository 或其他模块公开 Port 写入。
6. 追加审计/Outbox，提交事务并记录幂等响应。

Controller 只解析 HTTP、建立请求上下文、调用 Use Case 并序列化结果。不要在 Controller 计算余额、概率、成长时间或权限。

### 参数与返回值

- 超过 5 个参数时使用具名、只读参数对象，不使用位置参数数组。
- 经济类型使用品牌化 `bigint` 值对象；不要在业务边界传裸 `number`。
- Wire DTO 与 Domain 类型分离。JSON 中 `bigint` 使用十进制字符串，并由 Zod 校验为无符号或有符号整数格式。
- Repository 返回领域快照或专用结果，不返回 Drizzle 生成的表行。
- 外部 Provider 错误在 Adapter 转换为内部稳定错误，禁止第三方 SDK 异常穿过 Application 层。

## 钱包和账本

余额是账本投影，不是可人工编辑的事实。每个变动必须有：

- 全局唯一 Ledger Entry ID。
- 用户、模型钱包、方向和整数 Token 数量。
- 稳定的业务原因和业务引用，例如 planting、order、request、package 或 admin adjustment ID。
- UTC 时间、操作者、幂等记录和可选的冲正目标。

禁止直接修复余额。错误入账使用引用原流水的等额冲正，再创建正确流水。Wallet Repository 可以在同一事务中更新缓存余额，但必须同时追加账本，且数据库约束不得允许可用余额为负。

`available = posted - reserved`。预留、释放和最终结算都是 WalletService 命令；Gateway、Farm、Social、Payment 不写钱包表。

## 幂等

所有写接口要求 `Idempotency-Key`，格式为 16 到 128 个可打印 ASCII 字符。服务端按 `(actor_id, operation, key)` 唯一。

- 首次请求保存规范化请求指纹并执行事务。
- 同 Key、同指纹、已完成：返回原 HTTP 状态和原业务响应，不重复执行。
- 同 Key、不同指纹：返回 `409 IDEMPOTENCY_CONFLICT`。
- 同 Key 正在执行：等待短时间后返回已完成结果，或返回可重试的 `409 IDEMPOTENCY_IN_PROGRESS`。
- 账务、奖励、支付、收获、偷取和激活记录永久保留幂等业务约束；其他 HTTP 响应缓存至少保留 7 天。
- Provider 回调使用 Provider 事件/交易号作为第二层唯一键，不能依赖客户端幂等键。

## 时间与随机性

- 数据库字段使用 `timestamptz`，代码使用明确的 `UtcInstant`，禁止保存本地时间或无时区字符串。
- 周期计算使用持续时间，不把一天写死为 24 小时；排行榜的“日/周”边界在 `Asia/Shanghai` 中计算后转换成 UTC 查询区间。
- Adapter 提供 `Clock.now()`；测试使用固定时钟。
- Adapter 使用 CSPRNG 产生 32 字节 seed。Domain 只消费显式 seed 派生的确定性值。
- 随机规则必须带版本、内容哈希、抽样顺序和整数区间。不要使用浮点概率或改变已有版本的随机消费顺序。

## 版本化配置

价格、作物、土地、事件、收获、偷取和小狗配置使用不可变版本：

1. 草稿可以编辑，但不能用于业务。
2. 发布时验证总概率、整数边界、准备金上限和引用完整性，生成内容哈希。
3. 已发布版本不可修改，只能停用并发布新版本。
4. Planting、Model Request、Steal Attempt 和 Ledger Entry 保存实际使用的版本 ID。
5. 配置变化只影响发布后的新业务，不追溯改变已开始的种植或请求。

## 数据库与并发

- 状态竞争使用 PostgreSQL 事务和行锁或原子条件更新，不能用进程内 Mutex 作为最终保护。
- 余额非负、唯一奖励、同茬单人单次偷取、单次 Token 包激活、Provider 回调唯一等不变量必须有数据库约束。
- 事务内部不调用慢外部网络。支付确认先验签/查单，再用短事务入账；模型流量先预留，流结束后用短事务结算。
- Outbox 与业务状态同事务写入；消费者至少一次执行并按事件 ID 幂等。
- Redis 锁只减少重复工作，不能替代数据库约束。

## React 与 Phaser

- React Query/专用 Hook 负责请求和缓存，Domain/View Model 函数负责业务呈现判断，组件只处理交互与渲染。
- Phaser Scene 只管理画布对象、动画、命中区域和相机；服务端状态通过明确的 Scene Adapter 输入。
- UI 不预测最终收获或偷取。倒计时可以本地显示，但动作前由服务端再次校验。
- 使用固定轨道、aspect ratio 和 min/max 约束，确保加载、悬停、长中文文本和 24 格土地不会推动布局。
- 不为小于 1180px 的视口维护第二套游戏逻辑；显示电脑端提示。

## 复杂度门槛

| 指标         | 默认上限 | 执行方式                        |
| ------------ | -------: | ------------------------------- |
| 普通源码文件 |   400 行 | ESLint `max-lines`              |
| 普通函数     |    50 行 | ESLint `max-lines-per-function` |
| 参数个数     |        5 | ESLint `max-params`             |
| 圈复杂度     |       10 | ESLint `complexity`             |
| 重复率       |       3% | jscpd                           |
| PR 有效增删  |   500 行 | GitHub `pr-size` job            |

数据库 Schema、迁移、版本化大配置表和正式像素资源可在集中配置中排除。其他超限需要：

1. 只对最小语句/函数使用局部 disable。
2. 注释写明不能立即拆分的具体原因和关联 Issue。
3. PR 的风险部分解释测试与后续动作。
4. 不允许文件级、目录级或仓库级临时关闭规则。

超过 500 行有效代码的 PR 默认失败。只有确实不可拆分且已经人工评审后，维护者才添加 `large-change-approved` 标签。迁移、锁文件、正式资产、版本化配置和文档不计有效代码。

## 重复与抽象

- 相同语法不一定是相同业务。只有三处含义、变化原因和生命周期都相同的重复才抽象。
- 先在所属模块内抽象；只有至少三个模块共享稳定、无业务所有权的概念，才考虑移入 `packages`。
- 禁止万能 `utils.ts`。用目的命名文件，例如 `token-ratio.ts`、`utc-instant.ts`。
- 禁止 Base Service/Repository。组合小 Port 和明确 Use Case。

## 迁移流程

生产迁移使用四阶段：

1. **Expand**：新增可空列/表/索引；不删除旧结构。验证旧应用仍可运行。
2. **Backfill**：可恢复、可重复、分批回填；记录游标和统计，避免长事务。
3. **Dual read/write**：必要时新旧结构同时写，读取带观测的回退；核对一致性。
4. **Contract**：至少一个稳定发布后删除旧路径，再在后续发布删除旧列。

每个迁移 PR 包含前向兼容说明、数据量/锁风险、备份点、验证查询和回滚/恢复策略。生成迁移后人工审查 SQL，不手改生产数据库。

## 评审与技术债

PR 模板中的 Spec、范围、风险、迁移、验证、回滚和截图项必须填写。钱包、支付、Gateway、数据库、安全和部署变更由 `CODEOWNERS` 指定维护者评审。

每个迭代保留约 15% 容量处理重复、超大模块、慢查询、测试缺口、过时依赖和有 Issue 的 TODO。技术债 Issue 必须描述影响、位置、缺失保护和可验证的完成条件，不能只写“重构”。

## Definition of Done

- 可观察行为与 Spec 一致，或同一 PR 更新 Spec 和 ADR。
- 所有新增写操作具有幂等与并发测试。
- 所有 Token 变化进入账本并可按业务引用追溯。
- 受影响验证矩阵通过，没有新增无 Issue TODO、跨模块深层导入或未说明复杂度豁免。
- 发布相关变化包含健康检查、监控信号、备份和回滚步骤。
