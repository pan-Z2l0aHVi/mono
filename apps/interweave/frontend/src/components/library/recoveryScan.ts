import { ref, type Ref } from 'vue'

import type { RecoveryScanUpdate } from './restore'

/** 轮询间隔：扫描在后端按批推进，250ms 足以感到连续，又不会把 UI 线程压满。 */
export const RECOVERY_SCAN_POLL_INTERVAL_MS = 250

export type RecoveryScanErrorStage = 'start' | 'poll' | 'cancel'

export interface RecoveryScanHost {
  start(ids: string[], directory: string): Promise<string>
  poll(id: string): Promise<RecoveryScanUpdate>
  cancel(id: string): Promise<void>
  discard(id: string): Promise<void>
}

/** 注入计时器让单测能直接推进 250ms 轮询，不必等待真实时间。 */
export interface RecoveryScanTimers {
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>
  clearTimeout(handle: ReturnType<typeof setTimeout>): void
}

export interface RecoveryScanPorts {
  timers?: RecoveryScanTimers
  onProgress?(update: RecoveryScanUpdate): void
  /** done=true 的终态；cancelled / error 由宿主按 update 内容展示。 */
  onDone?(update: RecoveryScanUpdate): void
  /** stage 区分启动失败、轮询失败与停止失败，宿主各自决定文案。 */
  onError?(stage: RecoveryScanErrorStage, cause: unknown): void
}

/**
 * 找回扫描的状态机：单次会话、按轮询推进、可中途停止。
 *
 * 它拥有「一次 beginScan 对应一个会话」的代次纪律：停止、重新开始、组件卸载都会让在途的
 * start/poll 结果作废；作废的会话由 discard 清扫，不留在后端。界面只消费进度与终态回调。
 */
export interface RecoveryScanController {
  scanning: Ref<boolean>
  stopping: Ref<boolean>
  /** 扫描以 canceled 或 error 结束：条目已收回的候选不完整。 */
  incomplete: Ref<boolean>
  beginScan(directory: string, sourceIds: string[]): Promise<void>
  requestStop(): void
  /** 立即作废当前会话并清扫后端扫描；不等待轮询。 */
  stop(): void
  dispose(): void
}

const defaultTimers: RecoveryScanTimers = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: handle => clearTimeout(handle)
}

export function createRecoveryScanController(
  host: RecoveryScanHost,
  ports: RecoveryScanPorts = {}
): RecoveryScanController {
  const timers = ports.timers ?? defaultTimers
  const scanning = ref(false)
  const stopping = ref(false)
  const incomplete = ref(false)
  let generation = 0
  let scanId: string | null = null
  let stopRequested = false
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  function clearPollTimer() {
    if (!pollTimer) return
    timers.clearTimeout(pollTimer)
    pollTimer = null
  }

  function discard(id: string) {
    void host.discard(id).catch(console.error)
  }

  async function poll(request: number, id: string) {
    try {
      const update = await host.poll(id)
      if (request !== generation) return
      ports.onProgress?.(update)
      if (update.done) {
        scanId = null
        scanning.value = false
        stopping.value = false
        stopRequested = false
        incomplete.value = update.cancelled || Boolean(update.error)
        ports.onDone?.(update)
        return
      }
      pollTimer = timers.setTimeout(() => void poll(request, id), RECOVERY_SCAN_POLL_INTERVAL_MS)
    } catch (cause) {
      if (request !== generation) return
      scanning.value = false
      stopping.value = false
      incomplete.value = true
      scanId = null
      discard(id)
      ports.onError?.('poll', cause)
    }
  }

  async function beginScan(directory: string, sourceIds: string[]) {
    const request = ++generation
    scanning.value = true
    incomplete.value = false
    try {
      const id = await host.start(sourceIds, directory)
      // 启动往返期间用户可能已经停止或重新开始：这次结果已经没有归属，直接清扫。
      if (request !== generation) {
        discard(id)
        return
      }
      scanId = id
      // 停止请求可能早于 scan id 到达；这里补发 cancel，轮询仍会走到 done。
      if (stopRequested) await host.cancel(id)
      await poll(request, id)
    } catch (cause) {
      if (request !== generation) return
      scanning.value = false
      stopping.value = false
      // start 已落地但停止/轮询失败：会话仍在后端跑，必须清扫，否则它会一直占住 runner。
      const failedId = scanId
      scanId = null
      if (failedId) discard(failedId)
      ports.onError?.('start', cause)
    }
  }

  function requestStop() {
    stopRequested = true
    stopping.value = true
    incomplete.value = true
    const id = scanId
    if (!id) return
    host.cancel(id).catch(cause => {
      // 取消失败时扫描可能仍在继续：交回轮询，用户可再点一次停止。
      stopping.value = false
      ports.onError?.('cancel', cause)
    })
  }

  function stop() {
    generation += 1
    clearPollTimer()
    const id = scanId
    scanId = null
    scanning.value = false
    stopping.value = false
    stopRequested = false
    if (id) discard(id)
  }

  return {
    scanning,
    stopping,
    incomplete,
    beginScan,
    requestStop,
    stop,
    dispose: stop
  }
}
