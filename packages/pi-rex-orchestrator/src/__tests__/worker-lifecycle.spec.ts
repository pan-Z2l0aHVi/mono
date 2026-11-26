import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import type { GitExec } from '../git-inspector'
import { HandoffStore } from '../handoff-store'
import { resolveProfiles, type AgentProfile } from '../profiles'
import { WorkerRegistry } from '../state-machine'
import { createWorkerLifecycle, extractSessionId, type WorkerLifecycleDeps } from '../worker-lifecycle'

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

function makeProfile(): AgentProfile {
  const base = resolveProfiles({}).get('claude')
  if (!base) throw new Error('missing builtin claude profile')
  return { ...base, binary: '/usr/local/bin/claude' }
}

function makeFixture(overrides: Partial<WorkerLifecycleDeps> = {}) {
  const registry = new WorkerRegistry()
  const root = mkdtempSync(join(tmpdir(), 'worker-lifecycle-spec-'))
  tempDirs.push(root)
  const store = new HandoffStore({ root, sessionId: 'session' })
  const persistRegistry = vi.fn<() => void>()
  const reconcile = vi.fn<() => Promise<void>>(async () => {})
  const notify = vi.fn<(message: string) => void>()

  const gitCalls: string[][] = []
  const gitExec: GitExec = vi.fn<GitExec>(async args => {
    gitCalls.push(args)
    if (args[0] === 'rev-parse' && args[1] === '--verify') {
      return { stdout: 'deadbeef\n', stderr: '', code: 0, killed: false, truncated: false }
    }
    if (args[0] === 'status') {
      return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
    }
    return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
  })

  const exec = vi.fn<WorkerLifecycleDeps['exec']>(async (cmd, args) => {
    if (cmd === '/usr/bin/test' && args[0] === '-f') {
      return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
    }
    if (cmd === '/usr/bin/test' && args[0] === '-e') {
      return { stdout: '', stderr: '', code: 1, killed: false, truncated: false }
    }
    return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
  })

  const adapter: WorkerLifecycleDeps['adapter'] = {
    runBlock: vi.fn<WorkerLifecycleDeps['adapter']['runBlock']>(async () => ({
      windowId: 'win-1',
      blockIds: ['blk-1']
    })),
    blockClose: vi.fn<WorkerLifecycleDeps['adapter']['blockClose']>(async () => {}),
    send: vi.fn<WorkerLifecycleDeps['adapter']['send']>(async () => {}),
    sendKey: vi.fn<WorkerLifecycleDeps['adapter']['sendKey']>(async () => {}),
    capture: vi.fn<WorkerLifecycleDeps['adapter']['capture']>(async () => 'screen line 1\nscreen line 2')
  }

  const lifecycle = createWorkerLifecycle({
    adapter,
    registry,
    profiles: new Map([['claude', makeProfile()]]),
    requireStore: () => store,
    getShortSession: () => 'session1',
    gitExec,
    exec,
    persistRegistry,
    reconcile,
    notify,
    options: {
      runHeadlessPath: '/opt/run-headless.mjs',
      nodePath: '/usr/bin/node',
      ackTimeoutMs: 20,
      shortId: () => 'abcd1234'
    },
    ...overrides
  })

  return { lifecycle, registry, store, adapter, gitExec, gitCalls, exec, persistRegistry, reconcile, notify }
}

describe('extractSessionId', () => {
  it('提取尾部最新的 session_id 或 thread_id', () => {
    expect(extractSessionId(undefined)).toBeUndefined()
    expect(extractSessionId('not-json\n{"thread_id":"th-1"}\n{"session_id":"se-2"}\n')).toBe('se-2')
    expect(extractSessionId('{"thread_id":"th-1"}\n{"other":true}\n')).toBe('th-1')
  })
})

describe('createWorkerLifecycle', () => {
  it('未知 agent 返回错误，不触碰 git 或 adapter', async () => {
    const { lifecycle, adapter, gitExec } = makeFixture()
    const result = await lifecycle.spawn(
      { agent: 'unknown', task: 'hi' },
      { hasUI: true, cwd: '/repo', ui: { confirm: async () => false } }
    )
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('未知 agent')
    expect(adapter.runBlock).not.toHaveBeenCalled()
    expect(gitExec).not.toHaveBeenCalled()
  })

  it('worktree 派发前写 brief 失败时自动回滚 worktree', async () => {
    const { lifecycle, store, gitCalls, registry } = makeFixture()
    vi.spyOn(store, 'writeBrief').mockRejectedValueOnce(new Error('disk full'))

    await expect(
      lifecycle.spawn(
        { agent: 'claude', task: 'build feature', use_worktree: true },
        { hasUI: true, cwd: '/repo', ui: { confirm: async () => true } }
      )
    ).rejects.toThrow('disk full')

    expect(gitCalls.some(args => args[0] === 'worktree' && args[1] === 'add')).toBe(true)
    expect(gitCalls.some(args => args[0] === 'worktree' && args[1] === 'remove')).toBe(true)
    expect(registry.list()).toHaveLength(0)
  })

  it('worktree 模式下 runBlock 失败时登记 unconfirmed 占位而非回滚', async () => {
    const { lifecycle, registry, adapter, persistRegistry } = makeFixture()
    vi.mocked(adapter.runBlock).mockRejectedValueOnce(new Error('rex rpc timeout'))

    const result = await lifecycle.spawn(
      { agent: 'claude', task: 'task', use_worktree: true },
      { hasUI: true, cwd: '/repo', ui: { confirm: async () => true } }
    )

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('已按「未确认」登记')
    expect(persistRegistry).toHaveBeenCalledTimes(1)
    const worker = registry.get('claude-abcd1234')
    expect(worker?.blockId).toBe('unconfirmed:claude-abcd1234')
    expect(worker?.status).toBe('closed')
  })

  it('sendInput 在 confirm 等待期间若 worker 被移除则拒绝继续投递', async () => {
    const { lifecycle, registry, adapter } = makeFixture()
    registry.register({
      workerId: 'w-1',
      agent: 'claude',
      mode: 'interactive',
      label: 'w-1',
      blockId: 'blk-1',
      turn: 1,
      cwd: '/repo',
      baseCommit: 'deadbeef',
      baseDirty: [],
      paused: true
    })

    const result = await lifecycle.sendInput(
      { worker_id: 'w-1', instruction: 'continue' },
      {
        hasUI: true,
        ui: {
          confirm: async () => {
            vi.spyOn(registry, 'get').mockReturnValueOnce(undefined)
            return true
          }
        }
      }
    )

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('未知 worker "w-1"')
    expect(adapter.send).not.toHaveBeenCalled()
  })

  it('headless 续跑创建新 Block、关闭旧 Block 并移除 retired 记录', async () => {
    const { lifecycle, store, registry, adapter } = makeFixture()
    await store.ensureWorkerDir('w-headless')
    vi.spyOn(store, 'readEvents').mockResolvedValueOnce('{"session_id":"session-99"}\n')
    registry.register(
      {
        workerId: 'w-headless',
        agent: 'claude',
        mode: 'headless',
        label: 'w-headless',
        blockId: 'blk-old',
        turn: 1,
        cwd: '/repo',
        baseCommit: 'deadbeef',
        baseDirty: [],
        paused: false
      },
      { initialStatus: 'idle' }
    )
    vi.mocked(adapter.runBlock).mockResolvedValueOnce({ windowId: 'win-1', blockIds: ['blk-new'] })

    const result = await lifecycle.sendInput(
      { worker_id: 'w-headless', instruction: 'next step' },
      { hasUI: true, ui: { confirm: async () => true } }
    )

    expect(result.isError).toBe(false)
    expect(result.content[0]?.text).toContain('旧 Tab 已自动回收')
    expect(adapter.blockClose).toHaveBeenCalledWith('blk-old')
    const updated = registry.get('w-headless')
    expect(updated?.blockId).toBe('blk-new')
    expect(updated?.turn).toBe(2)
    expect(updated?.retiredBlockIds).toEqual([])
  })

  it('interactive 投递未观察到状态跃迁时附带 capture 尾部诊断', async () => {
    const { lifecycle, store, registry, adapter } = makeFixture()
    await store.ensureWorkerDir('w-int')
    registry.register(
      {
        workerId: 'w-int',
        agent: 'claude',
        mode: 'interactive',
        label: 'w-int',
        blockId: 'blk-int',
        turn: 1,
        cwd: '/repo',
        baseCommit: 'deadbeef',
        baseDirty: [],
        paused: false
      },
      { initialStatus: 'idle' }
    )

    const result = await lifecycle.sendInput(
      { worker_id: 'w-int', instruction: 'follow up' },
      { hasUI: true, ui: { confirm: async () => true } }
    )

    expect(result.isError).toBe(false)
    expect(result.content[0]?.text).toContain('未观察到状态跃迁')
    expect(result.content[0]?.text).toContain('screen line 2')
    expect(adapter.capture).toHaveBeenCalledWith('blk-int', 30)
  })

  it('setPaused 更新暂停状态并持久化注册表', () => {
    const { lifecycle, registry, persistRegistry } = makeFixture()
    registry.register({
      workerId: 'w-p',
      agent: 'claude',
      mode: 'interactive',
      label: 'w-p',
      blockId: 'blk-p',
      turn: 1,
      cwd: '/repo',
      baseCommit: 'deadbeef',
      baseDirty: [],
      paused: false
    })

    expect(lifecycle.setPaused('missing', true)).toBe(false)
    expect(lifecycle.setPaused('w-p', true)).toBe(true)
    expect(registry.get('w-p')?.paused).toBe(true)
    expect(persistRegistry).toHaveBeenCalledTimes(1)
  })
})
