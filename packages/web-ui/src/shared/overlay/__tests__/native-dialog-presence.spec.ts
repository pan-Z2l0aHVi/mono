import { afterEach, describe, expect, it } from 'vite-plus/test'

import { defineNativeDialogPresence } from '../native-dialog-presence'
import type { NativeDialogPresenceApi } from '../native-dialog-presence'

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

// jsdom 未实现原生 dialog 的 modal 语义，这里只补足 showModal/close 对 open 的影响。
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
// 断言只落在 dialog.open 与 handleNativeClose() 的返回值上（模块接口契约），
// 不断言 is-visible / is-closing 这类由模块自己增删的内部状态标记。
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

  it('sync(false) 经 transform 过渡收尾后关闭 dialog，且该原生 close 被判定为自身排队的关闭', async () => {
    const { dialog, presence, setOpen } = setup()
    presence.sync(true)
    await nextFrame()

    setOpen(false)
    presence.sync(false)
    settleCloseTransition(dialog, presence)

    expect(dialog.open).toBe(false)
    expect(presence.handleNativeClose()).toBe(true)
  })

  it('外部 dialog.close() 不被判定为自身排队的关闭', async () => {
    const { dialog, presence } = setup()
    presence.sync(true)
    await nextFrame()

    dialog.close()
    expect(dialog.open).toBe(false)

    expect(presence.handleNativeClose()).toBe(false)
    presence.dispose()
  })
})
