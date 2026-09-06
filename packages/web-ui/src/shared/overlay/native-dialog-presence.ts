import { definePlugin } from '@greypan/js-kit'

import { getTransitionDuration } from './presence'

export interface NativeDialogPresenceOptions {
  getDialog(): HTMLDialogElement | null
  isConnected(): boolean
  isOpen(): boolean
}

export interface NativeDialogPresenceApi {
  sync(open: boolean): void
  handleTransitionEnd(event: TransitionEvent): void
  handleNativeClose(): void
  dispose(): void
}

// 管理原生 dialog 保持在 top layer 直至退出动画完成的生命周期。
export const defineNativeDialogPresence = () =>
  definePlugin<NativeDialogPresenceApi, NativeDialogPresenceOptions>(ctx => {
    let closeFallbackTimer: ReturnType<typeof setTimeout> | undefined
    let openFrame: number | undefined
    let isClosing = false

    const clearCloseFallback = () => {
      if (closeFallbackTimer === undefined) return
      clearTimeout(closeFallbackTimer)
      closeFallbackTimer = undefined
    }

    const cancelOpenFrame = () => {
      if (openFrame === undefined) return
      cancelAnimationFrame(openFrame)
      openFrame = undefined
    }

    const finishClosing = () => {
      const dialog = ctx.getDialog()
      if (!dialog || !isClosing || ctx.isOpen()) return
      clearCloseFallback()
      isClosing = false
      dialog.classList.remove('is-closing', 'is-visible')
      if (dialog.open) dialog.close?.()
    }

    const startOpening = () => {
      const dialog = ctx.getDialog()
      if (!dialog) return
      isClosing = false
      clearCloseFallback()
      dialog.classList.remove('is-closing')
      if (!dialog.open) {
        try {
          // 并发多个 modal dialog（nested drawer 场景）在规范中合法；
          // 此 try/catch 为防御性兜底（如对已在 top layer 的 dialog 重复 showModal
          // 会抛 InvalidStateError），失败时由下方 rAF 回调的 dialog.open 判断中止动画。
          dialog.showModal?.()
        } catch {
          // 保留未打开状态
        }
      }

      cancelOpenFrame()
      openFrame = requestAnimationFrame(() => {
        openFrame = undefined
        if (!ctx.isConnected() || !ctx.isOpen() || !dialog.open) return
        dialog.classList.add('is-visible')
      })
    }

    const startClosing = () => {
      const dialog = ctx.getDialog()
      if (!dialog?.open) return
      cancelOpenFrame()
      isClosing = true
      if (!dialog.classList.contains('is-visible')) {
        finishClosing()
        return
      }

      dialog.classList.add('is-closing')
      dialog.classList.remove('is-visible')
      clearCloseFallback()
      closeFallbackTimer = setTimeout(() => finishClosing(), getTransitionDuration(dialog) + 80)
    }

    return {
      sync(open) {
        if (open) startOpening()
        else startClosing()
      },

      handleTransitionEnd(event) {
        if (event.target !== ctx.getDialog() || event.propertyName !== 'transform') return
        finishClosing()
      },

      handleNativeClose() {
        cancelOpenFrame()
        clearCloseFallback()
        isClosing = false
        ctx.getDialog()?.classList.remove('is-closing', 'is-visible')
      },

      dispose() {
        cancelOpenFrame()
        clearCloseFallback()
        isClosing = false
      }
    }
  })
