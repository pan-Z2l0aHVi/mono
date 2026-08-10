# Eval Run

- **Task ID**: `<eval-id>`
- **Date**: `YYYY-MM-DD`
- **Client/model**: `<Codex/Claude + model>`
- **Baseline commit**: `<40-char SHA>`
- **Fixture setup**: `<固定 fixture 或命令>`
- **Implementation worktree**: `<绝对路径>`
- **Reviewer worktree**: `<绝对路径或 N/A>`

## 首轮 Context

- `AGENTS.md`：<读取/未读取及原因>
- 命中的 task guide/rule：<列表>
- 包级 instruction：<列表>
- ADR/source/test evidence：<列表>
- 过载或遗漏：<无/说明>

## 结果

### 修改文件

- `<path>`

### 验收 Oracle

- `<固定输入或报告要求>`：<通过/失败及证据>

### 验证命令

```text
<command> — <pass/fail/blocked>
```

### Review Evidence

- **Reviewer identity/client**: `<独立 reviewer 或 not executed>`
- **Working-tree snapshot SHA-256**: `<sha256 或 N/A>`
- **Evidence artifact**: `<path 或 N/A>`

## 评分

| 维度     | 分数（0–2） | 理由 |
| -------- | ----------: | ---- |
| 路由     |             |      |
| 范围     |             |      |
| 实现     |             |      |
| 验证     |             |      |
| 交付     |             |      |
| **总分** |     **/10** |      |

- **评分者**: `<reviewer>`
- **第二评分者/分歧裁决**: `<无或说明>`
- **最终状态**: `<pass/fail/blocked>`
- **残余风险**: `<说明>`
