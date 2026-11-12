#!/usr/bin/env bash
# AgentFlow 一键接入：对任意 Git 仓库启用 AgentFlow 交付流水线
# 用法：bash init.sh /path/to/your-repo [--workflow standard|simple|katana]
set -euo pipefail

REPO_PATH="${1:?用法: bash init.sh /path/to/repo [--workflow standard]}"
WORKFLOW="standard"
[ "${2:-}" = "--workflow" ] && WORKFLOW="${3:?缺 workflow 名}"
command -v orca >/dev/null || { echo "❌ 未安装 orca CLI"; exit 1; }
command -v gh >/dev/null || { echo "❌ 未安装 gh"; exit 1; }
[ -d "$REPO_PATH/.git" ] || { echo "❌ 不是 Git 仓库: $REPO_PATH"; exit 1; }

echo "== AgentFlow init: $REPO_PATH (workflow: $WORKFLOW) =="

# 1. 规则库
if [ -d ~/.agentflow ]; then git -C ~/.agentflow pull -q 2>/dev/null || true
else git clone -q https://github.com/wang-neo/agentflow.git ~/.agentflow; fi
[ -f ~/.agentflow/workflows/$WORKFLOW.yml ] || { echo "❌ 未知 workflow: $WORKFLOW"; exit 1; }

# 2. 注册仓库 + 默认 workflow
REPO_ID=$(orca repo add --path "$REPO_PATH" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['repo']['id'])" 2>/dev/null) \
  || REPO_ID=$(orca repo list --json | python3 -c "
import json,sys
for r in json.load(sys.stdin)['result']['repos']:
    if r.get('path') == '$REPO_PATH': print(r['id']); break")
echo "$WORKFLOW" > "$REPO_PATH/.agentflow-workflow"
echo "✅ 仓库已注册 ($REPO_ID)，默认 workflow=$WORKFLOW"

# 3. 协调者会话（pi）
R=$(orca worktree create --name af-coordinator --repo "id:$REPO_ID" --agent pi --surface chat \
  --prompt "你是 AgentFlow 协调者。按 ~/.agentflow/BOOTSTRAP.md 执行（读规则库→启动协议→就绪简报）。" --json) \
  && echo "✅ 协调者已创建（Orca 中打开该 worktree 的 chat 发需求即可）" \
  || echo "⚠️ 协调者创建失败（可能已存在），请在 Orca 中确认"

# 4. PR 哨兵（幂等：先删旧）
OLD=$(orca automations list --json | python3 -c "
import json,sys
for a in json.load(sys.stdin)['result']['automations']:
    if a.get('name')=='agentflow-pr-sentinel' and '$REPO_ID' in json.dumps(a): print(a['id']); break" 2>/dev/null || true)
[ -n "$OLD" ] && orca automations remove "$OLD" --json >/dev/null 2>&1 || true
orca automations create --name "agentflow-pr-sentinel" --trigger "*/15 * * * *" \
  --provider pi --repo "id:$REPO_ID" \
  --prompt "$(cat ~/.agentflow/SENTINEL.md 2>/dev/null || echo '你是 AgentFlow PR 哨兵：按 ~/.agentflow/sentinel-spec.md 执行')" \
  --json >/dev/null 2>&1 && echo "✅ PR 哨兵已部署（每 15 分钟）" || echo "⚠️ 哨兵部署失败，可稍后手动建"

cat <<'EOF'

🎉 完成！接下来：
  1. 打开 Orca → 你的仓库 → af-coordinator 的 pi 会话
  2. 发「需求：xxx」启动流水线
  3. 审批/进度/通过/打回 —— 都在聊天里说人话即可
EOF
