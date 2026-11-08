import '..'
import '@/components/dropdown-item'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { cleanupElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiContextMenu } from '..'

const ITEMS = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

function createMenu(attrs: Record<string, string> = {}): WebUiContextMenu {
  const el = document.createElement('web-ui-context-menu')
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  el.innerHTML = `<div id="press-area">${ITEMS}</div>`
  document.body.append(el)
  return el
}

function touchPointer(type: string, init: PointerEventInit = {}): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, ...init })
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

function press(el: WebUiContextMenu, type = 'pointerdown') {
  el.querySelector('#press-area')?.dispatchEvent(touchPointer(type, { clientX: 120, clientY: 80 }))
}

function contextMenuEvent(clientX = 300, clientY = 200): MouseEvent {
  return new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY })
}

function trackChanges(el: WebUiContextMenu): CustomEvent<{ open: boolean }>[] {
  const events: CustomEvent<{ open: boolean }>[] = []
  el.addEventListener('open-change', e => events.push(e as CustomEvent<{ open: boolean }>))
  return events
}

describe('context-menu 长按（jsdom 逻辑）', () => {
  it('未启用 long-press 时长按不开 menu', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  /*
   * 陷阱钉子：long-press 走 Lit 的 Boolean 转换器，只看「属性在不在」——
   * setAttribute('long-press', 'false') 读回来也是 true。框架（如 Vue）对自定义元素走属性
   * 路径，布尔 false 会被写成字符串 "false"，于是「:long-press="someBool"」这种绑定会把
   * 语义整个反转：本想关闭，实际开启。真机上验证过 attribute "false" 而 property true。
   *
   * 这条钉住现行为，让任何想改转换器（比如把 "false" 判为关闭）的人都做成显式决定；
   * 消费方的正确写法是「属性整个消失」，apps/interweave 的 ResourceList spec 里有宿主侧
   * 的对应断言。
   */
  it('long-press="false" 字符串同样算启用：布尔语义是属性在不在，不是字面值', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': 'false' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('鼠标指针不触发长按', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'pointerType', { value: 'mouse' })
    el.querySelector('#press-area')?.dispatchEvent(event)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('长按达到延迟后打开 menu', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)
    const events = trackChanges(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(true)
    expect(events.filter(event => event.detail.open)).toHaveLength(1)
    cleanupElement(el)
  })

  it('long-press-delay 可调', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '', 'long-press-delay': '1200' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)

    await vi.advanceTimersByTimeAsync(700)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('long-press-delay 写错时回退到默认值，不退化成同帧开 menu', async () => {
    vi.useFakeTimers()
    // "abc" 经 Lit 的 Number converter 得到 NaN；Math.max(0, NaN) === NaN，
    // 而 setTimeout(fn, NaN) 会立刻触发 —— 那样长按在 pointerdown 同一帧就开 menu，
    // 绕过全部时长语义。所以断言「499ms 内不开、到 500ms 才开」，而不是只断言属性值。
    const el = createMenu({ 'long-press': '', 'long-press-delay': 'abc' })
    await waitForUpdate(el)

    expect(el.longPressDelay).toBe(500)

    press(el)
    await vi.advanceTimersByTimeAsync(499)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('long-press-delay 越界时钳到 [0, 5000]', async () => {
    vi.useFakeTimers()
    const tooLong = createMenu({ 'long-press': '', 'long-press-delay': '999999' })
    const negative = createMenu({ 'long-press': '', 'long-press-delay': '-50' })
    await Promise.all([waitForUpdate(tooLong), waitForUpdate(negative)])

    expect(tooLong.longPressDelay).toBe(5000)
    expect(negative.longPressDelay).toBe(0)

    // 下界 0 仍是被允许的值：抬手前就会开，不能被钳成默认 500。
    press(negative)
    await vi.advanceTimersByTimeAsync(0)
    await waitForUpdate(negative)
    expect(negative.isOpen).toBe(true)

    cleanupElement(tooLong)
    cleanupElement(negative)
  })

  it('位移超出阈值取消长按', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    el.querySelector('#press-area')?.dispatchEvent(touchPointer('pointermove', { clientX: 120 + 40, clientY: 80 }))
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('阈值内的位移不取消长按', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    el.querySelector('#press-area')?.dispatchEvent(touchPointer('pointermove', { clientX: 120 + 4, clientY: 80 + 3 }))
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it.each(['pointerup', 'pointercancel'])('%s 早于延迟则取消长按', async event => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    press(el, event)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('disabled 时长按不开 menu', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '', disabled: '' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('长按后浏览器补发的 contextmenu 被吞掉，不重复派发', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)
    const events = trackChanges(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    expect(events.filter(event => event.detail.open)).toHaveLength(1)

    // 浏览器在长按后补发原生 contextmenu：应被吞掉，既不重开也不派发。
    const suppressed = contextMenuEvent()
    el.dispatchEvent(suppressed)
    await waitForUpdate(el)

    expect(suppressed.defaultPrevented).toBe(true)
    expect(events.filter(event => event.detail.open)).toHaveLength(1)
    cleanupElement(el)
  })

  it('抑制标志不吞掉后续的真实右键', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    // menu 已由长按打开：补发的 contextmenu 被吞。
    el.dispatchEvent(contextMenuEvent())
    await waitForUpdate(el)

    // 关闭后标志必须已清空，否则这一次真实右键会被吞掉。
    el.close()
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)

    const genuine = contextMenuEvent()
    el.dispatchEvent(genuine)
    await waitForUpdate(el)

    expect(genuine.defaultPrevented).toBe(true)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('抬手后浏览器合成的 click 不会把刚打开的 menu 关掉', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(true)

    // 真实触控管线里 touchend 之后引擎补发的 click：它属于长按那一次意图。
    el.querySelector('#press-area')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)

    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  /*
   * 原「吸收窗口过期后，真实点击照常 light-dismiss」已删除：它靠
   * `document.body.dispatchEvent(click)` 触发。menu 打开时 scrim 处于 `showModal()`
   * 模态态，真实浏览器里这个 click 到不了 body；jsdom 没有 top layer，合成事件照样派发，
   * 于是它断言的是一条被模态契约关掉的通道。它唯一的实现就是 document 捕获阶段那个
   * 兜底监听器，那段已随之删除。
   *
   * 契约没有丢，迁到了 browser project 的真实触控管线：
   * `long-press.browser.spec.ts` 的「吸收窗口内的点击被吞，窗口过后同一次 menu 上的真实
   * 点击照常 dismiss」。它用 CDP 走完真长按，然后在**同一条用例**里断言两相：窗内点
   * scrim 被吞、越过 `LONG_PRESS_FOLLOW_UP_WINDOW_MS` 后同一次点击生效。合成事件表达不了
   * 「模态下下层收不到命中」，而这正是原用例赖以存在的前提。
   */
})

/*
 * 长按开 menu 后宿主一侧的补发 click 吸收（自 interweave ResourceList 的回声机迁移而来，
 * 迁移不复制）：长按抬手后浏览器合成的 click 落在宿主子树里（menu 已关时 target 恒为
 * pointerdown 落点），会激活宿主的行。吸收由本组件在宿主子树 capture 阶段自己做，
 * 用例走「pointer 序列进 → 吞 / 不吞出」的纯状态机断言，观察点是子树上派发的 click
 * 有没有被吞（defaultPrevented + 子节点的冒泡监听没收到）。
 */
describe('context-menu 长按的宿主侧补发 click 吸收', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  function createMenu(): WebUiContextMenu {
    const el = document.createElement('web-ui-context-menu')
    el.setAttribute('long-press', '')
    el.innerHTML = '<div id="press-area">press</div>'
    document.body.append(el)
    return el
  }

  function pressArea(el: WebUiContextMenu): HTMLElement {
    return el.querySelector('#press-area') as HTMLElement
  }

  function touchPointer(type: string): PointerEvent {
    const event = new PointerEvent(type, { bubbles: true, cancelable: true, clientX: 120, clientY: 80 })
    Object.defineProperty(event, 'pointerType', { value: 'touch' })
    return event
  }

  /** 长按到计时器到期，走组件自己的开启路径（openAt 命令式不算长按）。 */
  async function longPressOpensMenu(el: WebUiContextMenu) {
    pressArea(el).dispatchEvent(touchPointer('pointerdown'))
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    expect(el.isOpen, '前置条件：长按确实开出了 menu').toBe(true)
  }

  /** 在 press-area 上挂冒泡监听，观察 click 是否穿过吸收器落到宿主子树。 */
  function trackClicks(el: WebUiContextMenu): MouseEvent[] {
    const clicks: MouseEvent[] = []
    pressArea(el).addEventListener('click', event => clicks.push(event as MouseEvent))
    return clicks
  }

  it('menu 已关时仍吞掉长按手势的补发 click——吸收不读 menu 当前状态', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)
    const clicks = trackClicks(el)

    await longPressOpensMenu(el)
    // 真实顺序：touchend → pointerup → 浏览器补发 click。menu 常在补发 click 之前
    // 因 blur / 外点先关，抬手仍在关闭之后发生。
    pressArea(el).dispatchEvent(touchPointer('pointerup'))
    el.close()
    await waitForUpdate(el)
    expect(el.isOpen, '前置条件：此刻 menu 确实是关的').toBe(false)

    const echo = new MouseEvent('click', { bubbles: true, cancelable: true })
    pressArea(el).dispatchEvent(echo)
    await waitForUpdate(el)

    expect(echo.defaultPrevented, '补发的 click 应被吞掉').toBe(true)
    expect(clicks, '补发的 click 不该穿过吸收器激活宿主子树').toHaveLength(0)
    cleanupElement(el)
  })

  it('menu 开着时同样吞掉宿主子树的补发 click', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)
    const clicks = trackClicks(el)

    await longPressOpensMenu(el)
    pressArea(el).dispatchEvent(touchPointer('pointerup'))
    const echo = new MouseEvent('click', { bubbles: true, cancelable: true })
    pressArea(el).dispatchEvent(echo)
    await waitForUpdate(el)

    expect(echo.defaultPrevented).toBe(true)
    expect(clicks).toHaveLength(0)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('触屏轻点（没有长按开 menu）的 click 照常穿过', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)
    const clicks = trackClicks(el)

    // 按下即抬手，不等长按到期：全程没有 menu 开出。
    pressArea(el).dispatchEvent(touchPointer('pointerdown'))
    pressArea(el).dispatchEvent(touchPointer('pointerup'))
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)

    pressArea(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)

    expect(clicks, '轻点的 click 是有意的行激活，不能吞').toHaveLength(1)
    cleanupElement(el)
  })

  it('鼠标指针不武装吸收器：命令式开 menu 后点宿主子树照常穿过', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)
    const clicks = trackClicks(el)

    // 鼠标路径没有长按：即使 menu 被命令式打开，pointerup / click 也都不该被吞。
    const mouseDown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    Object.defineProperty(mouseDown, 'pointerType', { value: 'mouse' })
    pressArea(el).dispatchEvent(mouseDown)
    el.openAt(120, 80)
    await waitForUpdate(el)
    expect(el.isOpen, '前置条件：menu 处于打开态').toBe(true)

    const mouseUp = new PointerEvent('pointerup', { bubbles: true, cancelable: true })
    Object.defineProperty(mouseUp, 'pointerType', { value: 'mouse' })
    pressArea(el).dispatchEvent(mouseUp)
    pressArea(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)

    expect(clicks, '鼠标路径的点击照常激活宿主子树').toHaveLength(1)
    cleanupElement(el)
  })

  it('吸收不泄漏到下一手：新的 pointerdown 之后点击照常穿过', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)
    const clicks = trackClicks(el)

    await longPressOpensMenu(el)
    pressArea(el).dispatchEvent(touchPointer('pointerup'))
    // 补发的 click 这次没来（要构造的残留场景）。
    pressArea(el).dispatchEvent(touchPointer('pointerdown'))
    pressArea(el).dispatchEvent(touchPointer('pointerup'))
    await waitForUpdate(el)

    pressArea(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)
    expect(clicks, '上一手残留的吸收不该吞掉这一手的点击').toHaveLength(1)
    cleanupElement(el)
  })

  it('吸收是一次性的：消费之后同一手的下一次点击照常穿过', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)
    const clicks = trackClicks(el)

    await longPressOpensMenu(el)
    pressArea(el).dispatchEvent(touchPointer('pointerup'))

    pressArea(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)
    expect(clicks, '补发的 click 被吞').toHaveLength(0)

    pressArea(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)
    expect(clicks, '消费之后同一手的下一次点击照常穿过').toHaveLength(1)
    cleanupElement(el)
  })

  it('pointercancel 收尾的手势不武装吸收器', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)
    const clicks = trackClicks(el)

    await longPressOpensMenu(el)
    pressArea(el).dispatchEvent(touchPointer('pointercancel'))
    pressArea(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)

    expect(clicks, '手势被系统接管时补发 click 不会来，后续点击照常穿过').toHaveLength(1)
    cleanupElement(el)
  })
})

// jsdom 未实现原生 dialog 的 modal 语义，这里局部补足 showModal/close 对 open 的影响。
// 刻意不做成 test-helper 里的全局 shim —— 那会让共享 presence 的 `showModal?.()` 真正执行，
// 改变 image-preview 等既有用例的观察点。依据见 test-helper.ts 末尾的说明。
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
