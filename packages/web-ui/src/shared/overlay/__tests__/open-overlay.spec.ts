import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineOpenOverlay } from '../open-overlay'
import type { OpenOverlay, OpenOverlayHandle, OverlayClaimOptions } from '../open-overlay'

/*
 * 这些用例只走公开 interface：claim / adopt / release / setInert / scheduleFrame。
 * 刻意不 import 模块内部结构 —— 集合与树的形状是实现，不是契约。
 */

const created: OpenOverlayHandle[] = []

/** host 在 make() 时绑定，因此每个用例都要有自己带 requestClose 的实例。 */
function overlay(requestClose: () => void = () => {}, hostConnected: () => boolean = () => true): OpenOverlay {
  return defineOpenOverlay().make({ requestClose, isConnected: hostConnected })
}

/** 建一个宿主元素：惰性回收的判据是它与面板同时失联。 */
function hostElement(): HTMLElement {
  const element = document.createElement('div')
  document.body.append(element)
  return element
}

function claim(instance: OpenOverlay, target: HTMLElement, options: OverlayClaimOptions = {}): OpenOverlayHandle {
  const handle = instance.claim(target, { ancestryFrom: target, ...options })
  created.push(handle)
  return handle
}

/** 建一个已挂载的 panel；仲裁候选要求 panel 在文档里。 */
function panel(parent: HTMLElement = document.body): HTMLElement {
  const element = document.createElement('div')
  parent.append(element)
  return element
}

function pressEscape(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

afterEach(() => {
  for (const handle of created.splice(0)) handle.release()
  document.body.replaceChildren()
})

describe('open overlay 的 Escape 归属', () => {
  it('单层开启时命中该层并吞掉按键', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    claim(instance, panel())

    const event = pressEscape()

    expect(requestClose).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('嵌套时只关最内层，而不是先关外层', () => {
    const closeOuter = vi.fn<() => void>()
    const closeInner = vi.fn<() => void>()
    const outerInstance = overlay(closeOuter)
    const innerInstance = overlay(closeInner)
    const outer = panel()
    const inner = panel(outer)
    claim(outerInstance, outer)
    claim(innerInstance, inner)

    pressEscape()

    expect(closeInner).toHaveBeenCalledTimes(1)
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('互不包含的并列浮层按开启顺序取最上层', () => {
    const closeFirst = vi.fn<() => void>()
    const closeSecond = vi.fn<() => void>()
    claim(overlay(closeFirst), panel())
    claim(overlay(closeSecond), panel())

    pressEscape()

    expect(closeSecond).toHaveBeenCalledTimes(1)
    expect(closeFirst).not.toHaveBeenCalled()
  })

  it('none 层不参与仲裁，Escape 不被它拦下', () => {
    const instance = overlay()
    claim(instance, panel(), { arbitration: 'none' })

    const event = pressEscape()

    expect(event.defaultPrevented).toBe(false)
  })

  it('none 层在内、escape 层在外时仍关外层', () => {
    const closeOuter = vi.fn<() => void>()
    const outerInstance = overlay(closeOuter)
    const noneInstance = overlay()
    const outer = panel()
    const inner = panel(outer)
    claim(outerInstance, outer)
    claim(noneInstance, inner, { arbitration: 'none' })

    pressEscape()

    expect(closeOuter).toHaveBeenCalledTimes(1)
  })

  it('惰性层仍是最内层：吞掉按键且不关闭，也不把 Escape 漏给外层', () => {
    const closeOuter = vi.fn<() => void>()
    const closeInner = vi.fn<() => void>()
    const outerInstance = overlay(closeOuter)
    const innerInstance = overlay(closeInner)
    const outer = panel()
    const inner = panel(outer)
    claim(outerInstance, outer)
    const innerHandle = claim(innerInstance, inner)

    innerHandle.setInert(true)
    const event = pressEscape()

    expect(event.defaultPrevented).toBe(true)
    expect(closeInner).not.toHaveBeenCalled()
    // 旧的「跳过候选」语义会放任事件落到外层把它关掉，这里刻意不是。
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('setInert 动态开关在候选与惰性之间切换', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const handle = claim(instance, panel())

    handle.setInert(true)
    pressEscape()
    expect(requestClose).not.toHaveBeenCalled()

    handle.setInert(false)
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('release 幂等，且 release 之后不再被仲裁', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const handle = claim(instance, panel())

    handle.release()
    handle.release()

    const event = pressEscape()
    expect(requestClose).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('panel 脱离文档后不再是候选', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const target = panel()
    claim(instance, target)

    target.remove()
    const event = pressEscape()

    expect(requestClose).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('断连时释放的层只靠重新 claim 恢复仲裁（声明式的代价）', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const target = panel()
    const first = claim(instance, target)

    // 模拟 disconnectedCallback：释放后重挂载不会自动恢复，必须由组件显式重新声明。
    first.release()
    target.remove()
    document.body.append(target)
    pressEscape()
    expect(requestClose).not.toHaveBeenCalled()

    claim(instance, target)
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('仅 DOM 短暂移除再放回不丢登记：层对象比 DOM 连接活得久', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const target = panel()
    claim(instance, target)

    target.remove()
    expect(pressEscape().defaultPrevented).toBe(false)

    document.body.append(target)
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('暂缓层吞掉 Escape 但不走关闭入口：退场中的面板不重复关闭', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const handle = claim(instance, panel())

    handle.deferArbitration()
    const event = pressEscape()

    // 仍是候选：按键被它接住，不落到 document 之外（原生 cancel 也被压掉）。
    expect(event.defaultPrevented).toBe(true)
    expect(requestClose).not.toHaveBeenCalled()
  })

  it('暂缓层只是兜底：仍有开启中的层时，Escape 归属那一层', () => {
    const closeOuter = vi.fn<() => void>()
    const closeInner = vi.fn<() => void>()
    const outerInstance = overlay(closeOuter)
    const innerInstance = overlay(closeInner)
    const outer = panel()
    const inner = panel(outer)
    claim(outerInstance, outer)
    const innerHandle = claim(innerInstance, inner)

    // 内层正在退场：它已不再开启，不能再占住「最内层」名额。
    innerHandle.deferArbitration()
    pressEscape()

    expect(closeOuter).toHaveBeenCalledTimes(1)
    expect(closeInner).not.toHaveBeenCalled()
  })

  it('重新 claim 的新会话不继承暂缓：退场被打断后由新会话接管', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const target = panel()
    const closing = claim(instance, target)

    closing.deferArbitration()
    pressEscape()
    expect(requestClose).not.toHaveBeenCalled()

    claim(instance, target)
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })
})

describe('open overlay 的组合树查询', () => {
  it('adopt 的子面板计入 contains / containsEvent', () => {
    const instance = overlay()
    const parent = panel()
    const child = panel()
    const handle = claim(instance, parent)
    const childHandle = handle.adopt(child)
    created.push(childHandle)

    expect(handle.contains(child)).toBe(true)
    expect(handle.contains(document.createElement('div'))).toBe(false)

    let insideDuringDispatch: boolean | null = null
    const inner = document.createElement('span')
    child.append(inner)
    inner.addEventListener('boom', event => {
      // composedPath() 在派发结束后会被清空，因此必须在派发过程中判定 ——
      // 真实调用方（click-outside 守卫）也在监听器内部调用。
      insideDuringDispatch = handle.containsEvent(event)
    })
    inner.dispatchEvent(new Event('boom', { bubbles: true, composed: true }))
    expect(insideDuringDispatch).toBe(true)
  })

  it('claim 沿祖先链跨 shadow host 与 slot 找到最近已开启层', () => {
    const instance = overlay()
    const parentPanel = panel()
    const childHost = document.createElement('div')
    const childShadow = childHost.attachShadow({ mode: 'open' })
    const childPanel = document.createElement('div')
    childShadow.append(childPanel)
    const slot = document.createElement('slot')
    parentPanel.append(slot, childHost)
    slot.assign?.(childHost)

    const parentHandle = claim(instance, parentPanel)
    // portal 面板与宿主物理分离，祖先链要从宿主起算才判得对「谁在谁里面」。
    const childHandle = claim(instance, childPanel, { ancestryFrom: childHost })
    created.push(childHandle)

    expect(parentHandle.contains(childPanel)).toBe(true)
  })

  it('adopt 的子层默认不是候选，显式指定 escape 才是', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const handle = claim(instance, panel(), { arbitration: 'none' })
    const child = panel()

    const defaultChild = handle.adopt(child)
    created.push(defaultChild)
    pressEscape()
    // 父层 none、子层默认 none：没有任何候选，Escape 不被拦。
    expect(requestClose).not.toHaveBeenCalled()

    const candidateChild = handle.adopt(child, { arbitration: 'escape' })
    created.push(candidateChild)
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('release 连带撤销已 adopt 的子层', () => {
    const instance = overlay()
    const parent = panel()
    const child = panel()
    const handle = claim(instance, parent)
    const childHandle = handle.adopt(child)
    created.push(childHandle)

    childHandle.release()
    expect(handle.contains(child)).toBe(false)
  })

  it('同一 panel 重新 claim 视为新的一次开启', () => {
    const closeOuter = vi.fn<() => void>()
    const closeInner = vi.fn<() => void>()
    const outerInstance = overlay(closeOuter)
    const innerInstance = overlay(closeInner)
    const outer = panel()
    const inner = panel(outer)
    claim(outerInstance, outer)
    const first = claim(innerInstance, inner)

    // 重新 claim：旧会话整体作废，新会话仍挂在同一父级下。
    const second = claim(innerInstance, inner)
    expect(first.contains(inner)).toBe(false)
    expect(second.contains(inner)).toBe(true)

    pressEscape()
    expect(closeInner).toHaveBeenCalledTimes(1)
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('inert 与会话同 lifetime：重新 claim 建出的新会话回到可关闭', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const target = panel()
    const first = claim(instance, target)

    first.setInert(true)
    pressEscape()
    expect(requestClose).not.toHaveBeenCalled()

    // 新会话不继承上一会话的惰性 —— 所以「重新 claim」的路径
    // （anchored-panel.reconfigure、同一 panel 重复 open）之后，调用方必须按当前状态重推。
    claim(instance, target)
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('adopt 到新父级后旧父级不再 contains，不留 stale ancestry', () => {
    const instance = overlay()
    const first = panel()
    const second = panel()
    const child = panel()
    const firstHandle = claim(instance, first)
    const secondHandle = claim(instance, second)

    created.push(firstHandle.adopt(child))
    expect(firstHandle.contains(child)).toBe(true)
    expect(secondHandle.contains(child)).toBe(false)

    // 同一个 panel 改挂到另一个父级：旧父级必须立刻失去它。
    created.push(secondHandle.adopt(child))
    expect(firstHandle.contains(child)).toBe(false)
    expect(secondHandle.contains(child)).toBe(true)
  })

  it('released 句柄上 adopt 不建层：不留无人回收却仍参与仲裁的孤层', () => {
    const requestClose = vi.fn<() => void>()
    const instance = overlay(requestClose)
    const handle = claim(instance, panel())
    handle.release()

    const child = panel()
    const orphan = handle.adopt(child, { arbitration: 'escape' })
    created.push(orphan)

    // 返回值必须与其它句柄方法一样静默降级，且不能建出任何参与仲裁的层。
    expect(orphan.contains(child)).toBe(false)
    expect(orphan.hasFocusWithin()).toBe(false)
    const event = pressEscape()
    expect(requestClose).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)

    // 该层确实不存在：重新挂到有效父级上时会拿到一个可用的新层。
    const valid = claim(instance, panel())
    created.push(valid.adopt(child))
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })
})

describe('open overlay 的帧事务', () => {
  it('scheduleFrame 在下一帧执行回调', async () => {
    const callback = vi.fn<() => void>()
    overlay().scheduleFrame(callback)

    await nextFrame()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('whileLive 句柄释放后，属于该会话的帧不再执行', async () => {
    const instance = overlay()
    const handle = claim(instance, panel())
    const callback = vi.fn<() => void>()
    instance.scheduleFrame(callback, handle)

    handle.release()
    await nextFrame()
    expect(callback).not.toHaveBeenCalled()
  })

  it('invalidate 取消尚未执行的帧', async () => {
    const instance = overlay()
    const callback = vi.fn<() => void>()
    instance.scheduleFrame(callback)

    instance.invalidate()
    await nextFrame()
    expect(callback).not.toHaveBeenCalled()
  })

  it('suspend 停止调度，resume 后恢复', async () => {
    const instance = overlay()
    const callback = vi.fn<() => void>()

    instance.suspend()
    instance.scheduleFrame(callback)
    await nextFrame()
    expect(callback).not.toHaveBeenCalled()

    instance.resume()
    instance.scheduleFrame(callback)
    await nextFrame()
    expect(callback).toHaveBeenCalledTimes(1)
  })
})

/*
 * 登记表的兜底回收（issue #139）。
 *
 * `layers` 强引用 panel 与 host，漏 release 会让整个组件无法回收，还会让
 * `shouldListen` 恒为 true 把 document 捕获监听永久留住。显式 release 之外的
 * 第二条删除路径在这里被压住。
 */
describe('open overlay 登记表的兜底回收', () => {
  it('宿主与面板一起脱离文档后，登记表尺寸回落，监听不再被死层留住', () => {
    const host = hostElement()
    const target = document.createElement('div')
    host.append(target)
    const requestClose = vi.fn<() => void>()
    claim(
      overlay(requestClose, () => host.isConnected),
      target
    )
    expect(__openOverlayLayerCount()).toBe(1)

    // 模拟 disconnectedCallback 漏掉 release 的组件路径：宿主与面板一起脱离文档。
    host.remove()
    // 惰性：不到遍历入口（仲裁 / claim / release）不回收。
    expect(__openOverlayLayerCount()).toBe(1)

    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const event = pressEscape()

    expect(__openOverlayLayerCount()).toBe(0)
    expect(event.defaultPrevented).toBe(false)
    expect(requestClose).not.toHaveBeenCalled()
    // 死层不再把 document 上的 capture keydown 监听永久留住。
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    removeSpy.mockRestore()
  })

  it('宿主仍在文档、只有面板脱离：不回收，重新挂回后照旧仲裁', () => {
    const host = hostElement()
    const target = document.createElement('div')
    host.append(target)
    const requestClose = vi.fn<() => void>()
    claim(
      overlay(requestClose, () => host.isConnected),
      target
    )

    // portal 在容器间搬运面板、或面板短暂移除再放回，都属这一类：宿主还连着。
    target.remove()
    pressEscape()
    expect(__openOverlayLayerCount()).toBe(1)

    host.append(target)
    pressEscape()
    expect(__openOverlayLayerCount()).toBe(1)
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('回收后新 claim 的层照常接管仲裁', () => {
    const host = hostElement()
    const target = document.createElement('div')
    host.append(target)
    claim(
      overlay(
        () => {},
        () => host.isConnected
      ),
      target
    )

    host.remove()
    pressEscape()
    expect(__openOverlayLayerCount()).toBe(0)

    const requestClose = vi.fn<() => void>()
    claim(overlay(requestClose), panel())
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  /*
   * claim 路径不跑回收：调用方先 claim 再把 panel 与宿主挂进文档是合法时序，
   * 那一刻两者都还没连上，扫它就会把一个没被给过挂载机会的层判成死层删掉。
   * 旧实现里这样的层只是暂不参与仲裁，挂载后即恢复。
   */
  it('claim 时面板与宿主都未挂载：层不被回收，挂上后恢复仲裁', () => {
    const host = hostElement()
    const target = document.createElement('div')
    const requestClose = vi.fn<() => void>()

    host.remove()
    claim(
      overlay(requestClose, () => host.isConnected),
      target
    )
    expect(__openOverlayLayerCount()).toBe(1)

    document.body.append(host)
    host.append(target)
    pressEscape()

    expect(__openOverlayLayerCount()).toBe(1)
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('claim 后始终不挂载：仲裁入口的回收照旧把它摘掉', () => {
    const host = hostElement()
    const target = document.createElement('div')
    const requestClose = vi.fn<() => void>()

    host.remove()
    claim(
      overlay(requestClose, () => host.isConnected),
      target
    )
    expect(__openOverlayLayerCount()).toBe(1)

    pressEscape()

    expect(__openOverlayLayerCount()).toBe(0)
    expect(requestClose).not.toHaveBeenCalled()
  })
})
