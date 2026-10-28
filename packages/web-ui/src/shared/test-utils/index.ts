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

/** 让出一次 rAF 及其后的 task；只代表该次渲染步进，不代表任意异步工作已完成。 */
export async function afterRenderStep(): Promise<void> {
  await renderStepUntil(Infinity)
}

export async function renderStepUntil(deadline: number): Promise<boolean> {
  if (performance.now() >= deadline) return false
  return new Promise(resolve => {
    let done = false
    let frame = 0
    let task: ReturnType<typeof setTimeout> | undefined
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const finish = (completed: boolean) => {
      if (done) return
      done = true
      cancelAnimationFrame(frame)
      clearTimeout(task)
      clearTimeout(watchdog)
      resolve(completed)
    }
    if (Number.isFinite(deadline)) watchdog = setTimeout(() => finish(false), deadline - performance.now())
    frame = requestAnimationFrame(() => {
      task = setTimeout(() => finish(performance.now() < deadline), 0)
    })
  })
}

function rectsEqual(a: DOMRect, b: DOMRect): boolean {
  return (
    Math.abs(a.top - b.top) < 0.01 &&
    Math.abs(a.bottom - b.bottom) < 0.01 &&
    Math.abs(a.left - b.left) < 0.01 &&
    Math.abs(a.right - b.right) < 0.01
  )
}

function connectedRoots(roots: Element | ReadonlyArray<Element | null | undefined>): Element[] {
  const passed = Array.isArray(roots) ? roots : [roots]
  const observed = passed.filter((root): root is Element => !!root && root.isConnected)
  if (observed.length === 0) {
    throw new Error(`waitForAnimationsToFinish: no connected root to observe (${passed.length} passed, 0 connected)`)
  }
  return observed
}

/** 两个连续渲染步进均无未完成动画才成功；预算耗尽返回 false。 */
export async function waitForAnimationsToFinish(
  roots: Element | ReadonlyArray<Element | null | undefined>,
  timeoutMs = 5000
): Promise<boolean> {
  return animationsUntil(connectedRoots(roots), performance.now() + timeoutMs)
}

async function animationsUntil(observed: readonly Element[], deadline: number): Promise<boolean> {
  let idleFrames = 0
  while (await renderStepUntil(deadline)) {
    if (observed.some(root => !root.isConnected)) throw new Error('observed target disconnected during animation wait')
    const running = new Set(
      observed
        .flatMap(root => root.getAnimations({ subtree: true }))
        .filter(animation => animation.playState !== 'finished' && animation.playState !== 'idle')
    )
    if (running.size === 0) {
      if (++idleFrames === 2) return true
      continue
    }
    idleFrames = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const finished = await Promise.race([
        Promise.all([...running].map(animation => animation.finished.catch(() => undefined))).then(() => true),
        new Promise<boolean>(resolve => {
          timer = setTimeout(() => resolve(false), Math.max(0, deadline - performance.now()))
        })
      ])
      if (!finished) return false
    } finally {
      clearTimeout(timer)
    }
  }
  return false
}

/** 等待目标的初始 RO 投递及其后一次渲染步进；缺少投递时失败，不能宣称已排干。 */
export async function drainResizeObserver(
  targets: ReadonlyArray<Element | null | undefined>,
  timeoutMs = 5000
): Promise<void> {
  const observed = targets.filter((target): target is Element => !!target && target.isConnected)
  if (observed.length === 0) return
  await resizeObserverUntil(observed, performance.now() + timeoutMs)
}

async function resizeObserverUntil(observed: readonly Element[], deadline: number): Promise<void> {
  const failure = () => new Error('ResizeObserver did not deliver before the deadline')
  await new Promise<void>((resolve, reject) => {
    const observer = new ResizeObserver(() => {
      observer.disconnect()
      clearTimeout(timer)
      if (observed.some(root => !root.isConnected)) reject(new Error('observed target disconnected during RO wait'))
      else resolve()
    })
    const timer = setTimeout(
      () => {
        observer.disconnect()
        reject(failure())
      },
      Math.max(0, deadline - performance.now())
    )
    try {
      for (const target of observed) observer.observe(target, { box: 'border-box' })
    } catch (error) {
      observer.disconnect()
      clearTimeout(timer)
      reject(error)
    }
  })
  if (!(await renderStepUntil(deadline))) throw failure()
}

export interface SettleExpectation {
  readonly check: () => boolean
  readonly describe?: () => string
}

/** 先等目标条件，再等动画、RO 和连续稳定矩形。所有阶段共享一个失败预算。 */
export async function waitForSettledLayout(
  targets: ReadonlyArray<Element | null | undefined>,
  options: { stableFrames?: number; timeoutMs?: number; expect?: SettleExpectation } = {}
): Promise<void> {
  const { stableFrames = 2, timeoutMs = 5000, expect } = options
  const startedAt = performance.now()
  const deadline = startedAt + timeoutMs
  let stage = 'expectation'
  let stageStartedAt = startedAt
  const phases: string[] = []
  const enter = (next: string) => {
    const now = performance.now()
    phases.push(`${stage}=${Math.round(now - stageStartedAt)}ms`)
    stageStartedAt = now
    stage = next
  }
  const failure = (detail: string) =>
    new Error(
      `waitForSettledLayout: ${detail} after ${Math.round(performance.now() - startedAt)}ms ` +
        `(budget ${timeoutMs}ms, stage=${stage}, phases=${phases.join(',')}, expectation=${expect?.describe?.() ?? 'n/a'})`
    )
  const step = async () => {
    if (!(await renderStepUntil(deadline))) throw failure('render step did not complete')
  }
  if (expect) while (!expect.check()) await step()
  const observed = targets.filter((target): target is Element => !!target && target.isConnected)
  if (!observed.length) throw failure(`no connected target to settle (${targets.length} passed, 0 connected)`)
  enter('animations')
  try {
    if (!(await animationsUntil(observed, deadline))) throw new Error('animations did not settle')
  } catch (error) {
    throw failure(error instanceof Error ? error.message : String(error))
  }
  enter('resize-observer')
  try {
    await resizeObserverUntil(observed, deadline)
  } catch (error) {
    throw failure(error instanceof Error ? error.message : String(error))
  }
  enter('stable-frames')
  if (expect) while (!expect.check()) await step()
  if (observed.some(target => !target.isConnected)) throw failure('observed target disconnected')
  let previous = observed.map(target => target.getBoundingClientRect())
  let stable = 0
  while (stable < stableFrames) {
    await step()
    if (observed.some(target => !target.isConnected)) throw failure('observed target disconnected')
    const current = observed.map(target => target.getBoundingClientRect())
    stable =
      (!expect || expect.check()) && current.every((rect, index) => rectsEqual(rect, previous[index])) ? stable + 1 : 0
    previous = current
  }
}

/** 轮询目标条件；预算覆盖每个渲染步进，超时包含最后读数。 */
export async function pollUntil(
  check: () => boolean,
  message: string | (() => string),
  timeoutMs = 5000
): Promise<void> {
  const startedAt = performance.now()
  const deadline = startedAt + timeoutMs
  let frames = 0
  while (!check()) {
    if (!(await renderStepUntil(deadline))) {
      if (check()) return
      const reading = typeof message === 'function' ? message() : message
      throw new Error(
        `${reading} (waited ${Math.round(performance.now() - startedAt)}ms / ${frames} render steps, budget ${timeoutMs}ms)`
      )
    }
    frames++
  }
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
