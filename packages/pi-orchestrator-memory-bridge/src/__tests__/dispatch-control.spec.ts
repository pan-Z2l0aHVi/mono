/**
 * 编排控制：并发上限与独立 tab。
 *
 * 两件事都发生在 `herdr_dispatch` / `herdr_review` 前后，但断言分开：
 *
 * 1. **并发**：只统计正在跑的 worker（`working` / `blocked`），historical idle pane 不占槽位；
 *    reviewer 不计入 worker 上限；上限从 config.json 的 `shepherd` 段读，非法值回退 4；
 *    `herdr agent list` 查询失败 fail open。
 * 2. **tab**：dispatch / review 成功后把对应 pane 移到新 tab，label 带 slice 名；zoomed 被拒
 *    时先 `herdr pane zoom --off` 再重试一次，取消 zoom 自身失败只通知；`separateTabs: false`
 *    时完全不动 layout。
 *
 * 全部用注入的假 reader / mover，不真起 herdr、不碰真实会话。
 */

import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

import { createBridge, type BridgeOptions, type DispatchControlDeps } from '../bridge'
import type { Activation, HerdrAgentEntry } from '../contracts'
import { evaluateDispatchLimit, runningAgents, type DispatchLimitVerdict } from '../dispatch/concurrency'
import { DEFAULT_MAX_CONCURRENT_WORKERS, parseControlConfig, readControlConfig } from '../dispatch/config'
import {
  paneMoveArgs,
  paneZoomOffArgs,
  parsePaneMoveResult,
  tabMoveRequestFor,
  type PaneMoveOutcome,
  type PaneZoomClearOutcome
} from '../dispatch/tabs'

import { createMockPi, type MockContext } from './pi-mock'

/** D5 断言：tool_result 处理器返回的 content 里带 `[bridge]` 注释行。 */
function expectBridgeAnnotation(result: unknown): void {
  const content = (result as { content?: ReadonlyArray<{ text?: string }> } | undefined | null)?.content
  expect(content).toBeDefined()
  expect(content!.some(part => typeof part?.text === 'string' && part.text.startsWith('[bridge] '))).toBe(true)
}

const ACTIVE: Activation = { active: true, paneId: 'w1:p1' }

const entry = (name: string, status: string): HerdrAgentEntry => ({
  name,
  agent_status: status,
  pane_id: `w1:${name}`
})

/** `expect(...).toBe(false)` 不给 TS 收窄，这里显式取拒绝分支。 */
const expectBlocked = (verdict: DispatchLimitVerdict): Extract<DispatchLimitVerdict, { allowed: false }> => {
  if (verdict.allowed) throw new Error('expected the dispatch to be blocked')
  return verdict
}

/** 写一份临时 config.json 并返回路径；不传内容表示文件不存在。 */
const tempConfigPath = async (content?: unknown): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'dispatch-control-spec-'))
  const path = join(dir, 'config.json')
  if (content !== undefined) {
    await writeFile(path, typeof content === 'string' ? content : JSON.stringify(content), 'utf8')
  }
  return path
}

const ctx = (): MockContext => ({ cwd: process.cwd(), hasUI: true })

/**
 * 装配一个只含控制依赖的桥接。
 *
 * 默认给一个不存在的配置路径：测试不读本机 `~/.pi` 的真实配置。
 */
const setupBridge = async (
  control: Partial<DispatchControlDeps> & Pick<DispatchControlDeps, 'listAgents' | 'movePane'>,
  configContent?: unknown
): Promise<{ pi: ReturnType<typeof createMockPi>; options: BridgeOptions }> => {
  const configPath = await tempConfigPath(configContent)
  const pi = createMockPi()
  const options: BridgeOptions = {
    activation: ACTIVE,
    control: { ...control, configPath }
  }
  createBridge(pi, options)
  return { pi, options }
}

describe('并发上限判定', () => {
  const noReviewers = new Set<string>()

  it('未达上限时放行', () => {
    const verdict = evaluateDispatchLimit({
      agents: [entry('a', 'working'), entry('b', 'working')],
      maxConcurrentWorkers: 4,
      reviewerNames: noReviewers
    })

    expect(verdict.allowed).toBe(true)
    expect(verdict.workers).toEqual(['a', 'b'])
  })

  it('达到上限时拒绝，reason 带当前 worker 名与上限', () => {
    const verdict = evaluateDispatchLimit({
      agents: [entry('a', 'working'), entry('b', 'blocked'), entry('c', 'working'), entry('d', 'working')],
      maxConcurrentWorkers: 4,
      reviewerNames: noReviewers
    })

    const blocked = expectBlocked(verdict)
    expect(blocked.reason).toContain('4 个 worker')
    expect(blocked.reason).toContain('上限 4')
    for (const name of ['a', 'b', 'c', 'd']) expect(blocked.reason).toContain(name)
  })

  it('超过上限也拒绝，reason 报实际数量', () => {
    const agents = ['a', 'b', 'c', 'd', 'e'].map(name => entry(name, 'working'))
    const verdict = evaluateDispatchLimit({ agents, maxConcurrentWorkers: 4, reviewerNames: noReviewers })

    expect(expectBlocked(verdict).reason).toContain('5 个 worker')
  })

  it('idle / done / unknown 的历史具名 agent 不占槽位', () => {
    // 真实环境里历史 worker pane 仍然具名且 idle；把它们计入会让 dispatch 永久被拒。
    const agents = [entry('old-1', 'idle'), entry('old-2', 'done'), entry('old-3', 'unknown'), entry('live', 'working')]
    const verdict = evaluateDispatchLimit({ agents, maxConcurrentWorkers: 4, reviewerNames: noReviewers })

    expect(verdict.allowed).toBe(true)
    expect(verdict.workers).toEqual(['live'])
  })

  it('无名 agent 不计入', () => {
    const agents: HerdrAgentEntry[] = [{ pane_id: 'w1:p1', agent_status: 'working' }]
    expect(evaluateDispatchLimit({ agents, maxConcurrentWorkers: 1, reviewerNames: noReviewers }).allowed).toBe(true)
  })

  it('reviewer 不占 worker 槽位，但在 reason 里单独列出', () => {
    const agents = [
      entry('a', 'working'),
      entry('b', 'working'),
      entry('c', 'working'),
      entry('d', 'working'),
      entry('review-1', 'working')
    ]
    const reviewers = new Set(['review-1'])
    const verdict = evaluateDispatchLimit({ agents, maxConcurrentWorkers: 4, reviewerNames: reviewers })

    const blocked = expectBlocked(verdict)
    expect(blocked.reviewers).toEqual(['review-1'])
    expect(blocked.reason).toContain('review-1')
    expect(blocked.reason).toContain('不计入 worker 上限')
  })

  it('worker 未满时 reviewer 再多也放行', () => {
    const agents = [entry('a', 'working'), entry('r1', 'working'), entry('r2', 'blocked')]
    const verdict = evaluateDispatchLimit({
      agents,
      maxConcurrentWorkers: 4,
      reviewerNames: new Set(['r1', 'r2'])
    })

    expect(verdict.allowed).toBe(true)
    expect(verdict.reviewers).toEqual(['r1', 'r2'])
  })

  it('runningAgents 按状态归类', () => {
    const result = runningAgents([entry('a', 'working'), entry('b', 'idle'), entry('r', 'blocked')], new Set(['r']))
    expect(result).toEqual({ workers: ['a'], reviewers: ['r'] })
  })
})

describe('配置读取', () => {
  it('缺少 shepherd 段时用缺省值，不告警', () => {
    expect(parseControlConfig({ roles: {}, ledgerDir: '.herdr-runs' })).toEqual({
      maxConcurrentWorkers: DEFAULT_MAX_CONCURRENT_WORKERS,
      separateTabs: true
    })
    expect(DEFAULT_MAX_CONCURRENT_WORKERS).toBe(4)
  })

  it('读到 maxConcurrentWorkers 与 separateTabs', () => {
    expect(parseControlConfig({ shepherd: { maxConcurrentWorkers: 2, separateTabs: false } })).toEqual({
      maxConcurrentWorkers: 2,
      separateTabs: false
    })
  })

  it('非法值回退缺省并保留原因', () => {
    const config = parseControlConfig({ shepherd: { maxConcurrentWorkers: 0, separateTabs: 'yes' } })

    expect(config.maxConcurrentWorkers).toBe(4)
    expect(config.separateTabs).toBe(true)
    expect(config.warning).toContain('maxConcurrentWorkers')
    expect(config.warning).toContain('separateTabs')
  })

  it('文件不存在是正常状态：用缺省值且不告警', async () => {
    const config = await readControlConfig(await tempConfigPath())

    expect(config).toEqual({ maxConcurrentWorkers: 4, separateTabs: true })
    expect(config.warning).toBeUndefined()
  })

  it('非法 JSON 回退缺省并告警', async () => {
    const config = await readControlConfig(await tempConfigPath('{ not json'))

    expect(config.maxConcurrentWorkers).toBe(4)
    expect(config.warning).toContain('不是合法 JSON')
  })
})

describe('tab 移动请求与 herdr 参数', () => {
  it('dispatch 用 slice 名做 label，参数完整', () => {
    const request = tabMoveRequestFor('herdr_dispatch', {
      action: 'dispatch',
      name: 's1',
      pane: 'w1:p7'
    })

    expect(request).toEqual({ paneId: 'w1:p7', label: 'slice: s1' })
    expect(paneMoveArgs(request!.paneId, request!.label)).toEqual([
      'pane',
      'move',
      'w1:p7',
      '--new-tab',
      '--label',
      'slice: s1',
      '--no-focus'
    ])
  })

  it('review 优先用 details.slice 做 label', () => {
    const request = tabMoveRequestFor('herdr_review', {
      action: 'review',
      name: 'review-round8',
      slice: 'board-sharing',
      pane: 'w1:p8'
    })

    expect(request).toEqual({ paneId: 'w1:p8', label: 'review: board-sharing' })
  })

  it('取消 zoom 用同一个 paneId 与 --off', () => {
    expect(paneZoomOffArgs('w1:p7')).toEqual(['pane', 'zoom', 'w1:p7', '--off'])
  })

  it('中间态、其他工具、缺 pane 都不产生请求', () => {
    expect(tabMoveRequestFor('herdr_dispatch', { action: 'dispatch', name: 's1', waiting: true })).toBeUndefined()
    expect(tabMoveRequestFor('herdr_plan', { action: 'plan', pane: 'w1:p7' })).toBeUndefined()
    expect(tabMoveRequestFor('herdr_dispatch', { action: 'dispatch', name: 's1' })).toBeUndefined()
  })
})

describe('parsePaneMoveResult', () => {
  it('成功响应', () => {
    const outcome = parsePaneMoveResult(JSON.stringify({ id: 'cli:pane:move', result: { changed: true } }))
    expect(outcome).toEqual({ moved: true })
  })

  it('zoomed_tab 识别为可降级的拒绝', () => {
    const outcome = parsePaneMoveResult(
      JSON.stringify({ error: { code: 'pane_move_failed', message: 'source tab is zoomed', reason: 'zoomed_tab' } })
    )

    expect(outcome.moved).toBe(false)
    expect(outcome.zoomed).toBe(true)
    expect(outcome.reason).toBe('zoomed_tab')
  })

  it('zoomed_tab 出现在 code、message 或顶层 reason 里也能识别', () => {
    expect(readZoomed(JSON.stringify({ error: { code: 'zoomed_tab' } }))).toBe(true)
    expect(readZoomed(JSON.stringify({ error: { code: 'x', message: 'cannot move: zoomed_tab' } }))).toBe(true)
    expect(readZoomed(JSON.stringify({ error: { code: 'pane_move_failed' }, reason: 'zoomed_tab' }))).toBe(true)
  })

  it('其他失败保留原始原因', () => {
    const outcome = parsePaneMoveResult(
      JSON.stringify({ error: { code: 'pane_not_found', message: 'source pane not found' } })
    )

    expect(outcome).toEqual({ moved: false, reason: 'pane_not_found' })
  })

  it('不可解析输出不当成功', () => {
    expect(parsePaneMoveResult('not json').moved).toBe(false)
    expect(parsePaneMoveResult('').moved).toBe(false)
  })
})

describe('桥接：dispatch 并发闸门', () => {
  it('未超限时不干预', async () => {
    const { pi } = await setupBridge({
      listAgents: async () => [entry('a', 'working')],
      movePane: async () => ({ moved: true })
    })

    const result = await pi.emit('tool_call', { toolName: 'herdr_dispatch' }, ctx())

    expect(result).toBeUndefined()
  })

  it('达到上限时 block，reason 说明人数与上限', async () => {
    const agents = ['a', 'b', 'c', 'd'].map(name => entry(name, 'working'))
    const { pi } = await setupBridge({
      listAgents: async () => agents,
      movePane: async () => ({ moved: true })
    })

    const result = (await pi.emit('tool_call', { toolName: 'herdr_dispatch' }, ctx())) as {
      block: boolean
      reason: string
    }

    expect(result.block).toBe(true)
    expect(result.reason).toContain('4 个 worker')
    expect(result.reason).toContain('上限 4')
    expect(result.reason).toContain('herdr_watch')
  })

  it('上限从 config.json 的 shepherd 段读到', async () => {
    const { pi } = await setupBridge(
      {
        listAgents: async () => [entry('a', 'working'), entry('b', 'working')],
        movePane: async () => ({ moved: true })
      },
      { shepherd: { maxConcurrentWorkers: 2 } }
    )

    const result = (await pi.emit('tool_call', { toolName: 'herdr_dispatch' }, ctx())) as {
      block: boolean
      reason: string
    }

    expect(result.block).toBe(true)
    expect(result.reason).toContain('上限 2')
  })

  it('配置非法时回退 4，并只通知一次', async () => {
    const agents = ['a', 'b', 'c', 'd', 'e'].map(name => entry(name, 'working'))
    const { pi } = await setupBridge(
      { listAgents: async () => agents, movePane: async () => ({ moved: true }) },
      { shepherd: { maxConcurrentWorkers: -1 } }
    )

    await pi.emit('tool_call', { toolName: 'herdr_dispatch' }, ctx())
    const second = (await pi.emit('tool_call', { toolName: 'herdr_dispatch' }, ctx())) as {
      block: boolean
      reason: string
    }

    expect(second.block).toBe(true)
    expect(second.reason).toContain('上限 4')
    expect(pi.notifications.filter(message => message.startsWith('shepherd config:'))).toHaveLength(1)
  })

  it('herdr 查询失败时 fail open 并说明原因', async () => {
    const { pi } = await setupBridge({
      listAgents: async () => {
        throw new Error('herdr not found')
      },
      movePane: async () => ({ moved: true })
    })

    const result = await pi.emit('tool_call', { toolName: 'herdr_dispatch' }, ctx())

    expect(result).toBeUndefined()
    expect(pi.notifications.some(message => message.includes('fail open') && message.includes('herdr not found'))).toBe(
      true
    )
  })

  it('其他工具不查 herdr', async () => {
    let calls = 0
    const { pi } = await setupBridge({
      listAgents: async () => {
        calls += 1
        return []
      },
      movePane: async () => ({ moved: true })
    })

    await pi.emit('tool_call', { toolName: 'bash' }, ctx())
    await pi.emit('tool_call', { toolName: 'herdr_review' }, ctx())

    expect(calls).toBe(0)
  })
})

describe('桥接：worker / reviewer 独立 tab', () => {
  const dispatchDetails = (overrides: Record<string, unknown> = {}) => ({
    action: 'dispatch',
    name: 'bridge-worker',
    role: 'builder',
    pane: 'w1:p7',
    ...overrides
  })

  const reviewResultDetails = (overrides: Record<string, unknown> = {}) => ({
    action: 'review',
    name: 'review-round8',
    slice: 'bridge-worker',
    pane: 'w1:p8',
    verdict: 'APPROVE',
    ...overrides
  })

  const recordMoves = () => {
    const moves: Array<{ paneId: string; label: string }> = []
    const movePane = async (paneId: string, label: string): Promise<PaneMoveOutcome> => {
      moves.push({ paneId, label })
      return { moved: true }
    }
    return { moves, movePane }
  }

  it('dispatch 成功后把 pane 移到独立 tab，label 带 slice 名', async () => {
    const { moves, movePane } = recordMoves()
    const { pi } = await setupBridge({ listAgents: async () => [], movePane })

    await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    expect(moves).toEqual([{ paneId: 'w1:p7', label: 'slice: bridge-worker' }])
    expect(
      pi.notifications.some(message => message.includes('slice: bridge-worker') && message.includes('own tab'))
    ).toBe(true)
  })

  it('review 成功后把 reviewer pane 移到独立 tab，label 带 slice 名', async () => {
    const { moves, movePane } = recordMoves()
    const { pi } = await setupBridge({ listAgents: async () => [], movePane })

    await pi.emit('tool_result', { toolName: 'herdr_review', details: reviewResultDetails() }, ctx())

    expect(moves).toEqual([{ paneId: 'w1:p8', label: 'review: bridge-worker' }])
  })

  it('未装配取消 zoom 能力时，zoomed 被拒只给可读原因，不影响 worker', async () => {
    const { pi } = await setupBridge({
      listAgents: async () => [],
      movePane: async () => ({ moved: false, reason: 'zoomed_tab', zoomed: true })
    })

    const result = await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    // D5：搬迁结论随 tool_result 注释返回，模型能读到（不含原始 content 时只注入注释一行）。
    expectBridgeAnnotation(result)
    expect(pi.notifications.some(message => message.includes('zoom') && message.includes('不受影响'))).toBe(true)
  })

  it('zoomed 时取消 zoom（同一个 paneId）后重试移动，成功通知说明取消了一次 zoom', async () => {
    const moves: string[] = []
    const zooms: string[] = []
    const outcomes: PaneMoveOutcome[] = [{ moved: false, reason: 'zoomed_tab', zoomed: true }, { moved: true }]
    const { pi } = await setupBridge({
      listAgents: async () => [],
      movePane: async paneId => {
        moves.push(paneId)
        return outcomes[moves.length - 1] ?? { moved: true }
      },
      clearPaneZoom: async paneId => {
        zooms.push(paneId)
        return { cleared: true }
      }
    })

    const result = await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    // D5：搬迁结论随 tool_result 注释返回，模型能读到（不含原始 content 时只注入注释一行）。
    expectBridgeAnnotation(result)
    expect(moves).toEqual(['w1:p7', 'w1:p7'])
    expect(zooms).toEqual(['w1:p7'])
    const message = pi.notifications.find(item => item.includes('slice: bridge-worker'))
    expect(message).toContain('独立 tab')
    expect(message).toContain('取消了一次 zoom')
    expect(message).toContain('不受影响')
  })

  it('取消 zoom 后仍被拒时只重试一次，通知带重试的原因', async () => {
    const moves: string[] = []
    const { pi } = await setupBridge({
      listAgents: async () => [],
      movePane: async paneId => {
        moves.push(paneId)
        return { moved: false, reason: 'zoomed_tab', zoomed: true }
      },
      clearPaneZoom: async () => ({ cleared: true })
    })

    const result = await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    // D5：搬迁结论随 tool_result 注释返回，模型能读到（不含原始 content 时只注入注释一行）。
    expectBridgeAnnotation(result)
    expect(moves).toHaveLength(2)
    expect(pi.notifications.some(message => message.includes('已取消 zoom') && message.includes('zoomed_tab'))).toBe(
      true
    )
  })

  it('取消 zoom 自身失败时带 zoom 命令的原因，不再重试移动', async () => {
    const moves: string[] = []
    const { pi } = await setupBridge({
      listAgents: async () => [],
      movePane: async paneId => {
        moves.push(paneId)
        return { moved: false, reason: 'zoomed_tab', zoomed: true }
      },
      clearPaneZoom: async (): Promise<PaneZoomClearOutcome> => ({
        cleared: false,
        reason: 'pane_not_found'
      })
    })

    const result = await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    // D5：搬迁结论随 tool_result 注释返回，模型能读到（不含原始 content 时只注入注释一行）。
    expectBridgeAnnotation(result)
    expect(moves).toHaveLength(1)
    expect(
      pi.notifications.some(
        message => message.includes('处于 zoom') && message.includes('不受影响') && message.includes('pane_not_found')
      )
    ).toBe(true)
  })

  it('非 zoom 的移动失败不触发取消 zoom', async () => {
    const zooms: string[] = []
    const { pi } = await setupBridge({
      listAgents: async () => [],
      movePane: async () => ({ moved: false, reason: 'pane_not_found' }),
      clearPaneZoom: async paneId => {
        zooms.push(paneId)
        return { cleared: true }
      }
    })

    await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    expect(zooms).toEqual([])
    expect(
      pi.notifications.some(message => message.includes('未能移到独立 tab') && message.includes('pane_not_found'))
    ).toBe(true)
  })

  it('其他失败带原始原因通知', async () => {
    const { pi } = await setupBridge({
      listAgents: async () => [],
      movePane: async () => ({ moved: false, reason: 'pane_not_found' })
    })

    await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    expect(
      pi.notifications.some(message => message.includes('未能移到独立 tab') && message.includes('pane_not_found'))
    ).toBe(true)
  })

  it('mover 抛错也只通知，不让结果变成错误', async () => {
    const { pi } = await setupBridge({
      listAgents: async () => [],
      movePane: async () => {
        throw new Error('spawn failed')
      }
    })

    const result = await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    // D5：搬迁结论随 tool_result 注释返回，模型能读到（不含原始 content 时只注入注释一行）。
    expectBridgeAnnotation(result)
    expect(pi.notifications.some(message => message.includes('spawn failed'))).toBe(true)
  })

  it('D5：搬迁注释保留 tool_result 原有 content，附加 [bridge] 行', async () => {
    const { moves, movePane } = recordMoves()
    const { pi } = await setupBridge({ listAgents: async () => [], movePane })

    const result = (await pi.emit(
      'tool_result',
      {
        toolName: 'herdr_dispatch',
        details: dispatchDetails(),
        content: [{ type: 'text', text: 'Dispatched bridge-worker: original text' }]
      },
      ctx()
    )) as { content?: Array<{ type: string; text?: string }> }

    expect(moves).toHaveLength(1)
    const texts = (result.content ?? []).map(part => part.text ?? '')
    expect(texts[0]).toBe('Dispatched bridge-worker: original text')
    expect(texts.at(-1)).toMatch(/^\[bridge\] moved slice: bridge-worker to its own tab \(w1:p7\)$/)
  })

  it('D5：搬迁注释不把 isError 升级，失败也不反转为成功', async () => {
    const { pi } = await setupBridge({
      listAgents: async () => [],
      movePane: async () => ({ moved: false, reason: 'pane_not_found' })
    })

    const result = (await pi.emit(
      'tool_result',
      { toolName: 'herdr_dispatch', details: dispatchDetails(), isError: false },
      ctx()
    )) as { content?: Array<{ text?: string }> }

    expect((result.content ?? []).every(part => !part.text?.includes('isError'))).toBe(true)
    expect(pi.notifications.some(message => message.includes('未能移到独立 tab'))).toBe(true)
  })

  it('D1：tool_call 放行后按 input.name 登记，settle 兜底能对上这个名字', async () => {
    const moved: string[] = []
    const { pi } = await setupBridge({
      listAgents: async () => [entry('registered-worker', 'working')],
      movePane: async paneId => {
        moved.push(paneId)
        return { moved: true }
      }
    })

    const allowed = await pi.emit(
      'tool_call',
      { toolName: 'herdr_dispatch', input: { name: 'registered-worker', role: 'builder' } },
      ctx()
    )
    expect(allowed).toBeUndefined()

    // 同名 agent 在列表里：settle 注入的说明应指向这个 pane（搬迁由独立断言覆盖，这里看说明）。
    // settle 会经 tool_call 的登记把在场的 pane 搬走——这里通过 agent_before_settle 触发。
    const settle = (await pi.emit('agent_before_settle', { type: 'agent_before_settle' }, ctx())) as
      | { entries?: Array<{ content: string }> }
      | undefined
    expect(moved).toEqual(['w1:registered-worker'])
    expect(settle?.entries?.[0]?.content).toContain('registered-worker')
  })

  it('shepherd.separateTabs: false 时不动 layout', async () => {
    const { moves, movePane } = recordMoves()
    const { pi } = await setupBridge({ listAgents: async () => [], movePane }, { shepherd: { separateTabs: false } })

    await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails() }, ctx())

    expect(moves).toEqual([])
  })

  it('绝不移动 lead 自己的 pane', async () => {
    const { moves, movePane } = recordMoves()
    const { pi } = await setupBridge({ listAgents: async () => [], movePane })

    await pi.emit('tool_result', { toolName: 'herdr_dispatch', details: dispatchDetails({ pane: 'w1:p1' }) }, ctx())

    expect(moves).toEqual([])
  })

  it('中间态结果不移动 pane', async () => {
    const { moves, movePane } = recordMoves()
    const { pi } = await setupBridge({ listAgents: async () => [], movePane })

    await pi.emit(
      'tool_result',
      { toolName: 'herdr_dispatch', details: { action: 'dispatch', name: 'bridge-worker', waiting: true } },
      ctx()
    )

    expect(moves).toEqual([])
  })
})

/** 只读辅助：从 CLI 输出里判断是否被 zoomed 拒绝。 */
function readZoomed(stdout: string): boolean {
  return parsePaneMoveResult(stdout).zoomed === true
}
