/**
 * @description
 * 页面错误插件：监听 uncaught error 与 unhandled promise rejection，
 * 并通过组合后的 Tracker 上报。插件不采集资源加载失败、console 消息
 * 或框架回调错误，也不建立独立传输通道。
 */

import { definePlugin, safeCall } from '@greypan/js-kit'

import { on } from '@/shortcut'

import type { TrackCapability } from '../capabilities'

export type PageErrorCategory = 'uncaught' | 'unhandled_rejection'

export interface PageErrorDetail {
  category: PageErrorCategory
  message: string
  filename?: string
  lineno?: number
  colno?: number
  stack?: string
}

export interface PageErrorEvent {
  event: 'page_error'
  timestamp: number
  error: PageErrorDetail
  metadata?: object
}

export type PageErrorMetadata = object | (() => object)

export interface PageErrorsOptions {
  /** 页面生命周期内最多实际上报的错误数量。 */
  maxErrors?: number
  /** 同一错误签名的去重窗口；0 或负数表示关闭去重。 */
  dedupeWindowMs?: number
  /** message 字符串的最大长度。 */
  maxMessageLength?: number
  /** stack 字符串的最大长度。 */
  maxStackLength?: number
  /** 每次上报时求值的增强信息；不参与错误风暴保护的标准字段。 */
  metadata?: PageErrorMetadata
}

const DEFAULT_OPTIONS: Required<Omit<PageErrorsOptions, 'metadata'>> = {
  maxErrors: 20,
  dedupeWindowMs: 5_000,
  maxMessageLength: 1_000,
  maxStackLength: 8_000
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function truncate(value: string, maxLength: number): string {
  return Number.isFinite(maxLength) ? value.slice(0, Math.max(0, maxLength)) : value
}

/** 非字符串与宿主对象都可能让 String() 抛错；错误插件不能制造新的页面错误。 */
function rejectionMessage(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason instanceof Error) return reason.message
  try {
    return String(reason)
  } catch {
    return 'Unknown unhandled rejection'
  }
}

function resolveMetadata(options: PageErrorsOptions): object | undefined {
  try {
    const metadata = options.metadata
    const value = typeof metadata === 'function' ? metadata() : metadata
    if (!isObject(value)) return undefined
    // 浅拷贝返回值，避免调用方后续修改对象影响已入队的错误事件。
    return { ...value }
  } catch {
    // metadata 是增强信息，失败时保留错误本体。
    return undefined
  }
}

export function definePageErrors(options: PageErrorsOptions = {}) {
  return definePlugin((ctx: TrackCapability) => {
    const stopNoop = () => {}

    // SSR / 非浏览器环境没有全局错误事件；保持 stop() 契约一致，便于调用方无条件释放。
    if (typeof window === 'undefined') return { stop: stopNoop }

    // 不展开 options：metadata 可能是 throwing getter，插件初始化不能因此失败。
    const config: typeof DEFAULT_OPTIONS = {
      maxErrors: options.maxErrors ?? DEFAULT_OPTIONS.maxErrors,
      dedupeWindowMs: options.dedupeWindowMs ?? DEFAULT_OPTIONS.dedupeWindowMs,
      maxMessageLength: options.maxMessageLength ?? DEFAULT_OPTIONS.maxMessageLength,
      maxStackLength: options.maxStackLength ?? DEFAULT_OPTIONS.maxStackLength
    }
    const controller = new AbortController()
    const { signal } = controller
    const signatures = new Map<string, number>()
    let reportedCount = 0

    function pruneExpiredSignatures(timestamp: number) {
      if (config.dedupeWindowMs <= 0) return

      for (const [signature, reportedAt] of signatures) {
        if (timestamp - reportedAt >= config.dedupeWindowMs) signatures.delete(signature)
      }
    }

    function canReport(signature: string, timestamp: number) {
      // NaN 会让 >= 判定恒为 false，必须显式失败关闭，避免绕过错误风暴保护。
      if (Number.isNaN(config.maxErrors) || reportedCount >= config.maxErrors) return false
      if (config.dedupeWindowMs <= 0) return true

      const reportedAt = signatures.get(signature)
      return reportedAt === undefined || timestamp - reportedAt >= config.dedupeWindowMs
    }

    function report(detail: PageErrorDetail, signature: string) {
      const timestamp = Date.now()
      pruneExpiredSignatures(timestamp)
      if (!canReport(signature, timestamp)) return

      if (config.dedupeWindowMs > 0) signatures.set(signature, timestamp)
      reportedCount += 1
      const payload: PageErrorEvent = {
        event: 'page_error',
        timestamp,
        error: detail
      }
      const metadata = resolveMetadata(options)
      if (metadata) payload.metadata = metadata

      // track 的入队路径不应因异常产生新的全局错误；错误上报保持 best-effort。
      safeCall(() => ctx.track(payload))
    }

    on(
      window,
      'error',
      event => {
        const source = event.error instanceof Error ? event.error : undefined
        const detail: PageErrorDetail = {
          category: 'uncaught',
          message: truncate(event.message, config.maxMessageLength),
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: source?.stack ? truncate(source.stack, config.maxStackLength) : undefined
        }

        report(
          detail,
          [detail.category, detail.message, detail.filename ?? '', detail.lineno ?? '', detail.colno ?? ''].join('|')
        )
      },
      { signal }
    )

    on(
      window,
      'unhandledrejection',
      event => {
        const source = event.reason instanceof Error ? event.reason : undefined
        const detail: PageErrorDetail = {
          category: 'unhandled_rejection',
          message: truncate(rejectionMessage(event.reason), config.maxMessageLength),
          stack: source?.stack ? truncate(source.stack, config.maxStackLength) : undefined
        }

        report(detail, [detail.category, detail.message].join('|'))
      },
      { signal }
    )

    return {
      stop() {
        controller.abort()
      }
    }
  })
}
