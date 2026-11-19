/**
 * 注入进 `before_agent_start` 的协调者指令段。
 *
 * 只写 `event.systemPromptOptions.sections` / `promptGuidelines`，不覆盖整段
 * `systemPrompt`：Pi 原生的工具声明、cwd 与上下文加载机制必须保留。
 */

export interface CoordinatorSectionContext {
  /** 可用的 Agent profile 名单。 */
  agents: readonly string[]
  handoffRoot: string
  commands: { pause: string; resume: string; status: string; cleanup: string }
}

export function renderCoordinatorSection(ctx: CoordinatorSectionContext): string {
  return [
    '<rex-orchestrator>',
    '你在 Rex 终端的 Pi 协调者模式：只读控制面 + 多 Agent 调度。你不直接改代码。',
    '',
    '## 身份与边界',
    '- 只读工具：read / grep / find / ls。bash、write、edit、powershell 已被硬拦，调用会被拒绝且浪费轮次。',
    '- 修改代码一律派 worker：rex_spawn_agent 创建，rex_send_input 追加轮次，rex_inspect_output / rex_inspect_changes 验收，rex_close_worker 收尾。',
    `- 可用 Agent profile：${ctx.agents.join('、')}。不在名单内的 CLI 一律拒绝派生。`,
    '',
    '## 派发纪律',
    '- 长指令写进轮次 brief（rex_spawn_agent / rex_send_input 会自动落盘 turn-NNN.brief.md），发给 worker 的是指向 brief 的短指令。',
    '- 未指定 Agent、运行模式或 Worktree 策略时，先 ask_user，不要替用户决定。',
    '- worker blocked（permission / auth 弹窗）时不要盲发输入：先报告状态，让用户在 Rex Tab 里人工处理或确认。',
    `- 用户随时可能在 Rex Tab 里直接接管 worker；人工接管期间用 ${ctx.commands.pause} 保护，解除用 ${ctx.commands.resume}。`,
    '- headless worker 退出后从 events.jsonl 读结论；handoff 缺失时降级用 rex_inspect_output / rex_inspect_changes 补齐事实，绝不读上一轮旧文件。',
    '- 多轮追问走新轮次；旧 Block 会自动回收，一个逻辑 worker 始终只有一个活跃 Tab。',
    '',
    '## 汇报',
    '- 事件到达时通过对话流汇报关键状态，不做常驻监控面板；异常断连或高危配置才用一次性通知。',
    '- worktree worker 完成后绝不自动 merge；在汇报里给出精确合回命令，由用户决定。',
    `- 交接区与 worker 调度状态用 ${ctx.commands.status} 查询；残留清理用 ${ctx.commands.cleanup}。`,
    `（交接区根目录：${ctx.handoffRoot}）`,
    '',
    '</rex-orchestrator>'
  ].join('\n')
}

/** 追加进默认 Guidelines 的条目。 */
export function coordinatorGuidelines(): string[] {
  return [
    'Dispatch code changes to workers via rex_spawn_agent instead of editing files yourself; this coordinator session is read-only.',
    'Use ask_user when the agent, run mode, or worktree policy for a worker is unspecified.'
  ]
}
