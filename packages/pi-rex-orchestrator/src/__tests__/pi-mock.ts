/**
 * `ExtensionAPI` 的最小 mock。
 *
 * 只记录本扩展真正用到的面：钩子、工具、命令、消息与工具集。`emit()` 手动触发事件，
 * 不需要真跑 Pi 与 rex。
 */

import type { BridgePi } from '../orchestrator'
import type { ExtensionContext, PiToolDefinition } from '../pi-types'

export interface MockContext extends ExtensionContext {
  confirmations: Array<{ title: string; message: string }>
  selects: Array<{ title: string; options: string[] }>
  /** ctx.ui.notify 的记录；/rex-cleanup 等命令路径的断言用。 */
  notifies: Array<{ message: string; type?: string }>
}

export interface ToolRecord {
  definition: Record<string, unknown>
  execute(...args: unknown[]): Promise<unknown>
}

export interface MockPi {
  readonly pi: BridgePi
  readonly events: Map<string, Array<(event: never, ctx: ExtensionContext) => unknown>>
  readonly tools: Map<string, ToolRecord>
  readonly commands: Map<string, { description: string; handler(args: string, ctx: unknown): Promise<void> | void }>
  readonly messages: Array<{ content: string; options?: Record<string, unknown> }>
  readonly execCalls: Array<{ command: string; args: string[]; options?: Record<string, unknown> }>
  readonly ctx: MockContext
  activeTools: string[]
  emit(event: string, payload: unknown): unknown
  emitWith(event: string, payload: unknown, ctx: ExtensionContext): Promise<unknown>
}

export interface MockExecResult {
  stdout: string
  stderr: string
  code: number
  killed: boolean
  truncated: boolean
}

export function createMockPi(
  execImpl?: (command: string, args: string[], options?: Record<string, unknown>) => Promise<MockExecResult>,
  uiOverrides: Partial<Pick<MockContext, 'hasUI'>> = {}
): MockPi {
  const events = new Map<string, Array<(event: never, ctx: ExtensionContext) => unknown>>()
  const tools = new Map<string, ToolRecord>()
  const commands = new Map<string, { description: string; handler(args: string, ctx: unknown): Promise<void> | void }>()
  const messages: Array<{ content: string; options?: Record<string, unknown> }> = []
  const execCalls: Array<{ command: string; args: string[]; options?: Record<string, unknown> }> = []
  const confirmations: Array<{ title: string; message: string }> = []
  const selects: Array<{ title: string; options: string[] }> = []
  const notifies: Array<{ message: string; type?: string }> = []
  let activeTools: string[] = ['read', 'grep', 'find', 'ls', 'bash', 'edit', 'write']

  const ctx: MockContext = {
    cwd: '/repo',
    mode: 'tui',
    hasUI: uiOverrides.hasUI ?? true,
    ui: {
      confirm: async (title: string, message: string) => {
        confirmations.push({ title, message })
        return true
      },
      select: async (title: string, options: string[]) => {
        selects.push({ title, options })
        return options[0]
      },
      notify: (message: string, type?: 'info' | 'warning' | 'error') => {
        notifies.push({ message, type })
      }
    },
    sessionManager: { getSessionId: () => 'session-mock-0001' },
    confirmations,
    selects,
    notifies
  }

  const pi: BridgePi = {
    on: (event, handler) => {
      const list = events.get(event) ?? []
      list.push(handler)
      events.set(event, list)
      return () => {
        const current = events.get(event)
        const index = current?.indexOf(handler) ?? -1
        if (current !== undefined && index !== -1) current.splice(index, 1)
      }
    },
    registerTool: (tool: PiToolDefinition) => {
      tools.set(tool.name, {
        definition: tool as unknown as Record<string, unknown>,
        execute: (...args: unknown[]) => (tool.execute as (...a: unknown[]) => Promise<unknown>)(...args)
      })
    },
    registerCommand: (name, options) => {
      commands.set(name, options as { description: string; handler(args: string, ctx: unknown): Promise<void> | void })
    },
    exec: async (command: string, args: string[], options?: Record<string, unknown>) => {
      execCalls.push({ command, args, options })
      if (execImpl) return execImpl(command, args, options)
      return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
    },
    sendMessage: (message, options) => {
      messages.push({ content: String(message.content), options: options as Record<string, unknown> })
    },
    getActiveTools: () => [...activeTools],
    setActiveTools: (names: string[]) => {
      activeTools = [...names]
    }
  }

  return {
    pi,
    events,
    tools,
    commands,
    messages,
    execCalls,
    ctx,
    get activeTools() {
      return [...activeTools]
    },
    set activeTools(value: string[]) {
      activeTools = [...value]
    },
    emit(event: string, payload: unknown): unknown {
      let result: unknown
      for (const handler of events.get(event) ?? []) {
        const value = handler(payload as never, ctx)
        if (result === undefined && value !== undefined) result = value
      }
      return result
    },
    emitWith(event: string, payload: unknown, ctxArg: ExtensionContext): Promise<unknown> {
      let result: unknown
      let done = Promise.resolve()
      for (const handler of events.get(event) ?? []) {
        const value = handler(payload as never, ctxArg)
        if (result === undefined && value !== undefined) result = value
        if (value instanceof Promise) done = value
      }
      return done.then(() => result)
    }
  }
}
