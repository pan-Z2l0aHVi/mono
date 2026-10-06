import { afterEach, describe, expect, it } from 'vite-plus/test'

import { defineNativeDialogPresence } from '../native-dialog-presence'
import type { NativeDialogPresenceApi } from '../native-dialog-presence'

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

/*
 * jsdom 未实现原生 dialog 的 modal 语义，这里**逐 spec 局部**补足 showModal/close 对
 * open 的影响。绝不能装全局 shim：它会让所有消费共享 presence 的 spec 里
 * `showModal?.()` 真正执行，改变那些 spec 既有的观察点。
 */
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

function setup() {
  const dialog = document.createElement('dialog')
  document.body.append(dialog)
  let open = true
  const presence = defineNativeDialogPresence().make({
    getDialog: () => dialog,
    isConnected: () => true,
    isOpen: () => open
  })
  return {
    dialog,
    presence,
    setOpen(value: boolean) {
      open = value
    }
  }
}

// 复刻消费方接线：transitionend 交给 handleTransitionEnd 判定本轮关闭是否收尾。
// 判据取 dialog.open ——「退出过渡播完才真正离开 top layer」是这一层存在的全部理由。
// is-visible / is-closing 是模块的内部动画相位，用户不依赖，不作断言。
function settleCloseTransition(dialog: HTMLDialogElement, presence: NativeDialogPresenceApi): void {
  dialog.addEventListener('transitionend', event => presence.handleTransitionEnd(event), { once: true })
  const event = new Event('transitionend')
  Object.defineProperty(event, 'propertyName', { value: 'transform' })
  dialog.dispatchEvent(event)
}

describe('native dialog presence', () => {
  it('sync(true) 使原生 dialog 进入 open 状态', () => {
    const { dialog, presence } = setup()

    presence.sync(true)

    expect(dialog.open).toBe(true)
  })

  it('sync(false) 不立刻离开 top layer，过渡收尾后才关闭，且该关闭被判定为自身排队的', async () => {
    const { dialog, presence, setOpen } = setup()
    presence.sync(true)
    await nextFrame()

    setOpen(false)
    presence.sync(false)

    // 退出过渡期间 dialog 必须留在 top layer，否则遮罩先消失、面板还在原地。
    expect(dialog.open).toBe(true)

    settleCloseTransition(dialog, presence)

    expect(dialog.open).toBe(false)
    expect(presence.handleNativeClose()).toBe(true)
  })

  it('打开首帧前立刻关闭：dialog 仍留在 top layer，直到退出过渡收尾才关闭', async () => {
    const { dialog, presence, setOpen } = setup()

    presence.sync(true)
    setOpen(false)
    presence.sync(false)

    // 尚未建立可见态就进入关闭：这里最容易出的真实回归是「直接跳过退出过渡」，
    // 面板会瞬间消失而不是滑出。判据是 open ——它在收尾前必须仍然为 true。
    expect(dialog.open).toBe(true)

    await nextFrame()
    await nextFrame()
    expect(dialog.open).toBe(true)

    settleCloseTransition(dialog, presence)
    expect(dialog.open).toBe(false)
  })

  it('外部 dialog.close() 被判定为真实外部关闭，交给消费方恢复状态', async () => {
    const { dialog, presence } = setup()
    presence.sync(true)
    await nextFrame()

    dialog.close()
    expect(dialog.open).toBe(false)

    // 返回 false 表示「不是本模块排队的」，消费方必须据此恢复 open —— 误判成
    // 自身关闭会让一次真实的外部关闭（表单 method="dialog" 等）被静默吞掉。
    expect(presence.handleNativeClose()).toBe(false)
    presence.dispose()
  })

  it('自身排队的 close 只被消费一次：快速重开后过期事件不会误关刚重开的 dialog', async () => {
    const { dialog, presence, setOpen } = setup()
    presence.sync(true)
    await nextFrame()

    // 关闭走完收尾 → 原生 close 事件在「路上」。
    setOpen(false)
    presence.sync(false)
    settleCloseTransition(dialog, presence)
    expect(dialog.open).toBe(false)

    // 原生 close 是异步任务（queue a task），可能落在重开之后才到达。
    setOpen(true)
    presence.sync(true)
    expect(dialog.open).toBe(true)

    // 过期事件：识别为本模块排队的，调用方据此跳过外部关闭处理，不会把刚重开的 dialog 关掉。
    expect(presence.handleNativeClose()).toBe(true)
    expect(dialog.open).toBe(true)
  })
})
