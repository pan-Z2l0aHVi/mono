/**
 * 装配层：激活后注册面、护栏、prompt 注入、事件分发与验收折叠。
 *
 * rex 适配全部用 stub，不经真实 CLI；git 命令用 execImpl 的假返回。守的是装配
 * 时序契约，不是 rex 行为（rex 行为由 rex-events / rex-adapter 的专项测试守）。
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { HandoffStore } from '../handoff-store'
import { createOrchestrator } from '../orchestrator'
import { resolveProfiles } from '../profiles'
import type { RexAdapter } from '../rex-adapter'
import { WorkerRegistry } from '../state-machine'

import { createMockPi, type MockPi } from './pi-mock'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

interface AdapterStub {
  runBlocks: Array<{ cwd: string; label: string; keepOpen: boolean; focus: boolean; commandSegments: string[] }>
  sends: Array<{ blockId: string; text: string }>
  keys: Array<{ blockId: string; key: string }>
  captures: string[]
  closedBlocks: string[]
  onLine: ((line: string) => void) | undefined
  listBlocks: string[]
  blockStatuses: Map<string, Array<{ id: string; record: { state: string; kind?: string } }>>
}

function makeAdapterStub(): { adapter: RexAdapter; stub: AdapterStub } {
  const stub: AdapterStub = {
    runBlocks: [],
    sends: [],
    keys: [],
    captures: [],
    closedBlocks: [],
    onLine: undefined,
    listBlocks: ['block:A'],
    blockStatuses: new Map()
  }
  const adapter = {
    runBlock: async (options: {
      cwd: string
      label: string
      keepOpen: boolean
      focus: boolean
      commandSegments: string[]
    }) => {
      stub.runBlocks.push(options)
      return { windowId: 'window:w1', blockIds: [`block:${stub.runBlocks.length}`] }
    },
    send: async (blockId: string, text: string) => {
      stub.sends.push({ blockId, text })
    },
    sendKey: async (blockId: string, key: string) => {
      stub.keys.push({ blockId, key })
    },
    capture: async (blockId: string, tailLines?: number) => {
      void blockId
      const text = stub.captures.join('\n') || 'empty screen'
      return tailLines === undefined ? text : text.split('\n').slice(-tailLines).join('\n')
    },
    blockList: async () =>
      stub.listBlocks.map(blockId => ({
        blockId,
        label: blockId,
        flavor: 'com.superlogical.terminal.shell',
        windowId: 'window:w1',
        placement: 'placed'
      })),
    blockCallProgramStatus: async (blockId: string) => stub.blockStatuses.get(blockId) ?? [],
    blockClose: async (blockId: string) => {
      stub.closedBlocks.push(blockId)
    },
    startEventsStream: (handlers: { onLine(line: string): void; onExit(error: Error | undefined): void }) => {
      stub.onLine = handlers.onLine
      return { kill: () => undefined }
    }
  } as unknown as { adapter: RexAdapter; stub: AdapterStub }
  return { adapter: adapter as unknown as RexAdapter, stub }
}

function fakeGit(): (
  command: string,
  args: string[],
  options?: Record<string, unknown>
) => Promise<{ stdout: string; stderr: string; code: number; killed: boolean; truncated: boolean }> {
  return async (command, args) => {
    if (command === 'git' && args[0] === 'rev-parse')
      return { stdout: 'b'.repeat(40), stderr: '', code: 0, killed: false, truncated: false }
    if (command === 'git' && args[0] === 'status')
      return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
    if (command === '/usr/bin/which')
      return { stdout: '/opt/homebrew/bin/claude\n', stderr: '', code: 0, killed: false, truncated: false }
    return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
  }
}

function makeOrchestrator(): { mock: MockPi; stub: AdapterStub; registry: WorkerRegistry; dispose(): void } {
  const mock = createMockPi(fakeGit())
  const { adapter, stub } = makeAdapterStub()
  const registry = new WorkerRegistry(() => 0)
  const orchestrator = createOrchestrator(mock.pi, {
    adapter,
    registry,
    profiles: resolveProfiles(undefined),
    createStore: sessionId => new HandoffStore({ root: roots[roots.length - 1] ?? '', sessionId }),
    runHeadlessPath: '/ext/scripts/run-headless.mjs',
    nodePath: '/usr/local/bin/node',
    // ACK 诊断路径用真实短窗口验证；产品语义里的 5 秒是 deps 缺省值。
    ackTimeoutMs: 100
  })
  return { mock, stub, registry, dispose: () => orchestrator.dispose() }
}

/** 先建临时交接区再跑用例；`it` 的第二参必须是函数，返回 Promise 会被当成 todo。 */
function withTempRoot<T>(fn: () => Promise<T>): () => Promise<T> {
  return async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pi-rex-orch-spec-'))
    roots.push(root)
    return fn()
  }
}

describe('装配面', () => {
  it(
    '激活后注册 7 个工具与 4 个命令',
    withTempRoot(async () => {
      const { mock } = makeOrchestrator()
      expect([...mock.tools.keys()].sort()).toEqual([
        'ask_user',
        'rex_close_worker',
        'rex_inspect_changes',
        'rex_inspect_output',
        'rex_list_workers',
        'rex_send_input',
        'rex_spawn_agent'
      ])
      expect([...mock.commands.keys()].sort()).toEqual(['rex-cleanup', 'rex-pause', 'rex-resume', 'rex-status'])
    })
  )

  it(
    'session_start 挂只读白名单，shutdown 还原',
    withTempRoot(async () => {
      const { mock, dispose } = makeOrchestrator()
      const before = mock.activeTools
      mock.emit('session_start', { reason: 'startup' })
      expect(mock.activeTools.sort()).toEqual(
        [
          'ask_user',
          'rex_spawn_agent',
          'rex_list_workers',
          'rex_send_input',
          'rex_inspect_output',
          'rex_inspect_changes',
          'rex_close_worker',
          'read',
          'grep',
          'find',
          'ls'
        ].sort()
      )
      mock.emit('session_shutdown', { reason: 'quit' })
      expect(mock.activeTools).toEqual(before)
      dispose()
    })
  )

  it(
    'before_agent_start 注入 sections 与 guidelines，不覆盖整段 prompt',
    withTempRoot(async () => {
      const { mock } = makeOrchestrator()
      const options = {
        sections: {} as Record<string, string>,
        promptGuidelines: [] as string[],
        systemPrompt: 'original'
      }
      mock.emit('before_agent_start', { systemPromptOptions: options })
      expect(options.sections['rex-orchestrator']).toContain('<rex-orchestrator>')
      expect(options.sections['rex-orchestrator']).toContain('claude、codex')
      expect(options.promptGuidelines.join('\n')).toContain('rex_spawn_agent')
      expect(options.systemPrompt).toBe('original')
    })
  )

  it(
    'tool_call 硬拦 bash / edit 与 destructiveHint MCP 工具，放行 read',
    withTempRoot(async () => {
      const { mock } = makeOrchestrator()
      const bash = mock.emit('tool_call', { toolName: 'bash', input: {} }) as { block: boolean; reason: string }
      expect(bash.block).toBe(true)
      expect(bash.reason).toContain('bash')
      expect((mock.emit('tool_call', { toolName: 'edit', input: {} }) as { block: boolean }).block).toBe(true)
      expect(
        (
          mock.emit('tool_call', { toolName: 'mcp__x__y', annotations: { destructiveHint: true }, input: {} }) as {
            block: boolean
          }
        ).block
      ).toBe(true)
      expect(mock.emit('tool_call', { toolName: 'read', input: {} })).toBeUndefined()
    })
  )
})

describe('spawn 与投递', () => {
  it(
    'spawn headless：brief 落盘、防递归前缀、registry 登记',
    withTempRoot(async () => {
      const { mock, stub, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })

      const result = (await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', mode: 'headless' }, undefined, undefined, mock.ctx)) as {
        content: Array<{ text: string }>
      }
      const text = result.content[0]?.text ?? ''
      expect(text).toContain('claude-')
      expect(stub.runBlocks).toHaveLength(1)
      const run = stub.runBlocks[0]
      expect(run.keepOpen).toBe(true)
      expect(run.commandSegments[0]).toBe('/usr/bin/env')
      expect(run.commandSegments[1]).toBe('PI_REX_ORCH=0')
      expect(run.commandSegments.slice(2)).toContain('stream-json')
      expect(registry.list()).toHaveLength(1)
      expect(registry.list()[0]?.mode).toBe('headless')
      expect(registry.list()[0]?.baseCommit).toMatch(/^b{40}$/)
      dispose()
    })
  )

  it(
    'blocked worker 投递前必须用户确认，确认后走 send + enter；无跃迁时回报 ACK 诊断',
    withTempRoot(async () => {
      const { mock, stub, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })
      await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A' }, undefined, undefined, mock.ctx)
      const worker = registry.list()[0]
      registry.applyProgramStatus(worker.blockId, { state: 'blocked', kind: 'permission' })

      const result = (await mock.tools
        .get('rex_send_input')
        ?.execute('t1', { worker_id: worker.workerId, instruction: '继续' }, undefined, undefined, mock.ctx)) as {
        content: Array<{ text: string }>
      }

      expect(mock.ctx.confirmations.length).toBe(1)
      expect(mock.ctx.confirmations[0]?.title).toContain('投递新指令')
      expect(stub.sends).toHaveLength(1)
      expect(stub.sends[0]?.text).toContain('turn-002.brief.md')
      expect(stub.keys).toEqual([{ blockId: worker.blockId, key: 'enter' }])
      expect(result.content[0]?.text).toContain('未观察到状态跃迁')
      expect(worker.turn).toBe(2)
      expect(worker.status).toBe('blocked')
      dispose()
    })
  )

  it(
    'headless 续跑：events 尾部提取 session id、新 Block 原子替换',
    withTempRoot(async () => {
      const { mock, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })
      await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', mode: 'headless' }, undefined, undefined, mock.ctx)
      const worker = registry.list()[0]
      const store = new HandoffStore({ root: roots[roots.length - 1] as string, sessionId: 'session-mock-0001' })
      await store.ensureWorkerDir(worker.workerId)
      await store.appendEvents(worker.workerId, 1, `{"type":"result","session_id":"agent-sid-9"}\n`)

      registry.applyChildExited(worker.blockId, 0)
      const result = (await mock.tools
        .get('rex_send_input')
        ?.execute('t1', { worker_id: worker.workerId, instruction: '追问' }, undefined, undefined, mock.ctx)) as {
        content: Array<{ text: string }>
      }
      expect(result.content[0]?.text).toContain('headless 续跑已启动')
      expect(worker.agentSessionId).toBe('agent-sid-9')
      expect(worker.blockId).not.toBe(`block:1`)
      expect(worker.retiredBlockIds).toEqual(['block:1'])
      dispose()
    })
  )
})

describe('事件环与验收折叠', () => {
  it(
    'child_exited 事件驱动终态，1 秒窗口聚合后 followUp 唤醒',
    withTempRoot(async () => {
      vi.useFakeTimers()
      const { mock, stub, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })
      await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', mode: 'headless' }, undefined, undefined, mock.ctx)
      const worker = registry.list()[0]

      stub.onLine?.(
        JSON.stringify({
          type: 'session_event',
          payload: {
            session_id: 's',
            event: {
              type: 'block_event',
              payload: {
                block_id: worker.blockId,
                creator_name: 'com.superlogical.terminal',
                name: 'child_exited',
                payload: { exit_code: 0 }
              }
            }
          }
        })
      )
      expect(worker.status).toBe('done')

      await vi.advanceTimersByTimeAsync(1100)
      const wake = mock.messages.find(message => message.options?.triggerTurn === true)
      expect(wake?.content).toContain('本轮完成')
      expect(wake?.options?.deliverAs).toBe('followUp')
      vi.useRealTimers()
      dispose()
    })
  )

  it(
    'context 折叠取代旧轮次的 inspect 输出',
    withTempRoot(async () => {
      const { mock, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })
      await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A' }, undefined, undefined, mock.ctx)
      const worker = registry.list()[0]
      const first = (await mock.tools
        .get('rex_inspect_output')
        ?.execute('call-1', { worker_id: worker.workerId }, undefined, undefined, mock.ctx)) as Record<string, unknown>
      expect((first.content as Array<{ text: string }>)[0]?.text).toContain(worker.workerId)
      await mock.tools
        .get('rex_inspect_output')
        ?.execute('call-2', { worker_id: worker.workerId }, undefined, undefined, mock.ctx)

      const messages = [
        { role: 'toolResult', toolCallId: 'call-1', content: [{ type: 'text', text: '很长的旧验收输出' }] },
        { role: 'toolResult', toolCallId: 'call-2', content: [{ type: 'text', text: '最新验收输出' }] },
        { role: 'toolResult', toolCallId: 'other', content: [{ type: 'text', text: '别的工具结果' }] }
      ]
      const result = mock.emit('context', { messages }) as { messages: typeof messages }
      expect((result.messages[0].content as Array<{ text: string }>)[0]?.text).toContain('已折叠')
      expect((result.messages[1].content as Array<{ text: string }>)[0]?.text).toBe('最新验收输出')
      expect((result.messages[2].content as Array<{ text: string }>)[0]?.text).toBe('别的工具结果')
      dispose()
    })
  )
})
