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
import { CODE_CHANGE_ROUTE_RULE, DIRECT_SCOPE_RULE } from '../prompt'
import type { RexAdapter } from '../rex-adapter'
import { WorkerRegistry } from '../state-machine'

import { createMockPi, type MockExecResult, type MockPi } from './pi-mock'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 }))
  )
})

interface AdapterStub {
  runBlocks: Array<{
    cwd: string
    label: string
    keepOpen: boolean
    focus: boolean
    interactiveShell?: boolean
    commandSegments: string[]
  }>
  /** 非空时下一次 runBlock 抛错；状态不明用例设置。 */
  runBlockError?: Error
  /** 非空时下一次 blockClose 抛错；旧 Tab 关不掉的兜底用例设置。 */
  failBlockClose?: boolean
  /** 非空时 blockList 抛错；状态不明用例设置。 */
  blockListError?: Error
  sends: Array<{ blockId: string; text: string }>
  keys: Array<{ blockId: string; key: string }>
  captures: string[]
  closedBlocks: string[]
  onLine: ((line: string) => void) | undefined
  /** 事件环断开回调；重连告警用例手动触发。 */
  onExit: ((error: Error | undefined) => void) | undefined
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
    onExit: undefined,
    listBlocks: ['block:A'],
    blockStatuses: new Map()
  }
  const adapter = {
    runBlock: async (options: {
      cwd: string
      label: string
      keepOpen: boolean
      focus: boolean
      interactiveShell?: boolean
      commandSegments: string[]
    }) => {
      stub.runBlocks.push(options)
      if (stub.runBlockError !== undefined) {
        const error = stub.runBlockError
        stub.runBlockError = undefined
        throw error
      }
      const blockId = `block:${stub.runBlocks.length}`
      // 新 Block 登记后对账会用到列表：默认让它视为存活，保持 starting 不被对账关闭。
      stub.listBlocks.push(blockId)
      return { windowId: 'window:w1', blockIds: [blockId] }
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
    blockList: async () => {
      if (stub.blockListError !== undefined) throw stub.blockListError
      return stub.listBlocks.map(blockId => ({
        blockId,
        label: blockId,
        flavor: 'com.superlogical.terminal.shell',
        windowId: 'window:w1',
        placement: 'placed'
      }))
    },
    blockCallProgramStatus: async (blockId: string) => stub.blockStatuses.get(blockId) ?? [],
    blockCallLastExit: async (blockId: string) => {
      void blockId
      return undefined
    },
    blockClose: async (blockId: string) => {
      if (stub.failBlockClose === true) {
        stub.failBlockClose = false
        throw new Error('block is focused')
      }
      stub.closedBlocks.push(blockId)
    },
    startEventsStream: (handlers: { onLine(line: string): void; onExit(error: Error | undefined): void }) => {
      stub.onLine = handlers.onLine
      stub.onExit = handlers.onExit
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
    // 常态：主仓没有进行中的合并；冲突场景由各用例显式覆盖为 code 0。
    if (command === 'git' && args[0] === 'rev-parse' && args.includes('MERGE_HEAD'))
      return { stdout: '', stderr: '', code: 1, killed: false, truncated: false }
    if (command === 'git' && args[0] === 'rev-parse')
      return { stdout: 'b'.repeat(40), stderr: '', code: 0, killed: false, truncated: false }
    if (command === 'git' && args[0] === 'status')
      return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
    if (command === '/usr/bin/which')
      return { stdout: '/opt/homebrew/bin/claude\n', stderr: '', code: 0, killed: false, truncated: false }
    return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
  }
}

function makeOrchestrator(
  hasUI = true,
  profiles = resolveProfiles(undefined)
): {
  mock: MockPi
  stub: AdapterStub
  registry: WorkerRegistry
  dispose(): void
} {
  const mock = createMockPi(fakeGit(), { hasUI })
  const { adapter, stub } = makeAdapterStub()
  const registry = new WorkerRegistry(() => 0)
  const orchestrator = createOrchestrator(mock.pi, {
    adapter,
    registry,
    profiles,
    createStore: sessionId => new HandoffStore({ root: roots[roots.length - 1] ?? '', sessionId }),
    runHeadlessPath: '/ext/scripts/run-headless.mjs',
    nodePath: '/usr/local/bin/node',
    rexBin: '/opt/rex',
    rexSession: 'session:env',
    // ACK 诊断路径用真实短窗口验证；产品语义里的 5 秒是 deps 缺省值。
    ackTimeoutMs: 100,
    // 欢迎语只在一个专项用例里开：其余用例断言 messages 为空。
    showWelcome: false
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
    '激活后注册 8 个工具与 4 个命令',
    withTempRoot(async () => {
      const { mock } = makeOrchestrator()
      expect([...mock.tools.keys()].sort()).toEqual([
        'ask_user',
        'rex_cli',
        'rex_close_worker',
        'rex_inspect_changes',
        'rex_inspect_output',
        'rex_list_workers',
        'rex_send_input',
        'rex_spawn_agent'
      ])
      expect([...mock.commands.keys()].sort()).toEqual(['rex-cleanup', 'rex-pause', 'rex-resume', 'rex-status'])

      const rexCli = mock.tools.get('rex_cli')
      expect(rexCli?.definition.exposure).toBe('model-only')
      expect(rexCli?.definition.executionMode).toBe('parallel')
      expect(rexCli?.definition.parameters).toMatchObject({
        type: 'object',
        properties: { args: { type: 'array', items: { type: 'string' }, minItems: 1 } },
        required: ['args'],
        additionalProperties: false
      })

      await rexCli?.execute('t-rex', { args: ['window', 'ls'] }, undefined, undefined, mock.ctx)
      expect(mock.execCalls.at(-1)).toEqual({
        command: '/opt/rex',
        args: ['window', 'ls', '-s', 'session:env'],
        options: { timeout: 15000 }
      })
    })
  )

  it(
    'rex_cli 将自定义 profile binary basename 注入 agent 路由护栏',
    withTempRoot(async () => {
      const profiles = resolveProfiles({
        profiles: {
          coder: { binary: '/opt/acme/coder' }
        }
      })
      const { mock, dispose } = makeOrchestrator(true, profiles)
      const rexCli = mock.tools.get('rex_cli')

      const result = (await rexCli?.execute(
        't-profile-agent',
        { args: ['run', '--', '/opt/acme/coder', '-p', 'hi'] },
        undefined,
        undefined,
        mock.ctx
      )) as { content: Array<{ text: string }>; isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('自定义 profile')
      expect(result.content[0]?.text).toContain('rex_spawn_agent')
      expect(mock.execCalls).toEqual([])
      dispose()
    })
  )

  it(
    '激活时给用户发一条友好速查，且只发一次',
    withTempRoot(async () => {
      const mock = createMockPi(fakeGit())
      const { adapter } = makeAdapterStub()
      const orchestrator = createOrchestrator(mock.pi, {
        adapter,
        registry: new WorkerRegistry(() => 0),
        profiles: resolveProfiles(undefined),
        createStore: sessionId => new HandoffStore({ root: roots[roots.length - 1] ?? '', sessionId }),
        runHeadlessPath: '/ext/scripts/run-headless.mjs',
        nodePath: '/usr/local/bin/node',
        rexBin: '/opt/rex',
        rexSession: 'session:env',
        // 历史会话残留只在有存货时提醒。
        listHandoffSessions: async () => ['session-mock-0001', 'crashed-old-session']
      })
      mock.emit('session_start', { reason: 'startup' })
      // 残留提醒是 fire-and-forget 的 promise，等一个事件环 tick 再断言。
      await new Promise(resolve => setTimeout(resolve, 0))
      const welcomes = mock.messages.filter(message => message.content.includes('rex-orchestrator-welcome'))
      expect(welcomes).toHaveLength(1)
      expect(welcomes[0]?.content).toContain('直接做')
      expect(welcomes[0]?.content).toContain('派一个 claude worker')
      expect(welcomes[0]?.content).toContain('代码改动派 worker')
      expect(welcomes[0]?.content).not.toContain('git merge --no-ff')
      expect(welcomes[0]?.content).not.toContain('让用户在对应工作区执行')
      expect(welcomes[0]?.options?.triggerTurn).toBeFalsy()
      // 其他会话的交接区不自动删；措辞必须提醒「可能在运行中」，不诱导删除。
      const residue = mock.messages.find(message => message.content.includes('其他会话的目录'))
      expect(residue?.content).toContain('crashed-old-session')
      expect(residue?.content).toContain('另一个正在运行的会话')
      expect(residue?.content).not.toContain('session-mock-0001')
      // 重复 session_start 不再刷屏。
      mock.emit('session_start', { reason: 'reload' })
      expect(mock.messages.filter(message => message.content.includes('rex-orchestrator-welcome'))).toHaveLength(1)
      orchestrator.dispose()
    })
  )

  it(
    'session_start 挂协调者工具白名单，shutdown 还原',
    withTempRoot(async () => {
      const { mock, dispose } = makeOrchestrator()
      const before = mock.activeTools
      mock.emit('session_start', { reason: 'startup' })
      expect(mock.activeTools.sort()).toEqual(
        [
          'ask_user',
          'rex_cli',
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
      const section = options.sections['rex-orchestrator']
      const guidelines = options.promptGuidelines.join('\n')
      expect(section).toContain('<rex-orchestrator>')
      expect(section).toContain('直接（rex_cli）')
      expect(section).toContain('派发（rex_spawn_agent）')
      expect(section).toContain('拒绝点')
      expect(section).toContain('claude、codex')
      expect(section).toContain('仓库代码改动一律派 worker')
      expect(section).toContain('合并与发布优先按该仓库自身流程')
      expect(section.match(/^## 直接（rex_cli）$/gm)).toHaveLength(1)
      expect(section.match(/^## 派发（rex_spawn_agent）$/gm)).toHaveLength(1)
      expect(section).toContain(DIRECT_SCOPE_RULE)
      expect(section).toContain(CODE_CHANGE_ROUTE_RULE)
      expect(guidelines).toContain('Check every action against one binary first')
      expect(guidelines).toContain('read-only or non-code-changing work')
      expect(guidelines).toContain('Route agent launches through rex_spawn_agent')
      expect(options.systemPrompt).toBe('original')
    })
  )

  it.each(['write', 'edit', 'bash', 'powershell'])('tool_call 硬拦内置写工具 %s', toolName =>
    withTempRoot(async () => {
      const { mock } = makeOrchestrator()
      const decision = mock.emit('tool_call', { toolName, input: {} }) as { block: boolean; reason: string }
      expect(decision.block).toBe(true)
      expect(decision.reason).toContain(toolName)
      expect(decision.reason).not.toContain('本会话只读')
    })()
  )

  it(
    'tool_call 放行只读工具与 rex_cli，硬拦 destructiveHint MCP 工具',
    withTempRoot(async () => {
      const { mock } = makeOrchestrator()
      for (const toolName of ['rex_cli', 'read', 'grep', 'find', 'ls']) {
        expect(mock.emit('tool_call', { toolName, input: {} })).toBeUndefined()
      }
      expect(
        (
          mock.emit('tool_call', { toolName: 'mcp__x__y', annotations: { destructiveHint: true }, input: {} }) as {
            block: boolean
          }
        ).block
      ).toBe(true)
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
      const registered = registry.list()[0]
      expect(registered?.mode).toBe('headless')
      expect(registered?.baseCommit).toMatch(/^b{40}$/)
      // 省略 label 时用 workerId 兜底，而不是把 undefined 传给 rex run（review #9）。
      expect(run.label).toBe(registered?.workerId)
      dispose()
    })
  )

  it(
    'rex run 失败且带 worktree 时一律保守：登记 closed placeholder 供追踪，不接管不回滚（re-review #17 终版）',
    withTempRoot(async () => {
      const { mock, stub, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })
      stub.runBlockError = new Error('rex down')

      const result = (await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', use_worktree: true }, undefined, undefined, mock.ctx)) as {
        content: Array<{ text: string }>
        isError?: boolean
      }

      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('派生结果不明')
      // placeholder 登记：rex_list_workers 与 /rex-cleanup 都能看到这份残留。
      expect(registry.list()).toHaveLength(1)
      const placeholder = registry.list()[0]
      expect(placeholder?.blockId).toMatch(/^unconfirmed:/)
      expect(placeholder?.status).toBe('closed')
      expect(placeholder?.worktree?.branch).toMatch(/^pi-orch\//)
      // 登记为 closed 不产生「Block 已被关闭」的合成事件通知。
      expect(mock.messages).toEqual([])
      // 绝不删除可能正被使用的 worktree（Block 是否已建出不可证明）。
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('worktree add -b pi-orch/'))).toBe(true)
      expect(argJoins.some(args => args.startsWith('worktree remove'))).toBe(false)
      expect(argJoins.some(args => args.startsWith('branch -D pi-orch/'))).toBe(false)
      dispose()
    })
  )

  it(
    'placeholder 的 worktree 清理必须过显式确认（re-review #17 四次）',
    withTempRoot(async () => {
      // 有 UI：confirm 后 force 清理。
      const ui = makeOrchestrator()
      ui.mock.emit('session_start', { reason: 'startup' })
      ui.stub.runBlockError = new Error('rex down')
      await ui.mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', use_worktree: true }, undefined, undefined, ui.mock.ctx)
      const placeholder = ui.registry.list()[0]

      const closed = (await ui.mock.tools
        .get('rex_close_worker')
        ?.execute('t1', { worker_id: placeholder?.workerId }, undefined, undefined, ui.mock.ctx)) as {
        content: Array<{ text: string }>
        isError?: boolean
      }
      expect(ui.mock.ctx.confirmations[0]?.title).toContain('清理未确认 worker')
      expect(closed.isError).toBeFalsy()
      expect(closed.content[0]?.text).toContain('已清理')
      const argJoins = ui.mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('branch -D pi-orch/'))).toBe(true)
      // 合成 blockId 不送 rex：关闭调用列表里不该出现 unconfirmed: 前缀。
      expect(ui.stub.closedBlocks.some(blockId => blockId.startsWith('unconfirmed:'))).toBe(false)
      ui.dispose()

      // 无 UI：不能安全清理，一律保留。
      const headless = makeOrchestrator(false)
      headless.mock.emit('session_start', { reason: 'startup' })
      headless.stub.runBlockError = new Error('rex down')
      await headless.mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', use_worktree: true }, undefined, undefined, headless.mock.ctx)
      const headlessPlaceholder = headless.registry.list()[0]

      const refused = (await headless.mock.tools
        .get('rex_close_worker')
        ?.execute('t1', { worker_id: headlessPlaceholder?.workerId }, undefined, undefined, headless.mock.ctx)) as {
        content: Array<{ text: string }>
        isError?: boolean
      }
      expect(refused.isError).toBe(true)
      expect(refused.content[0]?.text).toContain('worktree 保留')
      const headlessJoins = headless.mock.execCalls.map(call => call.args.join(' '))
      expect(headlessJoins.some(args => args.startsWith('worktree remove'))).toBe(false)
      headless.dispose()
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
      expect(registry.get(worker.workerId)?.turn).toBe(2)
      expect(registry.get(worker.workerId)?.status).toBe('blocked')
      dispose()
    })
  )

  it(
    'headless 续跑：events 尾部提取 session id、新 Block 原子替换、旧 Tab 自动回收',
    withTempRoot(async () => {
      const { mock, stub, registry, dispose } = makeOrchestrator()
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
      expect(result.content[0]?.text).toContain('旧 Tab 已自动回收')
      const updated = registry.get(worker.workerId)
      expect(updated?.agentSessionId).toBe('agent-sid-9')
      expect(updated?.blockId).not.toBe(`block:1`)
      // V3-02 单活跃 Tab：回收成功的旧 Block 从 retired 列表移除，
      // 不留给 /rex-cleanup 反复重关。
      expect(updated?.retiredBlockIds).toEqual([])
      expect(stub.closedBlocks).toContain('block:1')
      dispose()
    })
  )

  it(
    'headless 续跑：旧 Tab 关不掉时如实报告并留在 retired 由 /rex-cleanup 兜底',
    withTempRoot(async () => {
      const { mock, stub, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })
      await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', mode: 'headless' }, undefined, undefined, mock.ctx)
      const worker = registry.list()[0]
      const store = new HandoffStore({ root: roots[roots.length - 1] as string, sessionId: 'session-mock-0001' })
      await store.ensureWorkerDir(worker.workerId)
      await store.appendEvents(worker.workerId, 1, `{"type":"result","session_id":"agent-sid-9"}\n`)

      registry.applyChildExited(worker.blockId, 0)
      stub.failBlockClose = true
      const result = (await mock.tools
        .get('rex_send_input')
        ?.execute('t1', { worker_id: worker.workerId, instruction: '追问' }, undefined, undefined, mock.ctx)) as {
        content: Array<{ text: string }>
      }
      expect(result.content[0]?.text).toContain('旧 Tab 关闭失败')
      expect(registry.get(worker.workerId)?.retiredBlockIds).toEqual(['block:1'])
      dispose()
    })
  )
})

describe('关闭、合并与内容落地', () => {
  /** 构造带自定义 git fake 的关闭装配；worker 预置为未合并的 worktree 模式。 */
  function makeCloseOrchestrator(exec: (command: string, args: string[]) => Promise<MockExecResult>): {
    mock: MockPi
    stub: AdapterStub
    registry: WorkerRegistry
    orchestrator: { dispose(): void }
  } {
    const mock = createMockPi(exec)
    const { adapter, stub } = makeAdapterStub()
    const registry = new WorkerRegistry(() => 0)
    const orchestrator = createOrchestrator(mock.pi, {
      adapter,
      registry,
      profiles: resolveProfiles(undefined),
      createStore: sessionId => new HandoffStore({ root: roots[roots.length - 1] ?? '', sessionId }),
      runHeadlessPath: '/ext/scripts/run-headless.mjs',
      nodePath: '/usr/local/bin/node',
      rexBin: '/opt/rex',
      rexSession: 'session:env',
      showWelcome: false
    })
    registry.register({
      workerId: 'claude-1',
      agent: 'claude',
      mode: 'interactive',
      label: 'claude-1',
      blockId: 'block:A',
      turn: 1,
      cwd: '/wt-path',
      baseCommit: null,
      baseDirty: [],
      worktree: { path: '/wt-path', branch: 'pi-orch/review1/w-1' },
      mainCwd: '/repo',
      paused: false
    })
    return { mock, stub, registry, orchestrator }
  }

  const closeWorker = (mock: MockPi, workerId = 'claude-1') =>
    mock.tools
      .get('rex_close_worker')
      ?.execute('t0', { worker_id: workerId }, undefined, undefined, mock.ctx) as Promise<{
      content: Array<{ text: string }>
      isError?: boolean
    }>

  it(
    '干净但未确认落地：用户确认后按无 PR 流程本地 merge 并自动清理',
    withTempRoot(async () => {
      let mergedIntoMain = false
      const { mock, registry, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'merge') {
          mergedIntoMain = true
          return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
        }
        if (command === 'git' && args[0] === 'branch' && args[1] === '--merged') {
          return {
            stdout: mergedIntoMain ? `* main\n  pi-orch/review1/w-1\n` : '* main\n',
            stderr: '',
            code: 0,
            killed: false,
            truncated: false
          }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(mock.ctx.confirmations[0]?.title).toContain('本地合并 pi-orch/review1/w-1')
      expect(mock.ctx.confirmations[0]?.message).toContain(
        '按该仓库自身流程合并（有 PR 流程走 PR；无 PR 流程确认后可本地 merge）'
      )
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args === 'merge --no-ff pi-orch/review1/w-1')).toBe(true)
      expect(result.isError).toBeFalsy()
      expect(result.content[0]?.text).toContain('已按无 PR 流程本地合并并清理')
      expect(argJoins.some(args => args === 'branch -d pi-orch/review1/w-1')).toBe(true)
      expect(registry.get('claude-1')?.worktree).toBeUndefined()
      orchestrator.dispose()
    })
  )

  it(
    'merge 失败但 MERGE_HEAD 指向别的分支时不 abort',
    withTempRoot(async () => {
      let mergeAttempted = false
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse' && args.includes('MERGE_HEAD')) {
          return { stdout: 'a'.repeat(40), stderr: '', code: mergeAttempted ? 0 : 1, killed: false, truncated: false }
        }
        if (command === 'git' && args[0] === 'merge') {
          mergeAttempted = true
          return { stdout: '', stderr: 'CONFLICT', code: 1, killed: false, truncated: false }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(result.content[0]?.text).toContain('主仓当前存在进行中的合并')
      expect(result.content[0]?.text).toContain('未执行 git merge --abort')
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args === 'merge --abort')).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    'merge 失败且主仓有进行中的合并时绝不自动 abort',
    withTempRoot(async () => {
      let failMergeOnce = true
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse' && args.includes('MERGE_HEAD')) {
          return { stdout: 'b'.repeat(40), stderr: '', code: failMergeOnce ? 1 : 0, killed: false, truncated: false }
        }
        if (command === 'git' && args[0] === 'merge' && failMergeOnce) {
          failMergeOnce = false
          return { stdout: '', stderr: 'CONFLICT (content): merge conflict', code: 1, killed: false, truncated: false }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args === 'merge --no-ff pi-orch/review1/w-1')).toBe(true)
      expect(argJoins.some(args => args === 'merge --abort')).toBe(false)
      expect(result.content[0]?.text).toContain('主仓当前存在进行中的合并')
      expect(result.content[0]?.text).toContain('未执行 git merge --abort')
      expect(argJoins.some(args => args.startsWith('worktree remove'))).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    '合并状态探针非 0 非 1 时 fail closed，不发起代合并',
    withTempRoot(async () => {
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse' && args.includes('MERGE_HEAD')) {
          return { stdout: '', stderr: 'fatal: not a git repository', code: 128, killed: false, truncated: false }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(result.content[0]?.text).toContain('无法确认主仓合并状态（rev-parse exit 128）')
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(mock.ctx.confirmations).toHaveLength(0)
      expect(argJoins.some(args => args.startsWith('merge '))).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    '确认期间主仓 HEAD 变化时拒绝在非预期分支上代合并',
    withTempRoot(async () => {
      let headProbeCount = 0
      const beforeSha = 'b'.repeat(40)
      const afterSha = 'c'.repeat(40)
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse' && args[1] === 'HEAD') {
          headProbeCount += 1
          // fakeGit() 的 merge-base 输出为空，落地探针因此按 inconclusive 早退，
          // 随后进入本地 merge 确认路径。前两次 HEAD 读取是确认前后目标捕获；
          // 两次值不同用于证明确认期目标复检会拒绝 merge，而不是只看确认框结果。
          return {
            stdout: headProbeCount <= 1 ? beforeSha : afterSha,
            stderr: '',
            code: 0,
            killed: false,
            truncated: false
          }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(result.content[0]?.text).toContain('确认期间主仓目标发生变化')
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('merge '))).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    'merge 成功但 worktree remove 失败时如实报告清理未完',
    withTempRoot(async () => {
      let mergedIntoMain = false
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'merge') {
          mergedIntoMain = true
          return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
        }
        if (command === 'git' && args[0] === 'branch' && args[1] === '--merged') {
          return {
            stdout: mergedIntoMain ? `* main\n  pi-orch/review1/w-1\n` : '* main\n',
            stderr: '',
            code: 0,
            killed: false,
            truncated: false
          }
        }
        if (command === 'git' && args[0] === 'worktree') {
          return { stdout: '', stderr: 'git boom', code: 1, killed: false, truncated: false }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(result.content[0]?.text).toContain('本地合并已完成，但清理未完')
      expect(result.content[0]?.text).toContain('git worktree remove 失败: git boom')
      expect(result.content[0]?.text).toContain('请手动执行（已存在的步骤可跳过）')
      expect(result.content[0]?.text).not.toContain('合并失败')
      orchestrator.dispose()
    })
  )

  it(
    '主仓本来就在合并中时不发起代合并、更不会 abort 用户的合并',
    withTempRoot(async () => {
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse' && args.includes('MERGE_HEAD')) {
          return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(mock.ctx.confirmations).toHaveLength(0)
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('merge '))).toBe(false)
      expect(result.content[0]?.text).toContain('主仓正处于合并中')
      orchestrator.dispose()
    })
  )

  it(
    'merge 未开始即失败时不乱开 abort 药方，如实报告原因',
    withTempRoot(async () => {
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'merge' && args[1] === '--no-ff') {
          return { stdout: '', stderr: 'local changes would be overwritten', code: 1, killed: false, truncated: false }
        }
        if (command === 'git' && args[0] === 'rev-parse' && args.includes('MERGE_HEAD')) {
          return { stdout: '', stderr: '', code: 1, killed: false, truncated: false }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(result.content[0]?.text).toContain('本地合并未开始即失败')
      expect(result.content[0]?.text).toContain('local changes would be overwritten')
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args === 'merge --abort')).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    '确认期间切到指向同一 commit 的另一分支时同样拒绝',
    withTempRoot(async () => {
      let refProbeCount = 0
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'symbolic-ref' && args.at(-1) === 'HEAD') {
          refProbeCount += 1
          return {
            stdout: refProbeCount <= 1 ? 'refs/heads/main' : 'refs/heads/other',
            stderr: '',
            code: 0,
            killed: false,
            truncated: false
          }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(result.content[0]?.text).toContain('确认期间主仓目标发生变化')
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('merge '))).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    '内容未落地：close 输出仓库流程、可选本地 merge 与 force 废弃，拒绝本地 merge 后不删除',
    withTempRoot(async () => {
      const ok = { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
      const baseSha = 'b'.repeat(40)
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse' && args[1]?.startsWith('refs/heads/')) {
          return { ...ok, stdout: `${'c'.repeat(40)}\n` }
        }
        if (command === 'git' && args[0] === 'merge-base') {
          return { ...ok, stdout: `${'a'.repeat(40)}\n` }
        }
        if (command === 'git' && args[0] === 'diff' && args.includes('--name-only')) {
          return { ...ok, stdout: 'a.txt\0' }
        }
        if (command === 'git' && args[0] === 'diff' && args.includes('--quiet')) {
          return { ...ok, code: 1 }
        }
        return fakeGit()(command, args)
      })
      mock.ctx.ui.confirm = async (title, message) => {
        mock.ctx.confirmations.push({ title, message })
        return false
      }

      const result = await closeWorker(mock)

      const text = result.content[0]?.text ?? ''
      expect(text).toContain('分支内容不在 main 中')
      expect(text).toContain('按该仓库自身流程合并')
      expect(text).toContain('无 PR 流程确认后可本地 merge')
      expect(text).toContain('确认废弃 → 用 force: true 清理')
      expect(text).toContain('请现在二选一')
      expect(text).not.toContain('git merge --no-ff')
      expect(mock.ctx.confirmations[0]?.message).toContain(
        '按该仓库自身流程合并（有 PR 流程走 PR；无 PR 流程确认后可本地 merge）'
      )
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(command => command.startsWith('diff --name-only -z'))).toBe(true)
      expect(argJoins.some(command => command.startsWith(`diff --quiet --no-relative ${baseSha} `))).toBe(true)
      expect(argJoins.some(command => command.startsWith('diff --quiet --no-relative main '))).toBe(false)
      expect(argJoins.some(args => args.startsWith('merge '))).toBe(false)
      expect(argJoins.some(args => args.startsWith('worktree remove'))).toBe(false)
      expect(argJoins.some(args => args.startsWith('update-ref -d') || args.startsWith('branch -D'))).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    '内容落地无法判定：给出命令与 stderr 摘要，并只给 PR / force 二选一',
    withTempRoot(async () => {
      const ok = { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse' && args[1]?.startsWith('refs/heads/')) {
          return { ...ok, stdout: `${'c'.repeat(40)}\n` }
        }
        if (command === 'git' && args[0] === 'merge-base') {
          return { ...ok, stdout: `${'a'.repeat(40)}\n` }
        }
        if (command === 'git' && args[0] === 'diff') {
          return { ...ok, stderr: 'fatal: unable to read tree', code: 128 }
        }
        return fakeGit()(command, args)
      })
      mock.ctx.ui.confirm = async (title, message) => {
        mock.ctx.confirmations.push({ title, message })
        return false
      }

      const result = await closeWorker(mock)

      const text = result.content[0]?.text ?? ''
      expect(text).toContain('无法自动判定分支内容是否已在 main 中')
      expect(text).toContain('git diff --name-only -z')
      expect(text).toContain('fatal: unable to read tree')
      expect(text).toContain('按该仓库自身流程合并')
      expect(text).toContain('无 PR 流程确认后可本地 merge')
      expect(text).toContain('确认内容已在 main，或确认废弃 → 用 force: true 清理')
      expect(text).toContain('请现在二选一')
      expect(text).not.toContain('git merge --no-ff')
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('merge '))).toBe(false)
      expect(argJoins.some(args => args.startsWith('worktree remove'))).toBe(false)
      expect(argJoins.some(args => args.startsWith('branch -D'))).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    '逐路径内容比对识别 squash 落地后关闭 worker 并清除 registry worktree',
    withTempRoot(async () => {
      const ok = { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
      const baseSha = 'b'.repeat(40)
      const { mock, registry, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse') {
          if (args.includes('MERGE_HEAD')) return { ...ok, code: 1 }
          if (args.some(arg => arg.startsWith('refs/heads/'))) return { ...ok, stdout: `${'c'.repeat(40)}\n` }
          if (args[1] === 'HEAD') return { ...ok, stdout: `${'1'.repeat(40)}\n` }
          if (args.includes('refs/remotes/origin/HEAD')) return { ...ok, stdout: `${'2'.repeat(40)}\n` }
        }
        if (command === 'git' && args[0] === 'symbolic-ref') {
          return { ...ok, stdout: 'refs/remotes/origin/main\n' }
        }
        if (command === 'git' && args[0] === 'status') return ok
        if (command === 'git' && args[0] === 'branch' && args[1] === '--merged') {
          return { ...ok, stdout: '* main\n' }
        }
        if (command === 'git' && args[0] === 'merge-base') return { ...ok, stdout: `${'a'.repeat(40)}\n` }
        if (command === 'git' && args[0] === 'diff' && args.includes('--name-only')) {
          return { ...ok, stdout: 'a.txt\0' }
        }
        if (command === 'git' && args[0] === 'diff' && args.includes('--quiet')) return ok
        if (command === 'git' && args[0] === 'ls-tree') {
          return { ...ok, stdout: `100644 blob ${'d'.repeat(40)}\ta.txt\0` }
        }
        if (command === 'git' && args[0] === 'worktree') return ok
        if (command === 'git' && args[0] === 'update-ref') return ok
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      expect(result.content[0]?.text).toContain('内容已在 origin/main 中（squash 合并），因此无需确认')
      expect(mock.ctx.confirmations).toHaveLength(0)
      expect(mock.execCalls.some(call => call.command === 'env')).toBe(false)
      const gitCommands = mock.execCalls.filter(call => call.command === 'git').map(call => call.args.join(' '))
      expect(gitCommands).toContain('rev-parse origin/main')
      expect(gitCommands.some(command => command.startsWith(`merge-base ${baseSha} `))).toBe(true)
      expect(gitCommands.some(command => command.startsWith('diff --name-only -z'))).toBe(true)
      expect(gitCommands.some(command => command.startsWith(`diff --quiet --no-relative ${baseSha} `))).toBe(true)
      expect(gitCommands.some(command => command.includes('-- :(top,literal)a.txt'))).toBe(true)
      expect(gitCommands.some(command => command.startsWith('diff --quiet --no-relative origin/main '))).toBe(false)
      expect(gitCommands.some(command => command.startsWith('read-tree') || command.startsWith('apply '))).toBe(false)
      expect(gitCommands.some(command => command.startsWith('update-ref -d refs/heads/'))).toBe(true)
      expect(registry.get('claude-1')?.worktree).toBeUndefined()
      orchestrator.dispose()
    })
  )

  it(
    '探针后分支已被外部删除：close 报清理完成并清除 registry worktree',
    withTempRoot(async () => {
      const ok = { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
      let branchDeleted = false
      const { mock, registry, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'rev-parse') {
          if (args.includes('MERGE_HEAD')) return { ...ok, code: 1 }
          if (args.some(arg => arg.startsWith('refs/heads/'))) {
            return branchDeleted ? { ...ok, code: 1 } : { ...ok, stdout: `${'c'.repeat(40)}\n` }
          }
          if (args[1] === 'HEAD') return { ...ok, stdout: `${'1'.repeat(40)}\n` }
          if (args.includes('refs/remotes/origin/HEAD')) return { ...ok, stdout: `${'2'.repeat(40)}\n` }
        }
        if (command === 'git' && args[0] === 'symbolic-ref') {
          return { ...ok, stdout: 'refs/remotes/origin/main\n' }
        }
        if (command === 'git' && args[0] === 'status') return ok
        if (command === 'git' && args[0] === 'branch' && args[1] === '--merged') {
          return { ...ok, stdout: '* main\n' }
        }
        if (command === 'git' && args[0] === 'merge-base') return { ...ok, stdout: `${'a'.repeat(40)}\n` }
        if (command === 'git' && args[0] === 'diff' && args.includes('--name-only')) {
          return { ...ok, stdout: 'a.txt\0' }
        }
        if (command === 'git' && args[0] === 'diff' && args.includes('--quiet')) return ok
        if (command === 'git' && args[0] === 'ls-tree') {
          return { ...ok, stdout: `100644 blob ${'d'.repeat(40)}\ta.txt\0` }
        }
        if (command === 'git' && args[0] === 'worktree' && args[1] === 'remove') {
          branchDeleted = true
          return ok
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)
      const closedText = result.content[0]?.text ?? ''

      expect(result.isError).toBeFalsy()
      expect(closedText).toContain('worker claude-1 已关闭。')
      expect(closedText).toContain('worktree 与分支 pi-orch/review1/w-1 已清理')
      expect(closedText).not.toContain('分支 pi-orch/review1/w-1 保留')
      expect(closedText).not.toContain('重新判定')
      expect(mock.ctx.confirmations).toHaveLength(0)
      expect(registry.get('claude-1')?.worktree).toBeUndefined()
      expect(registry.get('claude-1')?.status).toBe('closed')
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('worktree remove'))).toBe(true)
      expect(argJoins.some(args => args.startsWith('update-ref -d'))).toBe(false)
      orchestrator.dispose()
    })
  )

  it(
    '祖先链已合并但 branch -d 失败：如实报告分支清理失败与手动补救',
    withTempRoot(async () => {
      const { mock, orchestrator } = makeCloseOrchestrator(async (command, args) => {
        if (command === 'git' && args[0] === 'branch' && args[1] === '--merged') {
          return { stdout: `* main\n  pi-orch/review1/w-1\n`, stderr: '', code: 0, killed: false, truncated: false }
        }
        if (command === 'git' && args[0] === 'branch' && args[1] === '-d') {
          return { stdout: '', stderr: 'branch used by worktree', code: 1, killed: false, truncated: false }
        }
        return fakeGit()(command, args)
      })

      const result = await closeWorker(mock)

      const text = result.content[0]?.text ?? ''
      expect(text).toContain('分支清理失败')
      expect(text).toContain('worktree 目录已移除')
      expect(text).toContain('请手动执行（已存在的步骤可跳过）')
      expect(text).toContain('git branch -d pi-orch/review1/w-1')
      orchestrator.dispose()
    })
  )

  it(
    '关闭顺序：retired 先关且成功即出列，失败整体中止；重试不重复关闭（codex exec 八轮 #2）',
    withTempRoot(async () => {
      const { mock, stub, registry, orchestrator } = makeCloseOrchestrator(fakeGit())
      registry.restore([{ ...registry.get('claude-1')!, retiredBlockIds: ['block:R'] }])
      stub.failBlockClose = true

      // 第一次：retired 关闭失败 → 活跃 Block 尚未被关，列表保留待重试。
      const first = await closeWorker(mock)
      expect(first.isError).toBe(true)
      expect(stub.closedBlocks).toEqual([])
      expect(registry.get('claude-1')?.retiredBlockIds).toEqual(['block:R'])
      expect(registry.get('claude-1')?.status).not.toBe('closed')

      // 第二次：一次性失败已重置 → retired 与活跃 Block 依序关闭，worker 收尾。
      const second = await closeWorker(mock)
      expect(second.isError).toBeFalsy()
      expect(stub.closedBlocks).toEqual(['block:R', 'block:A'])
      expect(registry.get('claude-1')?.retiredBlockIds).toEqual([])
      expect(registry.get('claude-1')?.activeBlockClosed).toBe(true)
      expect(registry.get('claude-1')?.status).toBe('closed')
      orchestrator.dispose()
    })
  )

  it(
    'Block 关不掉就整体中止：不 markClosed、不动 worktree（codex exec 七轮 #2）',
    withTempRoot(async () => {
      const { mock, stub, registry, orchestrator } = makeCloseOrchestrator(fakeGit())
      stub.failBlockClose = true

      const result = await closeWorker(mock)

      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('Block block:A 关闭失败')
      expect(result.content[0]?.text).toContain('保持原状')
      // 关闭失败路径绝不触碰 worktree。
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('worktree remove'))).toBe(false)
      expect(mock.ctx.confirmations).toHaveLength(0)
      expect(registry.get('claude-1')?.status).not.toBe('closed')
      orchestrator.dispose()
    })
  )
})

describe('事件环与验收折叠', () => {
  it(
    '连续断连告警带上 adapter 上的 stderr 诊断，不只剩通用文案（codex exec #4 二次）',
    withTempRoot(async () => {
      vi.useFakeTimers()
      try {
        const { mock, stub, dispose } = makeOrchestrator()
        mock.emit('session_start', { reason: 'startup' })
        // 真实形态是「一条流退出一次 → 重连 → 再退出」：每次退出后推进重连延迟，
        // 不留下测试结束后才触发的计时器。
        for (let i = 0; i < 3; i += 1) {
          stub.onExit?.(new Error('rex events 退出（code=1）：Rex server unavailable'))
          await vi.advanceTimersByTimeAsync(2000)
        }
        const alarms = () => mock.messages.filter(message => message.content.includes('重连失败'))
        expect(alarms()).toHaveLength(1)
        expect(alarms()[0]?.content).toContain('Rex server unavailable')

        // 跨过阈值后继续失败不再重复刷屏。
        stub.onExit?.(new Error('rex events 退出（code=1）：Rex server unavailable'))
        await vi.advanceTimersByTimeAsync(2000)
        expect(alarms()).toHaveLength(1)

        // 收到首行事件即复位：再连续失败三次重新告警。
        stub.onLine?.('{}')
        for (let i = 0; i < 3; i += 1) {
          stub.onExit?.(new Error('rex events 退出（code=1）：Rex server unavailable'))
          await vi.advanceTimersByTimeAsync(2000)
        }
        expect(alarms()).toHaveLength(2)
        dispose()
      } finally {
        vi.useRealTimers()
      }
    })
  )

  it(
    '/rex-cleanup 对关不掉的旧 Tab 保留跟踪并如实通知，不清空重试列表（codex exec #2 二次）',
    withTempRoot(async () => {
      const { mock, stub, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })
      registry.register({
        workerId: 'claude-1',
        agent: 'claude',
        mode: 'headless',
        label: 'claude-1',
        blockId: 'block:R',
        turn: 1,
        cwd: '/repo',
        baseCommit: null,
        baseDirty: [],
        paused: false
      })
      registry.replaceBlock('claude-1', 'block:B')
      stub.failBlockClose = true

      await mock.commands.get('rex-cleanup')?.handler('', mock.ctx as never)

      expect(registry.get('claude-1')?.retiredBlockIds).toEqual(['block:R'])
      expect(mock.ctx.notifies.some(note => note.message.includes('旧 Tab 关闭失败'))).toBe(true)
      dispose()
    })
  )

  it(
    'child_exited 事件驱动终态，1 秒窗口聚合后 followUp 唤醒',
    withTempRoot(async () => {
      vi.useFakeTimers()
      try {
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
        expect(registry.get(worker.workerId)?.status).toBe('done')

        await vi.advanceTimersByTimeAsync(1100)
        const wake = mock.messages.find(message => message.options?.triggerTurn === true)
        expect(wake?.content).toContain('本轮完成')
        expect(wake?.options?.deliverAs).toBe('followUp')
        dispose()
      } finally {
        vi.useRealTimers()
      }
    })
  )

  it(
    'session_shutdown 停摆聚合计时器，会话结束后不再触碰 runtime',
    withTempRoot(async () => {
      vi.useFakeTimers()
      try {
        const { mock, registry, dispose } = makeOrchestrator()
        mock.emit('session_start', { reason: 'startup' })
        registry.register({
          workerId: 'claude-1',
          agent: 'claude',
          mode: 'headless',
          label: 'claude-1',
          blockId: 'block:A',
          turn: 1,
          cwd: '/repo',
          baseCommit: null,
          baseDirty: [],
          paused: false
        })
        registry.applyProgramStatus('block:A', { state: 'done' })
        mock.emit('session_shutdown', { reason: 'quit' })

        await vi.advanceTimersByTimeAsync(2000)
        expect(mock.messages).toEqual([])
        dispose()
      } finally {
        vi.useRealTimers()
      }
    })
  )

  it(
    'stale runtime 上的 sendMessage 抛错不会带崩宿主，通知循环静默停摆',
    withTempRoot(async () => {
      vi.useFakeTimers()
      try {
        const { mock, registry, dispose } = makeOrchestrator()
        // 模拟会话结束后 runtime 失效：宿主在 sendMessage 上直接抛异常。
        ;(mock.pi as unknown as { sendMessage: () => void }).sendMessage = () => {
          throw new Error('This extension ctx is stale after session replacement or reload.')
        }
        registry.register({
          workerId: 'claude-1',
          agent: 'claude',
          mode: 'headless',
          label: 'claude-1',
          blockId: 'block:A',
          turn: 1,
          cwd: '/repo',
          baseCommit: null,
          baseDirty: [],
          paused: false
        })
        registry.applyProgramStatus('block:A', { state: 'done' })
        await vi.advanceTimersByTimeAsync(1200)
        expect(mock.messages).toEqual([])
        dispose()
      } finally {
        vi.useRealTimers()
      }
    })
  )

  it(
    '/reload 恢复：新实例从持久化注册表重建 worker 跟踪（PR 审查 Block 1）',
    withTempRoot(async () => {
      const first = makeOrchestrator()
      first.mock.emit('session_start', { reason: 'startup' })
      await first.mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', mode: 'headless' }, undefined, undefined, first.mock.ctx)
      const workerId = first.registry.list()[0]?.workerId
      // 等持久化落盘（fire-and-forget）。
      const store = new HandoffStore({ root: roots[roots.length - 1] as string, sessionId: 'session-mock-0001' })
      const deadline = Date.now() + 3000
      for (;;) {
        const saved = await store.loadRegistry()
        if (Array.isArray(saved) && saved.length > 0) break
        if (Date.now() > deadline) throw new Error('注册表未在 3s 内落盘')
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      first.dispose()

      const second = makeOrchestrator()
      second.mock.emit('session_start', { reason: 'reload' })
      const restoredDeadline = Date.now() + 3000
      for (;;) {
        if (second.registry.get(workerId ?? '') !== undefined) break
        if (Date.now() > restoredDeadline) throw new Error('reload 后未恢复注册表')
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      expect(second.registry.get(workerId ?? '')?.blockId).toBe('block:1')
      second.dispose()
    })
  )

  it(
    '登记前到达的终态事件由登记后对账补齐（PR 审查 Block 3）',
    withTempRoot(async () => {
      const { mock, stub, registry, dispose } = makeOrchestrator()
      mock.emit('session_start', { reason: 'startup' })
      // Block 创建到 register 之间已到达的 done 状态：登记后立即对账应拉平。
      stub.blockStatuses.set('block:1', [{ id: 'x', record: { state: 'done' } }])
      await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', mode: 'headless' }, undefined, undefined, mock.ctx)
      const deadline = Date.now() + 3000
      for (;;) {
        if (registry.list()[0]?.status === 'done') break
        if (Date.now() > deadline) break
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      expect(registry.list()[0]?.status).toBe('done')
      dispose()
    })
  )

  it(
    'worktreeSetupHook 经 shell 前缀注入 $MAIN_CWD（PR 审查 Should fix）',
    withTempRoot(async () => {
      const mock = createMockPi(fakeGit())
      const { adapter } = makeAdapterStub()
      const registry = new WorkerRegistry(() => 0)
      const root = roots[roots.length - 1] as string
      const orchestrator = createOrchestrator(mock.pi, {
        adapter,
        registry,
        profiles: resolveProfiles(undefined),
        createStore: sessionId => new HandoffStore({ root, sessionId }),
        config: { worktreeSetupHook: 'ln -sfn "$MAIN_CWD/.env" .env' },
        runHeadlessPath: '/ext/scripts/run-headless.mjs',
        nodePath: '/usr/local/bin/node',
        rexBin: '/opt/rex',
        rexSession: 'session:env',
        showWelcome: false
      })
      mock.emit('session_start', { reason: 'startup' })
      await mock.tools
        .get('rex_spawn_agent')
        ?.execute('t0', { agent: 'claude', task: '做 A', use_worktree: true }, undefined, undefined, mock.ctx)

      const hookCall = mock.execCalls.find(call => call.command === '/bin/sh')
      expect(hookCall?.args[1]).toContain("export MAIN_CWD='/repo'")
      expect(hookCall?.args[1]).toContain('ln -sfn "$MAIN_CWD/.env" .env')
      orchestrator.dispose()
    })
  )

  it(
    '派发前步骤失败时回滚刚建的 worktree，不留无记录残留（PR 审查 Should fix）',
    withTempRoot(async () => {
      const mock = createMockPi(fakeGit())
      const { adapter } = makeAdapterStub()
      const registry = new WorkerRegistry(() => 0)
      const root = roots[roots.length - 1] as string
      const orchestrator = createOrchestrator(mock.pi, {
        adapter,
        registry,
        profiles: resolveProfiles(undefined),
        createStore: sessionId => {
          const store = new HandoffStore({ root, sessionId })
          store.writeBrief = async () => {
            throw new Error('disk full')
          }
          return store
        },
        runHeadlessPath: '/ext/scripts/run-headless.mjs',
        nodePath: '/usr/local/bin/node',
        rexBin: '/opt/rex',
        rexSession: 'session:env',
        showWelcome: false
      })
      mock.emit('session_start', { reason: 'startup' })

      await expect(
        mock.tools
          .get('rex_spawn_agent')
          ?.execute('t0', { agent: 'claude', task: '做 A', use_worktree: true }, undefined, undefined, mock.ctx)
      ).rejects.toThrow('disk full')
      const argJoins = mock.execCalls.map(call => call.args.join(' '))
      expect(argJoins.some(args => args.startsWith('worktree add -b pi-orch/'))).toBe(true)
      expect(argJoins.some(args => args.startsWith('worktree remove'))).toBe(true)
      expect(argJoins.some(args => args.startsWith('branch -D pi-orch/'))).toBe(true)
      expect(registry.list()).toHaveLength(0)
      orchestrator.dispose()
    })
  )

  it(
    'ask_user 在无 UI 会话直接降级，不触发弹窗（PR 审查 Should fix）',
    withTempRoot(async () => {
      const { mock, dispose } = makeOrchestrator(false)
      const result = (await mock.tools
        .get('ask_user')
        ?.execute('t0', { question: '选哪个？' }, undefined, undefined, mock.ctx)) as {
        content: Array<{ text: string }>
        isError?: boolean
      }
      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('没有弹窗 UI')
      expect(mock.ctx.confirmations).toHaveLength(0)
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
