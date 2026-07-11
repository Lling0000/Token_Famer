# Economy Specification

## 1. 原则

- 每个用户只有一个统一 Token Credit 钱包；模型选择不创建子余额，也不发生模型间兑换。
- 所有 Token 和 Score 使用 `bigint`/PostgreSQL `numeric(38,0)`；JSON 使用十进制字符串。
- 比例使用整数分子/分母，乘法后按本文指定方向取整，禁止浮点数。
- Wallet Ledger 追加写，余额是同事务投影；任何人工修正使用补偿流水。
- 每个经济动作绑定幂等键、业务引用、规则/价格版本和 UTC 时间。

## 2. 统一 Token Credit 钱包

首发模型目录由 `packages/contracts` 的版本化 `MODEL_IDS` 发布，当前包含 20 个 ID：

`claude-fable-5`、`claude-haiku-4-5`、`claude-haiku-4-5-20251001`、`claude-opus-4-6`、`claude-opus-4-7`、`claude-opus-4-8`、`claude-sonnet-4-6`、`claude-sonnet-5`、`deepseek-v4-flash`、`deepseek-v4-pro`、`gemini-3.1-pro-preview`、`gemini-3.5-flash`、`glm-5.2`、`gpt-5.4-mini`、`gpt-5.4`、`gpt-5.5`、`gpt-5.6-luna`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-image-2`。

同一个用户 API Key 可被授予一个或多个模型 ID。所有模型用量、种植成本、支付入账和 Token 包激活都结算到同一个钱包；模型 ID 继续保存在用量、Planting 和 Token 包中作为定价、花型和审计维度。钱包展示：

- `posted_amount`：已入账总余额投影。
- `reserved_amount`：尚未最终结算的 API/奖励预留。
- `available_amount = posted_amount - reserved_amount`。
- `unactivated_package_amount`：全部模型来源 Token 包的可激活总额，只是查询投影。

数据库约束保证三项非负；对外返回十进制字符串。

## 3. 首次欢迎赠送

触发条件是用户完成邀请码注册、邮箱验证并首次成功登录。单一事务向统一钱包追加 `80,000` Token Credit：

- Ledger 原因是 `welcome_grant`，业务引用为用户 Welcome Grant ID。
- 唯一业务引用为 `welcome:{user_id}:unified-v1`。
- 并发首次进入、页面刷新、邮箱回调重放和任务重试只返回同一结果。
- 永不过期，可用于种植或模型 API。
- 不计农场净收获榜；进入持有榜，并在真实 API 使用后进入消耗榜。
- 不可转账、交易、提现或兑换现金。

钱包、Ledger、用户 Grant 状态任一步失败则全部回滚。

## 4. API 标准 Token 计费

每个 Model Price Version 保存整数倍率：

```text
input_ratio       = input_numerator / input_denominator
output_ratio      = output_numerator / output_denominator
cache_write_ratio = cache_write_numerator / cache_write_denominator
cache_read_ratio  = cache_read_numerator / cache_read_denominator
score_ratio       = score_numerator / score_denominator
```

输入倍率通常定义标准单位，但仍显式版本化。每一类别使用整数向上取整，再求和：

```text
category_charge(tokens, n, d) = ceil(tokens * n / d)

api_charge =
  category_charge(input_tokens, input_ratio)
  + category_charge(output_tokens, output_ratio)
  + category_charge(cache_write_tokens, cache_write_ratio)
  + category_charge(cache_read_tokens, cache_read_ratio)
```

未报告的 usage 类别视为 0，不能把负数或小数 usage 入账。Adapter 负责把 Provider 字段映射为内部四类 Usage。

### 4.1 预留与结算

1. Gateway 根据请求最大输出、输入估算、模型价格和安全上限计算预留。
2. Wallet 原子检查 `available_amount` 并增加 `reserved_amount`；不足时返回余额错误，不调用上游。
3. 流结束取得最终 usage 后，按请求开始时 Price Version 计算 charge。
4. Wallet 在一个事务中扣实际 charge、释放预留、写 Ledger 和 Usage 引用。
5. 实际 charge 低于预留时释放差额；高于预留只能在不使余额为负的前提补扣，否则记录 Provider Incident 并冻结该 Key，不能产生负余额。

客户端断开不取消已经发生的上游消费。服务端继续读取至有界超时；缺失最终 usage 时扣除保守预留并标记 `estimated`，对账取得权威 usage 后用补偿流水调整。

## 5. 种子成本

| 等级 | 作物       |  单地成本 |
| ---: | ---------- | --------: |
|    0 | 新手数据花 |         0 |
|    1 | 白萝卜     |    10,000 |
|    2 | 胡萝卜     |    20,000 |
|    3 | 大白菜     |    50,000 |
|    4 | 大蒜       |   100,000 |
|    5 | 大葱       |   210,000 |
|    6 | 水稻       |   420,000 |
|    7 | 小麦       |   630,000 |
|    8 | 玉米       |   840,000 |
|    9 | 鲜姜       | 1,110,000 |
|   10 | 土豆       | 1,340,000 |
|   11 | 小白菜     | 1,670,000 |
|   12 | 生菜       | 2,010,000 |
|   13 | 油菜       | 2,880,000 |
|   14 | 茄子       | 5,760,000 |
|   15 | 红枣       | 8,640,000 |

成本从统一 Token Credit 可用余额扣除。0 级新手数据花成长 1 分钟，固定生成 `100` Token 包，不受土地品质或随机倍率影响、不可偷取。前端显示“两轮安全储备”=`当前可种地块数 * 当前种子成本 * 2`；余额低于该值只警告，单地成本和平台准备金都满足时仍允许播种。

## 6. 收获随机与整数结算

### 6.1 基础分布

无未处理虫害时，用 `0..9999` 均匀整数抽样：

|      区间 | 概率 | 收获倍率 |
| --------: | ---: | -------: |
|     0-799 |   8% |      50% |
|  800-8299 |  75% |     100% |
| 8300-9799 |  15% |     110% |
| 9800-9999 |   2% |     145% |

期望倍率为 98.4%。每个成熟时仍未解决的虫害把 100% 档的 1,000 个整数位置移到 50% 档；其他档不变。两个虫害后的分布为 28%/55%/15%/2%。

### 6.2 Commit/Reveal

- 播种生成 32 字节 CSPRNG seed 并公开 `SHA-256(seed || plantingId || ruleVersionHash)`。
- 每个随机用途使用带标签的确定性派生，例如 `harvest-outcome`、`event-35`、`steal-budget`，避免消费顺序耦合。
- 成熟时公开 seed、规则哈希和抽样结果；客户端可以验证 commit 和规则区间。
- 已公开 commit 后不能替换 seed。解密失败进入人工故障处理，不允许重新抽取。

### 6.3 果实和总价值

使用整数有理数一次性计算，所有中间乘法使用足够宽的 `bigint`：

```text
fruit_num = floor(base_fruit * land_yield_n / land_yield_d * harvest_n / harvest_d)
gross_token_value = floor(seed_cost * land_yield_n / land_yield_d * harvest_n / harvest_d)
```

`fruit_num` 最少为 1。不要按“单果实价格”逐个四舍五入。为了让偷取与主人收获严格守恒，累计前 `k` 个被偷果实的价值定义为：

```text
cumulative_stolen_value(k) = floor(gross_token_value * k / fruit_num)
batch_value(before, after) = cumulative_stolen_value(after) - cumulative_stolen_value(before)
owner_value = gross_token_value - cumulative_stolen_value(stole_num)
```

因此所有偷取者 Token 包加主人 Token 包始终精确等于 `gross_token_value`，没有逐批取整增发。

## 7. 平台奖励准备金

播种前计算该 Planting 的最大可能总价值：

```text
max_liability = floor(seed_cost * land_yield_n / land_yield_d * 145 / 100)
```

平台按模型维护奖励准备金。播种事务同时扣用户成本并预留 `max_liability`；准备金不足时返回 `REWARD_RESERVE_INSUFFICIENT`，不扣用户余额。

收获完成后只消耗实际 `gross_token_value`，释放剩余准备金。偷取 Token 包和主人包共同使用同一 Planting 预留，不能分别重复预留。已在田作物的准备金不能被新规则或管理员操作挪用。

## 8. 维护费用与花瓣

- 两次免费除草/除虫失败后，保证解决费为 `ceil(seed_cost * 1 / 100)`，从统一钱包扣除并进入 `farm_maintenance` Ledger 原因。
- 花瓣是无现金价值的游戏积分，独立于模型钱包，不可调用 API、交易或进入 Token 榜单。
- 土地升级、化肥、狗粮和外观只使用花瓣；价格属于带版本配置。
- 任务、签到和帮助可以发花瓣，但不得发模型 Token，避免绕过准备金。

## 9. Token 包

收获和成功偷取创建不可交易、不过期的 Token Package：

- 包含用户、模型、整数金额、来源、Planting、可选 Steal Attempt、规则版本和状态。
- 状态为 `available -> activated`；不支持转让或撤回。
- 激活事务锁定 Package，向统一 Wallet 追加 Ledger，再把状态置为 activated；Package 保留来源模型 ID。
- 唯一业务引用保证相同 Package 只能入账一次；相同幂等键返回原结果。
- 退款或纠错使用新的补偿流水，不重开已经激活的 Package。

## 10. 偷取价值

偷取的果实数量按 Gameplay Spec 计算，价值按第 6.3 节累计公式从该 Planting 的 `gross_token_value` 划分。

- 落空、被狗抓、资格失败或预算耗尽不创建 Package。
- 成功批次只创建一个偷取者 Package。
- 偷取不会创建额外 Token，只改变同一 Planting 总价值的归属。
- 同一事务写果实变化、Steal Attempt、Package 和 Outbox；任一步失败全部回滚。

## 11. 购买和退款

商品 SKU 绑定整数 Token 数量、法币最小单位金额、币种和不可变商品版本。浏览器只提交 SKU；可选模型字段只用于活动归因，不创建模型子余额。

订单状态：

```text
pending -> paid -> credited
pending -> expired
credited -> refunded
```

- 只有验签回调或服务端主动查单确认后才能进入 `paid`。
- `paid -> credited` 与 Wallet 入账在同一事务；Provider 事件和交易号有唯一约束。
- Mock Provider 和支付宝沙箱走同一状态机。
- 正式支付启用前，部分退款、余额不足退款和资金对账必须另行评审；第一版沙箱退款用等额 Wallet 冲正验证流程。

## 12. Token Score 与榜单

每个 Model Price Version 保存 `score_n/score_d`，单笔 Score 为 `floor(token_amount * score_n / score_d)`。

- 农场净收获：Token 包价值减播种和保证维护 Ledger，欢迎赠送不计。
- API 消耗：最终 API charge；预留不计，补偿按方向计。
- 当前持有：快照时统一 Wallet 的 posted + reserved + available package，再按榜单规则版本换算。
- 历史事件使用发生时版本；不因后台改价追溯重排。

## 13. 必须成立的不变量

1. `available_amount >= 0`、`reserved_amount >= 0`、平台 `unreserved_reward_reserve >= 0`。
2. 每次 Token 变化存在且只存在一条可追溯 Ledger 业务引用。
3. Welcome Grant 每用户只发放一次统一 `80,000` Token Credit。
4. `sum(stolen packages) + owner package = gross_token_value`。
5. 同一 Token Package 只能激活一次。
6. Provider 回调重复任意次数只入账一次。
7. API 最终结算释放对应预留，不遗留无法解释的 reserved amount。
8. 任何规则、重试、并发或管理员操作都不能产生负余额或绕过准备金。

这些不变量必须同时由数据库约束、单元/属性测试和并发集成测试保护。
