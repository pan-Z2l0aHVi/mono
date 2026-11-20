/**
 * Worker 注册表与状态机。
 *
 * 一个逻辑 Worker 至多对应一个活跃 Block（V3-02）：headless 续跑时旧 Block 原子移入
 * `retiredBlockIds`，新 Block 顶上；旧 Block 的关闭事件不再当作异常。终态
 * （`child_exited` / `done`）按 `(blockId, turn)` 幂等合并，自动唤醒经熔断器约束：
 * 单 Worker 连续 2 次 `error` 或 3 分钟内自动唤醒 > 5 次即熔断，降级为一次性通知。
 *
 * 本模块不碰 I/O 与时间（`now` 由调用方注入），方便单测覆盖状态转移与门禁。
 */

import type { ProgramStatusRecord } from './rex-events'

export type WorkerMode = 'interactive' | 'headless'

export type WorkerStatus = 'starting' | 'working' | 'idle' | 'blocked' | 'done' | 'error' | 'closed'

export const TERMINAL_STATUSES: readonly WorkerStatus[] = ['done', 'error', 'closed']

export interface WorkerEntry {
  workerId: string
  agent: string
  mode: WorkerMode
  label: string
  blockId: string
  retiredBlockIds: string[]
  status: WorkerStatus
  /** `blocked` 的原因类别（permission / auth 等）。 */
  blockedKind?: string
  msg?: string
  /** 已派发的轮次数（从 1 起）。 */
  turn: number
  /** worker cwd（主仓或独立 worktree）。 */
  cwd: string
  /** 期望的 git 基线；`rex_inspect_changes` 按它出全量 diff。 */
  baseCommit: string | null
  /** worker 派生前的脏文件行；Untracked 新文件按它对比。 */
  baseDirty: string[]
  worktree?: { path: string; branch: string }
  /** worktree 模式下的主仓路径；清理分支要在主仓执行。 */
  mainCwd?: string
  agentSessionId?: string
  exitCode?: number
  /** `/rex-pause` 的人工接管保护。 */
  paused: boolean
  /** 最近一次进入稳定状态（idle/done/error/blocked）的时刻。 */
  stableSince?: number
  errorStreak: number
  /** 活跃 Block 已确认关闭（成功关过一次）；重试时跳过重复关闭。 */
  activeBlockClosed?: boolean
  /** 最近一次计过数的 error 轮次；同一轮的重放/交叉来源不重复计数。 */
  errorTurn?: number
  /** 最近一次接受的 OSC 记录 updated_at；更旧的重放直接丢弃。 */
  lastStatusAt?: string
  /** 自动唤醒时间戳（熔断窗口用）。 */
  wakeups: number[]
  fused: boolean
}

export interface StatusTransition {
  workerId: string
  from: WorkerStatus
  to: WorkerStatus
  at: number
}

/** 事件驱动的门禁与熔断参数；集中成常量便于测试推演。 */
export const POLICY = {
  /** `idle` / `done` 后至少稳定这么久才允许静默投递。 */
  stableMs: 1500,
  /** 熔断窗口。 */
  fuseWindowMs: 3 * 60 * 1000,
  /** 窗口内自动唤醒超过该次数即熔断。 */
  maxWakeupsPerWindow: 5,
  /** 连续 error 达到该次数即熔断。 */
  maxErrorStreak: 2
} as const

export interface RegistryEvents {
  onTransition(transition: StatusTransition): void
}

export class WorkerRegistry {
  private readonly workers = new Map<string, WorkerEntry>()
  /** `(blockId, turn)` → 终态是否已通知，幂等合并用。 */
  private readonly settledTurns = new Set<string>()
  private readonly listeners: RegistryEvents[] = []

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** 订阅状态转移；返回注销函数，等待跃迁的 Promise 用它防泄漏。 */
  subscribe(listener: RegistryEvents): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index !== -1) this.listeners.splice(index, 1)
    }
  }

  register(
    entry: Omit<WorkerEntry, 'retiredBlockIds' | 'status' | 'errorStreak' | 'wakeups' | 'fused'>,
    options: { initialStatus?: WorkerStatus } = {}
  ): WorkerEntry {
    const worker: WorkerEntry = {
      ...entry,
      retiredBlockIds: [],
      // 直接赋值不触发转移通知：派生结果不明时登记的 closed placeholder 不该
      // 产生「Block 已被关闭」事件。
      status: options.initialStatus ?? 'starting',
      errorStreak: 0,
      wakeups: [],
      fused: false
    }
    this.workers.set(worker.workerId, worker)
    return worker
  }

  /** 从持久化快照重建注册表（/reload 或会话恢复）；只接受形状完整的条目。 */
  restore(entries: readonly unknown[]): number {
    let restored = 0
    for (const entry of entries) {
      if (typeof entry !== 'object' || entry === null) continue
      const candidate = entry as Partial<WorkerEntry>
      if (typeof candidate.workerId !== 'string' || typeof candidate.blockId !== 'string') continue
      if (typeof candidate.agent !== 'string' || typeof candidate.mode !== 'string') continue
      const worker: WorkerEntry = {
        workerId: candidate.workerId,
        agent: candidate.agent,
        mode: candidate.mode === 'headless' ? 'headless' : 'interactive',
        label: typeof candidate.label === 'string' ? candidate.label : candidate.workerId,
        blockId: candidate.blockId,
        retiredBlockIds: Array.isArray(candidate.retiredBlockIds)
          ? candidate.retiredBlockIds.filter((id): id is string => typeof id === 'string')
          : [],
        status: candidate.status ?? 'starting',
        msg: candidate.msg,
        turn: typeof candidate.turn === 'number' ? candidate.turn : 1,
        cwd: typeof candidate.cwd === 'string' ? candidate.cwd : '.',
        baseCommit: typeof candidate.baseCommit === 'string' ? candidate.baseCommit : null,
        baseDirty: Array.isArray(candidate.baseDirty)
          ? candidate.baseDirty.filter((line): line is string => typeof line === 'string')
          : [],
        worktree:
          typeof candidate.worktree === 'object' && candidate.worktree !== null ? candidate.worktree : undefined,
        mainCwd: candidate.mainCwd,
        agentSessionId: candidate.agentSessionId,
        exitCode: candidate.exitCode,
        paused: candidate.paused === true,
        errorStreak: typeof candidate.errorStreak === 'number' ? candidate.errorStreak : 0,
        errorTurn: candidate.errorTurn,
        wakeups: Array.isArray(candidate.wakeups)
          ? candidate.wakeups.filter((at): at is number => typeof at === 'number')
          : [],
        fused: candidate.fused === true,
        activeBlockClosed: candidate.activeBlockClosed === true
      }
      this.workers.set(worker.workerId, worker)
      restored += 1
    }
    return restored
  }

  get(workerId: string): WorkerEntry | undefined {
    return this.workers.get(workerId)
  }

  list(): WorkerEntry[] {
    return [...this.workers.values()]
  }

  private transition(worker: WorkerEntry, to: WorkerStatus, now: number, extra?: Partial<WorkerEntry>): void {
    const from = worker.status
    if (from === to && !extra) return
    Object.assign(worker, extra)
    worker.status = to
    if (to === 'working' || to === 'starting') {
      worker.stableSince = undefined
    } else if (to !== from || worker.stableSince === undefined) {
      // 稳定窗口按「进入该状态」重新起算：blocked → idle 后沿用 blocked 时期的时间戳
      // 会让门禁放行一个刚恢复 0.7 秒的 TUI。同状态重复上报不重置。
      worker.stableSince = now
    }
    if (to !== from) {
      for (const listener of this.listeners) {
        listener.onTransition({ workerId: worker.workerId, from, to, at: now })
      }
    }
  }

  /** 只匹配活跃 Block：retired Block 的延迟事件不允许再改写 worker 状态。 */
  findActiveByBlockId(blockId: string): WorkerEntry | undefined {
    return this.list().find(worker => worker.blockId === blockId)
  }

  findByBlockId(blockId: string): WorkerEntry | undefined {
    return this.list().find(worker => worker.blockId === blockId || worker.retiredBlockIds.includes(blockId))
  }

  /** OSC 状态更新；按 `record.state` 直接读明文，不做解码。转移经 `subscribe` 通知。 */
  applyProgramStatus(blockId: string, record: ProgramStatusRecord, options: { now?: number } = {}): void {
    const worker = this.findActiveByBlockId(blockId)
    if (!worker || worker.status === 'closed') return
    // 单调时间戳护栏：断连重连对账与事件流都会重放历史记录。真实 `updated_at` 是
    // 微秒精度，同一时间戳的再报必是重放——`<=` 一并拒绝，旧记录不得把已推进的
    // 状态拉回去，也不能借重放重复计数。
    if (
      record.updatedAt !== undefined &&
      worker.lastStatusAt !== undefined &&
      record.updatedAt <= worker.lastStatusAt
    ) {
      return
    }
    if (record.updatedAt !== undefined) worker.lastStatusAt = record.updatedAt
    const now = options.now ?? this.now()
    const state = record.state
    worker.msg = record.msg
    if (state === 'working') this.transition(worker, 'working', now)
    else if (state === 'blocked') this.transition(worker, 'blocked', now, { blockedKind: record.kind })
    else if (state === 'idle') {
      // interactive 的成功回合以 `idle` 收尾：中间隔了成功回合就不算「连续 error」。
      this.resetErrorStreakOnSuccess(worker)
      this.transition(worker, 'idle', now)
    } else if (state === 'done') {
      this.resetErrorStreakOnSuccess(worker)
      this.transition(worker, 'done', now)
    } else if (state === 'error') {
      this.noteError(worker)
      this.transition(worker, 'error', now)
    }
  }

  /** error 只按轮次计一次：OSC error、退出码 error 与二者的重放同属一轮失败。 */
  private noteError(worker: WorkerEntry): void {
    if (worker.errorTurn === worker.turn) return
    worker.errorTurn = worker.turn
    worker.errorStreak += 1
    if (worker.errorStreak >= POLICY.maxErrorStreak) worker.fused = true
  }

  private resetErrorStreakOnSuccess(worker: WorkerEntry): void {
    worker.errorStreak = 0
  }

  /** 终态幂等合并：同一 Block 的 child_exited 只结算一次。 */
  applyChildExited(blockId: string, exitCode: number | undefined): 'settled' | 'duplicate' | 'unknown' {
    const worker = this.findActiveByBlockId(blockId)
    if (!worker) return 'unknown'
    const key = `${blockId}:${worker.turn}`
    if (this.settledTurns.has(key)) return 'duplicate'
    this.settledTurns.add(key)
    const now = this.now()
    worker.exitCode = exitCode
    if (worker.status === 'closed') return 'settled'
    // undefined = 事件缺 exit_code（信号终止或协议字段缺失）：按未知失败处理，
    // 不能默认成功——否则被杀死的 worker 会被记成 done 并重置连续错误计数。
    const isError = exitCode !== 0
    if (isError) {
      this.noteError(worker)
    } else {
      this.resetErrorStreakOnSuccess(worker)
    }
    this.transition(worker, isError ? 'error' : 'done', now)
    return 'settled'
  }

  /** headless 续跑：旧 Block 原子移入 retired，新 Block 顶上（V3-02）。 */
  replaceBlock(workerId: string, newBlockId: string): void {
    const worker = this.get(workerId)
    if (!worker) return
    if (worker.blockId !== newBlockId && !worker.retiredBlockIds.includes(worker.blockId)) {
      worker.retiredBlockIds.push(worker.blockId)
    }
    worker.blockId = newBlockId
    // 新活跃 Block 尚未关闭：清除上一轮的关闭标记，否则下次关闭会跳过它。
    worker.activeBlockClosed = false
    this.transition(worker, 'starting', this.now())
  }

  /** 活跃 Block 被关闭；retired Block 的关闭不改变 worker 状态。 */
  applyBlockClosed(blockId: string): boolean {
    const worker = this.findByBlockId(blockId)
    if (!worker) return false
    if (worker.retiredBlockIds.includes(blockId)) return false
    if (blockId !== worker.blockId) return false
    // 活跃 Block 已实际关闭：置标记，关闭工具的后续重试不再重复关闭它。
    worker.activeBlockClosed = true
    this.transition(worker, 'closed', this.now())
    return true
  }

  /** 记录一次自动唤醒；返回熔断是否被触发。 */
  noteAutoWakeup(workerId: string): boolean {
    const worker = this.get(workerId)
    if (!worker) return false
    const now = this.now()
    worker.wakeups.push(now)
    worker.wakeups = worker.wakeups.filter(at => now - at <= POLICY.fuseWindowMs)
    if (worker.wakeups.length > POLICY.maxWakeupsPerWindow) {
      worker.fused = true
      return true
    }
    return false
  }

  /**
   * 记录新轮次已派发。`notifyTransition` 为 false 时只记 turn 不转移状态：
   * interactive 投递的 Send-ACK 监听要等 worker 真实的 OSC 跃迁，自家的合成转移
   * 会把 ACK 永远判成已确认。
   */
  markTurnDispatched(workerId: string, turn: number, options: { notifyTransition?: boolean } = {}): void {
    const worker = this.get(workerId)
    if (!worker) return
    worker.turn = turn
    if (options.notifyTransition !== false) {
      this.transition(worker, 'working', this.now())
    }
  }

  setPaused(workerId: string, paused: boolean): boolean {
    const worker = this.get(workerId)
    if (!worker) return false
    worker.paused = paused
    return true
  }

  setAgentSessionId(workerId: string, sessionId: string): void {
    const worker = this.get(workerId)
    if (worker) worker.agentSessionId = sessionId
  }

  markClosed(workerId: string): void {
    const worker = this.get(workerId)
    if (worker) this.transition(worker, 'closed', this.now())
  }

  /**
   * 状态门禁（设计 3.2 第 3 条）：只有 `idle` / `done` 且稳定 ≥ `stableMs`、未被
   * `/rex-pause` 时允许静默投递；`blocked`（尤其 permission / auth）、`working`、
   * 已暂停一律要求用户确认。
   */
  canAutoDeliver(workerId: string, now: number = this.now()): { allowed: boolean; reason?: string } {
    const worker = this.get(workerId)
    if (!worker) return { allowed: false, reason: 'unknown worker' }
    if (worker.status === 'closed') return { allowed: false, reason: 'worker 已关闭' }
    if (worker.paused) return { allowed: false, reason: 'worker 处于 /rex-pause 人工接管保护' }
    if (worker.status === 'blocked') {
      const kind = worker.blockedKind ? `（${worker.blockedKind}）` : ''
      return { allowed: false, reason: `worker 正在等待处理 blocked 状态${kind}，需用户确认后再投递` }
    }
    if (worker.status === 'working' || worker.status === 'starting') {
      return { allowed: false, reason: 'worker 正在运行中，投递可能覆盖其输入' }
    }
    if (worker.status === 'error') return { allowed: false, reason: 'worker 上一轮以 error 结束，需用户确认后再投递' }
    if (worker.stableSince === undefined || now - worker.stableSince < POLICY.stableMs) {
      return { allowed: false, reason: 'worker 状态尚未稳定满 1.5 秒' }
    }
    return { allowed: true }
  }
}
