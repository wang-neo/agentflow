# AgentFlow — Orca 交付流水线规则库

一套可复用的 Orca 编排规则：需求 → 技术文档（自审+人审）→ 编码（自CR）→ PR + Slack 通知 → review comment 闭环 → 通知人工 merge。

**merge 永远人工**——所有流程模板共用的铁律，不可配置关闭。

## 快速启动

### 方式一：点火咒语（任何 Orca chat 会话粘贴）

**通用协调者**（流程随任务/仓库自动选）：

```
你是 AgentFlow 协调者。
1. 规则库就位：~/.agentflow 不存在则 git clone https://github.com/wang-neo/agentflow.git ~/.agentflow；已存在则 git -C ~/.agentflow pull -q（失败用本地版并提示；两者皆无则报错停止，不编造规则）。
2. cat ~/.agentflow/BOOTSTRAP.md 并严格按它执行。
```

**专职协调者**（锁定单一流程，末尾加一行）：

```
你是 AgentFlow 协调者。
1. 规则库就位：（同上）
2. cat ~/.agentflow/BOOTSTRAP.md 并严格按它执行。
workflow=katana
```

### 方式二：一键接入（CLI，对任意 Git 仓库）

```bash
bash ~/.agentflow/scripts/init.sh /path/to/your-repo [--workflow standard|simple|katana]
```

自动完成：规则库就位 → orca repo 注册 → 协调者 chat 创建 → PR 哨兵部署（每小时兜底）。完成后去 Orca 打开该仓库 `af-coordinator` 的 pi 会话发需求即可。

## Workflow 选型（四层优先级，从高到低）

| 层级 | 方式 | 作用域 |
|---|---|---|
| 1 任务级 | 消息里 `用 simple：xxx` | 仅该任务 |
| 2 点火级 | 咒语末尾 `workflow=katana` | 该协调者所有任务 |
| 3 仓库级 | 仓库根 `.agentflow-workflow` 文件 | 该仓库 |
| 4 全局默认 | — | standard |

### 流程模板

| 模板 | 人工节点 | 适用 |
|---|---|---|
| `standard` | S4 方案审批 | 默认：个人开发，关键决策自己把关 |
| `simple` | 无（AI 双审兜底；撞墙最后问一次人） | 小改动/演示一把梭 |
| `katana` | S4（Slack 通知审批） | 团队协作：PR @ 审核人、review 闭环 Slack 全通知 |

## 用户消息速查（会话里说人话）

| 说 | 效果 |
|---|---|
| `需求：xxx` | 启动流水线 |
| `用 simple：xxx` / `用 katana：xxx` | 本任务换流程 |
| `并行：xxx` | 与在途任务并行跑 |
| `通过` / `通过：附言` | S4 放行（附言并入开发） |
| `打回：意见` | 退回修订（意见直达 worker） |
| `a3f2 通过` | 多任务时按短 ID 定向 |
| `进度` / `任务列表` | 状态三行 / 队列全景 |
| `改配置：S4 改 auto` | 热更策略并确认 |
| `重读 ~/.agentflow 配置` | 规则库热加载 |

## 监控体系（三层）

| 层 | 组件 | 延迟 | 说明 |
|---|---|---|---|
| 主力 | Slack Socket Mode daemon（`daemon/slack-daemon.js`） | 秒级 | 线程回复 → 唤醒协调者；需 App 开 Socket Mode + `.env` 配 `SLACK_APP_TOKEN` |
| 兜底 | PR 哨兵 automation | ≤1h | GitHub comments/approve + Slack 线程轮询；防 daemon 断连漏事件 |
| 随时 | 会话里问 `进度` | 即时 | — |

daemon 启动：`nohup ~/.agentflow/daemon/run-forever.sh &`（保活：崩溃 10s 拉起）。

## Slack 集成（以用户身份发送）

`~/.agentflow/.env`（600 权限，gitignore）：

```
SLACK_APP_TOKEN=xapp-…      # Socket Mode（秒级监控用）
SLACK_USER_TOKEN=xoxp-…     # 以你名义发消息（chat:write + users:read.email）
SLACK_CHANNEL_ID=C0…        # 目标频道
```

未配置时自动降级占位模式（聊天输出 + slack-log.md 留痕），流程不中断。

## 仓库结构

| 文件 | 用途 |
|---|---|
| `COORDINATOR.md` | 协调者完整指南（S1–S13、启动协议、失败卡片、任务队列） |
| `BOOTSTRAP.md` | 点火序列（被咒语 cat 的第二层） |
| `workflows/` | 流程模板：standard / simple / katana |
| `rubrics/` | AI Judge 判定标准（文档自审 / 代码自审 / 评论分类） |
| `slack.yml` | Slack 模板与发送纪律 |
| `sentinel-spec.md` | PR 哨兵 spec（双源监控 v5） |
| `daemon/` | Socket Mode daemon + 保活脚本 |
| `scripts/init.sh` | 一键接入 |
| `data-model.md` | 记账格式（artifacts.jsonl / 门决策 / 审批） |
| `CHANGELOG.md` | 变更日志（每改必留动机） |

## 使用约定

- 协调者会话持久复用：一个 repo 建一次，后续发 `需求：xxx` 即可
- 规则热更新：改本仓库 → push → 会话里说「重读 ~/.agentflow 配置」
- 各业务仓库可 fork 自定义模板；新模板放 `workflows/` 即被「用 <名>：」引用
- 所有 gate 决策附 config 版本与依据，「这步为什么这么走」可回放
