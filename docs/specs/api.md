# API Specification

## 1. 地址与版本

- 游戏 API：`https://tokenfarmer.online/api/v1`
- 模型兼容 API：`https://api.tokenfarmer.online/v1`
- 本地地址由 `.env` 配置，路径保持一致。

游戏 API 使用显式 `/api/v1`。兼容 API 按 OpenAI/Anthropic 路径版本化。破坏性游戏合同使用新的路径版本；只新增可选字段属于向后兼容。

## 2. 编码、时间与 ID

- 请求和非流式响应为 UTF-8 JSON。
- ID 是不透明字符串，客户端不能解析顺序或类型。
- Token、金额、数量型 Score 和 Ledger 数值使用十进制字符串，例如 `"20000"`。
- 数量较小且有明确上限的 UI 计数可以是 JSON integer，例如地块数和等级。
- 时间是 UTC RFC 3339，例如 `2026-07-11T08:00:00.000Z`。
- 客户端发送未知计算字段不会改变服务端结果；严格 Contract 的未知字段返回验证错误。

## 3. 鉴权

游戏 API 使用 Secure HttpOnly 会话 Cookie，并要求受保护写操作通过 CSRF/Origin 检查。模型 API 使用：

```http
Authorization: Bearer sk-tf-...
```

Anthropic `/v1/messages` 还接受：

```http
x-api-key: sk-tf-...
```

两种凭据同时出现且不同返回 `401 INVALID_API_KEY`。被冻结用户、撤销 Key 或禁用模型不调用上游。

管理员路径要求管理员角色、TOTP 2FA 和近期重新认证。身份认证成功不代表有权访问目标资源；每个 Use Case 验证资源归属或好友关系。

## 4. 幂等

所有 `POST`、`PUT`、`PATCH`、`DELETE` 写操作要求：

```http
Idempotency-Key: <16-128 printable ASCII chars>
```

规则：

- 相同 Actor、Operation、Key 和规范化 Body 返回第一次的状态码与业务响应。
- Key 相同但 Body 指纹不同返回 `409 IDEMPOTENCY_CONFLICT`。
- 首次仍执行中时返回最终结果或 `409 IDEMPOTENCY_IN_PROGRESS` 和 `Retry-After`。
- 缺失/非法 Key 返回 `400 IDEMPOTENCY_KEY_REQUIRED`。
- Payment Provider callback 使用 Provider Event ID 幂等，不要求第三方发送该 Header。

客户端生成新业务意图时使用新 Key；网络重试必须复用原 Key。

## 5. 错误合同

游戏 API 错误：

```json
{
  "error": {
    "code": "PLOT_OCCUPIED",
    "message": "This plot is not empty.",
    "request_id": "req_01...",
    "details": {}
  }
}
```

`code` 稳定供客户端分支，`message` 可本地化，`details` 只放安全的字段级信息。不得返回堆栈、SQL、Provider Secret、内部 URL 或上游认证错误正文。

常用状态：

|        HTTP | 类别                               |
| ----------: | ---------------------------------- |
|         400 | Contract/幂等 Header 无效          |
|         401 | 未登录或 API Key 无效              |
|         403 | 已登录但权限、保护期或冻结状态阻止 |
|         404 | 不存在或调用方无权知道资源存在     |
|         409 | 状态竞争、重复业务、幂等冲突       |
|         422 | 合法 JSON 但不满足业务前置条件     |
|         429 | 用户/IP/Key 限流                   |
| 502/503/504 | Provider、准备金或依赖暂时不可用   |

模型兼容 API 使用对应协议的错误外形，并始终返回内部 `request_id` 响应头。

## 6. 分页与请求追踪

列表使用不透明 Cursor：

```json
{
  "items": [],
  "next_cursor": null
}
```

`limit` 默认 20，最大 100。排序键固定为文档指定的业务时间加 ID，避免并发插入导致重复。服务端生成 `X-Request-Id`；客户端提供的同名值只在格式安全时作为关联 ID，不作为唯一性或幂等依据。

## 7. 游戏 API 资源

以下路径省略 `/api/v1` 前缀。请求/响应具体字段由 `packages/contracts` 的 Zod Schema 生成文档并接受契约测试。

### 7.1 Auth

| Method | Path                    | 行为                                 |
| ------ | ----------------------- | ------------------------------------ |
| POST   | `/auth/register`        | 邀请码、邮箱、密码注册并发送验证邮件 |
| POST   | `/auth/verify-email`    | 消费一次性验证 Token                 |
| POST   | `/auth/login`           | 创建并轮换会话                       |
| POST   | `/auth/logout`          | 撤销当前会话                         |
| POST   | `/auth/password/forgot` | 发送不泄露账号存在性的重置邮件       |
| POST   | `/auth/password/reset`  | 消费一次性 Token 并撤销旧会话        |
| POST   | `/auth/2fa/setup`       | 近期认证后生成 TOTP setup            |
| POST   | `/auth/2fa/confirm`     | 验证 TOTP 并一次展示恢复码           |
| POST   | `/auth/2fa/disable`     | 近期认证和 TOTP/恢复码后关闭         |
| GET    | `/me`                   | 当前用户、功能开关和首次赠送状态     |
| POST   | `/me/enter-farm`        | 幂等创建农场并发四模型 Welcome Grant |

### 7.2 Wallet、Token 包与 Key

| Method | Path                                   | 行为                                           |
| ------ | -------------------------------------- | ---------------------------------------------- |
| GET    | `/wallets`                             | 四模型余额、预留与 Token 包汇总                |
| GET    | `/wallets/{modelId}/ledger`            | Cursor 分页账本                                |
| GET    | `/token-packages`                      | 按模型/状态查询仓库                            |
| POST   | `/token-packages/{packageId}/activate` | 激活到对应钱包                                 |
| GET    | `/api-keys`                            | 只返回前缀、名称、限制和时间，不返 secret/hash |
| POST   | `/api-keys`                            | 近期 2FA 后创建，一次返回完整 Key              |
| DELETE | `/api-keys/{keyId}`                    | 立即撤销，重复调用返回同一终态                 |
| GET    | `/usage`                               | 按模型、状态和时间查询模型调用用量             |

### 7.3 Farm

| Method | Path                              | 行为                                       |
| ------ | --------------------------------- | ------------------------------------------ |
| GET    | `/farm`                           | 土地、Planting、事件、服务器时间和可用动作 |
| GET    | `/farm/crops`                     | 当前用户可见的发布作物/规则版本            |
| POST   | `/farm/plots/{plotId}/plant`      | `{ crop_id, model_id }` 播种               |
| POST   | `/farm/events/{eventId}/maintain` | 免费尝试或主人保证解决                     |
| POST   | `/farm/plantings/{id}/fertilize`  | 使用一次化肥                               |
| POST   | `/farm/plantings/{id}/harvest`    | 收获并创建 Token 包                        |
| POST   | `/farm/actions/batch`             | 对选定地块执行同一动作，逐项返回结果       |
| POST   | `/farm/plots/{plotId}/upgrade`    | 空地升级土地品质                           |

Farm 响应中的经济数值全部为字符串。Planting 暴露 commit；成熟后还暴露 reveal seed、规则哈希和抽样值。

### 7.4 Friends 与偷取

| Method | Path                                        | 行为                                   |
| ------ | ------------------------------------------- | -------------------------------------- |
| GET    | `/friends`                                  | 好友、亲密度、在线无关的可操作地块计数 |
| GET    | `/friends/search`                           | 按精确好友码或受限昵称搜索             |
| POST   | `/friend-requests`                          | 创建申请                               |
| POST   | `/friend-requests/{id}/accept`              | 接受并建立关系                         |
| POST   | `/friend-requests/{id}/reject`              | 拒绝                                   |
| DELETE | `/friends/{friendId}`                       | 删除关系                               |
| POST   | `/blocks`                                   | 拉黑并终止关系                         |
| DELETE | `/blocks/{userId}`                          | 解除拉黑，不恢复好友                   |
| GET    | `/friends/{friendId}/farm`                  | 权限过滤后的好友农场                   |
| POST   | `/friends/{friendId}/events/{eventId}/help` | 处理好友免费维护事件                   |
| POST   | `/friends/{friendId}/plantings/{id}/steal`  | 一次权威偷取尝试                       |
| POST   | `/friends/{friendId}/plantings/{id}/prank`  | 双方允许时放置虫草                     |
| PATCH  | `/social/preferences`                       | 更新允许恶作剧等设置                   |

偷取响应返回结果枚举、实际果实数、Token 包摘要和最新地块状态；不返回服务端最大偷取预算或未来随机值。

### 7.5 商品、订单与榜单

| Method | Path                        | 行为                                    |
| ------ | --------------------------- | --------------------------------------- |
| GET    | `/products`                 | 已发布沙箱 SKU，金额由服务端返回        |
| POST   | `/orders`                   | 按 SKU 和 Provider 创建订单             |
| GET    | `/orders/{orderId}`         | 查询权威订单状态                        |
| POST   | `/orders/{orderId}/refresh` | 服务端向 Provider 主动查单              |
| POST   | `/payments/alipay/callback` | Alipay Provider 回调；Provider 事件幂等 |
| GET    | `/leaderboards`             | `kind/scope/period/cursor` 查询快照     |
| PATCH  | `/leaderboards/privacy`     | 加入或退出当前持有榜                    |

订单创建请求不得包含可被采用的 Token 数或金额。响应中的跳转/表单字段来自 Payment Adapter，前端不能自行拼签名。

### 7.6 管理

管理端位于 `/admin/*`，只通过各模块公开 Admin Application Port：邀请、用户冻结、规则草稿/发布、准备金、订单查单/退款、补偿账本、榜单重建、上游健康和审计查询。

任何写操作保存管理员、原因、关联工单、变更前后摘要和近期认证时间。管理 API 不提供原始 SQL、直接余额设置或编辑已发布规则的接口。

## 8. 事件流

`GET /api/v1/events/stream` 使用会话鉴权的 Server-Sent Events：

```text
id: evt_01...
event: farm.crop_matured
data: {"planting_id":"plt_...","occurred_at":"..."}
```

- 支持 `Last-Event-ID` 在保留窗口内续传；超过窗口发送 `sync.required`，客户端重新拉取 REST 快照。
- 心跳为注释行，不是业务事件。
- SSE 只是 UI 刷新提示，不是账务事实；断线不影响 Worker、成熟或结算。
- 事件只包含当前用户有权看到的最少数据，不广播好友余额、Prompt 或隐藏偷取预算。

## 9. OpenAI 兼容端点

### `GET /v1/models`

只列出该 Key 和用户可以使用且 Wallet 存在的启用模型。模型 ID 使用本 Spec 的稳定 ID。

### `POST /v1/chat/completions`

支持非流式 JSON 和 `stream: true` 的 SSE。Gateway 验证模型、输入大小和最大输出，预留 Wallet，再转发给 Mock/授权 Adapter。流式结束发送兼容终止事件；内部最终 usage 独立持久化。

### `POST /v1/responses`

支持第一版 Contracts 明确允许的文本输入、工具描述和流式事件。未知 Provider 专属参数不能绕过内部最大输出和模型白名单。

兼容响应保留上游协议字段，但错误、usage 与内部 Request ID 需要契约测试。用户余额不足返回兼容的 `insufficient_quota`，且不上游。

## 10. Anthropic 兼容端点

### `POST /v1/messages`

接受 `x-api-key` 或 Bearer、要求显式 `anthropic-version`（支持版本由 Contract 列表控制），支持普通响应和 `text/event-stream`。

Adapter 将 Anthropic usage 映射到输入、输出、cache write、cache read 四类，再按内部 Price Version 结算。未知 beta Header 默认拒绝，只有白名单能力可以转发。

## 11. 流式与失败语义

- 只有 Wallet 预留成功后才发送上游请求和响应流 Header。
- 客户端断开时取消向客户端写入，但继续在有界超时内读取上游 usage。
- 上游在首字节前失败：释放预留并返回兼容 5xx；已经产生可计费 usage 时按权威 usage 结算。
- 流中途失败：关闭流、保存失败状态，并按最终 usage 或保守预留结算。
- usage 缺失：状态为 `estimated`，先扣保守预留，进入 Outbox 对账；后续差异使用补偿 Ledger。
- 同一个内部 Model Request 只能最终结算一次。客户端重试模型调用是新的消费意图，不使用 HTTP 幂等重放模型输出。

## 12. 限流

限流至少按全局 IP、用户、API Key、端点和模型并发维度执行。响应使用 `429` 和 `Retry-After`。具体数字是环境配置，不能由客户端提高；管理员降低额度只影响新请求。

支付回调不使用普通用户限流，但进行来源无关的验签、事件唯一性和防资源耗尽限制。登录、验证、找回与好友搜索有更严格的反枚举限制。

## 13. 契约验收

- 所有写端点缺少幂等 Key 时失败；相同请求重放返回同一业务 ID。
- 所有 Token JSON 字段是字符串，没有精度损失。
- 用户不能通过修改模型、价格、产量、好友 ID 或地块 ID 访问/改变非授权资源。
- OpenAI/Anthropic 普通和流式成功、余额不足、撤销 Key、断线、上游错误和 usage 缺失都有契约测试。
- Payment 回调验签、金额分歧、非法状态和十次重放都有测试。
- 日志快照测试确认 Header、Cookie、Prompt、响应正文和 Secret 被脱敏或未采集。
