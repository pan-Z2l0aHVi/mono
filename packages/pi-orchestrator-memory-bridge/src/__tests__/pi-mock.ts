/**
 * `ExtensionAPI` 的最小 mock。
 *
 * 只在桥接真正用到的那三件事上做记录：注册了哪些钩子、哪些工具、哪些命令。测试通过
 * `emit()` 手动触发事件，因此不需要真跑 Pi，也不需要 `herdr`。
 *
 * 刻意不引入 `test-kit`：那是给 msw / Playwright 用的浏览器基建，与这里的 Node 侧钩子
 * 装配无关，复用只会把浏览器依赖拖进本包。
 */

import type { PiCommandDefinition, PiEventHandler, PiToolDefinition, PiToolResult } from '../pi-types'

/** 钩子处理器收到的 ctx；测试按需构造。 */
export interface MockContext {
  cwd: string
  hasUI?: boolean
  ui?: {
    notify(message: string, type?: 'info' | 'warning' | 'error'): void
    setStatus?(key: string, text: string | undefined): void
  }
  executeTool?: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ isError?: boolean; content?: ReadonlyArray<{ type: string; text?: string }> }>
  /** Pi 的只读会话视图；`session_start` 用它重放 transcript 里的工具声明。 */
  sessionManager?: {
    getBranch(): unknown
  }
}

export interface MockPi {
  /** 全部已注册事件名，按注册顺序。 */
  readonly events: string[]
  /** 当前激活的工具集；`/shepherd` 会改写它。 */
  activeTools: string[]
  /** 按事件名取处理器列表。 */
  handlers(event: string): ReadonlyArray<PiEventHandler>
  /** 已注册的工具，按名字索引。 */
  readonly tools: Map<string, PiToolDefinition>
  /** 已注册的命令，按名字索引。 */
  readonly commands: Map<string, PiCommandDefinition>
  /** 收到的 notify 消息；没有 UI 时为空。 */
  readonly notifications: string[]
  /** 收到的 setStatus 调用序列（key → text）；用于验证状态栏。 */
  readonly statuses: Array<{ key: string; text: string | undefined }>
  /** 触发一个事件，返回所有处理器结果里第一个非 undefined 的。 */
  emit(event: string, payload: unknown, ctx: MockContext): Promise<unknown>
}

export function createMockPi(initialActiveTools: string[] = []): MockPi & {
  on(event: string, handler: PiEventHandler): () => void
  registerTool(tool: PiToolDefinition): void
  registerCommand(name: string, options: PiCommandDefinition): void
  getActiveTools(): string[]
  setActiveTools(toolNames: string[]): void
} {
  const registry = new Map<string, PiEventHandler[]>()
  const tools = new Map<string, PiToolDefinition>()
  const commands = new Map<string, PiCommandDefinition>()
  const notifications: string[] = []
  const statuses: Array<{ key: string; text: string | undefined }> = []

  return {
    events: [],
    notifications,
    statuses,
    tools,
    commands,
    activeTools: [...initialActiveTools],
    handlers(event) {
      return registry.get(event) ?? []
    },
    on(event, handler) {
      if (!registry.has(event)) {
        registry.set(event, [])
        this.events.push(event)
      }
      registry.get(event)?.push(handler)
      return () => {
        const list = registry.get(event)
        if (!list) return
        const index = list.indexOf(handler)
        if (index >= 0) list.splice(index, 1)
      }
    },
    registerTool(tool) {
      tools.set(tool.name, tool)
    },
    registerCommand(name, options) {
      commands.set(name, options)
    },
    getActiveTools() {
      return [...this.activeTools]
    },
    setActiveTools(toolNames) {
      this.activeTools = [...toolNames]
    },
    async emit(event, payload, ctx) {
      const withNotify: MockContext = {
        ...ctx,
        ui: {
          notify(message) {
            notifications.push(message)
          },
          setStatus(key, text) {
            statuses.push({ key, text })
          }
        }
      }
      let first: unknown
      for (const handler of registry.get(event) ?? []) {
        const result = await handler(payload as never, withNotify as never)
        if (first === undefined && result !== undefined) first = result
      }
      return first
    }
  }
}

/**
 * 构造一个只支持指定工具的 `executeTool`。
 *
 * `calls` 记录每次调用的名字与参数，用于断言「桥接真的只通过 pi-memory 的工具读写字存」。
 */
export function createExecuteTool(options: {
  readonly results: Record<string, PiToolResult | ((args: Record<string, unknown>) => PiToolResult)>
  readonly calls?: Array<{ name: string; args: Record<string, unknown> }>
}): MockContext['executeTool'] {
  return async (name, args) => {
    options.calls?.push({ name, args })
    const entry = options.results[name]
    if (!entry) {
      return { isError: true, content: [{ type: 'text', text: `unknown tool: ${name}` }] }
    }
    const result = typeof entry === 'function' ? entry(args) : entry
    return { isError: result.isError === true, content: result.content }
  }
}
