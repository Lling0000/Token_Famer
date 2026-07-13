# GitHub Main Branch Protection

## 1. 目的

仓库文件可以定义 CI、CODEOWNERS 和模板，但不能仅靠 Git 内容强制远端分支规则。仓库 Owner 必须在 GitHub Rulesets 或 Branch protection 中配置并验证本手册。

目标仓库：`Lling0000/Token_Farmer`，目标分支：`main`。

## 2. 必需规则

创建作用于默认分支 `main` 的 Active Ruleset：

- 禁止删除分支。
- 禁止 Force Push。
- 要求通过 Pull Request 合并，禁止直接 Push。
- 要求所有 Review Conversation 已解决。
- 要求分支在合并前与 `main` 保持最新。
- 要求线性历史，只允许 Squash 或 Rebase；仓库建议只启用 Squash。
- 要求以下状态检查成功：
  - `format`
  - `lint`
  - `typecheck`
  - `unit`
  - `property`
  - `integration`
  - `contract`
  - `architecture`
  - `migration`
  - `build`
  - `playwright-smoke`
  - `pr-size`
- 除仓库恢复用应急角色外，不设置 Bypass。Owner/Admin 也遵守规则。

当前单人仓库将 Required approvals 设为 0，否则 PR 作者不能批准自己的 PR；CODEOWNERS 仍负责路由和显示所有权。加入第二位维护者后，把 approvals 改为 1，并启用 Code Owner approval 和 dismiss stale approvals。

## 3. 配置顺序

1. 先把 `.github/workflows/ci.yml` 合入默认分支并成功运行一次，让状态检查出现在 GitHub 列表。
2. Repository Settings -> General：默认分支为 `main`，禁用 Merge commit，启用 Squash merge，自动删除已合并分支。
3. Settings -> Rules -> Rulesets：按第 2 节创建规则，并从 Evaluate 切换为 Active。
4. Settings -> Actions：Workflow permissions 默认 Read repository contents；只让 Publish workflow 使用 `packages: write`。
5. Settings -> Environments：为未来 `production` 设置审批者和 Secret；CI/Fork PR 不得访问生产 Secret。
6. Settings -> Security：启用 Dependabot alerts、security updates、Secret scanning 和 Push protection（套餐支持时）。

## 4. 验证

使用非 `main` 测试分支提交一个小型文档 PR：

1. 直接 Push 到 `main` 被拒绝。
2. 缺少必需检查不能合并。
3. 留有未解决 Conversation 不能合并。
4. 分支落后时要求更新。
5. Force Push 和删除 `main` 被拒绝。
6. 所有检查成功后可以 Squash 合并。
7. Publish Images 仅在成功合入 `main` 后生成 SHA 和 `main` 镜像标签，不从 PR 发布。

在仓库规则页使用“View rule insights”检查是否有意外 Bypass。每季度及维护者变更后重新验证。

## 5. 应急绕过

只有 GitHub 故障或规则自身阻止安全修复时使用受审计的应急角色。绕过前记录事故号、原因、目标 SHA、双人批准（单人项目记录 Owner 明确确认）和恢复时间。绕过完成后立即恢复规则，并通过正常 PR 补齐全部检查与复盘。

不得因为 PR 太大、测试慢或检查失败使用应急绕过；这些情况应拆分变更或修复检查。
