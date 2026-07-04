import { definePlugin } from './core'

export function defineEventEmitter<E extends Record<string, unknown[]>>() {
  return definePlugin(() => {
    const bus = new EventTarget()

    return {
      on<K extends keyof E>(type: K & string, handler: (...args: E[K]) => void, options?: AddEventListenerOptions) {
        const listener = (e: Event) => {
          const args = (e as CustomEvent).detail as E[K]
          handler(...args)
        }
        bus.addEventListener(type, listener, options)
        // off fn
        return () => bus.removeEventListener(type, listener)
      },

      // 支持传入多个参数
      emit<K extends keyof E>(type: K & string, ...args: E[K]) {
        const event = new CustomEvent(type, { detail: args })
        bus.dispatchEvent(event)
      }
    }
  })
}
