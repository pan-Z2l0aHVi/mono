/**
 * 桥接装配的端到端行为。
 *
 * 不碰真 Pi、不碰真 herdr、不碰真 pi-memory：全部经 `pi-mock` 与临时 git 仓库驱动。断言的是
 * 当前架构的可观察契约——
 *
 * 1. 未激活时零注册（worker pane 无痕）。
 * 2. `before_agent_start` 只注入 board 摘要，**不**注入编排记忆（钩子查不了 pi-memory）。
 * 3. 计划获批 / 审查拒绝只入队，不落盘；落盘必须经保存工具的 `executeTool`。
 * 4. 同一锚点重复触发只有一个键（pi-memory 的 upsert 语义 + 稳定 slot）。
 * 5. `orchestration_memory_recall` 从 pi-memory 读回本仓库的条目，并挡掉别的仓库。
 */

import { execFileSync } from 'node:child_process'
import { lstat, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vite-plus/test'

import {
  MAX_SETTLE_APPENDS,
  RECALL_TOOL_NAME,
  SAVE_TOOL_NAME,
  blockedToolsRemovedByTranscript,
  callToolVia,
  createBridge
} from '../bridge'
import type { Activation } from '../contracts'

import { createExecuteTool, createMockPi, type MockContext } from './pi-mock'

/**
 * 整套测试的共享板目录隔离。
 *
 * `session_start` 会调 `ensureSharedBoard(ctx.cwd)`，而它默认写到 `~/.pi/task-boards/`。
 * 没有这条隔离，跑一次测试就会在用户家目录下留一堆 `demo-*` 空目录——实测一次全量测试
 * 能造出几十个。`PI_TASK_BOARD_DIR` 必须在这里设，晚于任何一次 session_start。
 */
const TEST_BOARD_ROOT = await mkdtemp(join(tmpdir(), 'board-root-spec-'))
process.env.PI_TASK_BOARD_DIR = TEST_BOARD_ROOT

afterAll(async () => {
  delete process.env.PI_TASK_BOARD_DIR
  await rm(TEST_BOARD_ROOT, { recursive: true, force: true })
})

const ACTIVE: Activation = { active: true, paneId: 'w1:p1' }
const INACTIVE: Activation = { active: false, reason: 'worker-pane' }

const planDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'plan',
  approved: true,
  ledger: '/repo/.herdr-runs',
  slices: 2,
  ...overrides
})

const reviewDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'review',
  slice: 'bridge',
  verdict: 'REJECT',
  reason: 'no budget test',
  gaps: 'missing: budget spec',
  ...overrides
})

/** 造一个真实 git 仓库，因为身份解析读 `.git` 的目录形态。 */
const makeRepo = async (name = 'demo'): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'bridge-spec-'))
  const repo = join(root, name)
  await mkdir(repo, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repo })
  return repo
}

const baseCtx = (cwd: string): MockContext => ({ cwd, hasUI: false })

/** 主 checkout + linked worktree；共享板用例需要真实 worktree 布局。 */
const makeRepoWithWorktree = async (): Promise<{ main: string; worktree: string }> => {
  const root = await mkdtemp(join(tmpdir(), 'bridge-wt-spec-'))
  const main = join(root, 'demo-repo')
  await mkdir(main, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: main })
  execFileSync('git', ['config', 'user.email', 'spec@example.com'], { cwd: main })
  execFileSync('git', ['config', 'user.name', 'spec'], { cwd: main })
  await writeFile(join(main, 'README.md'), '# demo\n', 'utf8')
  execFileSync('git', ['add', '.'], { cwd: main })
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: main })

  const worktree = join(root, 'wt-branch')
  execFileSync('git', ['worktree', 'add', '-q', '-b', 'branch', worktree], { cwd: main })
  return { main, worktree }
}

/** 直接调用已注册的工具，绕开 Pi 的调度。 */
const runTool = async (
  pi: ReturnType<typeof createMockPi>,
  name: string,
  ctx: MockContext,
  params: Record<string, unknown>
) => {
  const tool = pi.tools.get(name)
  if (!tool) throw new Error(`tool not registered: ${name}`)
  return tool.execute('call-1', params as never, undefined, undefined, ctx as never)
}

describe('未激活时零注册', () => {
  it('不注册任何钩子、工具或命令', () => {
    const pi = createMockPi()
    const bridge = createBridge(pi, { activation: INACTIVE })

    expect(pi.events).toEqual([])
    expect(pi.tools.size).toBe(0)
    expect(pi.commands.size).toBe(0)
    expect(pi.notifications).toEqual([])
    expect(() => bridge.dispose()).not.toThrow()
  })

  it('dispose 幂等', () => {
    const pi = createMockPi()
    const bridge = createBridge(pi, { activation: INACTIVE })

    bridge.dispose()
    expect(() => bridge.dispose()).not.toThrow()
  })
})

describe('激活后注册', () => {
  it('注册全部钩子、保存与召回工具、诊断命令', () => {
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    expect(pi.events).toEqual([
      'session_start',
      'session_shutdown',
      'before_agent_start',
      'tool_call',
      'tool_result',
      'agent_before_settle'
    ])
    expect([...pi.tools.keys()].sort()).toEqual([RECALL_TOOL_NAME, SAVE_TOOL_NAME].sort())
    expect([...pi.commands.keys()].sort()).toEqual(['orchestration-memory', 'shepherd'].sort())
  })

  it('两个工具都是 model-only，不让 codemode 脚本调用', () => {
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    expect(pi.tools.get(SAVE_TOOL_NAME)?.exposure).toBe('model-only')
    expect(pi.tools.get(RECALL_TOOL_NAME)?.exposure).toBe('model-only')
  })

  it('召回工具的指引写明「记忆不会自动注入」', () => {
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })
    const recall = pi.tools.get(RECALL_TOOL_NAME)

    expect(recall?.description).toContain('not injected')
    expect(recall?.promptGuidelines?.join(' ')).toContain('not injected automatically')
  })
})

describe('session_start', () => {
  it('通知一次激活，带仓库身份键', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))

    const text = pi.notifications.join('\n')
    expect(text).toContain('active')
    expect(text).toMatch(/repo: demo-[0-9a-f]{6}/)
  })

  it('在 linked worktree 里建共享板并通知', async () => {
    const { worktree } = await makeRepoWithWorktree()
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    await pi.emit('session_start', { type: 'session_start' }, baseCtx(worktree))

    expect(pi.notifications.join('\n')).toContain('task board shared across worktrees')
    expect((await lstat(join(worktree, '.pi'))).isSymbolicLink()).toBe(true)
  })

  it('.pi 里有其他条目时只提示不迁移', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    await mkdir(join(worktree, '.pi'), { recursive: true })
    await writeFile(join(worktree, '.pi', 'settings.json'), '{}\n', 'utf8')
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    await pi.emit('session_start', { type: 'session_start' }, baseCtx(worktree))

    expect(pi.notifications.join('\n')).toContain('task board not shared')
    expect((await lstat(join(worktree, '.pi'))).isDirectory()).toBe(true)
    await expect(lstat(join(main, '.pi'))).rejects.toThrow(/ENOENT/)
  })
})

describe('before_agent_start 注入', () => {
  it('无 board 时不写 orchestration 段', async () => {
    const repo = await makeRepo()
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    const sections: Record<string, string> = {}
    await pi.emit(
      'before_agent_start',
      { type: 'before_agent_start', systemPromptOptions: { sections } },
      baseCtx(repo)
    )

    expect(sections.orchestration).toBeUndefined()
  })

  it('有 board 时只注入 board 摘要', async () => {
    const repo = await makeRepo('demo')
    await mkdir(join(repo, '.pi'), { recursive: true })
    await writeFile(
      join(repo, '.pi', 'task-board.json'),
      JSON.stringify({
        version: 2,
        nextPanelId: 2,
        nextTaskId: 2,
        lastPanelId: 'P-1',
        panels: [
          {
            id: 'P-1',
            name: 'orchestration',
            tasks: [{ id: 'T-1', title: 'slice: x', status: 'in_progress', sessions: [] }]
          }
        ]
      }),
      'utf8'
    )

    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    const sections: Record<string, string> = {}
    await pi.emit(
      'before_agent_start',
      { type: 'before_agent_start', systemPromptOptions: { sections } },
      baseCtx(repo)
    )

    expect(sections.orchestration).toContain('Board (orchestration)')
    expect(sections.orchestration).toContain('T-1')
  })

  it('从不注入编排记忆（那需要本地缓存，已移除）', async () => {
    const repo = await makeRepo()
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    const sections: Record<string, string> = {}
    await pi.emit(
      'before_agent_start',
      { type: 'before_agent_start', systemPromptOptions: { sections } },
      baseCtx(repo)
    )

    expect(sections.orchestration ?? '').not.toContain('orchestration.rejection')
    expect(sections.orchestration ?? '').not.toContain('orchestration.decision')
  })

  it('不往 transcript 追加消息：钩子返回 undefined', async () => {
    const repo = await makeRepo()
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })

    const result = await pi.emit(
      'before_agent_start',
      { type: 'before_agent_start', systemPromptOptions: { sections: {} } },
      baseCtx(repo)
    )

    expect(result).toBeUndefined()
  })
})

describe('tool_result 只入队', () => {
  const withStart = async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    return { repo, pi }
  }

  it('plan 获批后 settle 要求保存', async () => {
    const { repo, pi } = await withStart()

    await pi.emit('tool_result', { toolName: 'herdr_plan', details: planDetails() }, baseCtx(repo))
    const settle = (await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))) as
      | { continue?: boolean; entries?: Array<{ content: string }> }
      | undefined

    expect(settle?.continue).toBe(true)
    expect(settle?.entries?.[0]?.content).toContain(SAVE_TOOL_NAME)
  })

  it('APPROVE 不产生锚点', async () => {
    const { repo, pi } = await withStart()

    await pi.emit(
      'tool_result',
      { toolName: 'herdr_review', details: reviewDetails({ verdict: 'APPROVE' }) },
      baseCtx(repo)
    )
    const settle = await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))

    // board 侧仍会有动作（APPROVE 推进任务），但记忆侧没有锚点。
    const settleText = JSON.stringify(settle ?? {})
    expect(settleText).not.toContain('rejection')
  })

  it('herdr_watch done 把对应 slice 推进 in_review', async () => {
    const { repo, pi } = await withStart()

    await pi.emit(
      'tool_result',
      { toolName: 'herdr_watch', details: { action: 'watch', name: 'worker-a', status: 'done', elapsedMs: 5 } },
      baseCtx(repo)
    )
    const settle = (await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))) as
      | { continue?: boolean; entries?: Array<{ content: string }> }
      | undefined

    expect(settle?.continue).toBe(true)
    expect(settle?.entries?.[0]?.content).toContain('board move_task "slice: worker-a" -> in_review')
  })

  it('herdr_watch blocked 留在 in_progress', async () => {
    const { repo, pi } = await withStart()

    await pi.emit(
      'tool_result',
      { toolName: 'herdr_watch', details: { action: 'watch', name: 'worker-a', status: 'blocked', elapsedMs: 5 } },
      baseCtx(repo)
    )
    const settle = (await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))) as
      | { continue?: boolean; entries?: Array<{ content: string }> }
      | undefined

    expect(settle?.entries?.[0]?.content).toContain('board move_task "slice: worker-a" -> in_progress')
  })

  it('其他工具不产生锚点', async () => {
    const { repo, pi } = await withStart()

    await pi.emit('tool_result', { toolName: 'bash', details: { approved: true } }, baseCtx(repo))
    const settle = await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))

    expect(settle).toBeUndefined()
  })

  it('锚点入队后未调用保存工具时，pi-memory 一次都没被调用', async () => {
    const { repo, pi } = await withStart()
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    void createExecuteTool({ results: {}, calls })

    await pi.emit('tool_result', { toolName: 'herdr_plan', details: planDetails() }, baseCtx(repo))
    await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))

    expect(calls).toEqual([])
  })
})

describe('agent_before_settle', () => {
  it('无 pending 时不追加回合', async () => {
    const repo = await makeRepo()
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))

    expect(await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))).toBeUndefined()
  })

  it('有 pending 时返回 continue 并追加一条隐藏指令', async () => {
    const repo = await makeRepo()
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    await pi.emit('tool_result', { toolName: 'herdr_plan', details: planDetails() }, baseCtx(repo))

    const result = (await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))) as {
      continue?: boolean
      entries?: Array<{ type: string; customType: string; content: string; display: boolean }>
    }

    expect(result.continue).toBe(true)
    expect(result.entries?.[0]?.customType).toBe('orchestration-memory-pending')
    expect(result.entries?.[0]?.display).toBe(false)
    expect(result.entries?.[0]?.content).toContain(SAVE_TOOL_NAME)
  })

  /**
   * 失败路径：`pi-memory` 缺失时 `memory_remember` 是未知工具，保存工具每次都失败，
   * pending 永远非空。Pi 的 run 循环没有次数上限，不设上限就会一直追加模型回合。
   */
  it('写入持续失败时，超过追加上限后丢弃 pending 并停止追加回合', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    await pi.emit('tool_result', { toolName: 'herdr_plan', details: planDetails() }, baseCtx(repo))

    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        results: {
          memory_remember: { content: [{ type: 'text', text: 'unknown tool: memory_remember' }], isError: true }
        }
      })
    }

    for (let round = 0; round < MAX_SETTLE_APPENDS; round += 1) {
      expect(await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))).toBeDefined()
      expect((await runTool(pi, SAVE_TOOL_NAME, ctx, { flush: true })).isError).toBe(true)
    }

    // 第 MAX_SETTLE_APPENDS + 1 轮：锚点被丢弃，队列清空，不再追加模型回合。
    expect(await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))).toBeUndefined()

    const notice = pi.notifications.join('\n')
    expect(notice).toContain(`dropped 1 pending orchestration entry after ${MAX_SETTLE_APPENDS} save attempts`)
    expect(notice).toContain('last save error')
    expect(notice).toContain('unknown tool: memory_remember')
  })

  it('board 动作持续失败时同样在超过上限后丢弃', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    await pi.emit(
      'tool_result',
      { toolName: 'herdr_dispatch', details: { action: 'dispatch', name: 'worker-a', role: 'builder' } },
      baseCtx(repo)
    )

    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        results: { task_board: { content: [{ type: 'text', text: 'board unavailable' }], isError: true } }
      })
    }

    for (let round = 0; round < MAX_SETTLE_APPENDS; round += 1) {
      expect(await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))).toBeDefined()
      expect((await runTool(pi, SAVE_TOOL_NAME, ctx, { flush: true })).isError).toBe(true)
    }

    expect(await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))).toBeUndefined()
    expect(pi.notifications.join('\n')).toContain('board add_task "slice: worker-a"')
  })
})

describe('保存工具', () => {
  const withPending = async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    await pi.emit('tool_result', { toolName: 'herdr_plan', details: planDetails() }, baseCtx(repo))
    return { repo, pi }
  }

  it('flush 把 pending 写进 pi-memory，键是全局形式（不以 project. 开头）', async () => {
    const { repo, pi } = await withPending()
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        calls,
        results: {
          memory_remember: { content: [{ type: 'text', text: 'Remembered' }] },
          memory_pin: { content: [{ type: 'text', text: 'Unpinned' }] }
        }
      })
    }

    const result = await runTool(pi, SAVE_TOOL_NAME, ctx, { flush: true })
    expect(result.isError).toBe(false)
    const remember = calls.filter(call => call.name === 'memory_remember')
    expect(remember).toHaveLength(1)
    const key = String(remember[0]?.args.key)
    expect(key).toMatch(/^orchestration\.demo-[0-9a-f]{6}\.decision\.[0-9a-f]{16}$/)
    // 关键：不能带 project. 前缀，否则会被 pi-memory 按 worktree slug 拦下。
    expect(key.startsWith('project.')).toBe(false)
    // 写入不会清 pinned 列，flush 后必须主动撤销旧 pin。
    const unpin = calls.filter(call => call.name === 'memory_pin')
    expect(unpin).toEqual([{ name: 'memory_pin', args: { action: 'unpin', key } }])
  })

  it('重复 flush 不重复写同一个键（幂等）', async () => {
    const { repo, pi } = await withPending()
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        calls,
        results: {
          memory_remember: { content: [{ type: 'text', text: 'Remembered' }] },
          memory_pin: { content: [{ type: 'text', text: 'Unpinned' }] }
        }
      })
    }

    await runTool(pi, SAVE_TOOL_NAME, ctx, { flush: true })
    await runTool(pi, SAVE_TOOL_NAME, ctx, { flush: true })

    expect(calls.filter(call => call.name === 'memory_remember')).toHaveLength(1)
  })

  it('pi-memory 失败时保留 pending 并返回 isError', async () => {
    const { repo, pi } = await withPending()
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        results: { memory_remember: { content: [{ type: 'text', text: 'key rejected' }], isError: true } }
      })
    }

    const result = await runTool(pi, SAVE_TOOL_NAME, ctx, { flush: true })
    expect(result.isError).toBe(true)
    expect(await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))).toBeDefined()
  })

  it('没有 executeTool 时失败', async () => {
    const { repo, pi } = await withPending()
    expect((await runTool(pi, SAVE_TOOL_NAME, baseCtx(repo), { flush: true })).isError).toBe(true)
  })

  it('显式决策默认不 pin', async () => {
    const { repo, pi } = await withPending()
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        calls,
        results: {
          memory_remember: { content: [{ type: 'text', text: 'ok' }] },
          // 从未 pin 过的键，pi-memory 就是这么回：那是目标态，不是失败。
          memory_pin: { content: [{ type: 'text', text: 'Fact not found or not pinned' }], isError: true }
        }
      })
    }

    const result = await runTool(pi, SAVE_TOOL_NAME, ctx, { key: 'manual-decision', value: 'use recall' })

    expect(result.isError).toBe(false)
    const explicit = calls.find(call => call.name === 'memory_remember' && String(call.args.value) === 'use recall')
    expect(explicit).toBeDefined()
    expect(explicit?.args.pinned).toBeUndefined()
    expect(String(explicit?.args.key).startsWith('project.')).toBe(false)
    // 即使本次没 pin，也要撤销旧版本或手工留下的 pin。
    const unpin = calls.find(call => call.name === 'memory_pin')
    expect(unpin?.args).toEqual({ action: 'unpin', key: explicit?.args.key })
  })

  it('显式请求 pin 时写入后仍会撤销 pin', async () => {
    const { repo, pi } = await withPending()
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        calls,
        results: {
          memory_remember: { content: [{ type: 'text', text: 'ok' }] },
          memory_pin: { content: [{ type: 'text', text: 'Unpinned' }] }
        }
      })
    }

    const result = await runTool(pi, SAVE_TOOL_NAME, ctx, { key: 'manual-decision', value: 'use recall', pin: true })

    expect(result.isError).toBe(false)
    const explicitIndex = calls.findIndex(
      call => call.name === 'memory_remember' && String(call.args.value) === 'use recall'
    )
    expect(explicitIndex).toBeGreaterThanOrEqual(0)
    expect(calls[explicitIndex]?.args.pinned).toBe(true)
    // 编排键是全局键，pin 会注入到所有仓库，写入后必须立刻撤销。
    const unpin = calls.find((call, index) => index > explicitIndex && call.name === 'memory_pin')
    expect(unpin?.args).toEqual({ action: 'unpin', key: calls[explicitIndex]?.args.key })
  })

  it('unpin 真实失败时返回 isError，不静默留下 pinned 键', async () => {
    const { repo, pi } = await withPending()
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        results: {
          memory_remember: { content: [{ type: 'text', text: 'ok' }] },
          memory_pin: { content: [{ type: 'text', text: 'store is locked' }], isError: true }
        }
      })
    }

    const result = await runTool(pi, SAVE_TOOL_NAME, ctx, { key: 'manual-decision', value: 'use recall', pin: true })

    expect(result.isError).toBe(true)
    expect(String(result.content?.[0]?.text)).toContain('store is locked')
  })
})

describe('召回工具', () => {
  const withStart = async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi()
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    return { repo, pi }
  }

  const runRecall = async (
    pi: ReturnType<typeof createMockPi>,
    ctx: MockContext,
    params: Record<string, unknown> = {}
  ) => {
    const tool = pi.tools.get(RECALL_TOOL_NAME)
    if (!tool) throw new Error('recall tool not registered')
    return tool.execute('call-1', params as never, undefined, undefined, ctx as never)
  }

  it('从 pi-memory 读回本仓库的条目', async () => {
    const { repo, pi } = await withStart()
    const identity = (await import('../repo-identity')).resolveRepoIdentity(repo)
    const text = [
      `orchestration.${identity.key}.rejection.aaaaaaaaaaaaaaaa: REJECT on slice x: no tests (confidence: 0.95, source: user)`,
      `orchestration.${identity.key}.decision.bbbbbbbbbbbbbbbb: approved plan | 1 slice(s) (confidence: 0.95, source: user)`
    ].join('\n')
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({ results: { memory_search: { content: [{ type: 'text', text }] } } })
    }

    const result = await runRecall(pi, ctx)
    expect(result.isError).toBe(false)
    const content = String(result.content?.[0]?.text ?? '')
    expect(content).toContain('rejection.aaaaaaaaaaaaaaaa')
    expect(content).toContain('decision.bbbbbbbbbbbbbbbb')
    expect(content).toContain('2 item(s)')
  })

  it('挡掉别的仓库的编排条目', async () => {
    const { repo, pi } = await withStart()
    const text = [
      'orchestration.other-repo-123456.rejection.cccccccccccccccc: other repo leak',
      'workflow.some-global-fact: harmless'
    ].join('\n')
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({ results: { memory_search: { content: [{ type: 'text', text }] } } })
    }

    const result = await runRecall(pi, ctx)
    const content = String(result.content?.[0]?.text ?? '')
    expect(content).not.toContain('other repo leak')
    expect(content).toContain('No orchestration memory recorded')
  })

  it('memory_search 失败时返回 isError 与原因', async () => {
    const { repo, pi } = await withStart()
    const ctx: MockContext = {
      ...baseCtx(repo),
      executeTool: createExecuteTool({
        results: { memory_search: { content: [{ type: 'text', text: 'store not initialized' }], isError: true } }
      })
    }

    const result = await runRecall(pi, ctx)
    expect(result.isError).toBe(true)
    expect(String(result.content?.[0]?.text)).toContain('store not initialized')
  })

  it('未激活时不注册召回工具', () => {
    const pi = createMockPi()
    createBridge(pi, { activation: INACTIVE })
    expect(pi.tools.has(RECALL_TOOL_NAME)).toBe(false)
  })
})

describe('dispose', () => {
  it('清空 pending，之后的 settle 不再追加回合', async () => {
    const repo = await makeRepo()
    const pi = createMockPi()
    const bridge = createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    await pi.emit('tool_result', { toolName: 'herdr_plan', details: planDetails() }, baseCtx(repo))

    bridge.dispose()

    expect(await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, baseCtx(repo))).toBeUndefined()
  })
})

/**
 * `callToolVia` 的产出提取。
 *
 * 实测缺陷：嵌套调用 `task_board` 时 `content` 是空的，真正的 JSON 在 `details.summary`。
 * 只读 `content` 会让 `get_panel` 静默返回空串，查重永远失败。
 */
describe('callToolVia 产出提取', () => {
  const ctxWith = (outcome: Record<string, unknown>) =>
    ({ cwd: '/repo', hasUI: false, executeTool: async () => outcome }) as never

  it('优先取 content 的文本', async () => {
    expect(await callToolVia(ctxWith({ content: [{ type: 'text', text: 'hello' }] }), 'x', {})).toEqual({
      ok: true,
      text: 'hello'
    })
  })

  /**
   * 真实形状：`{ toolCall, result: { content }, isError, durationMs }`。
   *
   * 读错层级的表现是「写入成功但读取恒空」——曾经让任务板查重永远失败。这条用例钉住层级。
   */
  it('读嵌套的 result.content（真实形状）', async () => {
    const result = await callToolVia(
      ctxWith({
        toolCall: { name: 'memory_search' },
        result: { content: [{ type: 'text', text: 'nested payload' }] },
        isError: false,
        durationMs: 1
      }),
      'x',
      {}
    )

    expect(result).toEqual({ ok: true, text: 'nested payload' })
  })

  it('嵌套形状下 isError 在顶层时也生效', async () => {
    const result = await callToolVia(
      ctxWith({ result: { content: [{ type: 'text', text: 'failed' }] }, isError: true }),
      'x',
      {}
    )

    expect(result.ok).toBe(false)
    expect(result.text).toBe('failed')
  })

  it('嵌套形状下 isError 在 result 内层时也生效', async () => {
    const result = await callToolVia(
      ctxWith({ result: { content: [{ type: 'text', text: 'failed' }], isError: true } }),
      'x',
      {}
    )

    expect(result.ok).toBe(false)
  })

  it('content 为空时回退到 structuredContent', async () => {
    const result = await callToolVia(
      ctxWith({ content: [], structuredContent: { tasks: [{ id: 'T-1', title: 'a' }] } }),
      'x',
      {}
    )
    expect(result.ok).toBe(true)
    expect(result.text).toContain('"T-1"')
  })

  it('content 为空且无 structuredContent 时回退到 details.summary', async () => {
    const result = await callToolVia(ctxWith({ content: [], details: { summary: '{"tasks":[]}' } }), 'x', {})
    expect(result.text).toBe('{"tasks":[]}')
  })

  it('三处都为空时返回空串而不是抛错', async () => {
    expect(await callToolVia(ctxWith({ content: [] }), 'x', {})).toEqual({ ok: true, text: '' })
  })

  it('isError 原样透传', async () => {
    const result = await callToolVia(ctxWith({ content: [], isError: true, details: { summary: 'boom' } }), 'x', {})
    expect(result.ok).toBe(false)
    expect(result.text).toBe('boom')
  })

  it('没有 executeTool 时明确失败', async () => {
    const result = await callToolVia({ cwd: '/repo' } as never, 'x', {})
    expect(result.ok).toBe(false)
    expect(result.text).toContain('unavailable')
  })
})

/**
 * `/shepherd` 协调者模式的装配层行为。
 *
 * 断言落在「工具集真的变了」与「钩子真的拦了」上，而不是「指令文本里写了什么」——
 * 后者只测文本，前者才测约束。
 */
describe('/shepherd 协调者模式', () => {
  const ALL = ['read', 'bash', 'edit', 'write', 'grep', 'herdr_plan', 'herdr_dispatch']

  const setup = async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi([...ALL])
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    // 命令 handler 拿到的是调用方传入的 ctx，不像 emit 那样自动注入 mock ui，
    // 所以要自己接一个把 notify / setStatus 记到 pi 上的 ctx。
    const ui: MockContext['ui'] = {
      notify(message) {
        pi.notifications.push(message)
      },
      setStatus(key, text) {
        pi.statuses.push({ key, text })
      }
    }
    const ctx: MockContext = { cwd: repo, hasUI: true, ui }
    return { repo, pi, ctx }
  }

  const runCommand = async (pi: ReturnType<typeof createMockPi>, ctx: MockContext, args: string) => {
    const command = pi.commands.get('shepherd')
    if (!command) throw new Error('shepherd command not registered')
    await command.handler(args, ctx as never)
  }

  it('开启后从工具集移除 edit 与 write', async () => {
    const { repo, pi } = await setup()

    await runCommand(pi, baseCtx(repo), 'on')

    expect(pi.activeTools).toEqual(['read', 'bash', 'grep', 'herdr_plan', 'herdr_dispatch'])
  })

  it('再关闭后原样恢复', async () => {
    const { repo, pi } = await setup()

    await runCommand(pi, baseCtx(repo), 'on')
    await runCommand(pi, baseCtx(repo), 'off')

    expect(pi.activeTools).toEqual(ALL)
  })

  it('无参数时切换：未开启则开，已开启则关', async () => {
    const { repo, pi } = await setup()

    await runCommand(pi, baseCtx(repo), '')
    expect(pi.activeTools).not.toContain('edit')

    await runCommand(pi, baseCtx(repo), '')
    expect(pi.activeTools).toContain('edit')
  })

  it('重复开启不覆盖已保存的原始工具集', async () => {
    const { repo, pi } = await setup()

    await runCommand(pi, baseCtx(repo), 'on')
    await runCommand(pi, baseCtx(repo), 'on') // 第二次是 no-op
    await runCommand(pi, baseCtx(repo), 'off')

    expect(pi.activeTools).toEqual(ALL)
  })

  it('开启后 tool_call 钩子拦截 edit', async () => {
    const { repo, pi } = await setup()
    await runCommand(pi, baseCtx(repo), 'on')

    const result = (await pi.emit('tool_call', { toolName: 'edit', input: {} }, baseCtx(repo))) as
      | { block?: boolean; reason?: string }
      | undefined

    expect(result?.block).toBe(true)
    expect(result?.reason).toContain('herdr_plan')
  })

  it('开启后 tool_call 钩子拦截 write', async () => {
    const { repo, pi } = await setup()
    await runCommand(pi, baseCtx(repo), 'on')

    const result = (await pi.emit('tool_call', { toolName: 'write', input: {} }, baseCtx(repo))) as
      | { block?: boolean }
      | undefined

    expect(result?.block).toBe(true)
  })

  it('关闭时不拦截', async () => {
    const { repo, pi } = await setup()

    const result = await pi.emit('tool_call', { toolName: 'edit', input: {} }, baseCtx(repo))
    expect(result).toBeUndefined()
  })

  it('开启时也不拦非 edit/write 的工具', async () => {
    const { repo, pi } = await setup()
    await runCommand(pi, baseCtx(repo), 'on')

    for (const toolName of ['read', 'bash', 'herdr_plan']) {
      expect(await pi.emit('tool_call', { toolName, input: {} }, baseCtx(repo))).toBeUndefined()
    }
  })

  it('开启后注入 shepherd 段，关闭后删除', async () => {
    const { repo, pi } = await setup()

    const on: Record<string, string> = {}
    await runCommand(pi, baseCtx(repo), 'on')
    await pi.emit(
      'before_agent_start',
      { type: 'before_agent_start', systemPromptOptions: { sections: on } },
      baseCtx(repo)
    )
    expect(on.shepherd).toContain('<shepherd-mode>')

    const off: Record<string, string> = { shepherd: 'stale' }
    await runCommand(pi, baseCtx(repo), 'off')
    await pi.emit(
      'before_agent_start',
      { type: 'before_agent_start', systemPromptOptions: { sections: off } },
      baseCtx(repo)
    )
    expect(off.shepherd).toBeUndefined()
  })

  it('session_shutdown 时恢复工具集（reload 后 edit 不会永久消失）', async () => {
    const { repo, pi } = await setup()

    await runCommand(pi, baseCtx(repo), 'on')
    expect(pi.activeTools).not.toContain('edit')

    // Pi 在 reload 时向旧 runner 发 session_shutdown，然后才用旧 runner 的激活工具集构建
    // 新 runtime；所以恢复必须发生在这里，而不是工厂返回值上。
    await pi.emit('session_shutdown', { type: 'session_shutdown', reason: 'reload' }, baseCtx(repo))

    expect(pi.activeTools).toEqual(ALL)
  })

  it('session_shutdown 后再 session_start，edit/write 仍在激活集里', async () => {
    const { repo, pi } = await setup()

    await runCommand(pi, baseCtx(repo), 'on')
    await pi.emit('session_shutdown', { type: 'session_shutdown', reason: 'reload' }, baseCtx(repo))
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))

    expect(pi.activeTools).toEqual(ALL)
    expect(pi.activeTools).toEqual(expect.arrayContaining(['edit', 'write']))
  })

  it('session_shutdown 与 dispose 可重复调用而不抛错', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi([...ALL])
    const bridge = createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    await runCommand(pi, baseCtx(repo), 'on')

    await pi.emit('session_shutdown', { type: 'session_shutdown', reason: 'reload' }, baseCtx(repo))
    await pi.emit('session_shutdown', { type: 'session_shutdown', reason: 'quit' }, baseCtx(repo))
    expect(() => bridge.dispose()).not.toThrow()

    expect(pi.activeTools).toEqual(ALL)
  })
})

/**
 * resume-from-transcript。
 *
 * `/shepherd on` 之后退出 Pi，再用 `pi -c` 恢复该会话：Pi 在构造 `AgentSession` 时就按
 * transcript 重放了 loadout（`_restoreToolsFromTranscript`），edit / write 在 `session_start`
 * 之前已经是未激活。`session_shutdown` 的还原只覆盖同进程的 reload / 退出，所以修复必须发生
 * 在 `session_start`。判定只认同一条恢复路径的签名：transcript 记录显示两个工具都被摘掉，
 * 且当前都不在激活集里。
 */
describe('resume-from-transcript 后补回 edit/write', () => {
  const systemMessage = (declaration: Record<string, unknown>) => ({
    type: 'message',
    message: { role: 'system', ...declaration }
  })
  const removedBoth = [systemMessage({ toolsRemoved: [{ name: 'edit' }, { name: 'write' }] })]

  const resumeCtx = (cwd: string, branch: unknown): MockContext => ({
    ...baseCtx(cwd),
    sessionManager: { getBranch: () => branch }
  })

  it('transcript 记录两个工具都被摘掉、且当前未激活时补回', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi(['read', 'bash', 'grep'])
    createBridge(pi, { activation: ACTIVE })

    await pi.emit('session_start', { type: 'session_start', reason: 'startup' }, resumeCtx(repo, removedBoth))

    expect(pi.activeTools).toEqual(['read', 'bash', 'grep', 'edit', 'write'])
  })

  it('transcript 后来又加回过时不重复补', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi(['read', 'bash', 'grep'])
    createBridge(pi, { activation: ACTIVE })
    const branch = [...removedBoth, systemMessage({ toolsAdded: [{ name: 'edit' }, { name: 'write' }] })]

    await pi.emit('session_start', { type: 'session_start', reason: 'startup' }, resumeCtx(repo, branch))

    expect(pi.activeTools).toEqual(['read', 'bash', 'grep'])
  })

  it('transcript 只摘掉一个工具时不补（不是 /shepherd 的签名）', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi(['read', 'bash', 'grep'])
    createBridge(pi, { activation: ACTIVE })
    const branch = [systemMessage({ toolsRemoved: [{ name: 'write' }] })]

    await pi.emit('session_start', { type: 'session_start', reason: 'startup' }, resumeCtx(repo, branch))

    expect(pi.activeTools).toEqual(['read', 'bash', 'grep'])
  })

  it('从未激活过的工具不动手（例如 settings 的 defaultTools 不含 edit/write）', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi(['read', 'bash', 'grep'])
    createBridge(pi, { activation: ACTIVE })

    await pi.emit('session_start', { type: 'session_start', reason: 'startup' }, resumeCtx(repo, []))

    expect(pi.activeTools).toEqual(['read', 'bash', 'grep'])
  })

  it('工具本来就在激活集里时不重复添加', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi(['read', 'edit', 'bash', 'write'])
    createBridge(pi, { activation: ACTIVE })

    await pi.emit('session_start', { type: 'session_start', reason: 'startup' }, resumeCtx(repo, removedBoth))

    expect(pi.activeTools).toEqual(['read', 'edit', 'bash', 'write'])
  })

  it('读不到或读错会话分支时维持现状且不抛错', async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi(['read', 'bash'])
    createBridge(pi, { activation: ACTIVE })

    await expect(
      pi.emit(
        'session_start',
        { type: 'session_start', reason: 'startup' },
        {
          ...baseCtx(repo),
          sessionManager: {
            getBranch() {
              throw new Error('session not persisted')
            }
          }
        }
      )
    ).resolves.toBeUndefined()
    expect(pi.activeTools).toEqual(['read', 'bash'])
  })

  it('形状不认识的条目按没有声明处理', () => {
    expect(
      blockedToolsRemovedByTranscript([
        null,
        { type: 'message' },
        { type: 'message', message: { role: 'user', toolsRemoved: [{ name: 'edit' }] } },
        { type: 'custom', customType: 'x' },
        { type: 'message', message: { role: 'system', toolsRemoved: [null, { name: 42 }] } }
      ])
    ).toEqual([])
    expect(blockedToolsRemovedByTranscript(undefined)).toEqual([])
  })
})

/**
 * 状态可见性。
 *
 * `/shepherd` 无参数是切换语义，用户没法从命令本身推断当前值，所以状态栏是唯一的常驻提示。
 * 另外 `status` 子命令要能在切换之前报到当前值。
 */
describe('/shepherd 状态可见性', () => {
  const ALL = ['read', 'bash', 'edit', 'write', 'herdr_plan']

  const setup = async () => {
    const repo = await makeRepo('demo')
    const pi = createMockPi([...ALL])
    createBridge(pi, { activation: ACTIVE })
    await pi.emit('session_start', { type: 'session_start' }, baseCtx(repo))
    // 命令 handler 拿到的是调用方传入的 ctx，不像 emit 那样自动注入 mock ui，
    // 所以要自己接一个把 notify / setStatus 记到 pi 上的 ctx。
    const ui: MockContext['ui'] = {
      notify(message) {
        pi.notifications.push(message)
      },
      setStatus(key, text) {
        pi.statuses.push({ key, text })
      }
    }
    const ctx: MockContext = { cwd: repo, hasUI: true, ui }
    return { repo, pi, ctx }
  }

  const runCommand = async (pi: ReturnType<typeof createMockPi>, ctx: MockContext, args: string) => {
    const command = pi.commands.get('shepherd')
    if (!command) throw new Error('shepherd command not registered')
    await command.handler(args, ctx as never)
  }

  it('session_start 时清掉残留的状态栏', async () => {
    const { pi } = await setup()

    const last = pi.statuses.at(-1)
    expect(last?.key).toBe('shepherd')
    expect(last?.text).toBeUndefined()
  })

  it('开启后状态栏显示 SHEPHERD', async () => {
    const { pi, ctx } = await setup()

    await runCommand(pi, ctx, 'on')

    const last = pi.statuses.at(-1)
    expect(last?.key).toBe('shepherd')
    expect(last?.text).toContain('SHEPHERD')
  })

  it('关闭后状态栏被清除', async () => {
    const { pi, ctx } = await setup()

    await runCommand(pi, ctx, 'on')
    await runCommand(pi, ctx, 'off')

    expect(pi.statuses.at(-1)?.text).toBeUndefined()
  })

  it('status 子命令报告当前值，且不切换', async () => {
    const { pi, ctx } = await setup()

    await runCommand(pi, ctx, 'status')
    expect(pi.notifications.at(-1)).toContain('shepherd mode: OFF')
    expect(pi.activeTools).toContain('edit')

    await runCommand(pi, ctx, 'on')
    await runCommand(pi, ctx, 'status')
    expect(pi.notifications.at(-1)).toContain('shepherd mode: ON')
    expect(pi.notifications.at(-1)).toContain('edit, write')
    expect(pi.activeTools).not.toContain('edit')
  })

  it('重复切换时也报告当前状态，而不是只说 already', async () => {
    const { pi, ctx } = await setup()

    await runCommand(pi, ctx, 'on')
    await runCommand(pi, ctx, 'on')

    const last = pi.notifications.at(-1) ?? ''
    expect(last).toContain('already in')
    expect(last).toContain('shepherd mode: ON')
  })

  it('没有 UI 的 ctx 不抛错', async () => {
    const { repo, pi } = await setup()

    await expect(runCommand(pi, { cwd: repo, hasUI: false, ui: undefined }, 'on')).resolves.toBeUndefined()
  })
})
