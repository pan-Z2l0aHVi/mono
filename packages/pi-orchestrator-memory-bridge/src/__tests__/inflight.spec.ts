/**
 * D1 兜底与 D5 通知注入。
 *
 * 主线（`tool_result` 成功路径）由 `dispatch-control.spec.ts` / `board-sync.spec.ts` 覆盖；
 * 这里覆盖三条缺陷路径：
 *
 * 1. `tool_call` 登记 → tool_result 是 isError 且没有 details（dispatch 超时 throw）→
 *    `agent_before_settle` 用注入的 agent 列表扫描，把在场的 pane 搬走、说明行注入给模型；
 * 2. 恢复出的看板动作在 flush 时真正落盘（add_task in_progress / in_review）；
 * 3. agent 列表里查不到名字（调用在校验阶段就失败）时如实说明，不编造状态。
 */

import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

import { createBridge, SAVE_TOOL_NAME, type BridgeOptions, type DispatchControlDeps } from '../bridge'
import type { Activation, HerdrAgentEntry } from '../contracts'
import { createInFlightRegistry, inFlightBoardAction, matchInFlight } from '../dispatch/inflight'

import { createExecuteTool, createMockPi, type MockContext } from './pi-mock'

const ACTIVE: Activation = { active: true, paneId: 'w1:p1' }

const entryOf = (name: string, status: string, paneId: string): HerdrAgentEntry => ({
  name,
  agent_status: status,
  pane_id: paneId
})

describe('in-flight 登记（纯逻辑）', () => {
  it('登记后 settle 移除；同名不串 review 与 dispatch', () => {
    const registry = createInFlightRegistry()
    registry.add({ toolName: 'herdr_dispatch', name: 'w1' })
    registry.add({ toolName: 'herdr_review', name: 'w1' })

    expect(registry.open().map(entry => entry.name)).toEqual(['w1', 'w1'])

    const settled = registry.settle('w1', 'herdr_dispatch')
    expect(settled?.toolName).toBe('herdr_dispatch')
    expect(registry.open().map(entry => entry.toolName)).toEqual(['herdr_review'])
    expect(registry.settle('w1', 'herdr_dispatch')).toBeUndefined()
  })

  it('details 缺失或名字缺失时不结算', () => {
    const registry = createInFlightRegistry()
    registry.add({ toolName: 'herdr_dispatch', name: 'w1' })

    expect(registry.settleFromResultName(undefined, 'herdr_dispatch')).toBeUndefined()
    expect(registry.settleFromResultName({ other: 1 }, 'herdr_dispatch')).toBeUndefined()
    expect(registry.open()).toHaveLength(1)
  })

  it('matchInFlight：有 pane 的配上、无 pane 归 missing', () => {
    const open = [
      { toolName: 'herdr_dispatch', name: 'w1' },
      { toolName: 'herdr_review', name: 'r1' }
    ] as const
    const { matched, missing } = matchInFlight(open, [
      entryOf('w1', 'done', 'w2:p3'),
      // 同名 agent 没有 pane id 也按 missing 处理：搬迁与建任务都没有依据。
      { name: 'r1', agent_status: 'idle' }
    ])

    expect(matched.map(item => item.entry.name)).toEqual(['w1'])
    expect(matched[0]?.agent?.pane_id).toBe('w2:p3')
    expect(missing.map(entry => entry.name)).toEqual(['r1'])
  })

  it('inFlightBoardAction：done/idle → watch-done 同构的 in_review；其余 in_progress；review 不建任务', () => {
    const dispatch = { toolName: 'herdr_dispatch', name: 'w1', role: 'builder' }

    expect(inFlightBoardAction(dispatch, 'done')).toMatchObject({ status: 'in_review', title: 'slice: w1' })
    expect(inFlightBoardAction(dispatch, 'idle')).toMatchObject({ status: 'in_review' })
    const running = inFlightBoardAction(dispatch, 'working', 'w2:p3')
    expect(running).toMatchObject({ kind: 'add_task', status: 'in_progress', title: 'slice: w1' })
    expect(running?.description).toContain('pane: w2:p3')

    expect(inFlightBoardAction({ toolName: 'herdr_review', name: 'r1' }, 'done')).toBeUndefined()
  })
})

describe('D1 兜底（桥接装配）', () => {
  const git = (cwd: string, ...args: string[]): void => {
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  }

  const makeRepo = async (slug = 'demo'): Promise<string> => {
    const root = await mkdtemp(join(tmpdir(), `inflight-${slug}-`))
    await mkdir(join(root, '.git'), { recursive: true })
    git(root, 'init', '-q')
    git(root, 'config', 'user.email', 'spec@example.com')
    git(root, 'config', 'user.name', 'spec')
    return root
  }

  const setup = async (control: DispatchControlDeps) => {
    const repo = await makeRepo()
    const pi = createMockPi()
    const options: BridgeOptions = { activation: ACTIVE, control }
    createBridge(pi, options)
    await pi.emit('session_start', { type: 'session_start' }, { cwd: repo, hasUI: true })
    return { pi, repo }
  }

  it('dispatch 超时（isError、无 details）后，settle 扫描搬走在场的 pane 并注入说明', async () => {
    const moves: Array<{ paneId: string; label: string }> = []
    const { pi } = await setup({
      listAgents: async () => [entryOf('recovered-worker', 'working', 'w2:p3'), entryOf('other', 'working', 'w2:p9')],
      movePane: async (paneId, label) => {
        moves.push({ paneId, label })
        return { moved: true }
      },
      clearPaneZoom: async () => ({ cleared: true })
    })

    await pi.emit(
      'tool_call',
      { toolName: 'herdr_dispatch', input: { name: 'recovered-worker', role: 'builder' } },
      { cwd: process.cwd(), hasUI: true }
    )
    // 超时 throw：没有 details，name 从登记里来。
    await pi.emit('tool_result', { toolName: 'herdr_dispatch', isError: true }, { cwd: process.cwd(), hasUI: true })

    const settle = (await pi.emit(
      'agent_before_settle',
      { type: 'agent_before_settle' },
      { cwd: process.cwd(), hasUI: true }
    )) as { entries?: Array<{ content: string }>; continue?: boolean } | undefined

    expect(moves).toEqual([{ paneId: 'w2:p3', label: 'slice: recovered-worker' }])
    const content = settle?.entries?.[0]?.content ?? ''
    expect(content).toContain('herdr_dispatch recovered-worker timed out without a result')
    expect(content).toContain('run herdr_watch')
  })

  it('worker 已自结算（done）时注入的说明指向 in_review，且 flush 落盘 move 语义', async () => {
    const moves: Array<{ paneId: string }> = []
    const { pi, repo } = await setup({
      listAgents: async () => [entryOf('self-done', 'done', 'w2:p5')],
      movePane: async paneId => {
        moves.push({ paneId })
        return { moved: true }
      },
      clearPaneZoom: async () => ({ cleared: true })
    })

    await pi.emit(
      'tool_call',
      { toolName: 'herdr_dispatch', input: { name: 'self-done', role: 'builder' } },
      { cwd: repo, hasUI: true }
    )
    await pi.emit('tool_result', { toolName: 'herdr_dispatch', isError: true }, { cwd: repo, hasUI: true })

    const boardCalls: Array<{ name: string; args: Record<string, unknown> }> = []
    const ctx: MockContext = {
      cwd: repo,
      hasUI: true,
      executeTool: createExecuteTool({
        calls: boardCalls,
        results: {
          memory_remember: { content: [{ type: 'text', text: 'Remembered' }] },
          memory_pin: { content: [{ type: 'text', text: 'Unpinned' }] },
          task_board: { content: [{ type: 'text', text: '[{"name":"orchestration"}]' }] }
        }
      })
    }

    const settle = (await pi.emit(
      'agent_before_settle',
      { type: 'agent_before_settle' },
      { cwd: repo, hasUI: true }
    )) as { entries?: Array<{ content: string }> } | undefined
    expect(settle?.entries?.[0]?.content).toContain('The worker already settled on its own')

    // 队列里有 in_review 的 add_task：flush 后板上建任务即到 in_review（D3 的兜底路径）。
    const save = await pi.tools
      .get(SAVE_TOOL_NAME)
      ?.execute('call-1', { flush: true } as never, undefined, undefined, ctx as never)
    expect(save?.isError).toBe(false)
    const add = boardCalls.find(call => call.args.action === 'add_task')
    expect(add?.args).toMatchObject({ title: 'slice: self-done', status: 'in_review' })
  })

  it('agent 列表里查不到名字时如实说明，不搬 pane 不建任务', async () => {
    const moves: Array<{ paneId: string }> = []
    const { pi, repo } = await setup({
      listAgents: async () => [],
      movePane: async paneId => {
        moves.push({ paneId })
        return { moved: true }
      }
    })

    await pi.emit(
      'tool_call',
      { toolName: 'herdr_dispatch', input: { name: 'ghost-worker' } },
      { cwd: repo, hasUI: true }
    )
    await pi.emit('tool_result', { toolName: 'herdr_dispatch', isError: true }, { cwd: repo, hasUI: true })

    const boardCalls: Array<{ name: string; args: Record<string, unknown> }> = []
    const ctx: MockContext = {
      cwd: repo,
      hasUI: true,
      executeTool: createExecuteTool({
        calls: boardCalls,
        results: {
          memory_remember: { content: [{ type: 'text', text: 'Remembered' }] },
          memory_pin: { content: [{ type: 'text', text: 'Unpinned' }] },
          task_board: { content: [{ type: 'text', text: '[{"name":"orchestration"}]' }] }
        }
      })
    }

    const settle = (await pi.emit(
      'agent_before_settle',
      { type: 'agent_before_settle' },
      { cwd: repo, hasUI: true }
    )) as { entries?: Array<{ content: string }> } | undefined
    expect(moves).toEqual([])
    expect(settle?.entries?.[0]?.content).toContain('ghost-worker left no live herdr agent')

    const saved = await pi.tools
      .get(SAVE_TOOL_NAME)
      ?.execute('call-1', { flush: true } as never, undefined, undefined, ctx as never)
    expect(saved?.details).toMatchObject({ pending: 0, boardResults: [] })
    expect(boardCalls.filter(call => call.args.action === 'add_task')).toHaveLength(0)
  })
})
