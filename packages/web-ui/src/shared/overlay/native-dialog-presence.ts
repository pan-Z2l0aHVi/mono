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
  /**
   * 处理原生 dialog 的 `close` 事件。
   *
   * 返回 `true` 表示该事件是本模块自己 `finishClosing → dialog.close()` 排队的
   * 异步事件（正常时序在本关闭会话内到达，快速重开时在重开后到达的过期事件），
   * 消费方不应把它当成外部关闭；返回 `false` 表示真实的外部关闭
   * （如表单 method="dialog"、宿主程序化 dialog.close()），消费方需自行恢复状态。
   */
  handleNativeClose(): boolean
  dispose(): void
}

// 管理原生 dialog 保持在 top layer 直至退出动画完成的生命周期。
export const defineNativeDialogPresence = () =>
  definePlugin<NativeDialogPresenceApi, NativeDialogPresenceOptions>(ctx => {
    let closeFallbackTimer: ReturnType<typeof setTimeout> | undefined
    let openFrame: number | undefined
    let isClosing = false
    // 由本模块 finishClosing 主动 dialog.close() 时置 true。原生 dialog 的 close 事件
    // 是异步任务（queue a task），可能在之后任意时刻才到达：正常时序在本关闭会话内
    // 到达（消费方 open 已为 false，本就该忽略）；快速「关闭→重开」时它在重新打开
    // 之后才到达，若消费方把它当成外部关闭，会把刚重开的 dialog 关掉——这是 drawer
    // 连续开关后丢失过渡动画（重开即被误关）的根因。置位后由消费方的
    // handleNativeClose 经 handleNativeClose() 消费；消费方 open 为 false 提前返回时
    // 也必须调用一次以消费标志，避免泄漏到下一次真实关闭。
    let selfClosePending = false

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
      if (dialog.open) {
        selfClosePending = true
        dialog.close?.()
      }
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
      // 强制计算初始 top-layer 布局，确保 Safari 等浏览器在下一帧切换 class 时
      // 有稳定的 transition 起点，而不是偶发跳过进场过渡。
      void dialog.offsetWidth

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
        if (selfClosePending) {
          // 我们自己的 dialog.close() 排队的事件：正常时序在本会话内到达、快速重开
          // 时是上一会话的过期事件——两种情况本模块都已在 finishClosing 完成全部清理，
          // 消费标志并让调用方跳过外部关闭处理即可。
          selfClosePending = false
          return true
        }
        // 真实的外部关闭：重置打开/关闭状态，等待消费方恢复（如 open=false）。
        cancelOpenFrame()
        clearCloseFallback()
        isClosing = false
        ctx.getDialog()?.classList.remove('is-closing', 'is-visible')
        return false
      },

      dispose() {
        cancelOpenFrame()
        clearCloseFallback()
        isClosing = false
        selfClosePending = false
      }
    }
  })
