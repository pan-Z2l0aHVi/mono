import { definePlugin } from '@greypan/js-kit'

export interface OverlayLifecycleHost {
  isConnected(): boolean
  isOpen(): boolean
}

export interface OverlayFrameOptions {
  /**
   * 显式要求回调执行时 open 状态必须等于该值；未传入时只校验连接状态。
   */
  expectedOpen?: boolean
}

export interface OverlayFrameHandle {
  cancel(): void
}

export interface OverlayLifecycle {
  /** generation 只能通过方法读取：definePlugin.make 展开对象时会立即消费 getter。 */
  getGeneration(): number
  /** 结束当前事务：取消该事务内尚未执行的 frame，并让旧 generation 回调失效。 */
  invalidate(): void
  scheduleFrame(callback: (generation: number) => void, options?: OverlayFrameOptions): OverlayFrameHandle
  dispose(): void
  /** temporary disconnect 后恢复调度；generation 继续单调递增，旧事务保持失效。 */
  resume(): void
}

/**
 * Overlay 组件共享的帧级事务调度。portal / presence / positioning 可能跨多帧，
 * 同帧 controlled open/close、disconnect 或 reconfigure 都必须使旧事务失效，
 * 而不是让每个组件各自散落 open / isConnected 复查。
 */
export const defineOverlayLifecycle = () =>
  definePlugin<OverlayLifecycle, OverlayLifecycleHost>(host => {
    let generation = 0
    let disposed = false
    const frames = new Set<OverlayFrameHandle & { id: number; generation: number }>()

    const cancelFrame = (frame: OverlayFrameHandle & { id: number; generation: number }) => {
      cancelAnimationFrame(frame.id)
      frames.delete(frame)
    }

    const invalidateCurrent = () => {
      if (disposed) return
      generation += 1
      for (const frame of Array.from(frames)) cancelFrame(frame)
    }

    return {
      getGeneration() {
        return generation
      },

      invalidate: invalidateCurrent,

      scheduleFrame(callback, options = {}) {
        if (disposed) return { cancel() {} }

        const scheduledGeneration = generation
        const frame = {
          generation: scheduledGeneration,
          id: requestAnimationFrame(() => {
            frames.delete(frame)
            if (disposed || scheduledGeneration !== generation) return
            if (!host.isConnected()) return
            if (options.expectedOpen !== undefined && host.isOpen() !== options.expectedOpen) return
            callback(scheduledGeneration)
          }),
          cancel() {
            cancelFrame(frame)
          }
        }
        frames.add(frame)
        return frame
      },

      dispose() {
        if (disposed) return
        disposed = true
        invalidateCurrent()
      },

      resume() {
        if (!disposed) return
        disposed = false
        generation += 1
      }
    }
  })
