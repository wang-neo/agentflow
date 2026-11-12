# Rubric: PR 评论分类（S9 comment_classification）

对每条新 review comment 独立分类。

## 分类定义

- **must_fix**：正确性问题（bug/安全/数据丢失/兼容性破坏/验收标准未满足）。必须修改代码。
- **optional**：改进建议（性能优化/可读性/更优实现）。修不修由协调者按最小性原则决定，默认只在低成本时采纳。
- **no_fix**：风格偏好/与方案已批准决策冲突/超出本期范围。不修改，回复说明理由。
- **needs_clarification**：语义不明或与代码事实矛盾。回复提问，不改代码。

## 判定依据

1. comment 与验收标准/已批准 tech_doc 的关系
2. comment 指出的问题在 diff 中是否真实存在（引用 file:line 验证）
3. 修改成本 vs 收益（最小性原则）

## 输出格式

```json
{
  "decision": "pass | fail",
  "confidence": 0.0,
  "classifications": [
    { "comment_id": "...", "category": "must_fix|optional|no_fix|needs_clarification",
      "reason": "一句话依据", "evidence": "file:line 或 tech_doc 条目" }
  ],
  "reasons": [], "evidence": [], "required_actions": []
}
```

## 规则

- threshold 0.80；判定 pass 且全部 comment 有分类 → accepted
- must_fix 存在不是 fail（分类正确即 pass；修复在 S10 执行）
