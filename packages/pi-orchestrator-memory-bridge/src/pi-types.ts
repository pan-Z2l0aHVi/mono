/**
 * Pi 宿主的最小类型声明。
 *
 * 本包刻意不把 `@earendil-works/pi-coding-agent` 写进依赖：Pi 文档要求宿主提供的包只能
 * 出现在 `peerDependencies`，而它一旦进 `devDependencies` 就会把整个 provider 闭包拖进
 * 工作区（`@google/genai`、`protobufjs` 等）并需要改动根 `pnpm-workspace.yaml` 的
 * `allowBuilds`，那是仓库级共享配置变更。
 *
 * 运行时 Pi 通过虚拟模块映射供给真实实现，因此这里只需要声明桥接真正用到的那一小面。
 * 声明刻意保持宽松：宁可少写类型，也不假装拥有 Pi 的完整契约。
 */

/**
 * `pi.on()` 注册的事件处理器。
 *
 * `event` 用 `never` 收口，由实现内部断言具体形状：桥接只读极少数字段，写死 Pi 的完整
 * 事件类型会把每个钩子变成一次类型体操。`ctx` 用 Pi 的扩展上下文类型，因为钩子确实需要
 * `cwd`。
 */
export type PiEventHandler = (event: never, ctx: ExtensionContext) => unknown

/** 边界事件（`agent_before_settle`）的返回值形状。 */
export interface BoundaryEntry {
  type: 'custom_message'
  customType: string
  content: string
  display: boolean
}

export interface BoundaryResult {
  continue?: boolean
  entries?: BoundaryEntry[]
}

/** 工具执行结果。`isError` 在 Pi 里是显式字段，不是 throw。 */
export interface PiToolResult {
  content: Array<{ type: 'text'; text: string }>
  details?: unknown
  isError?: boolean
}

/** `pi.registerTool()` 接受的形状；`execute` 的 ctx 携带 `executeTool`。 */
export interface PiToolDefinition {
  name: string
  label: string
  description: string
  promptSnippet?: string
  promptGuidelines?: string[]
  exposure?: 'direct' | 'model-only' | 'codemode' | 'deferred' | 'hidden'
  parameters?: unknown
  executionMode?: 'sequential' | 'parallel'
  execute(
    toolCallId: string,
    params: never,
    signal: AbortSignal | undefined,
    onUpdate: unknown,
    ctx: never
  ): Promise<PiToolResult>
}

export interface PiCommandDefinition {
  description: string
  handler(args: string, ctx: never): Promise<void> | void
}

/**
 * 钩子上下文里桥接用到的字段。其余字段存在但不声明，避免与 Pi 的类型强耦合。
 *
 * 只有工具 `execute()` 拿到的 ctx 带 `executeTool`；`session_start`、`before_agent_start`、
 * `tool_result` 等事件钩子里它是 `undefined`。
 */
export interface ExtensionContext {
  cwd: string
  hasUI?: boolean
  ui?: {
    notify(message: string, type?: 'info' | 'warning' | 'error'): void
    /** 状态栏常驻一行；`undefined` 清除。非交互模式下可能缺失。 */
    setStatus?(key: string, text: string | undefined): void
  }
  executeTool?: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ isError?: boolean; content?: ReadonlyArray<{ type: string; text?: string }> }>
}

/** 扩展工厂收到的 API。 */
export interface ExtensionAPI {
  on(event: string, handler: PiEventHandler): () => void
  registerTool(tool: PiToolDefinition): void
  registerCommand(name: string, options: PiCommandDefinition): void
  /** 当前激活（对模型声明）的工具名。协调者模式用它摘掉 edit / write。 */
  getActiveTools(): string[]
  setActiveTools(toolNames: string[]): void
}
