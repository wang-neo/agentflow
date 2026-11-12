# Workflows — 流程模板目录

协调者启动/接受任务时按以下顺序决定用哪个 workflow：
1. 任务消息显式指定：`需求：xxx（用 simple）` 或 `用 katana 流程：xxx`
2. 业务仓库根有 `.agentflow-workflow` 文件（内容为模板名）→ 用它
3. 默认 `standard`

| 模板 | 人工节点 | 适用场景 |
|---|---|---|
| `standard.yml` | S4 方案审批 | 默认：个人开发，关键决策自己把关 |
| `simple.yml` | 无（全 auto，AI 双审兜底） | 小改动/演示/个人项目一把梭 |
| `katana.yml` | S4（Slack 通知审批） | 团队协作：PR @ 审核人、review 闭环 Slack 全通知 |

## 共同铁律（所有模板不可覆盖）

`merge_policy.human_required: true` —— merge 永远人工。

## 自定义

- fork 本仓库后改任意模板
- 新模板放进本目录即可被「用 <名字> 流程」引用（协调者读 `workflows/<名字>.yml`）
- 任务级覆盖：消息里写（用 katana，但 S4 改 auto）
