import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { isThemeTransitionInFlight, runThemeTransition } from '@/shared/theme/transition'

/*
 * 输入压制状态机与 flight token 时序的 unit 面：对 fake transition object
 * （{ ready, finished, skipTransition }）直接驱动引擎。自 theme.spec 迁移而来
 * （迁移不复制）——theme.spec 只留 Lit 接线断言；浏览器里才能证明的部分
 * （真实揭示动画、滚动跳过）归 theme-transition.browser.spec。
 */

interface FakeTransition {
  ready: Promise<void>
  finished: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition: ReturnType<typeof vi.fn>
  resolveFinished: () => void
}

function stubStartViewTransition() {
  const startDescriptor = Object.getOwnPropertyDescriptor(document, 'startViewTransition')
  const adoptedDescriptor = Object.getOwnPropertyDescriptor(document, 'adoptedStyleSheets')
  let last: FakeTransition | undefined
  const startViewTransition = vi.fn<typeof document.startViewTransition>((update?: () => Promise<void>) => {
    let resolveFinished!: () => void
    const finished = new Promise<void>(resolve => {
      resolveFinished = resolve
    })
    const transition: FakeTransition = {
      ready: Promise.resolve(),
      finished,
      updateCallbackDone: update ? update().then(() => undefined) : Promise.resolve(),
      // 真实语义：skip 让 finished 收敛，finally 随之释放 flight token。
      skipTransition: vi.fn<() => void>(() => resolveFinished()),
      resolveFinished
    }
    last = transition
    return transition as unknown as ViewTransition
  })
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    writable: true,
    value: startViewTransition
  })
  document.adoptedStyleSheets = []
  return {
    startViewTransition,
    get lastTransition() {
      return last
    },
    restore() {
      if (startDescriptor) Object.defineProperty(document, 'startViewTransition', startDescriptor)
      else Reflect.deleteProperty(document, 'startViewTransition')
      if (adoptedDescriptor) Object.defineProperty(document, 'adoptedStyleSheets', adoptedDescriptor)
      else Reflect.deleteProperty(document, 'adoptedStyleSheets')
    }
  }
}

function createHost(): HTMLElement {
  const host = document.createElement('div')
  document.body.append(host)
  return host
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('shared/theme/transition', () => {
  it('飞行期间压制输入；pointerup / keyup 的延迟消费与下一次 pointerdown 放行（自 theme.spec 迁移）', async () => {
    const stub = stubStartViewTransition()
    const host = createHost()
    const update = vi.fn<() => Promise<void>>(async () => {})

    const session = runThemeTransition({ host, resolvedNext: 'dark', update })
    expect(isThemeTransitionInFlight(), '飞行中 flight gate 关闭').toBe(true)
    expect(stub.startViewTransition).toHaveBeenCalledTimes(1)

    // 压制窗口内的输入全部被吞：dispatchEvent 返回 false 即 preventDefault 已生效。
    const press = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })
    expect(window.dispatchEvent(press)).toBe(false)
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })
    expect(window.dispatchEvent(click)).toBe(false)
    for (const type of ['auxclick', 'dblclick', 'contextmenu', 'beforeinput']) {
      const event = new Event(type, { bubbles: true, cancelable: true })
      expect(window.dispatchEvent(event)).toBe(false)
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }))
    const pointer = new PointerEvent('pointerdown', { pointerId: 42, bubbles: true, cancelable: true })
    expect(window.dispatchEvent(pointer)).toBe(false)

    // 收尾。pointerup 的版本计数延迟 1000ms 释放：随后的补发 click 仍属同一次意图。
    stub.lastTransition!.resolveFinished()
    await session.finished
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 42, bubbles: true }))
    const delayedClick = new PointerEvent('click', { pointerId: 42, detail: 1, bubbles: true, cancelable: true })
    expect(window.dispatchEvent(delayedClick)).toBe(false)

    // 新的 pointerdown / keydown 是新的用户意图：放行。
    const nextPointer = new PointerEvent('pointerdown', { pointerId: 42, bubbles: true, cancelable: true })
    expect(window.dispatchEvent(nextPointer)).toBe(true)
    const nextKey = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })
    expect(window.dispatchEvent(nextKey)).toBe(true)
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 42, bubbles: true }))

    expect(isThemeTransitionInFlight(), '收尾后 flight token 释放').toBe(false)
    stub.restore()
  })

  it('滚轮跳过揭示，且只跳过一次', async () => {
    const stub = stubStartViewTransition()
    const host = createHost()

    const session = runThemeTransition({ host, resolvedNext: 'dark', update: async () => undefined })
    window.dispatchEvent(new WheelEvent('wheel', { cancelable: true }))
    window.dispatchEvent(new WheelEvent('wheel', { cancelable: true }))
    expect(stub.lastTransition!.skipTransition).toHaveBeenCalledTimes(1)

    stub.lastTransition!.resolveFinished()
    await session.finished
    stub.restore()
  })

  it('断连路径的 skip()：跳过在途转场，flight gate 随 finished 收敛释放', async () => {
    const stub = stubStartViewTransition()
    const host = createHost()

    const session = runThemeTransition({ host, resolvedNext: 'dark', update: async () => undefined })
    session.skip()
    expect(stub.lastTransition!.skipTransition).toHaveBeenCalledTimes(1)
    expect(isThemeTransitionInFlight(), 'finished 尚未收敛前 flight gate 仍关闭').toBe(true)

    await session.finished
    expect(isThemeTransitionInFlight()).toBe(false)
    stub.restore()
  })

  it('样式表构建失败：同步段异常也要释放 flight token，动画 gate 不被永久关闭', async () => {
    // new CSSStyleSheet() / replaceSync 在受限嵌入环境会抛错。失败点在任何清理登记之前，
    // 曾经的失败路径不释放 token：之后所有主题切换都走直接落地分支，动画永久消失。
    const original = globalThis.CSSStyleSheet
    globalThis.CSSStyleSheet = class {
      replaceSync(): string {
        throw new Error('replaceSync unavailable')
      }
    } as unknown as typeof CSSStyleSheet

    const host = createHost()
    try {
      const session = runThemeTransition({ host, resolvedNext: 'dark', update: async () => undefined })
      await expect(session.finished).rejects.toThrow('replaceSync unavailable')
      expect(isThemeTransitionInFlight(), '失败路径同样释放 flight token').toBe(false)
    } finally {
      globalThis.CSSStyleSheet = original
    }
  })

  /*
   * 窗口 blur 清空压制集合（blockedPointers / blockedKeys / 版本计数）的分支不设 jsdom 用例：
   * 该分支判 `event.target === window`，真实浏览器里 window blur 的 target 是 window，
   * 而 jsdom 对 window 合成派发的 Event.target 不是 window 全局对象（实测 false），
   * 合成事件到不了那条分支——强行断言只会测到一条不存在的通道。分支随压制状态机
   * 逐行搬移，语义由 browser 侧的真实输入覆盖。
   */
})
