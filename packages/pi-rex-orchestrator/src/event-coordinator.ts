/**
 * Rex 事件流与通知聚合协调器。
 *
 * 负责订阅 `WorkerRegistry` 状态跃迁、1 秒窗口聚合通知、单 Worker 熔断降级、
 * 长驻 `rex events` 流断线重连（含 3 次失败诊断告警）以及断连 / `/reload` 后的
 * 全量对账。当宿主 runtime 在会话结束后失效时，`safeSendMessage` 会捕获异常并
 * 立即停摆整个事件环，防止聚合计时器拖垮宿主进程。
 */

import type { RexAdapter } from './rex-adapter'
import { parseRexEventLine } from './rex-events'
import type { WorkerRegistry } from './state-machine'

const NOTICE_WINDOW_MS = 1000
const DEFAULT_RECONNECT_DELAY_MS = 2000

export interface EventCoordinatorDeps {
  adapter: Pick<RexAdapter, 'blockList' | 'blockCallProgramStatus' | 'blockCallLastExit' | 'startEventsStream'>
  registry: WorkerRegistry
  reconnectDelayMs?: number
  sendMessage(
    message: { customType: string; content: string; display: boolean },
    options?: { triggerTurn?: boolean; deliverAs?: 'steer' | 'followUp' | 'nextTurn' }
  ): void
}

export interface EventCoordinator {
  start(): void
  stop(): void
  reconcile(): Promise<void>
  notify(message: string): void
  safeSendMessage(
    message: { customType: string; content: string; display: boolean },
    options?: { triggerTurn?: boolean; deliverAs?: 'steer' | 'followUp' | 'nextTurn' }
  ): void
  isActive(): boolean
  status(): { connected: boolean; reconnectFails: number }
}

export function createEventCoordinator(deps: EventCoordinatorDeps): EventCoordinator {
  const { adapter, registry } = deps
  let active = true
  let eventsHandle: { kill(): void } | undefined
  let reconnectFails = 0
  let alarmSent = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  const pendingNotices = new Map<string, string>()

  /** 事件环整体停摆：杀长驻子进程、清重连与聚合计时器。工具集还原由调用方决定。 */
  function stop(): void {
    active = false
    if (noticeTimer !== undefined) clearTimeout(noticeTimer)
    noticeTimer = undefined
    if (reconnectTimer !== undefined) clearTimeout(reconnectTimer)
    reconnectTimer = undefined
    eventsHandle?.kill()
    eventsHandle = undefined
    pendingNotices.clear()
    unsubscribe()
  }

  /**
   * 会话结束（quit / reload / print 模式跑完）后扩展 runtime 会整体失效，`pi.sendMessage`
   * 在 stale runtime 上直接抛异常；聚合计时器可能晚于会话结束触发，不防护会把宿主进程
   * 带崩。失效即停：这是「会话没了」而不是可重试的失败，静默停止并停摆整个事件环。
   */
  function safeSendMessage(
    message: { customType: string; content: string; display: boolean },
    options?: { triggerTurn?: boolean; deliverAs?: 'steer' | 'followUp' | 'nextTurn' }
  ): void {
    try {
      deps.sendMessage(message, options)
    } catch {
      stop()
    }
  }

  function notify(message: string): void {
    // 工厂作用域拿不到 ctx.ui；一次性通知走 sendMessage 的非唤醒展示面。
    safeSendMessage({ customType: 'rex-orch-notify', content: message, display: true }, { triggerTurn: false })
  }

  function queueNotice(workerId: string, line: string): void {
    pendingNotices.set(workerId, [pendingNotices.get(workerId) ?? '', line].filter(Boolean).join('\n'))
    if (noticeTimer !== undefined || !active) return
    noticeTimer = setTimeout(() => {
      noticeTimer = undefined
      flushNotices()
    }, NOTICE_WINDOW_MS)
  }

  /**
   * 1 秒窗口聚合后唤醒模型。逐 worker 过熔断器：fused 的只发一次性通知不 `triggerTurn`
   *（设计 3.4），窗口内唤醒过频同样熔断；熔断判定先于唤醒消息，不会既唤醒又只告警。
   */
  function flushNotices(): void {
    if (!active || pendingNotices.size === 0) return
    const wakeLines: string[] = []
    const fuseNotifications: string[] = []
    for (const [workerId, note] of pendingNotices) {
      const worker = registry.get(workerId)
      if (worker === undefined) continue
      if (worker.fused || registry.noteAutoWakeup(workerId)) {
        fuseNotifications.push(
          `worker ${workerId} 已熔断（连续 error 或唤醒过频），自动跟进暂停，请人工检查。\n### ${workerId}\n${note}`
        )
      } else {
        wakeLines.push(`### ${workerId}\n${note}`)
      }
    }
    pendingNotices.clear()
    if (wakeLines.length > 0) {
      const content = ['<rex-orchestrator-events>', ...wakeLines, '</rex-orchestrator-events>'].join('\n')
      safeSendMessage(
        { customType: 'rex-orch-event', content, display: true },
        { triggerTurn: true, deliverAs: 'followUp' }
      )
    }
    for (const fuseNotification of fuseNotifications) {
      notify(fuseNotification)
    }
  }

  const unsubscribe = registry.subscribe({
    onTransition({ workerId, to, from }) {
      if (to === from) return
      if (to === 'done') {
        const worker = registry.get(workerId)
        queueNotice(workerId, worker ? `本轮完成（exit ${worker.exitCode ?? '?'}），请验收。` : '本轮完成。')
      } else if (to === 'error') {
        const worker = registry.get(workerId)
        queueNotice(
          workerId,
          `本轮以 error 结束（exit ${worker?.exitCode ?? '?'}${worker?.msg ? `，msg: ${worker.msg}` : ''}）。`
        )
      } else if (to === 'blocked') {
        const worker = registry.get(workerId)
        queueNotice(workerId, `blocked（${worker?.blockedKind ?? 'unknown'}），等待用户在 Rex Tab 处理。`)
      } else if (to === 'closed' && from !== 'closed') {
        queueNotice(workerId, '活跃 Block 已被关闭（用户接管或手动关闭）。')
      }
    }
  })

  function dispatchEvent(line: string): void {
    const event = parseRexEventLine(line)
    switch (event.kind) {
      case 'program_status_changed':
        for (const change of event.changes) registry.applyProgramStatus(event.blockId, change.record)
        break
      case 'program_status_removed':
        // 状态记录消失不等于 worker 消失；只作状态回退依据，不触发终态通知。
        break
      case 'child_exited':
        registry.applyChildExited(event.blockId, event.exitCode)
        break
      case 'block_closed':
        registry.applyBlockClosed(event.blockId)
        break
      default:
        break
    }
  }

  /** 断连 / `/reload` 后的全量对账：以 `rex block ls` 与逐 block 状态调用为准。 */
  async function reconcile(): Promise<void> {
    const live = new Set((await adapter.blockList()).map(block => block.blockId))
    for (const worker of registry.list()) {
      if (worker.status === 'closed') continue
      if (!live.has(worker.blockId)) {
        registry.applyBlockClosed(worker.blockId)
        continue
      }
      try {
        for (const change of await adapter.blockCallProgramStatus(worker.blockId)) {
          registry.applyProgramStatus(worker.blockId, change.record)
        }
        // `--keep-open` 的 headless Block 在子进程退出后仍存活，状态记录可能停在
        // `idle` 或残留旧值：不查 `process` 会漏掉断连期间的非零 child_exited。
        // 终态结算按 (block, turn) 幂等，多调一次不会重复计数。
        const exitCode = await adapter.blockCallLastExit(worker.blockId)
        if (exitCode !== undefined) {
          registry.applyChildExited(worker.blockId, exitCode)
        }
      } catch (error) {
        // 对账拉不到状态不是终态：保留现有状态，等事件流自己补。
        notify(`对账 ${worker.workerId} 状态失败：${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  function start(): void {
    if (!active || eventsHandle !== undefined) return
    eventsHandle = adapter.startEventsStream({
      onLine: line => {
        // 收到任一事件即证明流已恢复：复位连续失败计数与告警去重位。
        if (reconnectFails !== 0 || alarmSent) {
          reconnectFails = 0
          alarmSent = false
        }
        dispatchEvent(line)
      },
      onExit: error => {
        eventsHandle = undefined
        if (!active) return
        if (error) reconnectFails += 1
        if (reconnectFails >= 3 && !alarmSent) {
          alarmSent = true
          // adapter 已把 stderr 尾部拼进 error.message；告警带上它，否则
          // "Rex server unavailable" 这类真实原因到不了用户眼前。
          notify(
            `rex events 已连续 ${reconnectFails} 次重连失败${error ? `（${error.message}）` : ''}，` +
              '事件驱动跟进暂停。用 /rex-status 检查。'
          )
        }
        const delay = deps.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS
        reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined
          start()
          if (error === undefined) reconnectFails = 0
          void reconcile().catch(() => undefined)
        }, delay)
      }
    })
  }

  return {
    start,
    stop,
    reconcile,
    notify,
    safeSendMessage,
    isActive: () => active,
    status: () => ({ connected: eventsHandle !== undefined, reconnectFails })
  }
}
