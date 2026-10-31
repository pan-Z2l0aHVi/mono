/**
 * 协调者模式（shepherd mode）。
 *
 * 编排层需要一个**显式**的模式开关，而不是靠 lead 自己判断「这件事该不该编排」。原因很实际：
 * 不切换模式时，lead 说「修 issue #123」会自己埋头改代码，`herdr_plan`/`herdr_dispatch`
 * 永远不被调用——整套编排设施等于闲置。
 *
 * `/shepherd` 开启后做两件事，缺一不可：
 *
 * 1. **物理约束**：把 `edit` / `write` 从激活工具集里摘掉。模型根本无法调用，比在指令里
 *    写「请不要改代码」可靠得多。
 * 2. **指令约束**：注入 `<shepherd-mode>` 段，说清允许什么、流程是什么。工具被摘掉之后
 *    模型需要知道该改用什么手段完成工作，否则会卡住或乱试。
 *
 * `bash` 不摘：协调者需要 `git status`、`gh pr view`、读文件、跑只读检查。但 `bash` 也能写
 * 文件——这是本模式的已知漏洞，靠指令约束。摘掉 `bash` 会让协调者完全没法工作，取舍不划算。
 */

/** 协调者模式下被物理移除的工具。 */
export const BLOCKED_TOOLS: readonly string[] = ['edit', 'write']

/** 模式状态。`previousTools` 用于退出时恢复。 */
export interface ShepherdState {
  active: boolean
  /** 开启前处于激活状态的工具名；退出时据此恢复。 */
  previousTools?: readonly string[]
}

/** 判断一个工具在协调者模式下是否应被拒绝。 */
export function isBlockedInShepherd(toolName: string): boolean {
  return BLOCKED_TOOLS.includes(toolName)
}

/** 从工具集里摘掉被禁的项，保持其余顺序不变。 */
export function withoutBlockedTools(tools: readonly string[]): string[] {
  return tools.filter(name => !isBlockedInShepherd(name))
}

export interface ShepherdContext {
  readonly repoKey: string
  readonly root: string
}

/**
 * 注入的指令段。
 *
 * 内容与 `BLOCKED_TOOLS` 保持一致：这里说「edit/write 已移除」，代码里就真的移除。指令与
 * 实现不同步会让模型反复尝试被拒的工具。
 */
export function renderShepherdInstructions(context: ShepherdContext): string {
  return [
    '<shepherd-mode>',
    `你在协调者模式。仓库：${context.repoKey}（${context.root}）。`,
    '本会话只做编排，不写代码。',
    '',
    '## 允许',
    '- 调研：read / grep / find / ls，以及 bash 的只读命令。范围大的调查用 herdr_dispatch（role: explorer）派一个 worker。',
    '- 拆任务与派任务：herdr_plan → 等用户批准 → herdr_dispatch。',
    '- 监督：herdr_watch 跟到 worker 的 DONE / BLOCKED。',
    '- 验收：herdr_review，请一个此前没参与该 slice 的独立 reviewer。',
    '- 记忆：开工前先 orchestration_memory_recall 读本仓库此前的决定与被拒原因；关键决定用 orchestration_memory_save 固化。',
    '- 看板：task_board（看进度与状态）。',
    '- 与用户对话：ask_user。',
    '',
    '## 禁止',
    '- 直接改仓库文件。edit 与 write 已从工具集移除，调用会被拒绝。',
    '- 用 bash 写文件、改配置、提交或推送代码（git commit / git push / git checkout -- 之类）。bash 只用于只读探查与状态查询。',
    '- 自己"顺手"把 slice 做掉。发现该做的事就写进计划或 closing note，不要自己实施。',
    '',
    '## 流程',
    '1. orchestration_memory_recall，确认这个仓库此前批过什么、拒过什么。',
    '2. 需要时先做只读调研，再用 herdr_plan 把目标拆成 slice（每个 slice 一个 worker）。',
    '3. 用户批准后逐个 herdr_dispatch，一个 slice 一个 worker，不要并行派多个。',
    '4. herdr_watch 跟到 DONE；blocked 就处理或问用户。',
    '5. slice 完成后 herdr_review 让独立 reviewer 验收；REJECT / RE_PLAN 就重新拆。',
    '6. 全部收尾后汇总结果向用户报告，并确认看板反映真实状态。',
    '',
    '</shepherd-mode>'
  ].join('\n')
}

/** 拒绝工具调用时给模型的原因。要指明出路，否则它会反复重试同一个工具。 */
export function blockedReason(toolName: string): string {
  return [
    `协调者模式下不能使用 ${toolName}：本会话不直接改代码。`,
    '把这项工作拆成 slice，用 herdr_plan + herdr_dispatch 派给 worker；',
    '或者如果它只是本轮的一小步，写进计划由 worker 一并完成。'
  ].join('')
}
