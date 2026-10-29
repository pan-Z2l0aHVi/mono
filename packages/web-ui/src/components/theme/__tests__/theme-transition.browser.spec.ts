import '..'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser'

import { pollUntil } from '@/shared/test-utils'

import type { ThemeMotion, WebUiTheme } from '..'

interface CdpSession {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>
}

async function emulateColorScheme(value: 'light' | 'dark'): Promise<void> {
  const session = cdp() as unknown as CdpSession
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] })
}

function createRootTheme(motion: ThemeMotion = 'full'): WebUiTheme {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = 'light'
  theme.motion = motion
  // 3000ms 让 650ms 探测 sleep 的 margin 达到 ~2.3s：900ms 时 CI 单次停顿即可越过 deadline。
  theme.style.setProperty('--wui-theme-transition-duration', '3000ms')
  document.body.append(theme)
  return theme
}

function createHitTarget(left = 40): HTMLElement {
  const target = document.createElement('button')
  target.style.cssText = `position:fixed;left:${left}px;top:40px;width:160px;height:48px;z-index:1`
  target.textContent = 'issue162 hit target'
  document.body.append(target)
  return target
}

function centerOf(target: HTMLElement): { x: number; y: number } {
  const box = target.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

function dispatchPointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  point: { x: number; y: number },
  pointerId = 1
): void {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, composed: true, clientX: point.x, clientY: point.y, pointerId })
  )
}

async function waitFor(condition: () => boolean, message: string, timeoutMs = 5000): Promise<void> {
  await pollUntil(condition, message, timeoutMs)
}

function createNestedTheme(): WebUiTheme {
  const outer = createRootTheme()
  const inner = document.createElement('web-ui-theme') as WebUiTheme
  inner.appearance = 'light'
  inner.motion = 'full'
  inner.style.setProperty('--wui-theme-transition-duration', '3000ms')
  outer.append(inner)
  return inner
}

function wrapStartViewTransition() {
  const original = document.startViewTransition
  let transition: ViewTransition | undefined
  let skipCount = 0
  const start = vi.spyOn(document, 'startViewTransition').mockImplementation(update => {
    transition = original.call(document, update)
    const skip = transition.skipTransition.bind(transition)
    Object.defineProperty(transition, 'skipTransition', {
      configurable: true,
      value: () => {
        skipCount += 1
        skip()
      }
    })
    return transition
  })
  return {
    get current() {
      return transition
    },
    get count() {
      return start.mock.calls.length
    },
    get skipCount() {
      return skipCount
    }
  }
}

afterEach(async () => {
  vi.restoreAllMocks()
  window.dispatchEvent(new KeyboardEvent('keydown'))
  document.body.replaceChildren()
  await emulateColorScheme('light')
})

/** 画 circle 动画的那一层必须盖在另一层之上：比大小关系，不把 z-index 数字钉进用例。 */
function layerAbove(top: string, bottom: string): boolean {
  const root = document.documentElement
  return Number(getComputedStyle(root, top).zIndex) > Number(getComputedStyle(root, bottom).zIndex)
}

describe('theme transition（浏览器）', () => {
  it('OS light 下 light→system 不启动 View Transition', async () => {
    await emulateColorScheme('light')
    const wrapper = wrapStartViewTransition()
    const theme = createRootTheme()
    await theme.updateComplete

    theme.appearance = 'system'
    await theme.updateComplete

    expect(wrapper.current).toBeUndefined()
    expect(theme.appearance).toBe('system')
    expect(theme.resolvedAppearance).toBe('light')
  })

  it('OS dark 下 light→system 使用 dark 扩大方向', async () => {
    await emulateColorScheme('dark')
    const wrapper = wrapStartViewTransition()
    const theme = createRootTheme()
    await theme.updateComplete

    theme.appearance = 'system'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    await transition!.ready
    await Promise.resolve()
    expect(theme.appearance).toBe('system')
    expect(theme.resolvedAppearance).toBe('dark')

    const reveal = document
      .getAnimations()
      .find(
        animation =>
          ((animation.effect as KeyframeEffect | null)?.pseudoElement ?? '') === '::view-transition-new(root)'
      )
    expect(reveal).toBeDefined()
    const frames = (reveal!.effect as KeyframeEffect).getKeyframes()
    expect(frames[0].clipPath as string).toMatch(/^circle\(0px at /)
    expect(frames[1].clipPath as string).toMatch(/^circle\(\d+px at /)
    expect(layerAbove('::view-transition-new(root)', '::view-transition-old(root)'), '揭示层应盖在旧快照上').toBe(true)

    await transition!.finished
  })

  it('根主题在 ::view-transition-new(root) 上创建圆形揭示并在结束后清理', async () => {
    const wrapper = wrapStartViewTransition()
    const theme = createRootTheme()
    await theme.updateComplete

    theme.appearance = 'dark'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    expect(wrapper.count, '一次 appearance 变化应只启动一次 View Transition').toBe(1)
    await transition!.ready
    await Promise.resolve()
    expect(theme.resolvedAppearance).toBe('dark')
    expect(theme.getAttribute('resolved-appearance')).toBe('dark')

    const reveal = document
      .getAnimations()
      .find(
        animation =>
          ((animation.effect as KeyframeEffect | null)?.pseudoElement ?? '') === '::view-transition-new(root)'
      )
    expect(reveal).toBeDefined()
    const effect = reveal!.effect as KeyframeEffect
    expect(effect.target).toBe(document.documentElement)
    const revealFrames = effect.getKeyframes()
    expect((revealFrames[0].clipPath as string).startsWith('circle(0px at ')).toBe(true)
    expect(revealFrames[1].clipPath as string).toMatch(/^circle\(\d+px at /)
    expect(layerAbove('::view-transition-new(root)', '::view-transition-old(root)'), '揭示层应盖在旧快照上').toBe(true)
    expect(
      document.adoptedStyleSheets.some(sheet =>
        Array.from(sheet.cssRules).some(rule => rule.cssText.includes('::view-transition-image-pair'))
      )
    ).toBe(true)

    // 过渡要跑够时间，快照才不会被提前拆掉。判据取动画自身的时长而不是睡 650ms 再读状态：
    // 后者把 wall-clock 当屏障，负载高时先红；这里读同一个数，跑多少帧都不影响结论。
    expect(reveal!.playState, '揭示动画起跑即被取消').toBe('running')
    const revealDuration = effect.getComputedTiming().duration
    expect(typeof revealDuration).toBe('number')
    expect(revealDuration as number, '主题过渡时长不足以完成圆形揭示').toBeGreaterThanOrEqual(600)

    await transition!.finished

    theme.appearance = 'light'
    const reverse = wrapper.current!
    expect(reverse).not.toBe(transition)
    await reverse.ready
    await Promise.resolve()
    expect(theme.resolvedAppearance).toBe('light')
    expect(theme.getAttribute('resolved-appearance')).toBe('light')

    const conceal = document
      .getAnimations()
      .find(
        animation =>
          ((animation.effect as KeyframeEffect | null)?.pseudoElement ?? '') === '::view-transition-old(root)'
      )
    expect(conceal).toBeDefined()
    const concealEffect = conceal!.effect as KeyframeEffect
    expect(concealEffect.target).toBe(document.documentElement)
    const concealFrames = concealEffect.getKeyframes()
    expect(concealFrames[0].clipPath as string).toMatch(/^circle\(\d+px at /)
    expect((concealFrames[1].clipPath as string).startsWith('circle(0px at ')).toBe(true)
    expect(layerAbove('::view-transition-old(root)', '::view-transition-new(root)'), '收合层应盖在新快照上').toBe(true)
    await reverse.finished

    expect(document.adoptedStyleSheets.some(sheet => sheet.cssRules.length > 0)).toBe(false)
    expect(theme.style.getPropertyValue('view-transition-name')).toBe('')
    expect(theme.style.getPropertyValue('display')).toBe('')
  })

  it('嵌套主题使用唯一 capture name 并只清理该飞行状态', async () => {
    const wrapper = wrapStartViewTransition()
    const theme = createNestedTheme()
    await theme.updateComplete

    theme.appearance = 'dark'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    await transition!.ready
    await Promise.resolve()

    const transitionName = theme.style.getPropertyValue('view-transition-name')
    expect(transitionName).toMatch(/^wui-theme-transition-/)
    const reveal = document
      .getAnimations()
      .find(
        animation =>
          ((animation.effect as KeyframeEffect | null)?.pseudoElement ?? '') ===
          `::view-transition-new(${transitionName})`
      )
    expect(reveal).toBeDefined()
    expect((reveal!.effect as KeyframeEffect).target).toBe(document.documentElement)

    await transition!.finished

    theme.appearance = 'light'
    const reverse = wrapper.current!
    expect(reverse).not.toBe(transition)
    await reverse.ready
    await Promise.resolve()

    const reverseName = theme.style.getPropertyValue('view-transition-name')
    const conceal = document
      .getAnimations()
      .find(
        animation =>
          ((animation.effect as KeyframeEffect | null)?.pseudoElement ?? '') === `::view-transition-old(${reverseName})`
      )
    expect(conceal).toBeDefined()
    expect((conceal!.effect as KeyframeEffect).target).toBe(document.documentElement)
    expect(
      layerAbove(`::view-transition-old(${reverseName})`, `::view-transition-new(${reverseName})`),
      '收合侧的快照层应盖住另一层'
    ).toBe(true)
    await reverse.finished

    expect(theme.style.getPropertyValue('view-transition-name')).toBe('')
    expect(theme.style.getPropertyValue('display')).toBe('')
  })

  /*
   * 局部揭示要求宿主有盒，而它默认 `display: contents`，所以飞行期间被临时抬成 block。宿主
   * display: contents 时父级 flex 的 item 是作用域内那个 width:100% 的子元素；盒一多、宿主当
   * item，子元素的宽度基准就跟着换成宿主的 shrink-to-fit——内容在揭示期间跳窄、结束后再跳回来
   * （demo 里表现为深色区宽度跳变）。这里钉的是行为：换了盒，宽度不许动。
   */
  it('嵌套主题在揭示期间不改变内容宽度', async () => {
    const wrapper = wrapStartViewTransition()
    const outer = createRootTheme()
    const flex = document.createElement('div')
    flex.style.cssText = 'display:flex;flex-wrap:wrap;width:600px'
    const inner = document.createElement('web-ui-theme') as WebUiTheme
    inner.appearance = 'light'
    inner.motion = 'full'
    inner.style.setProperty('--wui-theme-transition-duration', '3000ms')
    const content = document.createElement('div')
    content.style.cssText = 'width:100%;max-width:384px'
    content.append(
      ...[0, 1, 2].map(() => {
        const row = document.createElement('span')
        row.style.cssText = 'display:block;height:16px;width:120px'
        return row
      })
    )
    inner.append(content)
    flex.append(inner)
    outer.append(flex)
    await inner.updateComplete

    const before = content.getBoundingClientRect().width
    expect(before).toBe(384)

    inner.appearance = 'dark'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    await transition!.ready
    expect(getComputedStyle(inner).display).toBe('block')
    expect(content.getBoundingClientRect().width).toBe(before)

    await transition!.finished
    expect(content.getBoundingClientRect().width).toBe(before)
    expect(inner.style.getPropertyValue('width')).toBe('')
    expect(inner.style.getPropertyValue('display')).toBe('')
  })

  it('pointermove 与 pointerup 不触发 skip，pointerdown 立即恢复 hit-test', async () => {
    const wrapper = wrapStartViewTransition()
    const source = createHitTarget()
    const recovery = createHitTarget(240)
    const theme = createRootTheme()
    await theme.updateComplete
    const sourcePoint = centerOf(source)
    const recoveryPoint = centerOf(recovery)

    dispatchPointer(source, 'pointerdown', sourcePoint, 7)
    dispatchPointer(source, 'pointerup', sourcePoint, 7)
    theme.appearance = 'dark'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    await transition!.ready
    await Promise.resolve()
    expect(document.elementFromPoint(recoveryPoint.x, recoveryPoint.y)).toBe(document.documentElement)

    dispatchPointer(document.documentElement, 'pointermove', sourcePoint, 7)
    dispatchPointer(document.documentElement, 'pointermove', recoveryPoint, 99)
    dispatchPointer(document.documentElement, 'pointerup', sourcePoint, 7)
    expect(wrapper.skipCount).toBe(0)
    expect(document.elementFromPoint(recoveryPoint.x, recoveryPoint.y)).toBe(document.documentElement)
    const reveal = document
      .getAnimations()
      .find(
        animation =>
          ((animation.effect as KeyframeEffect | null)?.pseudoElement ?? '') === '::view-transition-new(root)'
      )
    expect(reveal?.playState).toBe('running')

    dispatchPointer(document.documentElement, 'pointerdown', recoveryPoint, 99)
    expect(wrapper.skipCount).toBe(1)
    await waitFor(
      () => document.elementFromPoint(recoveryPoint.x, recoveryPoint.y) === recovery,
      'pointerdown did not end rendering suppression before the configured duration'
    )
    await transition!.finished.catch(() => undefined)

    expect(theme.appearance).toBe('dark')
    expect(document.adoptedStyleSheets.some(sheet => sheet.cssRules.length > 0)).toBe(false)
    expect(theme.style.getPropertyValue('view-transition-name')).toBe('')
    expect(theme.style.getPropertyValue('display')).toBe('')
  })

  it('wheel 立即触发 skip 并恢复 hit-test', async () => {
    const wrapper = wrapStartViewTransition()
    const target = createHitTarget()
    const theme = createRootTheme()
    await theme.updateComplete
    const point = centerOf(target)
    expect(document.elementFromPoint(point.x, point.y)).toBe(target)

    window.dispatchEvent(new KeyboardEvent('keydown'))
    theme.appearance = 'dark'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    await transition!.ready
    await Promise.resolve()
    expect(document.elementFromPoint(point.x, point.y)).toBe(document.documentElement)

    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, composed: true, cancelable: true }))
    expect(wrapper.skipCount).toBe(1)
    await waitFor(
      () => document.elementFromPoint(point.x, point.y) === target,
      'wheel did not end rendering suppression before the configured duration'
    )
    await transition!.finished.catch(() => undefined)

    expect(theme.appearance).toBe('dark')
    expect(document.adoptedStyleSheets.some(sheet => sheet.cssRules.length > 0)).toBe(false)
    expect(theme.style.getPropertyValue('view-transition-name')).toBe('')
    expect(theme.style.getPropertyValue('display')).toBe('')
  })

  /*
   * 三档语义在无系统 reduce 偏好的环境里的另一半：motion=system 跟随系统（此处即无偏好）播放过渡，
   * motion=reduced 则完全不启动 —— 后者是「属性自身关掉过渡」的判据，与 reduced-motion project
   * 里由 Playwright 注入的系统偏好互为对照。
   */
  it('motion=system 跟随无偏好系统：启动 View Transition', async () => {
    const wrapper = wrapStartViewTransition()
    const theme = createRootTheme('system')
    await theme.updateComplete

    theme.appearance = 'dark'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    expect(wrapper.count, '一次 appearance 变化应只启动一次 View Transition').toBe(1)
    await transition!.ready
    await transition!.finished

    expect(theme.appearance).toBe('dark')
  })

  it('motion=reduced 时不启动 View Transition，直接落地 appearance', async () => {
    const wrapper = wrapStartViewTransition()
    const theme = createRootTheme('reduced')
    await theme.updateComplete

    theme.appearance = 'dark'
    await theme.updateComplete
    expect(wrapper.count, 'reduced 档一次都不该启动 View Transition').toBe(0)
    expect(theme.appearance).toBe('dark')
    expect(theme.getAttribute('appearance')).toBe('dark')
  })
})
