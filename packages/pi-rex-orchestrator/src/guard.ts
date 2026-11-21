/**
 * 内置写工具护栏：物理摘工具 + `tool_call` 硬拦截。
 *
 * 两层缺一不可——工具声明在请求前生成，`setActiveTools` 可能滞后一轮，`tool_call`
 * 钩子是运行态兜底。`bash` / `powershell` 也被硬拦：本协调者的 git 与探查全部走
 * 专用工具（内部经 `pi.exec`，不经模型的 bash），模型层面保留任何 shell 都是多余面。
 * 用户手动 `!` / `!!` 走 `user_bash`，不经过 `tool_call`，归属用户本人操作。
 *
 * 挂钩子于 Pi 的 `session_start` / `before_agent_start`，退出与 `session_shutdown`
 * 都要还原工具集，否则 `/reload` 之后 `edit` / `write` 会永久消失。
 */

export const READ_ONLY_BASE_TOOLS: readonly string[] = ['read', 'grep', 'find', 'ls']

/** 协调者模式下被硬拦的内置写工具。 */
export const BLOCKED_TOOL_NAMES: readonly string[] = ['write', 'edit', 'bash', 'powershell']

/** 工具调用拦截结果。 */
export interface GuardDecision {
  blocked: boolean
  reason?: string
}

export function guardToolCall(toolName: string, annotations?: { destructiveHint?: boolean }): GuardDecision {
  if (BLOCKED_TOOL_NAMES.includes(toolName)) {
    return {
      blocked: true,
      reason: `协调者不能使用内置写工具 ${toolName}。改仓库代码派 worker（rex_spawn_agent / rex_send_input），Rex 操作走 rex_cli。`
    }
  }
  if (toolName.startsWith('mcp__') && annotations?.destructiveHint === true) {
    return {
      blocked: true,
      reason: `MCP 工具 ${toolName} 声明了 destructiveHint：协调者模式下硬拦。需要其效果时经 ask_user 征得用户同意后由 worker 执行。`
    }
  }
  return { blocked: false }
}

/**
 * 交给 `pi.setActiveTools` 的白名单：只读基础工具 + 本扩展注册的全部工具名。
 * 调用方负责先保存原工具集（退出时恢复）。
 */
export function guardToolList(registeredTools: readonly string[]): string[] {
  const own = new Set(registeredTools)
  return [...READ_ONLY_BASE_TOOLS, ...own]
}
