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
 * 查询 fallback overlay root 中的 portal panel。结构为公开契约：
 * [data-wui-overlay-root]#shadow > [data-wui-overlay-container] > portal host div#shadow > panel。
 * role 按组件语义传入（popover/tooltip 的 dialog、select 的 listbox 等）。
 *
 * **只在无主题时适用**：挂了 `web-ui-theme` 时 panel 改挂 theme-owned overlay root
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
 * 查询 **theme-owned** overlay root 中的 portal panel。
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
 * 枚举 overlay 容器。overlay panel 可能挂在两种地方，必须一起枚举，否则模态化的 context-menu
 * 会「查不到 panel」：
 *
 * 1. document 上 fallback overlay root（`[data-wui-overlay-root]`）的
 *    `[data-wui-overlay-container]`（无主题时的 dropdown 与未模态化的 context-menu）。
 *    它自己的内容在其 shadow root 里，所以要进 shadow 查。
 *    theme-owned root **不进这份清单**：它由 `getThemedPortalPanel(theme, role)` 按主题查，
 *    而它与 (2) 的 scrim 互为祖先/后代 —— 两边都收会让同一个 menu panel 被 `getMenuPanels()`
 *    数两次，而那份重复会伪装成「多开了一层 menu」。
 * 2. menu scrim `<dialog data-wui-menu-scrim>`：模态化的 context-menu 把 panel 挂进自己
 *    `showModal()` 的 scrim（top layer）。scrim 挂在**最近主题的 overlay root 里**，
 *    也就是落在 `<web-ui-theme>` 的 shadow root 内（只有无主题时才回落 `document.body`）；
 *    `document.querySelectorAll` **穿不过 shadow 边界**，所以带主题的 scrim 要按宿主逐个
 *    进 shadow 里查 —— 嵌套 theme 各带一个 root，只查第一个会让内层 theme 里的 scrim 漏掉。
 *    menu**内部**再嵌套的 anchored overlay（popover 等）同样落进 scrim ——
 *    `findEnclosingOpenDialog` 把最近的已打开 dialog 当容器，而 menu 打开期间那就是 scrim。
 *
 * 漏掉 (2) 的后果不是「测试报错」而是**静默退化**：带主题的 menu 查找恒返回空，于是
 * `toHaveLength(0)` 永远绿、`expect(panel).toBeTruthy()` 永远红。前者更危险 —— 它把一批
 * 有效断言换成了永不失败的空断言。守护这条的是
 * `shared/test-utils/__tests__/overlay-locators-theme.browser.spec.ts`。
 */
function getOverlayContainers(): HTMLElement[] {
  const rootContainers = Array.from(document.querySelectorAll<HTMLElement>('[data-wui-overlay-root]')).flatMap(root =>
    Array.from(root.shadowRoot?.querySelectorAll<HTMLElement>('[data-wui-overlay-container]') ?? [])
  )

  // 无主题（或主题出现前就已打开）的 scrim 在 light DOM；带主题的在各 theme host 的 shadow
  // root 内。两条都要收，否则模态 menu 会按挂载点不同时灵时不灵。
  const scrims = [
    ...Array.from(document.querySelectorAll<HTMLElement>('dialog[data-wui-menu-scrim]')),
    ...Array.from(document.querySelectorAll<HTMLElement>('web-ui-theme')).flatMap(theme =>
      Array.from(theme.shadowRoot?.querySelectorAll<HTMLElement>('dialog[data-wui-menu-scrim]') ?? [])
    )
  ]

  return [...rootContainers, ...scrims]
}

/**
 * 取出容器下的 anchored portal host（带自身 shadow 的那一层）。
 *
 * 两棵树的相对深度不同：
 *
 * - overlay root 路径：`[data-wui-overlay-root]` 的 shadow 内有 `[data-wui-overlay-container]`，
 *   host 是**它的直接子级**。
 * - scrim 路径：容器是 `<dialog>` 本身。`[data-wui-overlay-container]` 只由 theme /
 *   overlay-root 创建，overlay 直接挂到 dialog 上时**没有**这一层，host 就是 dialog 的直接子级。
 *
 * 宽度必须按容器类型区分：overlay root 路径**不能**把容器的直接子级一并收进来 ——
 * menu panel 自身就是无 shadow 的直接子级，放宽会改变 dropdown / autocomplete 等既有查找结果。
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
 * 查询**所有** portal panel（`getPortalPanel` 的多 panel 版）。
 * 供嵌套 overlay 场景使用（祖先与后代 panel 同时在场时需要全量枚举）。
 */
export function getPortalPanels(role = 'dialog'): HTMLElement[] {
  return getOverlayContainers()
    .flatMap(getPortalHosts)
    .map(host => host.shadowRoot?.querySelector<HTMLElement>(`[role="${role}"]`))
    .filter((panel): panel is HTMLElement => panel !== null && panel !== undefined)
}

/**
 * 查询 overlay 容器中的 menu panel（dropdown / context-menu 族）。
 *
 * menu 族的 panel**直接**挂到 `[data-wui-overlay-container]`（或 scrim）且自身带 `role="menu"`，
 * 不像 anchored panel 那样再包一层带 shadow 的 portal host —— 因此不能复用
 * `getPortalPanel()`（后者要穿过内层 shadow）。`ariaLabel` 用于区分同族 panel，
 * 例如 context-menu 的 `'Context menu'` 与 `'submenu'`。
 */
export function getMenuPanels(ariaLabel?: string): HTMLElement[] {
  const panels = getOverlayContainers().flatMap(container =>
    Array.from(container.querySelectorAll<HTMLElement>('[role="menu"]'))
  )
  return ariaLabel === undefined ? panels : panels.filter(panel => panel.getAttribute('aria-label') === ariaLabel)
}

/**
 * 等待一帧，供打开 overlay 的 requestAnimationFrame 生命周期消费。
 */
export async function waitForFrame(): Promise<void> {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * 等「一个渲染步进真的过去了」，而不只是等 rAF 回调被调用。
 *
 * 差别是 ResizeObserver：它在渲染步进里、**rAF 回调之后**投递通知。
 * 因此 `await waitForFrame()` 返回时，那一批尺寸回调可能一个都还没派发，
 * 组件按尺寸写回的让位量此刻还没进布局——这正是「连续两帧读数相同」证明不了
 * 「已经就位」的机制来源：两帧读到的都是**旧**值。
 *
 * rAF 之后再让出一个宏任务，该宏任务只可能在步进（含 ResizeObserver 投递）
 * 结束后才被调度，于是它返回时样式计算、布局与本批尺寸回调都已落地。
 * 这是 settle / poll 系 helper 的统一底座。
 */
export async function afterRenderStep(): Promise<void> {
  await new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))
}

/**
 * 两个矩形是否逐边相等（精度与既有 spec 的 settleGeometry 同口径）。
 *
 * 容差 0.01px 不是随手取的：`getBoundingClientRect()` 返回的是 LayoutUnit 量化值，
 * 同一几何在不同引擎/不同缩放下能差一个 1/64 px。零容差会把「同一个盒子」判成
 * 「还在动」。
 */
function rectsEqual(a: DOMRect, b: DOMRect): boolean {
  return (
    Math.abs(a.top - b.top) < 0.01 &&
    Math.abs(a.bottom - b.bottom) < 0.01 &&
    Math.abs(a.left - b.left) < 0.01 &&
    Math.abs(a.right - b.right) < 0.01
  )
}

/**
 * 等元素上正在跑的过渡 / 动画真的结束。
 *
 * 为什么不能只等「矩形两次取样相等」：过渡进度只在渲染步进（update the rendering）里
 * 推进，而 `getBoundingClientRect()` 触发的强制样式重算**不**推进它。于是负载下
 * 「连续两次取样相等」既可能表示已经定版，也可能表示过渡还没起跑——后者量到的是
 * 过渡前那一帧的矩形，元素可能整个还在视口外。CI 上 drawer 的那几条 flaky 正是
 * 这个形态：胶囊坐标落在视口上方，`elementFromPoint` 返回 null。
 *
 * 为什么这里**不在第一次读到空集合时直接返回**：空集合有三种来源——已跑完、从未起跑、
 * 以及「这一帧还没跑到」。第三种与第一种在读数上无法区分，所以「读到空」不等于
 * 「已稳定」。本实现要求**连续两个渲染步进**都读到空才返回：
 * - 第一次取样之前先让出一个完整渲染步进，已排下但尚未提交的 class 变更此刻才被计算，
 *   过渡对象也才存在（处在 `delay` 中的过渡同样在集合里）；
 * - 若某个 ResizeObserver 回调或另一段脚本在第一个空步进之后又起了一个过渡，
 *   第二个步进会读到它，计数器归零重来。
 *
 * 于是「确实没动画、不必等」这条快路径在**本函数里根本不存在**——每次调用至少花掉两个
 * 渲染步进。调用方自己确知没有动画、想省掉这两个步进的话，直接跳过本函数即可
 * （不要拿「第一次读到空」当跳过的判据）。
 *
 * 取多个根而不是单个元素：只查调用方给的**第一个** target 时，其余 target 上的动画
 * 一概看不到（`getAnimations({subtree:true})` 覆盖自身与后代，但不覆盖祖先，也不覆盖
 * 与第一个 target 互不为祖先/后代的兄弟节点）。`finished` 在动画被取消时会 reject，
 * 这里吞掉——取消意味着「它不再跑了」，正是本函数要等到的状态，不该变成一次未处理的
 * rejection。
 *
 * 返回值是**是否真的收敛**：预算耗尽时仍有动画在跑会返回 `false`，而不是把
 * 「没等到」说成「已稳定」。低层调用方可以自己决定拿这个信号怎么办，但必须拿得到
 * ——`waitForSettledLayout` 就是靠它拒绝在过渡中途取样的。与 `pollUntil` 的取向
 * 也一致：后者是「轮询一个明确的期待值」，那里超时必须抛。
 *
 * **一个可观察的根都没有时抛错**，不静默返回。这正是本函数要消灭的形态：
 * 「什么都没读到」与「已经稳定」在读数上无法区分，而调用方写下这行时想的是
 * 「等这些元素上的动画收敛」。`Array.isArray` 的判据是刻意的（类型签名只收
 * `Element` 或真数组），所以 NodeList / HTMLCollection / `arguments` 会被包成
 * `[roots]` 再被过滤成空——这正是「误传类数组 ⇒ 安静宣布稳定」的入口，
 * 它会带着可读的报错停下来，调用点必须传元素而不是类数组。
 */
export async function waitForAnimationsToFinish(
  roots: Element | ReadonlyArray<Element | null | undefined>,
  timeoutMs = 5000
): Promise<boolean> {
  const observed = (Array.isArray(roots) ? roots : [roots]).filter(
    (root): root is Element => !!root && root.isConnected
  )
  if (observed.length === 0) {
    const passed = Array.isArray(roots) ? roots.length : 1
    throw new Error(
      `waitForAnimationsToFinish: no connected root to observe (${passed} passed, 0 connected). ` +
        'Pass Elements rather than a NodeList/HTMLCollection, and make sure the target is mounted.'
    )
  }

  const deadline = performance.now() + timeoutMs
  const idleFramesRequired = 2
  let idleFrames = 0

  while (performance.now() < deadline) {
    // 完整渲染步进：样式计算 + 布局 + ResizeObserver 投递都过去了才取样。
    await afterRenderStep()

    const running = new Set<Animation>()
    for (const root of observed) for (const animation of root.getAnimations({ subtree: true })) running.add(animation)

    if (running.size === 0) {
      if (++idleFrames >= idleFramesRequired) return true
      continue
    }

    idleFrames = 0
    const remaining = deadline - performance.now()
    await Promise.race([
      Promise.all([...running].map(animation => animation.finished.catch(() => undefined))),
      new Promise(resolve => setTimeout(resolve, Math.max(remaining, 0)))
    ])
  }

  // 走到这里说明预算先耗尽了——循环从未攒够 `idleFramesRequired` 个空闲步进。
  // 最后取一次样只为区分两件事：此刻仍有动画在跑（没等到，返回 false），还是
  // 只是没来得及凑满两帧（此时动画确实已经不在，取样足够支撑调用方的判断）。
  for (const root of observed) {
    if (root.getAnimations({ subtree: true }).length > 0) return false
  }
  return true
}

/**
 * 抽干一次 ResizeObserver 批次。
 *
 * 组件把尺寸写回宿主样式走的是 ResizeObserver（如 drawer 的 header / footer 让位量）。
 * 那一步移动的是**另一个盒子**：量 dialog 矩形量不到它，所以「dialog 矩形稳定了」
 * 推不出让位量已生效。用一个新观察者观察这些目标并等一次回调即可——更早注册的
 * 观察者（组件的共享实例）在同一批次里先派发，本回调触发时它已经跑完。
 * ResizeObserver 在开始观察时必定投递一次初始观测，所以这条等待不会因为
 * 「之后没有尺寸变化」而空转到超时。
 *
 * `timeoutMs` 必须是**本函数自己那份预算**，不能是调用方 deadline 的余量：那个
 * `setTimeout(finish, timeoutMs)` 兜底是「页面不再渲染时不能死等」的唯一出口，
 * 余量很小的话它会先于 RO 的初始投递触发，于是本函数假装排干了就返回——把这次
 * 改动要消灭的「超时即通过」原样搬到下一层。调用方的总预算由它自己的 deadline 管。
 *
 * 末尾那一步让写回的样式进布局，它同样在兜底之内：隐藏 / 被遮挡的文档里 rAF 不
 * 触发，所以它与 `timeoutMs` 对跑，而不是无条件等待。
 */
export async function drainResizeObserver(
  targets: ReadonlyArray<Element | null | undefined>,
  timeoutMs = 5000
): Promise<void> {
  const observed = targets.filter((target): target is Element => !!target && target.isConnected)
  if (observed.length === 0) return
  const deadline = performance.now() + timeoutMs
  await new Promise<void>(resolve => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      observer.disconnect()
      resolve()
    }
    const observer = new ResizeObserver(finish)
    for (const target of observed) observer.observe(target, { box: 'border-box' })
    // 观察者只在渲染步进里派发；页面完全不再渲染时不能死等。
    setTimeout(finish, timeoutMs)
  })
  // 观察者回调里写回的样式要再过一个渲染步进才进布局；rAF 在隐藏文档里不触发，
  // 所以同样与 deadline 对跑。
  await Promise.race([
    afterRenderStep(),
    new Promise(resolve => setTimeout(resolve, Math.max(deadline - performance.now(), 0)))
  ])
}

/** `waitForSettledLayout` / `pollUntil` 的期待条件与诊断。 */
export interface SettleExpectation {
  /** 期待值是否已到位。到位之前不进入帧驱动收尾。 */
  readonly check: () => boolean
  /** 期待值的当前读数，写进超时诊断——「读数停在 X」比「超时了」有用得多。 */
  readonly describe?: () => string
}

/**
 * 等矩定版：命中测试 / 几何断言取样前的前提。
 *
 * **期待驱动为主，帧驱动兜底。** 两段各管一件不同的事：
 *
 * 1. 期待驱动：给了 `expect` 就先等它成立。这是唯一能区分「已经就位」与
 *    「还没开始动」的信号——「连续两帧读数相同」在视口没生效、滚动没落定、
 *    定位还没写回时同样成立，两帧读到的都是同一个**旧**值。
 * 2. 帧驱动兜底：过渡确实结束（`waitForAnimationsToFinish`，内部要求连续两个
 *    渲染步进都没有动画）、ResizeObserver 批次已投递、随后连续 `stableFrames`
 *    个渲染步进里所有 targets 的矩形逐边相等。
 *
 * 顺序是因果链，不是「多睡几帧」：
 *   1. 等期待值到位（可选）；
 *   2. 等过渡跑完（否则量到的是动画中途、甚至动画尚未起跑那一帧的盒子）；
 *   3. 抽干 ResizeObserver（否则由尺寸写回的让位量还没生效）；
 *   4. 连续 `stableFrames` 个渲染步进里矩形逐边相等才算定版。
 *
 * 第 4 步单独不够（它正是既有 flaky 的来源），但作为收尾仍然必要——前两步保证
 * 「不会再变」，它保证「已经变了的那一次也量到了」。
 *
 * **期待值先于「没有可量的目标」这条快路径。** 目标没挂上 / 被换掉时，「没有可量的
 * 目标」与「已经定版」在读数上完全一样，而前者会直接毁掉本函数的用途：调用方写下
 * `expect: expectInsideViewport(targets)` 恰恰是在说「这些东西到位之前不许往下走」。
 * 所以顺序固定为：先等期待值 → 再取一次已连接目标 → 取不到就抛错。
 *
 * 目标清单因此在期待值之后**重新取一次**而不是复用进入函数时那份快照：期待值本身
 * 就可能在等挂载，而快照会把「等待期间才连上的元素」永远算成缺失。
 */
export async function waitForSettledLayout(
  targets: ReadonlyArray<Element | null | undefined>,
  options: { stableFrames?: number; timeoutMs?: number; expect?: SettleExpectation } = {}
): Promise<void> {
  const { stableFrames = 2, timeoutMs = 5000, expect } = options
  const deadline = performance.now() + timeoutMs
  const startedAt = performance.now()

  const diagnose = (stage: string) => {
    const reading = expect?.describe?.() ?? 'n/a'
    return (
      `waitForSettledLayout: ${stage} after ${Math.round(performance.now() - startedAt)}ms ` +
      `(budget ${timeoutMs}ms, expectation=${reading})`
    )
  }

  if (expect) {
    while (!expect.check()) {
      if (performance.now() >= deadline) throw new Error(diagnose('expectation never became true'))
      await afterRenderStep()
    }
  }

  // 期待值之后重取：挂载可能就发生在刚才那段等待里。
  const observed = targets.filter((target): target is Element => !!target && target.isConnected)
  if (observed.length === 0) {
    throw new Error(
      diagnose(
        `no connected target to settle (${targets.length} passed, 0 connected — ` +
          'a target that is not mounted yet is not a settled target)'
      )
    )
  }

  // 各步拿的是**总预算**，不是 deadline 的余量：期待条件若吃光了预算，后面两步会拿到 0
  // 而各自静默返回，等于把「什么都没等到」伪装成「已经排干」。余量只用来决定何时抛错——
  // 那是下面稳定帧循环的职责，它带着读数诊断。
  //
  // 动画那一步的返回值在这里是承重的：false 表示预算耗尽时过渡仍在跑，此时继续往下
  // 量到的就是动画中途的盒子——「超时即通过」正是本模块要消灭的形态。
  const animationsSettled = await waitForAnimationsToFinish(observed, timeoutMs)
  if (!animationsSettled) {
    throw new Error(diagnose(`animations were still running when the ${timeoutMs}ms budget ran out`))
  }
  await drainResizeObserver(observed, timeoutMs)

  await Promise.race([
    afterRenderStep(),
    new Promise(resolve => setTimeout(resolve, Math.max(deadline - performance.now(), 0)))
  ])
  let previous = observed.map(target => target.getBoundingClientRect())
  let stable = 0
  while (stable < stableFrames) {
    if (performance.now() >= deadline) {
      throw new Error(diagnose(`layout did not settle within ${timeoutMs}ms`))
    }
    await afterRenderStep()
    const current = observed.map(target => target.getBoundingClientRect())
    stable = current.every((rect, index) => rectsEqual(rect, previous[index])) ? stable + 1 : 0
    previous = current
  }
}

/**
 * 轮询到期待值成立为止，用于消费 MutationObserver / presence 过渡的异步链路。
 *
 * 每轮让出的是**一个完整渲染步进**而不是裸 rAF：ResizeObserver 与
 * MutationObserver 都在渲染步进里投递，裸 rAF 只保证回调被调用过，
 * 不保证这一批通知已经送到。
 *
 * 预算默认 5s（原 2s）。轮询的进度单位是**帧**，而帧在负载下会被拉长：
 * 2s 的墙钟预算在繁忙的 CI 上只够跑十几帧，期待值需要的帧数一旦超过它，
 * 「等到了但被判超时」就会以随机的方式红。放宽的是等待预算，不是断言——
 * 条件不成立时仍然会红，只是红得更晚一点、诊断里带着帧数与最终读数。
 * 等待对象本身带较长延迟（如 spec 自定义的 SHOW_DELAY）时可显式传入更大预算。
 *
 * `message` 收函数是有意的：诊断里带上期待值的**当前读数**，
 * 「读数停在 952」比「超时了」有用得多。
 */
export async function pollUntil(
  check: () => boolean,
  message: string | (() => string),
  timeoutMs = 5000
): Promise<void> {
  const describe = typeof message === 'function' ? message : () => message
  const deadline = performance.now() + timeoutMs
  const startedAt = performance.now()
  let frames = 0
  while (performance.now() < deadline) {
    if (check()) return
    await afterRenderStep()
    frames += 1
  }
  // 最后一轮：预算正好在条件成立的那一步耗尽时不该误报。
  if (check()) return
  throw new Error(
    `${describe()} (waited ${Math.round(performance.now() - startedAt)}ms / ${frames} render steps, budget ${timeoutMs}ms)`
  )
}

/**
 * 把一枚颜色写法结算成浏览器用的 rgb 形式，供「期望值来自输入而不是抄色板」的比对使用。
 *
 * 存在理由：`#123456` 落到 caret-color / stroke 上读回来是 `rgb(18, 52, 86)`，两种写法不能
 * 直接 toBe。用例因此可以断言「这个可观察属性确实等于我传进去的那枚值」，而不必把 rgb
 * 字面量抄进期望位——抄进去就成了随调色板腐化的设计值断言。
 *
 * 探针必须挂在**在渲染树里**的元素上：挂到没有默认槽的自定义元素里，Chrome 会把
 * `var(...)` 原样回传而不是算出色值。因此这里挂 body，只用于归一化调用方给出的颜色常量。
 */
export function resolveColor(color: string): string {
  const probe = document.createElement('span')
  probe.style.color = color
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}
