/**
 * @description
 * 失败重试插件：track 失败时数据入队并持久化，
 * 下次 track 成功时自动重试队列中的数据
 */

import { definePlugin, type PluginMade } from '@greypan/js-kit'
import { del, get, set } from 'idb-keyval'

import type { Flushable } from '../func-types'

import type { defineTracker } from './core'

interface Options {
  restoreKey?: string
  maxQueueSize?: number
}
type Config = Required<Options>

const DEFAULT_OPTIONS: Config = {
  restoreKey: 'failure-retry',
  maxQueueSize: 100
}

export function defineFailureRetry(options?: Options) {
  return definePlugin((ctx: PluginMade<typeof defineTracker> & Flushable) => {
    const config = { ...DEFAULT_OPTIONS, ...options }

    let retryQueue: object[] = []

    // 启动时恢复未完成的重试队列
    get<object[]>(config.restoreKey)
      .then(data => {
        if (data) retryQueue = data
      })
      .catch(console.error)

    async function track(data: object): Promise<void> {
      try {
        await ctx.track(data)
      } catch (error) {
        // 入队但不吞掉错误，保留错误链供调用者处理
        if (retryQueue.length < config.maxQueueSize) {
          retryQueue.push(data)
          void persist()
        }
        throw error
      }

      // 成功触发：重试队列中的数据
      if (retryQueue.length > 0) {
        void retryStaged()
      }
    }

    async function retryStaged(): Promise<void> {
      const toRetry = [...retryQueue]
      retryQueue = []

      for (const data of toRetry) {
        try {
          await ctx.track(data)
        } catch {
          // 重试失败，放回队列等待下次触发
          retryQueue.push(data)
          break
        }
      }

      void persist()
    }

    function persist() {
      return retryQueue.length > 0 ? set(config.restoreKey, retryQueue) : del(config.restoreKey)
    }

    // 页面关闭等场景：尝试发送待重试数据，而非直接丢弃
    function flush() {
      const toRetry = [...retryQueue]
      retryQueue = []
      void del(config.restoreKey)
      for (const data of toRetry) {
        void ctx.track(data)
      }
      ctx.flush?.()
    }

    return { track, flush }
  })
}
