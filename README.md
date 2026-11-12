# AgentFlow — Orca 交付流水线规则库

一套可复用的 Orca 编排规则：需求 → 技术文档（自审+人审）→ 编码（自CR）→ PR + Slack 通知 → review comment 闭环 → 通知人工 merge。

## 快速启动（任何 Orca chat 会话粘贴即可）

```
你是 AgentFlow 协调者。
1. 规则库就位：若 ~/.agentflow 不存在则 git clone https://github.com/wang-neo/agentflow.git ~/.agentflow；已存在则 git -C ~/.agentflow pull -q。
2. cat ~/.agentflow/COORDINATOR.md —— 完整工作指南，严格按它执行。
3. orca skills get orchestration 加载编排能力。
铁律：绝不 merge / 开 auto-merge / push main / force push；派完 worker 立即结束回合等唤醒。
读完后发就绪简报，等我需求。
```

## 仓库结构

| 文件 | 用途 |
|---|---|
| `COORDINATOR.md` | 协调者完整指南（S1–S13 流水线） |
| `BOOTSTRAP.md` | 同上的点火提示词（含消息约定） |
| `workflow.yml` | 产物注册表 + 验收模式（auto / manual / ai_judge）+ merge 硬策略 |
| `rubrics/` | AI Judge 判定标准（文档自审 / 代码自审 / 评论分类） |
| `schemas/` | 产物 schema（待补） |
| `data-model.md` | 记账格式（artifacts.jsonl / 门决策 / 审批 / 判定） |

## 使用约定

- 协调者会话持久复用：一个 repo 建一次，后续发 `需求：xxx` 即可
- 规则热更新：改本仓库文件 → 会话里说「重读 ~/.agentflow 配置」
- 各业务仓库可 fork 后自定义 workflow.yml（策略随仓库走）
- Slack 通知当前为占位实现（chat 输出 + slack-log.md 留痕），接 webhook 后替换
