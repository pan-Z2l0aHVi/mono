import { nanoid } from 'nanoid'

import { safeCall } from '@/shortcut'

import { definePlugin } from '../core'

export interface QueueItem<T = object> {
  id: string
  data: T
}

interface Options {
  initialQueue?: object[]
  onConsume?: (target: object, queue: object[]) => void
}
type Config = Required<Options>

const DEFAULT_OPTIONS = {
  initialQueue: [],
  onConsume: () => {}
}

export function defineLoopQueue(options: Options) {
  return definePlugin(() => {
    const config = { ...DEFAULT_OPTIONS, ...options } as Config
    const queue: QueueItem[] = config.initialQueue.map(data => ({ id: nanoid(), data }))
    let isProcessing = false
    let isPaused = false
    let resumeResolve: (() => void) | null = null

    function enqueue(data: object) {
      queue.push({ id: nanoid(), data })
      void processQueue()
    }

    async function processQueue() {
      if (isProcessing) return
      isProcessing = true

      while (queue.length > 0) {
        if (isPaused) {
          await new Promise<void>(r => {
            resumeResolve = r
          })
        }
        _consume()
      }
      isProcessing = false
    }

    function pause() {
      isPaused = true
    }

    function resume() {
      isPaused = false
      resumeResolve?.()
      resumeResolve = null
    }

    function flush() {
      while (queue.length > 0) {
        _consume()
      }
      isProcessing = false
      isPaused = false
      resumeResolve?.()
      resumeResolve = null
    }

    function _consume() {
      const item = queue.shift()
      if (item)
        safeCall(
          config.onConsume,
          item.data,
          queue.map(i => i.data)
        )
    }

    void processQueue()

    return { enqueue, pause, resume, flush }
  })
}
