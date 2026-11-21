/**
 * Pi 宿主的最小类型声明。
 *
 * 本包不把 `@earendil-works/pi-coding-agent` 写进任何依赖段
 * （进了 `devDependencies` 会拖入整个 provider 闭包并需要改根
 * `pnpm-workspace.yaml` 的 `allowBuilds`，那是仓库级共享配置变更）。运行时由 Pi 的 jiti
 * 直接加载 `src/index.ts`，宿主 API 经这里声明的形状消费。
 *
 * 声明对照真实宿主（`@earendil-works/pi-coding-agent@1.5.2` 的
 * `dist/core/extensions/types.d.ts`，2026-11-19 本机核对）只覆盖本包用到的面；
 * 宁可少写类型，也不假装拥有 Pi 的完整契约。
 */

/** `pi.exec()` 的执行结果；`code` 是退出码，`killed`/`truncated` 表示被宿主终止。 */
export interface PiExecResult {
  stdout: string
  stderr: string
  code: number
  killed: boolean
  truncated: boolean
}

export interface PiExecOptions {
  signal?: AbortSignal
  timeout?: number
  cwd?: string
  maxBuffer?: number
}

/** `before_agent_start` 里可变的结构化 prompt 选项；改 `sections`/`promptGuidelines` 而非覆盖整段。 */
export interface SystemPromptOptions {
  readonly systemPrompt: string
  /** XML 包裹的附加段，按 tag 名索引。 */
  sections: Record<string, string>
  /** 追加进默认 Guidelines 的条目。 */
  promptGuidelines: string[]
}

/** `before_agent_start` 事件。 */
export interface BeforeAgentStartEvent {
  type: 'before_agent_start'
  readonly systemPrompt: string
  systemPromptOptions: SystemPromptOptions
}

/** `session_start` 事件。 */
export interface SessionStartEvent {
  type: 'session_start'
  reason: 'startup' | 'reload' | 'new' | 'resume' | 'fork'
}

/** `context` 事件；返回 `{ messages }` 可以改写送入模型的 transcript。 */
export interface ContextEvent {
  type: 'context'
  messages: PiAgentMessage[]
}

/** transcript 里的消息最小面；`context` 折叠只读 role 与 content。 */
export interface PiAgentMessage {
  role: string
  content?: unknown
}

/** `tool_call` 事件；返回 `{ block: true, reason }` 拦截执行。 */
export interface ToolCallEvent {
  type: 'tool_call'
  toolName: string
  /** MCP 工具的注记；`destructiveHint` 为 true 时按高危拦截。 */
  annotations?: { destructiveHint?: boolean; readOnlyHint?: boolean }
  input: Record<string, unknown>
}

export interface ToolCallEventResult {
  block?: boolean
  reason?: string
}

/** 工具执行结果。`isError` 在 Pi 里是显式字段，不是 throw。 */
export interface PiToolResult {
  content: Array<{ type: 'text'; text: string }>
  details?: unknown
  isError?: boolean
}

/** `registerTool` 的定义；`parameters` 用普通 JSON Schema 字面量，Pi 不要求 typebox。 */
export interface PiToolDefinition {
  name: string
  label: string
  description: string
  promptSnippet?: string
  promptGuidelines?: string[]
  exposure?: 'direct' | 'model-only' | 'codemode' | 'deferred' | 'hidden'
  executionMode?: 'sequential' | 'parallel'
  parameters: Record<string, unknown>
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

/** `ctx.sessionManager` 的只读面；协调者用它取自身 session id。 */
export interface PiSessionManager {
  getSessionId(): string | undefined
}

/** 钩子上下文里本扩展用到的字段；其余字段存在但不声明，避免与 Pi 的类型强耦合。 */
export interface ExtensionContext {
  cwd: string
  /** 运行模式；非 `tui` 时弹窗能力受限。 */
  mode: 'tui' | 'rpc' | 'json' | 'print'
  /** 是否有弹窗能力的 UI。 */
  hasUI: boolean
  ui: {
    select(title: string, options: string[], opts?: { timeout?: number }): Promise<string | undefined>
    confirm(title: string, message: string, opts?: { timeout?: number }): Promise<boolean>
    notify(message: string, type?: 'info' | 'warning' | 'error'): void
  }
  sessionManager: PiSessionManager
}

/** 扩展工厂收到的 API。 */
export interface ExtensionAPI {
  on(event: string, handler: (event: never, ctx: ExtensionContext) => unknown): () => void
  registerTool(tool: PiToolDefinition): void
  registerCommand(name: string, options: PiCommandDefinition): void
  /** 执行外部命令；rex / git 子进程都经它。 */
  exec(command: string, args: string[], options?: PiExecOptions): Promise<PiExecResult>
  sendMessage(
    message: { customType: string; content: string; display: boolean; details?: unknown },
    options?: { triggerTurn?: boolean; deliverAs?: 'steer' | 'followUp' | 'nextTurn' }
  ): void
  getActiveTools(): string[]
  setActiveTools(toolNames: string[]): void
}
