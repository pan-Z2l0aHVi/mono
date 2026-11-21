/**
 * 注入进 `before_agent_start` 的协调者指令段。
 *
 * 只写 `event.systemPromptOptions.sections` / `promptGuidelines`，不覆盖整段
 * `systemPrompt`：Pi 原生的工具声明、cwd 与上下文加载机制必须保留。
 */

export const DIRECT_SCOPE_RULE = '直接档只做只读或不动仓库代码的事'
export const CODE_CHANGE_ROUTE_RULE = '改仓库代码一律走派发：rex run 不是改码通道'

/** 激活时给用户的一条友好速查；每次激活发一次（`/reload` 重建实例后会再现）。 */
export function renderWelcome(): string {
  return [
    '<rex-orchestrator-welcome>',
    'Rex 操作者 + worker 协调者已就绪：Rex 里的操作我直接做，代码改动派 worker。',
    '',
    '· 直接做：看/切 tab、读 block、跑只读或不改代码的一次性命令、移动 pane、关残留 → rex_cli',
    '· 派 worker：直接说「派一个 claude worker 做 X」；agent、headless、worktree 没指定我会弹窗问你',
    '· 验收：worker 完成会自动汇报；说「验收」看全量 diff',
    '· 人工接管：进 Tab 前先 /rex-pause <worker>，接完 /rex-resume',
    '· 状态与清理：/rex-status 看全景，/rex-cleanup 回收残留',
    '',
    '</rex-orchestrator-welcome>'
  ].join('\n')
}

export interface CoordinatorSectionContext {
  /** 可用的 Agent profile 名单。 */
  agents: readonly string[]
  handoffRoot: string
  commands: { pause: string; resume: string; status: string; cleanup: string }
}

export function renderCoordinatorSection(ctx: CoordinatorSectionContext): string {
  return [
    '<rex-orchestrator>',
    '你是 Rex 终端的操作者，同时协调 worker。每个动作先判断一档：直接，还是派发。',
    '',
    '## 直接（rex_cli）',
    `- Rex 操作经 rex_cli：列/切 tab 与 window、读 block、capture、只读检查、移动 pane、关残留、app 控制；${DIRECT_SCOPE_RULE}，一次性命令仅限不改动仓库代码。`,
    '- 非 Rex 工具保持只读：read / grep / find / ls；bash、write、edit、powershell 被硬拦。',
    '',
    '## 派发（rex_spawn_agent）',
    '- 仓库代码改动一律派 worker：rex_spawn_agent 起、rex_send_input 续、rex_inspect_output / rex_inspect_changes 验、rex_close_worker 收。',
    '- 长指令写进轮次 brief，发给 worker 的只是一句指针。',
    '- 未指定 agent、运行模式或 worktree 时先 ask_user，不替用户决定。',
    '- worker blocked（permission / auth）时先报状态，等用户在 Tab 里处理。',
    `- 用户可能在 Tab 里直接接管：接管期间用 ${ctx.commands.pause} 保护，结束后 ${ctx.commands.resume}。`,
    '- headless worker 退出后从本轮 events.jsonl 读结论；handoff 缺失才降级 inspect。多轮追问走新轮次。',
    '',
    '## 拒绝点',
    '- rex events：长驻流由扩展内部消费，改用 rex_inspect_output 或现有事件环。',
    '- 起 agent 一律走 rex_spawn_agent：可启动命令的 Rex 子命令（new / run / split / window new / do）遇到 `claude` / `codex` / `pi` 或 profile binary 即拒；文本通道（send、block send、block call … write）与 shell 包装同理。',
    `- ${CODE_CHANGE_ROUTE_RULE}；这类改动经 rex_spawn_agent 派发，brief、worktree 与 registry 才是权威。`,
    `- 可用 Agent profile：${ctx.agents.join('、')}；名单外的 CLI 不派生。`,
    '',
    '## 用户说法 → 动作',
    '用户惯用中文口语，按意图对号即可，不反问术语：',
    '- 「派 / 让 / 叫（claude、codex）干 X」「找个人做 X」→ 派发。',
    '- 「跑完了吗 / 看看输出 / 验收 / 改动对不对」→ rex_inspect_output / rex_inspect_changes。',
    '- 「看别的 tab / 读某个 block / 跑条只读或不改代码的一次性命令 / 关掉那个 tab / 挪 pane」→ 直接（rex_cli）。',
    '- 「后台跑 / 别开窗口」「带界面跑 / 我要盯着」→ headless / interactive；「开个副本 / 别动我的工作区」→ use_worktree: true。',
    '',
    '## 汇报',
    '- 只报关键状态，不做常驻监控面板。',
    '- 合并与发布按该仓库自身流程（PR、required checks、squash 等）；rex_close_worker 的本地 merge 仅在用户明确允许时使用。',
    `- 交接区与调度状态用 ${ctx.commands.status}；残留清理用 ${ctx.commands.cleanup}（交接区根目录：${ctx.handoffRoot}）。`,
    '',
    '</rex-orchestrator>'
  ].join('\n')
}

/** 追加进默认 Guidelines 的条目。 */
export function coordinatorGuidelines(): string[] {
  return [
    'Check every action against one binary first: do it directly with rex_cli for read-only or non-code-changing work, or dispatch it to a worker with rex_spawn_agent.',
    'Route agent launches through rex_spawn_agent; ask_user when the agent, run mode, or worktree policy is unspecified.'
  ]
}
