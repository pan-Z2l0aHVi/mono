/**
 * Worker 注册表状态机：转移、门禁、熔断与 Block 替换。
 */

import { describe, expect, it } from 'vite-plus/test'

import { POLICY, WorkerRegistry } from '../state-machine'

function makeRegistry(times: number[] = []): { registry: WorkerRegistry; tick(): void } {
  let index = 0
  const registry = new WorkerRegistry(() => times[index] ?? (times[index - 1] ?? 0) + 1000)
  return {
    registry,
    tick: () => {
      index += 1
    }
  }
}

function registerWorker(registry: WorkerRegistry, overrides: Partial<Parameters<WorkerRegistry['register']>[0]> = {}) {
  return registry.register({
    workerId: 'claude-1',
    agent: 'claude',
    mode: 'headless',
    label: 'claude-1',
    blockId: 'block:A',
    turn: 1,
    cwd: '/repo',
    baseCommit: 'abc',
    baseDirty: [],
    paused: false,
    ...overrides
  })
}

describe('状态转移', () => {
  it('注册后为 starting，OSC working/blocked/idle/done 各自落位', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    expect(worker.status).toBe('starting')

    registry.applyProgramStatus('block:A', { state: 'working', msg: 'busy' })
    expect(worker.status).toBe('working')
    expect(worker.msg).toBe('busy')

    registry.applyProgramStatus('block:A', { state: 'blocked', kind: 'permission' })
    expect(worker.status).toBe('blocked')
    expect(worker.blockedKind).toBe('permission')

    registry.applyProgramStatus('block:A', { state: 'idle' })
    expect(worker.status).toBe('idle')
    expect(worker.stableSince).toBeDefined()

    registry.applyProgramStatus('block:A', { state: 'unknown-state' })
    expect(worker.status).toBe('idle')
  })

  it('closed 后不再接受状态更新', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.markClosed('claude-1')
    registry.applyProgramStatus('block:A', { state: 'working' })
    expect(worker.status).toBe('closed')
  })
})

describe('终态与熔断', () => {
  it('child_exited 幂等：同 block 只结算一次', () => {
    const { registry } = makeRegistry()
    registerWorker(registry)
    expect(registry.applyChildExited('block:A', 0)).toBe('settled')
    expect(registry.applyChildExited('block:A', 0)).toBe('duplicate')
    expect(registry.applyChildExited('block:ZZ', 0)).toBe('unknown')
  })

  it('连续 2 轮 error 熔断', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.applyChildExited('block:A', 1)
    expect(worker.fused).toBe(false)
    // 真实续跑流程先推进轮次再替换 Block。
    registry.markTurnDispatched('claude-1', 2)
    registry.replaceBlock('claude-1', 'block:B')
    registry.applyChildExited('block:B', 1)
    expect(worker.fused).toBe(true)
  })

  it('OSC error 也计入熔断，且与同轮 child_exited 不双计', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.applyProgramStatus('block:A', { state: 'error' })
    expect(worker.errorStreak).toBe(1)
    // 同一错误的重复上报（重连对账会重放）只计一次。
    registry.applyProgramStatus('block:A', { state: 'error' })
    expect(worker.errorStreak).toBe(1)
    // 同一轮的退出码 error 不会把同一失败算两次。
    registry.applyChildExited('block:A', 1)
    expect(worker.errorStreak).toBe(1)
    registry.markTurnDispatched('claude-1', 2)
    registry.replaceBlock('claude-1', 'block:B')
    registry.applyProgramStatus('block:B', { state: 'error' })
    expect(worker.fused).toBe(true)
  })

  it('中间隔了成功回合（idle）不算连续 error（re-review #3）', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.applyProgramStatus('block:A', { state: 'error' })
    registry.applyProgramStatus('block:A', { state: 'idle' })
    registry.markTurnDispatched('claude-1', 2)
    registry.applyProgramStatus('block:A', { state: 'error' })
    expect(worker.errorStreak).toBe(1)
    expect(worker.fused).toBe(false)
  })

  it('已接受时间戳及更早的重放记录一律丢弃（re-review #3 二次）', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.applyProgramStatus('block:A', { state: 'error', updatedAt: 'T2' })
    registry.applyProgramStatus('block:A', { state: 'working', updatedAt: 'T3' })
    // turn 1 的 error 在新一轮 working 之后重放：旧时间戳不得把状态拉回、也不得重复计数。
    registry.applyProgramStatus('block:A', { state: 'error', updatedAt: 'T1' })
    expect(worker.status).toBe('working')
    expect(worker.errorStreak).toBe(1)
    // 同一时间戳的再报也按重放拒绝：真实 updated_at 是微秒精度，同 ts 必是重放。
    registry.applyProgramStatus('block:A', { state: 'error', updatedAt: 'T3' })
    expect(worker.status).toBe('working')
    expect(worker.errorStreak).toBe(1)
  })

  it('child_exited 缺 exit_code 时按未知失败处理，不记成 done（PR 审查 #2）', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    expect(registry.applyChildExited('block:A', undefined)).toBe('settled')
    expect(worker.status).toBe('error')
    expect(worker.fused).toBe(false)
  })

  it('restore 从持久化快照重建、丢弃形状不全的条目（PR 审查 Block 1）', () => {
    const { registry } = makeRegistry()
    const restored = registry.restore([
      {
        workerId: 'claude-9',
        agent: 'claude',
        mode: 'headless',
        label: 'claude-9',
        blockId: 'block:X',
        retiredBlockIds: ['block:W'],
        status: 'idle',
        turn: 2,
        cwd: '/repo',
        baseCommit: 'abc',
        baseDirty: ['?? a.txt'],
        worktree: { path: '/wt', branch: 'pi-orch/s/w' },
        mainCwd: '/repo',
        paused: true,
        activeBlockClosed: false,
        blockedKind: 'permission',
        lastStatusAt: '2026-11-19T00:00:00Z',
        stableSince: 1234
      },
      { workerId: 'broken' },
      { notAWorker: true }
    ])
    expect(restored).toBe(1)
    const worker = registry.get('claude-9')
    expect(worker?.turn).toBe(2)
    expect(worker?.retiredBlockIds).toEqual(['block:W'])
    expect(worker?.worktree?.branch).toBe('pi-orch/s/w')
    expect(worker?.paused).toBe(true)
    // 状态机守卫必须随快照恢复（PR 审查 Should fix）。
    expect(worker?.lastStatusAt).toBe('2026-11-19T00:00:00Z')
    expect(worker?.stableSince).toBe(1234)
    expect(worker?.blockedKind).toBe('permission')
  })

  it('retired Block 的延迟事件不再改写 worker（review #1）', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.applyChildExited('block:A', 0)
    registry.replaceBlock('claude-1', 'block:B')
    registry.applyProgramStatus('block:A', { state: 'working' })
    expect(registry.applyChildExited('block:A', 1)).toBe('unknown')
    // 新一轮已在 B 上 running；A 的迟到事件不得把状态打回 done/error。
    expect(worker.status).toBe('starting')
    expect(worker.exitCode).toBe(0)
    expect(worker.errorStreak).toBe(0)
  })

  it('3 分钟窗口内自动唤醒超过 5 次熔断', () => {
    const { registry } = makeRegistry([0, 1000, 2000, 3000, 4000, 5000, 6000])
    const worker = registerWorker(registry)
    for (let i = 0; i < POLICY.maxWakeupsPerWindow; i += 1) {
      expect(registry.noteAutoWakeup('claude-1')).toBe(false)
    }
    expect(registry.noteAutoWakeup('claude-1')).toBe(true)
    expect(worker.fused).toBe(true)
  })
})

describe('headless 续跑 Block 替换（V3-02）', () => {
  it('旧 Block 原子移入 retired，新 Block 顶上', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.replaceBlock('claude-1', 'block:B')
    expect(worker.blockId).toBe('block:B')
    expect(worker.retiredBlockIds).toEqual(['block:A'])
    expect(worker.status).toBe('starting')

    // retired Block 的关闭事件不改变 worker 状态。
    expect(registry.applyBlockClosed('block:A')).toBe(false)
    expect(worker.status).toBe('starting')

    // 活跃 Block 的关闭才标记 closed。
    expect(registry.applyBlockClosed('block:B')).toBe(true)
    expect(worker.status).toBe('closed')
  })
})

describe('activeBlockClosed 生命周期（codex exec 九轮 #1）', () => {
  it('replaceBlock 清除标记；活跃 Block 实际关闭时置位', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    // 模拟关闭工具成功关闭活跃 Block。
    worker.activeBlockClosed = true

    // 续跑创建新 Block：标记必须清零，否则下次关闭会跳过仍在运行的新 Block。
    registry.replaceBlock('claude-1', 'block:B')
    expect(worker.activeBlockClosed).toBe(false)

    // 活跃 Block 被事件/用户实际关闭：置位，关闭重试不再重复关闭。
    registry.applyBlockClosed('block:B')
    expect(worker.activeBlockClosed).toBe(true)
  })
})

describe('投递门禁（设计 3.2 第 3 条）', () => {
  it('blocked / working / paused / error 都要求确认', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.applyProgramStatus('block:A', { state: 'blocked', kind: 'permission' })
    expect(registry.canAutoDeliver('claude-1').allowed).toBe(false)

    registry.applyProgramStatus('block:A', { state: 'working' })
    expect(registry.canAutoDeliver('claude-1').allowed).toBe(false)

    registry.applyProgramStatus('block:A', { state: 'idle' })
    registry.setPaused('claude-1', true)
    expect(registry.canAutoDeliver('claude-1').allowed).toBe(false)
    registry.setPaused('claude-1', false)

    registry.applyChildExited('block:A', 1)
    expect(registry.canAutoDeliver('claude-1').allowed).toBe(false)
    expect(worker.paused).toBe(false)
  })

  it('idle 未满稳定窗口拒绝，满 1.5 秒后放行', () => {
    const { registry } = makeRegistry([0, 0, 1000, 2600])
    registerWorker(registry)
    registry.applyProgramStatus('block:A', { state: 'idle' })
    expect(registry.canAutoDeliver('claude-1').allowed).toBe(false)
    expect(registry.canAutoDeliver('claude-1', 2600).allowed).toBe(true)
  })

  it('稳定窗口按进入该状态重算：blocked → idle 后不沿用 blocked 的时间戳（review #2）', () => {
    const { registry, tick } = makeRegistry([0, 12000])
    registerWorker(registry)
    registry.applyProgramStatus('block:A', { state: 'blocked' })
    tick()
    registry.applyProgramStatus('block:A', { state: 'idle' })
    // idle 只持续 0.7 秒仍拒绝；沿用 blocked 时期的时间戳会在这里就放行。
    expect(registry.canAutoDeliver('claude-1', 12700).allowed).toBe(false)
    // idle 满 1.5 秒后放行。
    expect(registry.canAutoDeliver('claude-1', 13500).allowed).toBe(true)
  })

  it('未知 worker 拒绝', () => {
    const { registry } = makeRegistry()
    expect(registry.canAutoDeliver('nobody').allowed).toBe(false)
  })
})

describe('转移订阅', () => {
  it('onTransition 通知每次状态变化并可注销', () => {
    const { registry } = makeRegistry()
    const seen: string[] = []
    const unsubscribe = registry.subscribe({
      onTransition: transition => seen.push(`${transition.workerId}:${transition.to}`)
    })
    registerWorker(registry)
    registry.applyProgramStatus('block:A', { state: 'working' })
    registry.applyProgramStatus('block:A', { state: 'working' })
    unsubscribe()
    registry.applyProgramStatus('block:A', { state: 'idle' })
    expect(seen).toEqual(['claude-1:working'])
  })
})
