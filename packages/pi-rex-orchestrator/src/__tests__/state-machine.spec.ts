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

  it('连续 2 次 error 熔断', () => {
    const { registry } = makeRegistry()
    const worker = registerWorker(registry)
    registry.applyChildExited('block:A', 1)
    expect(worker.fused).toBe(false)
    registry.replaceBlock('claude-1', 'block:B')
    registry.applyChildExited('block:B', 1)
    expect(worker.fused).toBe(true)
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
