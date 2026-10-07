/**
 * 契约测试辅助工具。
 *
 * 所有测试仅验证公开契约：宿主 API、DOM 语义、可访问性、派发事件、FormData。
 * 禁止测试 shadowRoot 内部结构、私有字段、CSS class、内部样式或实现顺序。
 */

import { describe, expect, it } from 'vite-plus/test'

/**
 * 具备渲染完成信号的自定义元素。Lit 元素天然满足；
 * 用结构类型而非 LitElement 是为了让本模块不依赖具体实现。
 */
export interface TestableElement extends HTMLElement {
  updateComplete: Promise<unknown>
}

/**
 * 等待 Lit 元素完成渲染。
 * 在修改组件属性后调用，确保 DOM 已更新。
 */
export async function waitForUpdate(el: TestableElement): Promise<void> {
  await el.updateComplete
}

/**
 * 挂载一个自定义元素：先写 attribute，再写 light DOM 内容，最后挂到 parent（默认 body）。
 * 这是各组件 spec 里内联 `createXxx()` 工厂的公共骨架。
 */
export function mountElement<T extends HTMLElement = HTMLElement>(
  tag: string,
  init: { attrs?: Record<string, string>; html?: string; parent?: HTMLElement } = {}
): T {
  const el = document.createElement(tag) as T
  if (init.attrs) {
    for (const [name, value] of Object.entries(init.attrs)) el.setAttribute(name, value)
  }
  if (init.html) el.innerHTML = init.html
  ;(init.parent ?? document.body).append(el)
  return el
}

/**
 * 排空微任务与一个宏任务，供 setTimeout(0) 级别的异步链路消费。
 * 与 waitForFrame 的区别：这个跨宏任务，waitForFrame 只推进一帧 rAF。
 */
export async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * 修改 light DOM 后等待组件消费 slotchange 并完成渲染。
 * slotchange 在微任务检查点派发，flush 跨一个宏任务即可确保其已送达，
 * 从而不必触碰 shadowRoot 内部 slot 元素。
 */
export async function flushSlotChange(el: TestableElement): Promise<void> {
  await flush()
  await waitForUpdate(el)
}

/**
 * 按属性名设置公开 property。
 * 表驱动测试需要按名称写入，这一步的类型逃逸集中封装在此，不散落到各 spec。
 */
export function setProperty(el: HTMLElement, prop: string, value: unknown): void {
  ;(el as unknown as Record<string, unknown>)[prop] = value
}

/**
 * 表驱动属性反射契约：为每个 [property, 值, attribute, 期望字面量] 生成一条用例，
 * 断言 property 写入后同步到宿主 attribute。
 *
 * 使用方式：
 * ```
 * contractReflection('WebUiBadge 属性反射', () => createBadge(), [
 *   ['count', 42, 'count', '42'],
 *   ['placement', 'bottom-left', 'placement', 'bottom-left']
 * ])
 * ```
 */
export function contractReflection<T extends TestableElement>(
  title: string,
  create: () => T,
  cases: ReadonlyArray<readonly [prop: string, value: unknown, attr: string, expected: string]>
): void {
  describe(title, () => {
    for (const [prop, value, attr, expected] of cases) {
      it(`${prop} 反射到宿主 attribute`, async () => {
        const el = create()
        try {
          await waitForUpdate(el)
          setProperty(el, prop, value)
          await waitForUpdate(el)
          expect(el.getAttribute(attr)).toBe(expected)
        } finally {
          cleanupElement(el)
        }
      })
    }
  })
}

/**
 * `contractEvent` 的空 `counts` 护栏。
 *
 * 门禁 `vitest/expect-expect` 只看**语法上有无 `expect(...)`**，而生成本模块的用例体里
 * 那个 `expect` 写在循环里——因此 `counts: {}` 会生成一条**零断言的空过用例**，静态检查拦不住、
 * 运行也永远绿。这里把它变成收集期的硬失败。
 */
export function assertNonEmptyCounts(
  title: string,
  cases: ReadonlyArray<{ title: string; counts: Record<string, number> }>
): void {
  for (const testCase of cases) {
    if (Object.keys(testCase.counts).length === 0) {
      throw new Error(`contractEvent(${title}): 用例「${testCase.title}」的 counts 为空，会生成无断言的空过用例`)
    }
  }
}

/**
 * 表驱动事件契约：为每个用例生成一条 `it`，断言目标元素在指定交互下各事件的派发次数。
 *
 * 生成器（而非断言封装）是本仓库唯一可行的复用形态：门禁 `vitest/expect-expect`
 * 只认可测试体内字面出现的 `expect(...)`，形如 `expectReflected(el, …)` 的封装
 * 无法满足它。此处每个生成块内含字面 `expect`，因此调用方无需另写断言。
 *
 * `create()` 内的准备动作不计入派发——spy 在 `create()` 与首次渲染完成后才挂载。
 * 组件事件均为 `new Event(...)`、无 `detail`，故本运行器不建模 detail 形状。
 *
 * 使用方式：
 * ```
 * contractEvent('WebUiInput 事件契约', () => mountElement<WebUiInput>('web-ui-input'), [
 *   {
 *     title: '编程式设值不派发事件',
 *     act: el => setProperty(el, 'value', 'hello'),
 *     counts: { input: 0, change: 0 }
 *   }
 * ])
 * ```
 */
export function contractEvent<T extends TestableElement>(
  title: string,
  create: () => T,
  cases: ReadonlyArray<{
    title: string
    act: (el: T) => void | Promise<void>
    counts: Record<string, number>
  }>
): void {
  assertNonEmptyCounts(title, cases)

  describe(title, () => {
    for (const testCase of cases) {
      it(testCase.title, async () => {
        const el = create()
        const detachers: Array<() => void> = []
        try {
          await waitForUpdate(el)
          const seen = new Map<string, Event[]>()
          for (const name of Object.keys(testCase.counts)) {
            const [events, detach] = spyEvents(el, name)
            seen.set(name, events)
            detachers.push(detach)
          }
          await testCase.act(el)
          await waitForUpdate(el)
          for (const [name, expected] of Object.entries(testCase.counts)) {
            expect(seen.get(name) ?? [], `事件 ${name} 派发次数`).toHaveLength(expected)
          }
        } finally {
          for (const detach of detachers) detach()
          cleanupElement(el)
        }
      })
    }
  })
}

/**
 * 监听目标元素上指定事件类型的派发。
 * 返回事件数组和取消监听的函数。
 *
 * 使用方式：
 * ```
 * const [events, detach] = spyEvents(el, 'input')
 * // ... 触发交互 ...
 * expect(events).toHaveLength(1)
 * detach()
 * ```
 */
export function spyEvents<T extends Event = Event>(target: EventTarget, eventName: string): [T[], () => void] {
  const events: T[] = []
  const handler = (e: Event) => events.push(e as T)
  target.addEventListener(eventName, handler)
  return [events, () => target.removeEventListener(eventName, handler)]
}

/**
 * 监听目标元素上指定事件类型的派发，并记录每次事件的 target/currentTarget。
 * currentTarget 在派发结束后会被 DOM 重置为 null，因此必须在 handler 内捕获。
 *
 * 使用方式：
 * ```
 * const { events, targets, currentTargets, detach } = spyHostEvents(group, 'change')
 * // ... 触发交互 ...
 * expect(events).toHaveLength(1)
 * expect(targets[0]).toBe(group)
 * expect(currentTargets[0]).toBe(group)
 * detach()
 * ```
 */
export function spyHostEvents(
  target: EventTarget,
  eventName: string
): {
  events: Event[]
  targets: (EventTarget | null)[]
  currentTargets: (EventTarget | null)[]
  detach: () => void
} {
  const events: Event[] = []
  const targets: (EventTarget | null)[] = []
  const currentTargets: (EventTarget | null)[] = []
  const handler = (e: Event) => {
    events.push(e)
    targets.push(e.target)
    currentTargets.push(e.currentTarget)
  }
  target.addEventListener(eventName, handler)
  return {
    events,
    targets,
    currentTargets,
    detach: () => target.removeEventListener(eventName, handler)
  }
}

/**
 * 通过语义选择器查询 shadow DOM 中的可访问性元素。
 * 仅用于验证 role、aria-* 等公开语义属性，不依赖内部 class 结构。
 *
 * 示例：
 * ```
 * const dialog = queryA11y(el, '[role="dialog"]')
 * expect(dialog).toBeTruthy()
 * ```
 */
export function queryA11y(el: HTMLElement, selector: string): Element | null {
  return el.shadowRoot?.querySelector(selector) ?? null
}

export function expectReflected(el: HTMLElement, attr: string, value: boolean): void {
  if (value) {
    expect(el.hasAttribute(attr)).toBe(true)
  } else {
    expect(el.hasAttribute(attr)).toBe(false)
  }
}

export function cleanupElement(el: HTMLElement | null | undefined): void {
  el?.remove()
}

/**
 * 查询 fallback overlay root 中的 portal 面板。结构为公开契约：
 * [data-wui-overlay-root]#shadow > [data-wui-overlay-container] > portal host div#shadow > 面板。
 * role 按组件语义传入（popover/tooltip 的 dialog、select 的 listbox 等）。
 *
 * **只在无主题时适用**：挂了 `web-ui-theme` 时面板改挂 theme-owned overlay root
 * （`theme.getOverlayRoot()`），那条路径用 `getThemedPortalPanel()`。
 */
export function getPortalPanel(role = 'dialog'): HTMLElement | null {
  const container = document
    .querySelector<HTMLElement>('[data-wui-overlay-root]')
    ?.shadowRoot?.querySelector<HTMLElement>('[data-wui-overlay-container]')
  return (
    container
      ?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
      ?.shadowRoot?.querySelector(`[role="${role}"]`) ?? null
  )
}

/**
 * 查询 **theme-owned** overlay root 中的 portal 面板。
 *
 * 与 `getPortalPanel()` 的区别只在起点：后者从 document 上的 fallback
 * `[data-wui-overlay-root]` 出发，本函数从 theme 的公开方法 `getOverlayRoot()`
 * （= theme shadow 内的 `[data-wui-overlay-container]`）出发，其后各层结构相同。
 * 参数用结构化类型而非导入 `WebUiTheme`，避免 `shared/` 反向依赖 `components/`。
 */
export function getThemedPortalPanel(
  theme: { getOverlayRoot(): HTMLElement | undefined },
  role = 'dialog'
): HTMLElement | null {
  return (
    theme
      .getOverlayRoot()
      ?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
      ?.shadowRoot?.querySelector<HTMLElement>(`[role="${role}"]`) ?? null
  )
}

/**
 * 枚举浮层容器。浮层面板可能挂在两种地方，必须一起枚举，否则模态化的 context-menu
 * 会「查不到面板」：
 *
 * 1. overlay root 的 `[data-wui-overlay-container]`（dropdown 与未模态化的 context-menu）。
 *    嵌套 theme 各自带一个 root，只查第一个会让内层 theme 的浮层整体漏掉。
 * 2. 菜单 scrim `<dialog data-wui-menu-scrim>`：模态化的 context-menu 把面板挂进自己
 *    `showModal()` 的 scrim（top layer），它不在任何 overlay root 里。菜单**内部**再嵌套的
 *    anchored 浮层（popover 等）同样落进 scrim —— `findEnclosingOpenDialog` 把最近的已打开
 *    dialog 当容器，而菜单打开期间那就是 scrim。
 *
 * 只留 (1) 的后果不是「测试报错」而是**静默退化**：面板搬进 scrim 后查找恒返回空，于是
 * `toHaveLength(0)` 永远绿、`expect(panel).toBeTruthy()` 永远红。前者更危险 —— 它把一批
 * 有效断言换成了永不失败的空断言。
 */
function getOverlayContainers(): HTMLElement[] {
  return [
    ...Array.from(document.querySelectorAll<HTMLElement>('[data-wui-overlay-root]')).flatMap(root =>
      Array.from(root.shadowRoot?.querySelectorAll<HTMLElement>('[data-wui-overlay-container]') ?? [])
    ),
    ...Array.from(document.querySelectorAll<HTMLElement>('dialog[data-wui-menu-scrim]'))
  ]
}

/**
 * 取出容器下的 anchored portal host（带自身 shadow 的那一层）。
 *
 * 两棵树的相对深度不同：
 *
 * - overlay root 路径：`[data-wui-overlay-root]` 的 shadow 内有 `[data-wui-overlay-container]`，
 *   host 是**它的直接子级**。
 * - scrim 路径：容器是 `<dialog>` 本身。`[data-wui-overlay-container]` 只由 theme /
 *   overlay-root 创建，浮层直接挂到 dialog 上时**没有**这一层，host 就是 dialog 的直接子级。
 *
 * 宽度必须按容器类型区分：overlay root 路径**不能**把容器的直接子级一并收进来 ——
 * 菜单面板自身就是无 shadow 的直接子级，放宽会改变 dropdown / autocomplete 等既有查找结果。
 */
function getPortalHosts(container: HTMLElement): HTMLElement[] {
  const overlayContainers = [
    ...(container.matches('[data-wui-overlay-container]') ? [container] : []),
    ...Array.from(container.querySelectorAll<HTMLElement>('[data-wui-overlay-container]'))
  ]
  const hosts = [
    ...overlayContainers.flatMap(overlayContainer => Array.from(overlayContainer.children)),
    ...(container instanceof HTMLDialogElement ? Array.from(container.children) : [])
  ]
  return hosts.filter((child): child is HTMLElement => child instanceof HTMLElement && child.shadowRoot !== null)
}

/**
 * 查询**所有** portal 面板（`getPortalPanel` 的多面板版）。
 * 供嵌套浮层场景使用（祖先与后代面板同时在场时需要全量枚举）。
 */
export function getPortalPanels(role = 'dialog'): HTMLElement[] {
  return getOverlayContainers()
    .flatMap(getPortalHosts)
    .map(host => host.shadowRoot?.querySelector<HTMLElement>(`[role="${role}"]`))
    .filter((panel): panel is HTMLElement => panel !== null && panel !== undefined)
}

/**
 * 查询浮层容器中的菜单面板（dropdown / context-menu 族）。
 *
 * 菜单族的面板**直接**挂到 `[data-wui-overlay-container]`（或 scrim）且自身带 `role="menu"`，
 * 不像 anchored panel 那样再包一层带 shadow 的 portal host —— 因此不能复用
 * `getPortalPanel()`（后者要穿过内层 shadow）。`ariaLabel` 用于区分同族面板，
 * 例如 context-menu 的 `'上下文菜单'` 与 `'子菜单'`。
 */
export function getMenuPanels(ariaLabel?: string): HTMLElement[] {
  const panels = getOverlayContainers().flatMap(container =>
    Array.from(container.querySelectorAll<HTMLElement>('[role="menu"]'))
  )
  return ariaLabel === undefined ? panels : panels.filter(panel => panel.getAttribute('aria-label') === ariaLabel)
}

/**
 * 等待一帧，供打开浮层的 requestAnimationFrame 生命周期消费。
 */
export async function waitForFrame(): Promise<void> {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * 轮询到条件满足为止（默认 2s），用于消费 MutationObserver / presence 过渡的异步链路。
 * 等待对象本身带较长延迟（如 spec 自定义的 SHOW_DELAY）时显式传入更大预算。
 */
export async function pollUntil(check: () => boolean, message: string, timeoutMs = 2000): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (check()) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(message)
}

export { hostAnimations } from './animations'

/**
 * 组件内部滚动容器上**真正滚动**的那个元素。
 *
 * 内容区被 OverlayScrollbars 接管后，宿主自己变成 `overflow: hidden` 的外壳，滚动发生在它
 * 内部生成的 viewport 上；断言「内容区自己滚」时问的应当是后者。未被接管时返回宿主本身，
 * 所以同一条断言在接管前后都成立。
 */
export function scrollElementOf(host: Element): Element {
  return host.querySelector('[data-overlayscrollbars-viewport]') ?? host
}
