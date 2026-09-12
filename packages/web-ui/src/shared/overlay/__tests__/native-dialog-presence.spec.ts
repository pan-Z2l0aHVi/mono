import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineNativeDialogPresence } from '../native-dialog-presence'

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('native dialog presence', () => {
  it('open 时先强制读取 top-layer 布局，再在下一帧切换 is-visible', async () => {
    const dialog = document.createElement('dialog')
    const layoutReads = vi.fn<() => void>()
    Object.defineProperty(dialog, 'offsetWidth', {
      configurable: true,
      get() {
        layoutReads()
        return 0
      }
    })
    document.body.append(dialog)

    const presence = defineNativeDialogPresence().make({
      getDialog: () => dialog,
      isConnected: () => true,
      isOpen: () => true
    })

    presence.sync(true)

    expect(dialog.open).toBe(true)
    expect(dialog.classList.contains('is-visible')).toBe(false)
    expect(layoutReads).toHaveBeenCalledTimes(1)

    await nextFrame()

    expect(dialog.classList.contains('is-visible')).toBe(true)
  })
})
