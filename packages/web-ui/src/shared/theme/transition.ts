import { parseDuration } from '@/shared/theme/duration'

export type ResolvedThemeAppearance = 'light' | 'dark'

interface ViewTransitionLike {
  readonly ready: Promise<void>
  readonly finished: Promise<void>
  skipTransition?: () => void
}

/*
 * theme view transition 引擎（origin / flight / 压制 / 清理）——组件（web-ui-theme）只保留
 * `_shouldAnimate` 判定、reduced-motion 检查与 appearance property 管线；这里的每一行
 * 压制状态机、版本计数与清理顺序（issue #146 伤疤）都是从组件原样搬移的，只换住址。
 * 参照系：root-sync（shared/theme 下已拆出、已有专属 spec 的样板）。
 */

// 主 theme 组件不知道触发它的控件；pointerdown 记录坐标。键盘或程序化调用回退中心。
const transitionOrigin = { x: Number.NaN, y: Number.NaN }
let transitionSequence = 0
let transitionOriginCount = 0
let themeTransitionFlightToken: object | null = null
const activePointers = new Set<number>()
const recordTransitionOrigin = (event: Event) => {
  const pointer = event as PointerEvent
  activePointers.add(pointer.pointerId)
  transitionOrigin.x = pointer.clientX
  transitionOrigin.y = pointer.clientY
}
const releaseTransitionPointer = (event: Event) => activePointers.delete((event as PointerEvent).pointerId)
const forgetTransitionOrigin = () => {
  transitionOrigin.x = Number.NaN
  transitionOrigin.y = Number.NaN
}

function addTransitionOriginListeners() {
  if (transitionOriginCount++ > 0) return
  window.addEventListener('pointerdown', recordTransitionOrigin, true)
  window.addEventListener('pointerup', releaseTransitionPointer, true)
  window.addEventListener('pointercancel', releaseTransitionPointer, true)
  window.addEventListener('keydown', forgetTransitionOrigin, true)
}

function removeTransitionOriginListeners() {
  if (--transitionOriginCount > 0) return
  window.removeEventListener('pointerdown', recordTransitionOrigin, true)
  window.removeEventListener('pointerup', releaseTransitionPointer, true)
  window.removeEventListener('pointercancel', releaseTransitionPointer, true)
  activePointers.clear()
  window.removeEventListener('keydown', forgetTransitionOrigin, true)
}

/**
 * 圆心来源追踪的登记 / 撤销（引用计数 window 监听）。组件在连接期间保持登记；
 * 是否真正动画仍由组件的 `_shouldAnimate` 判定决定。
 */
export function trackThemeTransitionOrigin(): void {
  addTransitionOriginListeners()
}

export function untrackThemeTransitionOrigin(): void {
  removeTransitionOriginListeners()
}

/** 是否已有一次 theme view transition 在飞（document 级单飞的 flight gate）。 */
export function isThemeTransitionInFlight(): boolean {
  return themeTransitionFlightToken !== null
}

/*
 * rendering suppression 期间，规范强制 pointer hit-test 指向 documentElement；
 * 滚轮跳过揭示，及时恢复页面滚动。
 */
function addTransitionInputSkipListeners(transition: ViewTransitionLike, scope?: HTMLElement): () => void {
  let active = true
  let listening = true
  let skipRequested = false
  const existingPointers = new Set(activePointers)
  const blockedPointers = new Set<number>()
  const blockedKeys = new Set<string>()
  const pointerVersions = new Map<number, number>()
  const keyVersions = new Map<string, number>()
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const registrations: [string, EventListener, AddEventListenerOptions][] = []
  const listen = (type: string, handler: EventListener, passive = false) => {
    const options = { capture: true, passive }
    registrations.push([type, handler, options])
    window.addEventListener(type, handler, options)
  }
  const remove = () => {
    if (!listening) return
    listening = false
    for (const [type, handler, options] of registrations) window.removeEventListener(type, handler, options)
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
  }
  const releaseIfIdle = () => {
    if (!active && blockedPointers.size === 0 && blockedKeys.size === 0) remove()
  }
  const defer = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      callback()
      releaseIfIdle()
    }, delay)
    timers.add(timer)
  }
  const block = (event: Event) => {
    if (event.cancelable) event.preventDefault()
    event.stopImmediatePropagation()
  }
  const inScope = (event: Event) =>
    !scope || event.target === document.documentElement || event.composedPath().includes(scope)
  listen('pointerdown', event => {
    const pointer = event as PointerEvent
    if (!active || !inScope(event)) {
      blockedPointers.delete(pointer.pointerId)
      pointerVersions.delete(pointer.pointerId)
      releaseIfIdle()
      return
    }
    blockedPointers.add(pointer.pointerId)
    pointerVersions.set(pointer.pointerId, (pointerVersions.get(pointer.pointerId) ?? 0) + 1)
    block(event)
  })
  for (const type of ['pointerup', 'pointercancel']) {
    listen(
      type,
      event => {
        const id = (event as PointerEvent).pointerId
        const version = pointerVersions.get(id)
        if (version !== undefined)
          defer(
            () => {
              if (pointerVersions.get(id) === version) {
                blockedPointers.delete(id)
                pointerVersions.delete(id)
              }
            },
            type === 'pointercancel' ? 0 : 1000
          )
      },
      true
    )
  }
  listen('keydown', event => {
    const key = event as KeyboardEvent
    if (!active || !inScope(event) || key.metaKey || key.ctrlKey || key.altKey) return
    blockedKeys.add(key.code || key.key)
    keyVersions.set(key.code || key.key, (keyVersions.get(key.code || key.key) ?? 0) + 1)
    block(event)
  })
  listen(
    'keyup',
    event => {
      const key = event as KeyboardEvent
      const code = key.code || key.key
      const version = keyVersions.get(code)
      if (version !== undefined)
        defer(() => {
          if (keyVersions.get(code) === version) {
            blockedKeys.delete(code)
            keyVersions.delete(code)
          }
        }, 1000)
    },
    true
  )
  for (const type of ['click', 'auxclick', 'dblclick', 'contextmenu']) {
    listen(type, event => {
      const pointer = event as PointerEvent
      if (existingPointers.has(pointer.pointerId) && !blockedPointers.has(pointer.pointerId)) {
        existingPointers.delete(pointer.pointerId)
        return
      }
      const pendingPointer =
        blockedPointers.has(pointer.pointerId) ||
        (typeof pointer.pointerId !== 'number' && pointer.detail > 0 && blockedPointers.size > 0)
      const pending = pendingPointer || (pointer.detail === 0 && blockedKeys.size > 0)
      if ((!active || !inScope(event)) && !pending) return
      block(event)
    })
  }
  listen('beforeinput', event => {
    if (active && inScope(event)) block(event)
  })
  listen(
    'wheel',
    () => {
      if (active && !skipRequested) {
        skipRequested = true
        transition.skipTransition?.()
      }
    },
    true
  )
  listen(
    'blur',
    event => {
      if (event.target !== window) return
      blockedPointers.clear()
      blockedKeys.clear()
      pointerVersions.clear()
      keyVersions.clear()
      releaseIfIdle()
    },
    true
  )
  return () => {
    active = false
    releaseIfIdle()
    if (listening)
      defer(() => {
        blockedPointers.clear()
        blockedKeys.clear()
        pointerVersions.clear()
        keyVersions.clear()
      }, 30000)
  }
}

/** 飞行的 duration / easing：读宿主计算样式里的主题 token，非法 easing 回退 ease-in。 */
export function themeTransitionMotion(host: HTMLElement): { duration: number; easing: string } {
  const style = getComputedStyle(host)
  const duration = parseDuration(style.getPropertyValue('--wui-theme-transition-duration')) ?? 500
  const easing = style.getPropertyValue('--wui-theme-transition-easing').trim() || 'ease-in'
  const safeEasing = globalThis.CSS?.supports('animation-timing-function', easing) ? easing : 'ease-in'
  return { duration: Math.max(0, duration), easing: safeEasing }
}

function transitionPoint(x: number, y: number): { x: number; y: number } {
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  return {
    x: (window.innerWidth || 0) / 2,
    y: (window.innerHeight || 0) / 2
  }
}

/** 宿主 `display: contents` 时不产盒，rect 为 0；要量的是 slotted 子内容的并集宽度。 */
function contentWidth(host: HTMLElement): number {
  try {
    const range = document.createRange()
    range.selectNodeContents(host)
    return range.getBoundingClientRect().width
  } catch {
    // jsdom 的 Range 没有几何实现，量不到就返回 0——飞行期间不钉宽。
    return 0
  }
}

/** 揭示圆心：优先指针落点，回退宿主盒中心，再回退视口中心（键盘 / 程序化切换）。 */
function transitionOriginOf(host: HTMLElement): { x: number; y: number } {
  if (Number.isFinite(transitionOrigin.x) && Number.isFinite(transitionOrigin.y)) {
    return transitionOrigin
  }

  const box = host.getBoundingClientRect()
  if (box.width > 0 && box.height > 0) {
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }
  return transitionPoint(Number.NaN, Number.NaN)
}

function transitionKeyframes(x: number, y: number, radius: number, resolvedNext: ResolvedThemeAppearance): Keyframe[] {
  const from = `circle(0px at ${x}px ${y}px)`
  const to = `circle(${radius}px at ${x}px ${y}px)`
  return resolvedNext === 'dark' ? [{ clipPath: from }, { clipPath: to }] : [{ clipPath: to }, { clipPath: from }]
}

export interface ThemeTransitionOptions {
  /** 承载揭示与盒钉扎的宿主（web-ui-theme）。 */
  host: HTMLElement
  /**
   * 嵌套主题的局部揭示范围；根主题缺省（整页揭示、root 形态样式表）。
   * 「是否嵌套」由组件的祖先链判定，引擎只认 scope 有无。
   */
  scope?: HTMLElement
  resolvedNext: ResolvedThemeAppearance
  /**
   * appearance 提交闭包：View Transition 的 update callback 与失败回退共用。
   * stale 请求守卫与渲染收敛（返回 updateComplete）由组件的 property 管线负责。
   */
  update: () => unknown
}

export interface ThemeTransitionSession {
  /**
   * 本次飞行的收尾信号：正常结束 resolve；引擎侧失败（样式表构建 / startViewTransition
   * 抛错——此时清理链已跑完、flight token 已释放）reject，组件据此做 property 管线回退。
   * 调用方必须挂 rejection handler。
   */
  readonly finished: Promise<void>
  /** 断连路径：跳过在途转场并走完清理链。飞行已收尾后调用是幂等空转。 */
  skip(): void
}

/**
 * 单入口引擎：认领 flight token（在调用方 setter 的当前栈内生效）、构建样式表（root 与
 * 嵌套两种形态）、钉扎宿主盒、跑揭示动画与输入压制状态机，收尾按原顺序清理。
 *
 * 输入压制状态机、pointer/key 版本计数、窗口时序与清理顺序逐行保留自组件实现
 * （issue #146 伤疤在内）：cleanup 在 adoptedStyleSheets 写入之前登记，写入同步抛错时
 * 失败路径仍拿得到它，host 上的 view-transition-name 不会残留。
 */
export function runThemeTransition({
  host,
  scope,
  resolvedNext,
  update
}: ThemeTransitionOptions): ThemeTransitionSession {
  // async helper 可能把函数体排到当前栈后；flight gate 必须在调用方 setter 的当前栈内生效。
  const flightToken = {}
  themeTransitionFlightToken = flightToken

  const state: {
    active?: ViewTransitionLike
    cleanup?: () => void
    inputSkipCleanup?: () => void
  } = {}

  // 原 _cleanupThemeTransition(restoreCapture = true) 的引擎侧住址。
  const cleanupTransition = (restoreCapture = true) => {
    state.inputSkipCleanup?.()
    state.inputSkipCleanup = undefined
    state.active = undefined
    const cleanup = state.cleanup
    state.cleanup = undefined
    if (restoreCapture) cleanup?.()
  }

  // 异步体单独命名：外层入口在下面兜底「任何清理登记之前」的同步段失败——
  // new CSSStyleSheet() / replaceSync 在受限嵌入环境会抛错，host 盒钉扎同样发生在
  // state.cleanup 登记之前。没有这层兜底，flight token 永不释放，in-flight gate
  // 从此关闭，之后的每一次主题切换都走直接落地分支、动画永久消失（docblock 的承诺）。
  const finishTransition = async () => {
    const transitionName = scope ? `wui-theme-transition-${++transitionSequence}` : undefined
    const styleSheet = new CSSStyleSheet()
    if (transitionName) {
      styleSheet.replaceSync(`
        ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
        ::view-transition-old(root), ::view-transition-new(root) { mix-blend-mode: normal; }
        ::view-transition-image-pair(root), ::view-transition-image-pair(${transitionName}) { mix-blend-mode: normal; }
        ::view-transition-group(${transitionName}) { animation: none; }
        ::view-transition-old(${transitionName}), ::view-transition-new(${transitionName}) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-old(${transitionName}) { z-index: ${resolvedNext === 'dark' ? 1 : 2}; }
        ::view-transition-new(${transitionName}) { z-index: ${resolvedNext === 'dark' ? 2 : 1}; }
      `)
    } else {
      styleSheet.replaceSync(`
        ::view-transition-old(root), ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-image-pair(root) { mix-blend-mode: normal; }
        ::view-transition-old(root) { z-index: ${resolvedNext === 'dark' ? 1 : 2}; }
        ::view-transition-new(root) { z-index: ${resolvedNext === 'dark' ? 2 : 1}; }
      `)
    }

    const hadDisplay = host.style.getPropertyValue('display')
    const hadWidth = host.style.getPropertyValue('width')
    const hadTransitionName = transitionName ? host.style.getPropertyValue('view-transition-name') : undefined
    if (transitionName) {
      /*
       * 抬成 block 同时把宿主塞回父级布局：宿主 display: contents 时 flex 容器里当 item 的是
       * 作用域内那个 `width: 100%` 的子元素；宿主当 item 时宽度基准成了 shrink-to-fit，内容在揭示
       * 期间跳窄、结束再跳回来。所以先把内容几何钉在宿主上——换了盒，没换宽度。
       * `display: contents` 时宿主自己的 rect 是 0，量子内容只能靠 Range。
       */
      const width = contentWidth(host)
      host.style.setProperty('display', 'block')
      if (width > 0) host.style.setProperty('width', `${width}px`)
      host.style.setProperty('view-transition-name', transitionName)
    }

    const restoreCapture = () => {
      try {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(sheet => sheet !== styleSheet)
      } catch {
        // 拒绝写入的 setter 也拒绝回收，样式表本就没进去；host 内联态的恢复不能因此中断。
      }
      if (!transitionName) return
      if (hadTransitionName) host.style.setProperty('view-transition-name', hadTransitionName)
      else host.style.removeProperty('view-transition-name')
      if (hadWidth) host.style.setProperty('width', hadWidth)
      else host.style.removeProperty('width')
      if (hadDisplay) host.style.setProperty('display', hadDisplay)
      else host.style.removeProperty('display')
    }

    // cleanup 必须在 adoptedStyleSheets 写入之前登记：写入同步抛错时失败路径才拿得到它，
    // 否则 host 上的 view-transition-name 会残留，污染之后每一次 view transition（issue #146）。
    state.cleanup = restoreCapture

    let transition: ViewTransitionLike
    try {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet]
      transition = document.startViewTransition(update as () => Promise<void>) as unknown as ViewTransitionLike
    } catch (error) {
      // 原 setter .catch 的引擎侧（issue #146 顺序）：清理链先于拒绝传出，flight token 无条件释放。
      cleanupTransition()
      if (themeTransitionFlightToken === flightToken) themeTransitionFlightToken = null
      throw error
    }
    state.active = transition
    state.inputSkipCleanup = addTransitionInputSkipListeners(transition, scope)
    const animations: Animation[] = []

    transition.ready
      .then(() => {
        const { duration, easing } = themeTransitionMotion(host)
        if (duration <= 0) return
        const { x, y } = transitionOriginOf(host)
        const target = resolvedNext === 'dark' ? '::view-transition-new(root)' : '::view-transition-old(root)'
        if (scope) {
          const box = host.getBoundingClientRect()
          const relative = { x: x - box.left, y: y - box.top }
          const radius = Math.ceil(
            Math.hypot(Math.max(relative.x, box.width - relative.x), Math.max(relative.y, box.height - relative.y))
          )
          const frames = transitionKeyframes(relative.x, relative.y, radius, resolvedNext)
          const scopedTarget =
            resolvedNext === 'dark'
              ? `::view-transition-new(${transitionName})`
              : `::view-transition-old(${transitionName})`
          animations.push(
            document.documentElement.animate(frames, {
              duration,
              easing,
              fill: 'both',
              pseudoElement: scopedTarget
            } as KeyframeAnimationOptions)
          )
          return
        }

        const radius = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)))
        animations.push(
          document.documentElement.animate(transitionKeyframes(x, y, radius, resolvedNext), {
            duration,
            easing,
            fill: 'both',
            pseudoElement: target
          } as KeyframeAnimationOptions)
        )
      })
      .catch(() => undefined)

    try {
      await transition.finished
    } catch {
      // API 缺失、capture 冲突或用户 skip 都不是状态错误；appearance 已由 update callback 提交。
    } finally {
      state.inputSkipCleanup?.()
      state.inputSkipCleanup = undefined
      state.active = undefined
      state.cleanup = undefined
      for (const animation of animations) animation.cancel()
      restoreCapture()
      // disconnected skip 会提前清掉 active；flight token 必须无条件释放。
      if (themeTransitionFlightToken === flightToken) themeTransitionFlightToken = null
    }
  }

  const finished = (async () => {
    try {
      await finishTransition()
    } catch (error) {
      // 内层 catch（startViewTransition / adoptedStyleSheets 写入）已经清理过：这里的
      // cleanupTransition 对已清理状态是幂等 no-op。同步段失败则由这一层首次清理。
      cleanupTransition()
      if (themeTransitionFlightToken === flightToken) themeTransitionFlightToken = null
      throw error
    }
  })()

  return {
    finished,
    skip() {
      // 原 disconnectedCallback 的两行：跳过在途转场并走清理链。
      state.active?.skipTransition?.()
      cleanupTransition()
    }
  }
}
