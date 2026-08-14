# Agent 任务状态

本指南定义可持久化的**任务级状态**接口。它解决长任务、重试或交接时“上一轮已读取什么、验证了什么、还剩什么风险”的恢复问题；它不是新的常驻 context，也不替代 `AGENTS.md`、`CONTEXT.md`、ADR、源码或测试。

## 边界

- 长期工程决策仍写入 `CONTEXT.md` 或 ADR；不要把临时执行日志复制到长期文档。
- `.agent-state/` 默认被 Git 忽略，仅保存当前 workspace 的短期 task receipt；其中内容不是当前行为的权威来源。
- 只有在任务跨会话、需要交接、验证失败、或用户要求留下执行状态时才写入。一次性的局部任务不应为了“有记忆”而增加文件和 context。
- 状态文件不保存密钥、token、用户数据、完整 prompt、完整 tool trace 或大段日志。必要时只保存可重新定位的命令、路径和风险摘要。

## 命令

在仓库根目录执行：

```bash
pnpm agent:state -- write --task C03-web-ui-event --input /tmp/task-receipt.json
pnpm agent:state -- read --task C03-web-ui-event
pnpm agent:state -- list
```

`write` 会将状态写入 `.agent-state/tasks/<task-id>.json`。task id 只能使用字母、数字、`.`、`_` 和 `-`，避免把路径语义带入状态目录。

## 输入格式

```json
{
  "status": "in_progress",
  "summary": "已定位 web-ui event 类型边界，尚未修改实现。",
  "contextFiles": [
    "AGENTS.md",
    "packages/web-ui/AGENTS.md",
    "docs/agents/web-ui.md",
    "docs/adr/0011-framework-type-adaptation-narrowing.md"
  ],
  "changedPaths": ["packages/web-ui/src/types/react.ts"],
  "verification": [
    {
      "command": "pnpm --filter @greypan/web-ui test src/types",
      "status": "not_run",
      "note": "等待实现完成后执行"
    }
  ],
  "risks": ["需要确认 React/Vue type fixtures 的消费者影响。"]
}
```

- `status`：`in_progress`、`blocked` 或 `completed`。
- `summary`：必须是简短、可行动的当前结论，不写逐步思维过程。
- `contextFiles`：本任务实际读取的最小 context，不把“可能有用”的文件加入。
- `changedPaths`：已修改或计划继续检查的源码/配置路径。
- `verification`：每项必须标为 `passed`、`failed` 或 `not_run`；不能把未执行写成通过。
- `risks`：尚未验证的行为、环境阻塞或需要用户决策的事项。

## 交接与清理

恢复任务时先读取对应状态，再以当前 `git status`、源码、manifest、测试和配置核对；state receipt 只能帮助定位，不能覆盖当前事实。任务完成后可保留短期 receipt 供审计，也可删除本地 `.agent-state/`；不要提交它。
