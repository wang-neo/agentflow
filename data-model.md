# 数据模型：产物实例 / 门决策 / 审批 / AI 判定 / 自动检查
# 实现：docs/agentflow/artifacts.jsonl（每行一个 JSON，追加写，审计友好）

# artifact_instances
# { "id": "...", "task_id": "...", "artifact_type": "tech_doc", "node": "S2",
#   "version": 2, "schema_version": 1, "content_ref": "docs/plans/plan-v2.md",
#   "hash": "sha256:...", "producer": "worker:<dispatch>", "config_version": 4,
#   "status": "produced|accepted|rejected", "created_at": "..." }

# gate_decisions
# { "id": "...", "task_id": "...", "artifact_id": "...", "mode": "auto|manual|ai_judge",
#   "config_version": 4, "decision": "accepted|rejected|needs_fix",
#   "confidence": 0.9, "reasons": [], "evidence": [], "decided_by": "judge|rule:<name>|human:<who>",
#   "decided_at": "...", "sla_due_at": null, "escalated": false,
#   "idempotency_key": "<artifact_hash>:<mode>:<config_version>" }

# approvals (manual only)
# { "task_id": "...", "gate": "...", "artifact_id": "...", "artifact_version": 2,
#   "decision": "approved|rejected", "operator": "@Neo", "channel": "chat",
#   "reason": "附言", "created_at": "..." }

# ai_judgments (ai_judge only)
# { "task_id": "...", "artifact_id": "...", "rubric_version": "...", "model": "pi",
#   "output_json": {...}, "confidence": 0.88, "latency_ms": 12345 }

# auto_checks (auto only)
# { "task_id": "...", "artifact_id": "...", "rule_set_version": "checks@1",
#   "results_json": { "unit_test": "pass 46/46", "build": "pass" } }

# 下游消费记录：workflow_state.json 中 consumed_artifact_version
