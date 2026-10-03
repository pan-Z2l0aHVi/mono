import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '..'
import '@/components/checkbox'
import '@/components/dropdown-item'
import '@/components/editable-text'
import '@/components/popover'
import type { WebUiPopover } from '@/components/popover'
import { getMenuChildren } from '@/shared/menu-portal/menu-tree'
import { getMenuPanels, getPortalPanels } from '@/shared/test-utils'

import type { WebUiContextMenu } from '..'

const SUBMENU =
  '<web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'

// 根面板与子菜单面板都在 overlay 容器上（按文档序），统一用共享定位器枚举。
function getMenus(): HTMLElement[] {
  return getMenuPanels()
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * 等菜单打开后的首项聚焦落定。
 *
 * 模态化之后首项聚焦比从前晚一帧：`_focusFirstItem()` 必须等过 `showModal()` 排队的
 * dialog focusing steps，否则焦点会被 UA 从菜单项挪回 `<dialog>`。组件侧理由与实测见
 * `context-menu/index.ts` 里 `_focusFirstItem()` 上方的注释。
 */
async function waitForMenuFocus() {
  for (let attempt = 0; attempt < 10; attempt++) {
    await nextFrame()
    const first = getMenuPanels('上下文菜单')[0]?.querySelector('web-ui-dropdown-item')
    if (first?.shadowRoot?.activeElement) return
  }
  throw new Error('Expected the first menu item to take focus')
}

/** 合成 Escape：仲裁者挂在 document 捕获阶段，合成事件足以命中它。 */
function dispatchEscape() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true })
  )
}

// R4：.wui-menu-content 是内部 class 定位器，按 R4 换为面板自身（web-ui-dropdown-item 的
// 直接父级就是 role="menu" 面板），统一用公共浮层定位器 getMenuPanels 取面板。
function getMenuContent() {
  const panel = getMenuPanels('上下文菜单')[0]
  if (!panel) throw new Error('Expected the context menu to be open')
  return panel
}

async function waitForObserverRefresh() {
  await nextFrame()
  await nextFrame()
}

async function waitForItemsReturned(menu: WebUiContextMenu, count: number) {
  // 关闭动画（transitionend ~160ms + 80ms 兜底）后才归还，预算按 500ms 计；
  // 不能用帧数表达——帧时长随刷新率变化，120Hz 下 20 帧不足 180ms 会假失败。
  const deadline = performance.now() + 500
  while (performance.now() < deadline) {
    await nextFrame()
    if (menu.querySelectorAll('web-ui-dropdown-item').length === count) return
  }
  throw new Error(`Expected ${count} menu items to be returned within 500ms`)
}

afterEach(() => document.body.replaceChildren())

describe('WebUiContextMenu 组件（浏览器）', () => {
  it('disabled 不把消费者 slotted 内容整体降不透明度', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.setAttribute('disabled', '')
    menu.innerHTML = '<div class="consumer-trigger">触发区</div>'
    document.body.append(menu)
    await menu.updateComplete

    // disabled 只抑制菜单行为，菜单不渲染；宿主级降 opacity 唯一能作用到的就是
    // 消费者自己画在 default slot 里的触发区，那属于消费者，不归本组件置灰。
    // opacity 不继承，触发区自身任何计算值都读不出宿主这道合成闸门，所以只有宿主
    // 的 opacity 值得断言。cursor 会继承到触发区，因此触发区的 cursor 也能反映宿主
    // 的 cursor——钉成 auto 而非 not.toBe('not-allowed')：not 形式放过除该值外的任何
    // 错值，钉不住「恢复成继承的初始值」这个真实契约。
    // 不要给触发区加 inline color 再断言它的 color：inline 声明压过一切作者样式表，
    // 而祖先 opacity 从不影响后代 color 的计算值，那样的断言在任何实现下都不会红，
    // #191 完整回归时也不会——是条恒真断言。
    const trigger = menu.querySelector<HTMLElement>('.consumer-trigger')!
    expect(trigger).toBeTruthy()
    expect(getComputedStyle(menu).opacity).toBe('1')
    expect(getComputedStyle(trigger).cursor).toBe('auto')
  })

  it('openAt() 以即时状态显示根菜单', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const panel = getMenuPanels('上下文菜单')[0]
    expect(menu.isOpen).toBe(true)
    expect(panel).toBeTruthy()
    expect(panel?.getAttribute('role')).toBe('menu')
    expect(panel?.getAttribute('aria-label')).toBe('上下文菜单')
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('指针右键打开根菜单', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    await waitForMenuFocus()

    const panel = getMenuPanels('上下文菜单')[0]
    expect(menu.isOpen).toBe(true)
    expect(panel).toBeTruthy()
    expect(panel?.getAttribute('role')).toBe('menu')
    expect(panel?.getAttribute('aria-label')).toBe('上下文菜单')
  })

  /*
   * R10：鼠标右键路径**保持锚定落点**，不受触屏贴底改动影响（Q11 选 a）。
   *
   * 触屏长按那条路径传 `_openAt(..., anchorBottom = true)` 走贴底算术；右键这条路
   * 传的是默认 false，走 Floating UI 的 bottom-start + shift。落点选在视口中部
   * 且菜单装得下，于是没有任何 shift —— 「锚定」可以按等式断言，不留容差口子。
   *
   * 反向断言（面板离下缘很远）是这条用例区别于长按用例的关键：只断言锚定的话，
   * 某些窗口尺寸下两条路径的落点会重合，贴底改动悄悄蔓延到右键路径也测不出来。
   */
  it('鼠标右键打开时面板锚定在落点，未被贴底逻辑带偏', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 120, clientY: 140 }))
    await menu.updateComplete
    await waitForMenuFocus()

    const panel = getMenuPanels('上下文菜单')[0]
    expect(panel).toBeTruthy()
    // 等入场过渡落定：进场 scale 会污染 getBoundingClientRect() 的读数。
    for (let attempt = 0; attempt < 20 && panel!.getAnimations().length > 0; attempt++) await nextFrame()

    const rect = panel!.getBoundingClientRect()
    expect(rect.left).toBeCloseTo(120, 0)
    expect(rect.top).toBeCloseTo(140, 0)
    // 反向：离视口下缘很远，说明没走贴底算术。
    expect(window.innerHeight - rect.bottom).toBeGreaterThan(100)
  })

  /*
   * R8/R10 的坐标→定位映射，走公开 API 面。精确值断言只能在 browser mode 做：
   * 模态化后面板走 Floating UI + `shift({ padding: 8, crossAxis: true })`，jsdom 无布局时
   * `getBoundingClientRect()` 恒返回全 0，shift 必然把坐标夹到 padding —— 那条断言在
   * jsdom 里量不到任何实现改动（详见 context-menu.spec.ts 同名用例的注释）。
   *
   * 这里读 inline style 而不是 getBoundingClientRect()：前者是定位器**写入**的视口坐标，
   * 不受进场 scale 污染，所以不必等过渡落定，断言也就不会被动画时序带偏。
   */
  it('openAt(x, y) 把面板锚定在指定坐标', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(140, 180)
    await menu.updateComplete
    await nextFrame()

    const panel = getMenuPanels('上下文菜单')[0]
    expect(panel).toBeTruthy()
    expect(panel?.style.left).toBe('140px')
    expect(panel?.style.top).toBe('180px')
  })

  it('初始聚焦不绘制 accent，方向键导航后恢复键盘焦点视觉', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>Open</web-ui-dropdown-item><web-ui-dropdown-item>Copy</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    // 模态化后首项聚焦比从前晚一帧（须等过 showModal() 排队的 dialog focusing steps），
    // 单帧不够 —— 同 `指针右键打开根菜单` 用例的理由。
    await waitForMenuFocus()

    const panel = getMenuPanels('上下文菜单')[0]
    const items = [...(panel?.querySelectorAll<HTMLElement>('web-ui-dropdown-item') ?? [])]
    const firstControl = items[0]?.shadowRoot?.querySelector<HTMLElement>('.item-inner')
    const secondControl = items[1]?.shadowRoot?.querySelector<HTMLElement>('.item-inner')
    expect(items[0]?.shadowRoot?.activeElement).toBe(firstControl)
    expect(firstControl?.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(firstControl!).backgroundColor).not.toBe('rgb(0, 136, 255)')

    await userEvent.hover(firstControl!)
    expect(getComputedStyle(firstControl!).backgroundColor).not.toBe('rgb(0, 136, 255)')

    await userEvent.keyboard('{ArrowDown}')
    await nextFrame()

    expect(items[1]?.shadowRoot?.activeElement).toBe(secondControl)
    expect(items[1]?.hasAttribute('data-wui-menu-focus-suppressed')).toBe(false)
    expect(secondControl?.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(secondControl!).backgroundColor).toBe('rgb(0, 136, 255)')

    await userEvent.keyboard('{ArrowUp}')
    await nextFrame()

    expect(items[0]?.shadowRoot?.activeElement).toBe(firstControl)
    expect(items[0]?.hasAttribute('data-wui-menu-focus-suppressed')).toBe(false)
    expect(getComputedStyle(firstControl!).backgroundColor).toBe('rgb(0, 136, 255)')
  })

  it('键盘打开菜单时首项保留焦点视觉', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, composed: true }))
    await menu.updateComplete
    await waitForMenuFocus()

    const firstItem = getMenuPanels('上下文菜单')[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const firstControl = firstItem?.shadowRoot?.querySelector<HTMLElement>('.item-inner')
    expect(firstItem?.shadowRoot?.activeElement).toBe(firstControl)
    expect(firstItem?.hasAttribute('data-wui-menu-focus-suppressed')).toBe(false)
    expect(firstControl?.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(firstControl!).backgroundColor).toBe('rgb(0, 136, 255)')
  })

  /*
   * R5：Escape 关闭菜单**恰好一次** —— `open-change(false)` 只派发一次，且不留残余 scrim。
   *
   * 「恰好一次」是这里的重点。模态化引入了新的关闭动力：原生 `<dialog>` 自己也监听 Escape
   * 并派发 `cancel`。组件吞掉了 `cancel` 的默认行为（`_onScrimCancel`），但如果哪天那道
   * 吞拦失效，UA 会直接把 scrim 关掉 —— 那条路径**不经过组件状态机**，于是既可能漏派
   * `open-change`，也会多出一条与组件无关的关闭。这条断言就是为了把那种双关钉住。
   */
  it('Escape 恰好关闭一次：open-change(false) 只派发一次且不留残余 scrim', async () => {
    const menu = document.createElement('web-ui-context-menu')
    const row = document.createElement('div')
    row.tabIndex = 0
    menu.append(row, document.createElement('web-ui-dropdown-item'))
    document.body.append(menu)
    await menu.updateComplete

    const changes: CustomEvent<{ open: boolean }>[] = []
    menu.addEventListener('open-change', event => changes.push(event as CustomEvent<{ open: boolean }>))

    row.focus()
    menu.openAt(120, 120)
    await menu.updateComplete
    await nextFrame()
    expect(menu.isOpen).toBe(true)
    expect(document.querySelector('dialog[data-wui-menu-scrim]')).toBeTruthy()

    dispatchEscape()
    await waitForItemsReturned(menu, 1)

    const closed = changes.filter(event => !event.detail.open)
    expect(closed).toHaveLength(1)
    expect(menu.isOpen).toBe(false)
    // 关闭后 top layer 里不能残留仍 showModal() 的 dialog：残留会把整页锁死。
    expect(document.querySelector('dialog[data-wui-menu-scrim]')).toBeNull()
  })

  it('Escape 关闭后焦点回到打开前持焦的行', async () => {
    const menu = document.createElement('web-ui-context-menu')
    // 行可聚焦且在 light DOM 里：键盘打开路径从 document.activeElement 取归还目标，
    // 与 interweave 资源行（tabindex="0"）同构。
    const row = document.createElement('div')
    row.tabIndex = 0
    row.textContent = '资源行'
    menu.append(row, document.createElement('web-ui-dropdown-item'))
    document.body.append(menu)
    await menu.updateComplete

    row.focus()
    expect(document.activeElement).toBe(row)

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, composed: true }))
    await menu.updateComplete
    await nextFrame()
    expect(document.activeElement).not.toBe(row)

    dispatchEscape()
    await waitForItemsReturned(menu, 1)

    expect(document.activeElement).toBe(row)
  })

  /*
   * R12：原用例「关闭期间焦点被外部接管时不再抢回」已**删除**。
   *
   * 那道防护是为旧实现服务的：旧代码无条件 `focus()` 归还焦点，会抢走调用方在关闭期间
   * 刚安排好的焦点，因此才需要「先看看有没有人接管」的判据。焦点归还在模态化之后交给
   * `showModal()` / `close()` 的 UA 行为，组件不再自行实现，也就没有这道防护可保留 ——
   * 实测外部接管焦点后 close，UA 会抢回 opener。这是接受的契约变化，不是回归。
   */

  /*
   * 复刻 interweave 资源列表的右键重命名时序（两个组件都是本包的，无跨包依赖）：
   * 行持焦 → 右键开菜单 → 点「重命名」→ 回调同步把行换成编辑态并 select()，
   * 焦点在下一帧落进 textarea。菜单的退场动画在宏任务里才结束，无条件归还会在那时
   * 把焦点拽回行，blur 掉编辑器，而 editable-text 的 blur 契约会提交未改动的标题。
   */
  it('菜单项回调进入编辑态后，关闭菜单不会 blur 掉编辑器或提交未改动的值', async () => {
    const menu = document.createElement('web-ui-context-menu')
    const editable = document.createElement('web-ui-editable-text')
    editable.value = '原始标题'

    const row = document.createElement('div')
    row.tabIndex = 0
    const changes: string[] = []
    editable.addEventListener('change', () => changes.push(editable.value))

    // 行内按 editing 态在标题与编辑器之间切换，等价于消费者的 v-if。
    const render = (editing: boolean) => {
      row.replaceChildren(...(editing ? [editable] : [document.createTextNode('原始标题')]))
    }
    render(false)
    const item = document.createElement('web-ui-dropdown-item')
    item.textContent = '重命名'
    menu.append(row, item)
    document.body.append(menu, editable)
    await menu.updateComplete

    row.focus()
    // 键盘打开路径：menu-behavior 从 document.activeElement 取归还目标，此时焦点必在行上。
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, composed: true }))
    await menu.updateComplete
    await nextFrame()

    // 菜单项回调：同步建编辑态并在微任务里 focus()——与 interweave 的 emit + nextTick 同构。
    item.addEventListener('click', () => {
      render(true)
      void Promise.resolve().then(() => editable.select())
    })
    item.click()
    await nextFrame()
    await nextFrame()

    expect(editable.hasAttribute('editing')).toBe(true)
    expect(editable.shadowRoot?.activeElement?.tagName).toBe('TEXTAREA')

    await waitForItemsReturned(menu, 1)
    await nextFrame()

    expect(editable.hasAttribute('editing')).toBe(true)
    expect(editable.shadowRoot?.activeElement?.tagName).toBe('TEXTAREA')
    expect(changes).toEqual([])
    expect(editable.value).toBe('原始标题')
  })

  /*
   * 关闭来源决定 scrim 何时出顶层，这层区分必须有测试守着。
   *
   * 菜单项激活：立刻出顶层（`close()` 里的 `_releaseScrimModality`）。理由见 index.ts
   * 的 `close()` —— 此刻焦点还在菜单里，UA 的归还能落在 opener 上；等退场结束就晚了。
   *
   * 其余关闭（Escape / 点 scrim / 程序式）：保留 dialog 默认效果，scrim 在退场结束前
   * 一直是 `:modal`，下层保持不可命中。
   *
   * 变异验证：把区分抹掉（所有关闭都提前出顶层）后，context-menu 的 95 条用例全绿，
   * 一条都不会红。所以没有这条，下一个人很容易把「提前出顶层」推广到所有路径，
   * 把点击穿透的窗口扩大到每一种关闭方式。
   */
  it('菜单项点击立刻让 scrim 出顶层，Escape 则撑到退场结束', async () => {
    const itemMenu = document.createElement('web-ui-context-menu')
    itemMenu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(itemMenu)
    await itemMenu.updateComplete

    itemMenu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 60, clientY: 60 }))
    await itemMenu.updateComplete
    await waitForMenuFocus()
    const itemScrim = document.querySelector<HTMLDialogElement>('dialog[data-wui-menu-scrim]')
    expect(itemScrim?.matches(':modal')).toBe(true)

    getMenuPanels('上下文菜单')[0]!.querySelector('web-ui-dropdown-item')!.click()
    await nextFrame()
    expect(itemScrim?.matches(':modal'), '菜单项点击后 scrim 应立刻出顶层').toBe(false)
    // 出顶层不等于摘除：面板还要走完退场动画，否则视觉上会「啪」地消失。
    expect(itemScrim?.isConnected).toBe(true)
    await waitForItemsReturned(itemMenu, 1)
    expect(itemScrim?.isConnected).toBe(false)

    const escMenu = document.createElement('web-ui-context-menu')
    escMenu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(escMenu)
    await escMenu.updateComplete

    escMenu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 60, clientY: 60 }))
    await escMenu.updateComplete
    await waitForMenuFocus()
    const escScrim = document.querySelector<HTMLDialogElement>('dialog[data-wui-menu-scrim]')
    expect(escScrim?.matches(':modal')).toBe(true)

    dispatchEscape()
    await nextFrame()
    expect(escScrim?.matches(':modal'), 'Escape 关闭应保留 dialog 默认效果，撑到退场结束').toBe(true)
    await waitForItemsReturned(escMenu, 1)
    expect(escScrim?.isConnected).toBe(false)
  })

  /*
   * R1 / R2 的行为面：菜单打开时，下层目标既收不到命中，也收不到那次 click。
   *
   * 断言分两段，缺一不可：
   *
   * 1. **命中测试**：在 checkbox 中心做 elementFromPoint，必须解析到 scrim 而不是 checkbox。
   *    这一段是「收不到命中」的直接证据；只断言「菜单关了」无法区分「被 scrim 挡住」与
   *    「关掉了但事件照样穿透」。scrim 在 light DOM（document.body 下），不在 shadow 内，
   *    因此这里用 document 级查询即可。
   * 2. **行为**：点 scrim 后菜单关闭，而 checkbox 的 click 计数保持 0、checked 保持 false。
   */
  it('点 scrim 关闭菜单，且下层 checkbox 既不被命中也不收到 click', async () => {
    const menu = document.createElement('web-ui-context-menu')
    const row = document.createElement('div')
    const checkbox = document.createElement('web-ui-checkbox')
    checkbox.textContent = '选择资源'
    checkbox.addEventListener('click', event => event.stopPropagation())
    row.append(checkbox)
    menu.append(row, document.createElement('web-ui-dropdown-item'))
    menu.querySelector('web-ui-dropdown-item')!.textContent = 'Select'
    document.body.append(menu)
    await menu.updateComplete

    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    expect(menu.isOpen).toBe(true)

    let checkboxClicks = 0
    checkbox.addEventListener('click', () => checkboxClicks++)

    const scrim = document.querySelector<HTMLElement>('dialog[data-wui-menu-scrim]')
    expect(scrim).toBeTruthy()

    // scrim 必须真的处于 top layer：`:modal` 只在 showModal() 真正生效时匹配。
    // jsdom 不实现 `:modal`（theme.spec 那边只能断言 open），这条断言是它在真实
    // 浏览器里唯一的落点 —— 「挂了个 dialog 元素」不等于「模态生效」。
    expect((scrim as HTMLDialogElement).matches(':modal')).toBe(true)

    // (1) 命中测试：checkbox 所在位置被 scrim 占据。
    const rect = checkbox.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    expect(document.elementFromPoint(cx, cy)).toBe(scrim)

    // (2) 行为：点 scrim 只关菜单，下层目标零激活。
    scrim!.click()
    await menu.updateComplete
    await nextFrame()

    expect(menu.isOpen).toBe(false)
    expect(checkboxClicks).toBe(0)
    expect(checkbox.checked).toBe(false)
  })

  /*
   * R17：原用例「点击菜单面板外的列表行时保留行点击并关闭菜单」已**删除** —— 契约反转。
   *
   * 这条是别人专门写下的 light-dismiss 契约（旧行为：点外面 = 既关菜单又激活下层目标），
   * 而它正是用户报告的缺陷本身：一次点击同时产生「关菜单」与「激活行」两个后果，
   * 中间没有任何仲裁，于是弹出菜单的同时打开了另一个资源。
   *
   * 模态化之后下层目标在菜单打开期间**收不到命中**（见下面 checkbox 用例的命中测试），
   * 旧契约在物理上不再可能成立。取代它的是 scrim 用例：点外面 = 只关菜单。
   */

  it('menu panel 内嵌套子 overlay 的 wheel 不被父菜单抑制', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = `
      <web-ui-dropdown-item>
        Actions
        <web-ui-popover portal>
          <button slot="trigger">Nested</button>
          <div>Nested panel</div>
        </web-ui-popover>
      </web-ui-dropdown-item>
    `
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const nested = getMenuContent().querySelector<WebUiPopover>('web-ui-popover')
    expect(nested).toBeTruthy()
    nested!.show()
    await nested!.updateComplete
    await nextFrame()

    const nestedPanel = getPortalPanels('dialog').find(panel => panel.textContent?.includes('Nested panel'))
    expect(nestedPanel).toBeTruthy()
    const wheel = new WheelEvent('wheel', { bubbles: true, composed: true, cancelable: true })
    nestedPanel?.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(false)
    expect(menu.isOpen).toBe(true)
  })

  it('重定位打开后，宿主重建的嵌套子项重新隐藏（不叠加一级菜单）', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    if (!parentItem) throw new Error('Expected a submenu parent item')
    parentItem.replaceChildren()
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.textContent = 'DOCX'
    parentItem.appendChild(fresh)

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 200, clientY: 200 }))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const nested = parentItem.querySelector('web-ui-dropdown-item')!
    expect(nested.getAttribute('slot')).toBe('context-menu-hidden')
  })

  it('无重定位的宿主重建嵌套子项，观察者刷新后不再可见叠加', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    if (!parentItem) throw new Error('Expected a submenu parent item')

    parentItem.replaceChildren()
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.textContent = 'DOCX'
    parentItem.appendChild(fresh)

    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    expect(menu.isOpen).toBe(true)
    expect(fresh.getAttribute('slot')).toBe('context-menu-hidden')
  })

  it('菜单保持打开时重定位，移除 stale 子树并保持框架新子树顺序', async () => {
    const menu = document.createElement('web-ui-context-menu')
    const validItems =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item submenu>打开方式<web-ui-dropdown-item>Safari</web-ui-dropdown-item></web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    const brokenItems =
      '<web-ui-dropdown-item>找回资源</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    menu.innerHTML = validItems
    document.body.append(menu)
    await menu.updateComplete

    const getContent = () => getMenuPanels('上下文菜单')[0]!
    // 模拟框架 keyed 更新的移除侧：portal 内旧项被 removeChild、宿主子树整体替换。
    // 插入侧由框架锚点所在容器决定：旧元素在 portal 才插 portal，mount 期锚点仍在
    // 宿主的分支则插宿主；本测试放回宿主由 reconcile 搬运，直插 portal 的路径由
    // 「v-if 翻转式替换」用例覆盖。
    const setItems = (html: string) => {
      const content = getContent()
      for (const item of getMenuChildren(content)) item.remove()
      menu.replaceChildren()
      menu.append(...new DOMParser().parseFromString(html, 'text/html').body.children)
    }
    // 面板扁平顺序断言需排除嵌套 submenu 子项（否则 PDF 会被重复计入），
    // 公开 querySelectorAll('web-ui-dropdown-item') 不等价，故保留 getMenuChildren。
    const getPortalItemText = () =>
      getMenuChildren(getMenuPanels('上下文菜单')[0]!).map(item => item.textContent?.trim())

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    expect(getPortalItemText()).toEqual(['预览', '打开方式Safari', '删除'])

    setItems(brokenItems)
    await menu.updateComplete
    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 200, clientY: 200 }))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    expect(getPortalItemText()).toEqual(['找回资源', '删除'])

    setItems(validItems)
    await menu.updateComplete
    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 300, clientY: 300 }))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    expect(getPortalItemText()).toEqual(['预览', '打开方式Safari', '删除'])
  })

  it('portal 顺序稳定时不再触发 childList mutation', async () => {
    // 无抖动契约：稳态下 portal 不产生任何 DOM 变更，防止 marker 繁殖活锁；
    // MutationRecord 是该契约（"无 childList 变更"）的唯一可观察面，故作为有据例外保留。
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const observer = new MutationObserver(() => {})
    observer.observe(getMenus()[0]!, { childList: true, subtree: true })
    await waitForObserverRefresh()
    expect(observer.takeRecords()).toHaveLength(0)

    await nextFrame()
    await nextFrame()
    await nextFrame()
    expect(observer.takeRecords()).toHaveLength(0)
    observer.disconnect()
  })

  it('框架移除部分菜单项后，prune 失效锚点并保持剩余顺序', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const content = getMenuContent()
    const [, openWith] = Array.from(content.querySelectorAll('web-ui-dropdown-item'))
    openWith.remove()
    await waitForObserverRefresh()

    expect(Array.from(content.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '预览',
      '删除'
    ])

    // prune 的可观察后果：关闭后宿主项集合与顺序 == 期望（而非断言内部 marker 计数）
    menu.close()
    await menu.updateComplete
    await waitForItemsReturned(menu, 2)
    expect(Array.from(menu.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '预览',
      '删除'
    ])
  })

  it('框架直接移除单项后关闭，重开菜单项完整无重复', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const [, openWith] = Array.from(getMenuContent().querySelectorAll('web-ui-dropdown-item'))
    openWith.remove()
    menu.close()
    await menu.updateComplete
    await waitForObserverRefresh()
    await waitForItemsReturned(menu, 2)

    expect(menu.isOpen).toBe(false)
    expect(Array.from(menu.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '预览',
      '删除'
    ])

    // 孤儿 marker 的真实症状是下次打开时条目重复/丢失：重开后断言无重复且顺序正确
    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const reopened = Array.from(getMenuContent().querySelectorAll('web-ui-dropdown-item')).map(item =>
      item.textContent?.trim()
    )
    expect(reopened).toEqual(['预览', '删除'])
    expect(new Set(reopened).size).toBe(reopened.length)
  })

  it('v-if 翻转式替换 portal 内项后重定位，菜单完整且重开后顺序正确', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    // 模拟 Vue v-if 翻转：在 portal 内把「预览」卸载为注释锚点并就地插入新项
    const content = getMenuContent()
    const [preview] = Array.from(content.querySelectorAll('web-ui-dropdown-item'))
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.textContent = '找回资源'
    preview.replaceWith(document.createComment('v-if'), fresh)
    await waitForObserverRefresh()

    expect(Array.from(content.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '找回资源',
      '打开方式',
      '删除'
    ])

    menu.close()
    await menu.updateComplete
    await waitForItemsReturned(menu, 3)

    // 关闭后宿主项集合 == 期望（替代原 marker 计数 / 锚点残留断言）
    expect(Array.from(menu.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '找回资源',
      '打开方式',
      '删除'
    ])

    menu.openAt(200, 200)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const reopened = Array.from(getMenuContent().querySelectorAll('web-ui-dropdown-item')).map(item =>
      item.textContent?.trim()
    )
    expect(reopened).toEqual(['找回资源', '打开方式', '删除'])
  })

  it('框架直接向 portal 插入带子菜单的项，刷新后纳入托管且嵌套隐藏', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    // 绕过宿主直接向 portal 插入带嵌套子项的 submenu 父项（新节点无隐藏 slot）。
    // 组件监听的是 items 所在的内容区（既有 item 的父容器），需插入该容器而非面板自身，
    // 否则嵌套子项不会被 reconcile 纳入托管、也不会被 hideNestedMenuChildren 隐藏。
    const content = getMenuContent()
    const itemsContainer = content.querySelector('web-ui-dropdown-item')?.parentElement ?? content
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.setAttribute('submenu', '')
    fresh.textContent = '导出'
    const nested = document.createElement('web-ui-dropdown-item')
    nested.textContent = 'PDF'
    fresh.appendChild(nested)
    itemsContainer.appendChild(fresh)
    await waitForObserverRefresh()
    await waitForObserverRefresh()

    expect(menu.isOpen).toBe(true)
    // 面板内条目顺序（含嵌套 submenu 父项的拼接文本）；getMenuChildren 不递归进 submenu 子项，
    // 与公开 querySelectorAll('web-ui-dropdown-item') 不等价，故保留内部定位器表达扁平顺序。
    expect(getMenuChildren(content).map(item => item.textContent?.trim())).toEqual(['编辑', '导出PDF'])
    // slot 投影契约（§5 允许），保留
    expect(nested.getAttribute('slot')).toBe('context-menu-hidden')
  })

  it('键盘打开后，子菜单在退出中重新打开仍可用', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, composed: true }))
    await menu.updateComplete
    await nextFrame()

    const rootPanel = getMenuPanels('上下文菜单')[0]
    expect(menu.isOpen).toBe(true)
    expect(rootPanel).toBeTruthy()
    expect(rootPanel?.getAttribute('role')).toBe('menu')
    expect(rootPanel?.getAttribute('aria-label')).toBe('上下文菜单')
    expect(rootPanel?.hasAttribute('hidden')).toBe(false)

    await nextFrame()

    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    parentItem?.click()
    await nextFrame()
    await nextFrame()

    expect(menu.isOpen).toBe(true)
    expect(getMenus()).toHaveLength(2)
    expect(getMenus()[1]?.textContent).toContain('PDF')

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    parentItem?.click()
    await nextFrame()

    expect(getMenus()).toHaveLength(2)
    expect(getMenus()[1]?.hasAttribute('hidden')).toBe(false)
    expect(getMenus()[1]?.textContent).toContain('PDF')
  })

  /*
   * 退场被打断时 `_closeMenuAfterPresence` 会在 `hideOverlayPresence` 返回 false 后提前
   * 退出，`_menu` 因此仍在，而关闭分支已经撤了句柄。重开必须补 claim：否则菜单可见却无登记，
   * Escape 关不掉它，且每次 document click（含面板内部）都会被判成外部点击而关闭菜单。
   */
  it('退场中重开后仍保持登记：面板内点击不关闭，Escape 仍可关闭', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(20, 20)
    await menu.updateComplete
    await nextFrame()
    const panel = getMenuContent()

    dispatchEscape()
    await menu.updateComplete
    await nextFrame()
    expect(menu.isOpen).toBe(false)

    menu.openAt(40, 40)
    await menu.updateComplete
    await nextFrame()
    await menu.updateComplete
    expect(getMenuContent()).toBe(panel)
    expect(menu.isOpen).toBe(true)

    panel.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.isOpen).toBe(true)

    dispatchEscape()
    await menu.updateComplete
    expect(menu.isOpen).toBe(false)
  })

  /*
   * 根层在退场窗口内重新 claim 时，收尾栈里的子菜单面板仍在 DOM 里、仍然可见，但已经
   * 离开 `_activeSubmenus`。它必须在**取回之前与之后**都被挂回新会话的子树，否则会被
   * 判成面板外 —— 点它内部就关掉整张菜单（base 的登记树直到 dispose 才注销，故属回归）。
   *
   * 两个面板的 transition 都钉长：根面板撑开「重开窗口」，子菜单面板让 closing 栈条目
   * 不被提前 dispose —— 否则 take 走的是新建分支（自带 adopt），覆盖不到这个窗口。
   */
  it('退场窗口内重开后，收尾中的子菜单面板在取回前后都不可被当成面板外', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(20, 20)
    await menu.updateComplete
    await nextFrame()
    const rootPanel = getMenus()[0]!
    rootPanel.style.transition = 'opacity 5s'

    const parentItem = rootPanel.querySelector<HTMLElement>('web-ui-dropdown-item')!
    parentItem.click()
    await nextFrame()
    await nextFrame()
    expect(getMenus()).toHaveLength(2)
    const submenuPanel = getMenus()[1]!
    submenuPanel.style.transition = 'opacity 5s'

    // 第一次 Escape 让子菜单进 closing 栈，第二次关闭根菜单（句柄随之撤销）。
    dispatchEscape()
    await nextFrame()
    dispatchEscape()
    await menu.updateComplete
    await nextFrame()

    // 退场窗口内重开：根句柄换代。
    menu.openAt(40, 40)
    await menu.updateComplete
    await nextFrame()
    await menu.updateComplete
    expect(getMenus()[0]).toBe(rootPanel)
    expect(menu.isOpen).toBe(true)
    expect(submenuPanel.hidden).toBe(false)

    submenuPanel.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.isOpen).toBe(true)

    // 取回之后：同一断言再次成立（`_openSubmenu` 的 take 分支必须补 adopt）。
    parentItem.click()
    await nextFrame()
    await nextFrame()
    expect(menu.isOpen).toBe(true)
    getMenus()[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.isOpen).toBe(true)
  })
})
