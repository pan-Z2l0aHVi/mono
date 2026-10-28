import '..'
import '@/components/segmented-trigger'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import { afterRenderStep, pollUntil, queryA11y } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'

afterEach(() => document.body.replaceChildren())

/** 手势面以公开语义 role="listbox" 定位（不依赖内部 class）。 */
function gestureSurface(segmented: WebUiSegmented): HTMLElement {
  const surface = queryA11y(segmented, '[role="listbox"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="listbox" 的手势面')
  return surface
}

/** 单个 option 的可交互面以公开语义 role="option" 定位。 */
function optionSurface(trigger: WebUiSegmentedTrigger): HTMLElement {
  const surface = queryA11y(trigger, '[role="option"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
  return surface
}

function triggerCenter(trigger: WebUiSegmentedTrigger): { x: number; y: number } {
  const rect = optionSurface(trigger).getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** 命中元素是否落在 trigger 这一层：host 本体，或其 shadow 内部的可交互面。 */
function belongsToTrigger(hit: Element | null, trigger: WebUiSegmentedTrigger): boolean {
  if (!hit) return false
  if (hit === trigger) return true
  const root = hit.getRootNode()
  return root instanceof ShadowRoot && root.host === trigger
}

function describeHit(hit: Element | null): string {
  if (!hit) return 'null'
  const root = hit.getRootNode()
  const scope = root instanceof ShadowRoot ? ` @${root.host.tagName.toLowerCase()}` : ''
  return `${hit.tagName.toLowerCase()}${scope}`
}

// 注：本文件多处 `getBoundingClientRect()` 只用于给合成指针事件算 clientX/Y（测试驱动），
// 不承载任何像素契约断言——R3 允许的"边界约束"以外的几何读取在此仅为造事件所需。
function pointer(type: string, init: PointerEventInit): PointerEvent {
  return new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, ...init })
}

// 带时间戳的指针事件：drag-gesture 以事件 timeStamp 做滑动窗口速度估算，无时间戳合成
// 事件的速度随调度间隙漂移（间隙 ≥100ms 时 15px 窗口不足 300px/s 阈值），注入确定时间线。
function timedPointer(type: string, init: PointerEventInit & { timeStamp?: number }): PointerEvent {
  const { timeStamp, ...rest } = init
  const event = new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, ...rest })
  if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  return event
}

function createSegmented(options: { disabledSecond?: boolean } = {}): {
  segmented: WebUiSegmented
  t1: WebUiSegmentedTrigger
  t2: WebUiSegmentedTrigger
  t3: WebUiSegmentedTrigger
} {
  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'daily'

  const t1 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t1.value = 'daily'
  t1.textContent = 'Daily'

  const t2 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t2.value = 'weekly'
  t2.textContent = 'Weekly'
  if (options.disabledSecond) t2.disabled = true

  const t3 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t3.value = 'monthly'
  t3.textContent = 'Monthly'

  segmented.append(t1, t2, t3)
  document.body.appendChild(segmented)
  return { segmented, t1, t2, t3 }
}

/** 不等宽的 trigger 组：#222 的缺陷形态（interweave 设置 dialog 顶部即此形）。 */
function createUnequalSegmented(): {
  segmented: WebUiSegmented
  t1: WebUiSegmentedTrigger
  t2: WebUiSegmentedTrigger
} {
  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'narrow'

  const t1 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t1.value = 'narrow'
  t1.textContent = 'Narrow'
  t1.style.width = '72px'

  const t2 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t2.value = 'wide'
  t2.textContent = 'A much wider option'
  t2.style.width = '180px'

  segmented.append(t1, t2)
  document.body.appendChild(segmented)
  return { segmented, t1, t2 }
}

/**
 * indicator 的布局宽度：读**计算值**而不是 getBoundingClientRect——拖拽态的 indicator 带
 * `scale(1.5)`，rect 量到的是放大后的可视盒，与 trigger 的 rect 不同量纲。
 */
function indicatorWidth(segmented: WebUiSegmented): number {
  const indicator = queryA11y(segmented, '.wui-segmented-indicator')
  if (!(indicator instanceof HTMLElement)) throw new Error('未找到 indicator')
  return Number.parseFloat(getComputedStyle(indicator).width)
}

/**
 * 拖拽到某个 trigger 的中心：按下 + 一段 move，走组件自己的手势入口；指针保持按下。
 *
 * 按下点取 trigger 中心：indicator 中心跟手、宽度取「离 indicator 中心最近的 selectable option」，抓在边缘时
 * indicator 中心相对指针有一个偏移，宽度会按同样的偏移滞后——那是与松手吸附一致的判据，
 * 不是本用例要钉的东西。
 */
async function dragFromTo(
  segmented: WebUiSegmented,
  from: WebUiSegmentedTrigger,
  to: WebUiSegmentedTrigger
): Promise<number> {
  const inner = gestureSurface(segmented)
  const fromRect = from.getBoundingClientRect()
  const toRect = to.getBoundingClientRect()
  const y = fromRect.top + fromRect.height / 2

  inner.dispatchEvent(pointer('pointerdown', { clientX: fromRect.left + fromRect.width / 2, clientY: y }))
  await segmented.updateComplete
  // 越过 6px 意图死区即进入拖拽；宽度在拖拽态无过渡，落定后读到的是这一帧的值。
  window.dispatchEvent(pointer('pointermove', { clientX: toRect.left + toRect.width / 2, clientY: y }))
  await segmented.updateComplete
  return y
}

/** 在某个 trigger 上松手，落定到吸附目标。 */
async function releaseOn(segmented: WebUiSegmented, at: WebUiSegmentedTrigger, y: number): Promise<void> {
  const rect = at.getBoundingClientRect()
  window.dispatchEvent(pointer('pointerup', { clientX: rect.left + rect.width / 2, clientY: y }))
  await segmented.updateComplete
}

describe('WebUiSegmented 手势拖拽与吸附（浏览器）', () => {
  it('拖拽 indicator 超过中点松手：吸附至目标 option 并触发 input 与 change', async () => {
    const { segmented, t1, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const targetDistance = t2Rect.left - t1Rect.left

    const inner = gestureSurface(segmented)

    inner.dispatchEvent(pointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    window.dispatchEvent(
      pointer('pointermove', { clientX: t1Rect.left + 10 + targetDistance * 0.7, clientY: t1Rect.top + 10 })
    )
    await segmented.updateComplete

    window.dispatchEvent(
      pointer('pointerup', { clientX: t1Rect.left + 10 + targetDistance * 0.7, clientY: t1Rect.top + 10 })
    )
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
  })

  it('拖拽未过中点松手：回弹至原 option，不触发 input/change', async () => {
    const { segmented, t1, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const targetDistance = t2Rect.left - t1Rect.left

    const inner = gestureSurface(segmented)

    inner.dispatchEvent(
      timedPointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10, timeStamp: 0 })
    )
    await segmented.updateComplete

    // 移动距离越过 6px 阈值但未越过中点 (targetDistance * 0.3)。32ms 一段的慢拖：
    // 速度判定读事件 timeStamp，注入时间线才不会因调度间隙把同一段位移判成 flick。
    const dragDistance = Math.max(8, targetDistance * 0.3)
    const startX = t1Rect.left + 10
    for (let step = 1; step <= 10; step += 1) {
      window.dispatchEvent(
        timedPointer('pointermove', {
          clientX: startX + (dragDistance * step) / 10,
          clientY: t1Rect.top + 10,
          timeStamp: step * 32
        })
      )
    }
    await segmented.updateComplete

    window.dispatchEvent(
      timedPointer('pointerup', { clientX: startX + dragDistance, clientY: t1Rect.top + 10, timeStamp: 352 })
    )
    await segmented.updateComplete

    expect(segmented.value).toBe('daily')
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
  })

  it('跳过 disabled option：自动吸附至最近的可用 option', async () => {
    const { segmented, t1, t2 } = createSegmented({ disabledSecond: true })
    await segmented.updateComplete

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const inner = gestureSurface(segmented)

    inner.dispatchEvent(pointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    const t2Center = t2Rect.left + t2Rect.width / 2
    window.dispatchEvent(pointer('pointermove', { clientX: t2Center, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    window.dispatchEvent(pointer('pointerup', { clientX: t2Center, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    // 因为 t2 disabled，所以吸附到可用的 t1 或 t3；因为 t2 更接近谁就吸附到谁（t1 或 t3），但绝不会是 t2
    expect(segmented.value).not.toBe('weekly')
    expect(['daily', 'monthly']).toContain(segmented.value)
  })

  it('轻点（Tap）trigger 正常切换 option 且触发事件', async () => {
    const { segmented, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const inner = optionSurface(t2)

    const t2Rect = t2.getBoundingClientRect()
    inner.dispatchEvent(pointer('pointerdown', { clientX: t2Rect.left + 10, clientY: t2Rect.top + 10, composed: true }))
    inner.dispatchEvent(pointer('pointerup', { clientX: t2Rect.left + 10, clientY: t2Rect.top + 10, composed: true }))
    inner.click()
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
  })

  it('从非激活项起始的指针序列不切换 option，也不触发事件', async () => {
    const { segmented, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const inner = gestureSurface(segmented)
    const t2Rect = t2.getBoundingClientRect()

    // 按下未激活的 t2（drag 只能从当前激活项起始）
    inner.dispatchEvent(pointer('pointerdown', { clientX: t2Rect.left + 10, clientY: t2Rect.top + 10 }))
    await segmented.updateComplete

    window.dispatchEvent(pointer('pointermove', { clientX: t2Rect.left + 30, clientY: t2Rect.top + 10 }))
    await segmented.updateComplete

    window.dispatchEvent(pointer('pointerup', { clientX: t2Rect.left + 30, clientY: t2Rect.top + 10 }))
    await segmented.updateComplete

    expect(segmented.value, '非激活项起始的拖拽不应改变选中值').toBe('daily')
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
  })

  it('flick 抛掷快速手势切换至下一 option', async () => {
    const { segmented, t1 } = createSegmented()
    await segmented.updateComplete

    const t1Rect = t1.getBoundingClientRect()
    const inner = gestureSurface(segmented)

    inner.dispatchEvent(
      timedPointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10, timeStamp: 0 })
    )
    await segmented.updateComplete

    // move→up 注入 15px/30ms ≈ 500px/s，恒定高于 300px/s 提交阈值；真实墙钟间隙会漂移。
    window.dispatchEvent(
      timedPointer('pointermove', { clientX: t1Rect.left + 20, clientY: t1Rect.top + 10, timeStamp: 30 })
    )
    window.dispatchEvent(
      timedPointer('pointerup', { clientX: t1Rect.left + 35, clientY: t1Rect.top + 10, timeStamp: 60 })
    )
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
  })

  it('首帧把 indicator 直接定位到选中项，不产生 0→选中 的 left/width 过渡', async () => {
    const { segmented } = createSegmented()
    await segmented.updateComplete

    // 等首帧定位 rAF（_updateIndicator 在其中提交位置并开启 transition）执行完。
    // 若实现有 bug，transition 会在首帧从 CSS 回退的 0 滑到选中项（160ms），
    // 此刻仍在播放，getAnimations 应能捕获到 left/width。
    await afterRenderStep()
    await afterRenderStep()
    await segmented.updateComplete

    // indicator 无公开 role，只能按类名定位；本用例整体主题是动效，观察面用 Web Animations API
    // （非 CSS 取值），属动效契约的既定例外。
    const indicator = queryA11y(segmented, '.wui-segmented-indicator') as HTMLElement | null
    expect(indicator, 'indicator 应已渲染').not.toBeNull()

    expect(indicator!.getAnimations()).toHaveLength(0)
  })

  it('trigger 的 shadow 内容命中时，touchmove 由 composedPath 守护阻止，松手后解除', async () => {
    const { segmented, t1 } = createSegmented()
    await segmented.updateComplete
    await t1.updateComplete

    const t1Surface = optionSurface(t1)
    const t1Rect = t1.getBoundingClientRect()
    const x = t1Rect.left + 10
    const y = t1Rect.top + t1Rect.height / 2

    // pointerdown 从 trigger 的 shadow 内容派发（真实触摸落点），沿 composed 路径冒泡到手势元素。
    t1Surface.dispatchEvent(pointer('pointerdown', { clientX: x, clientY: y, composed: true }))
    await segmented.updateComplete

    // 非 composed touchmove（不跨 shadow 边界）在 trigger tree 内被 composedPath 挂载的守护阻止。
    const onInner = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    t1Surface.dispatchEvent(onInner)
    expect(onInner.defaultPrevented).toBe(true)

    // 确认拖拽后守护持续有效。
    window.dispatchEvent(pointer('pointermove', { clientX: x + 30, clientY: y }))
    await segmented.updateComplete
    const onInnerAfterCommit = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    t1Surface.dispatchEvent(onInnerAfterCommit)
    expect(onInnerAfterCommit.defaultPrevented).toBe(true)

    const onWindow = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    window.dispatchEvent(onWindow)
    expect(onWindow.defaultPrevented).toBe(false)

    window.dispatchEvent(pointer('pointerup', { clientX: x + 30, clientY: y }))
    await segmented.updateComplete
    const onInnerAfter = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    t1Surface.dispatchEvent(onInnerAfter)
    expect(onInnerAfter.defaultPrevented).toBe(false)
  })

  /*
   * 栈序契约：indicator 滑到哪个 option 上方，那个 option 的文字就必须仍在最上层；indicator 一旦盖住文字，
   * 该 option 的命中就会从自身 trigger 变成 segmented，用户点在选中项上却选不中它。
   * 命中测试是唯一能观测栈序的运行时证据——indicator 的底色、投影、透明度都看不出来。
   */
  it('静止/按住/拖拽/松开下每个 option 的文字都不被 indicator 遮挡', async () => {
    const { segmented, t1, t3 } = createSegmented()
    await segmented.updateComplete

    const expectTextVisible = (state: string) => {
      const hits = [t1, t3].map(trigger => {
        const { x, y } = triggerCenter(trigger)
        return { label: trigger.textContent ?? '', hit: document.elementFromPoint(x, y) }
      })
      expect(
        hits.every(({ hit }, index) => belongsToTrigger(hit, [t1, t3][index]!)),
        `${state} 下文字被 indicator 遮挡：${hits.map(({ label, hit }) => `「${label}」→ ${describeHit(hit)}`).join(' | ')}`
      ).toBe(true)
    }

    expectTextVisible('静止态')

    const inner = gestureSurface(segmented)
    const t1Rect = t1.getBoundingClientRect()
    inner.dispatchEvent(pointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete
    expectTextVisible('按住态')

    window.dispatchEvent(pointer('pointermove', { clientX: t1Rect.left + 30, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete
    expectTextVisible('拖拽态')

    window.dispatchEvent(pointer('pointerup', { clientX: t1Rect.left + 30, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete
    expectTextVisible('松开后')
  })

  /*
   * #222：trigger 宽度不等时，拖拽中的 indicator 宽度必须跟随当前 hover 的 trigger。
   *
   * 缺陷形态：拖拽全程把 `--indicator-width` 钉在按下那一项的宽度上，于是 indicator 滑过更宽的
   * option 时仍保持窄宽，与 option 对不齐——option 不等宽正是这个控件的常态（interweave 设置
   * dialog 顶部即此形）。
   *
   * 判据取**拖拽尚未松手时**的 indicator 宽度：松手后 `_updateIndicator` 本来就会把宽度写成
   * 新选中项的宽度，只在松手后断言的话，一条什么都不改的实现同样能过。
   * 双向：滑到宽项变宽、滑回窄项收窄——只钉一个方向的话，「宽度恒等于最宽项」也能过。
   */
  it('不等宽 trigger：拖拽中 indicator 宽度跟随 hover 的 trigger', async () => {
    const { segmented, t1, t2 } = createUnequalSegmented()
    await segmented.updateComplete
    await pollUntil(() => indicatorWidth(segmented) > 0, 'indicator 未完成定位')

    const narrowWidth = t1.getBoundingClientRect().width
    const wideWidth = t2.getBoundingClientRect().width
    // 可证伪：前提是两项宽度真的不等，否则下面两条断言恒真。
    expect(wideWidth - narrowWidth, '前提：两个 trigger 宽度不等').toBeGreaterThan(20)
    expect(indicatorWidth(segmented), '静止态 indicator 对齐选中项的宽度').toBeCloseTo(narrowWidth, 0)

    const y = await dragFromTo(segmented, t1, t2)
    expect(indicatorWidth(segmented), '滑到宽项上时 indicator 应取该 trigger 的宽度').toBeCloseTo(wideWidth, 0)

    // 松手落定后反向拖回：宽度跟着换回去，两个方向都钉住。
    await releaseOn(segmented, t2, y)
    expect(segmented.value, '松手应吸附到宽项').toBe('wide')

    await dragFromTo(segmented, t2, t1)
    expect(indicatorWidth(segmented), '滑回窄项上时 indicator 应取该 trigger 的宽度').toBeCloseTo(narrowWidth, 0)
  })

  /*
   * 同一缺陷的下游：宽度跟随后，indicator 仍要留在 track 内。等宽触发下这条恒真（宽度不变），
   * 不等宽时若越界，说明跟随的那一项把 indicator 推出了 track。
   */
  it('不等宽 trigger：拖拽中 indicator 不越出 track', async () => {
    const { segmented, t1, t2 } = createUnequalSegmented()
    await segmented.updateComplete
    await pollUntil(() => indicatorWidth(segmented) > 0, 'indicator 未完成定位')

    const track = gestureSurface(segmented).getBoundingClientRect()
    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const y = t1Rect.top + t1Rect.height / 2

    const inner = gestureSurface(segmented)
    inner.dispatchEvent(pointer('pointerdown', { clientX: t1Rect.left + 10, clientY: y }))
    await segmented.updateComplete

    // 一路拖到 track 最右端之外：indicator 被钳在最后一项上，宽度也取最后一项的。
    window.dispatchEvent(pointer('pointermove', { clientX: t2Rect.right + 400, clientY: y }))
    await segmented.updateComplete

    const indicator = queryA11y(segmented, '.wui-segmented-indicator') as HTMLElement
    const box = indicator.getBoundingClientRect()
    // scale(1.5) 绕中心放大，可视盒比布局盒宽；按放大系数换算回布局盒再比 track。
    const laidOut = {
      left: box.left + (box.width - box.width / 1.5) / 2,
      right: box.right - (box.width - box.width / 1.5) / 2
    }
    expect(laidOut.left, 'indicator 左沿越出 track').toBeGreaterThanOrEqual(track.left - 0.5)
    expect(laidOut.right, 'indicator 右沿越出 track').toBeLessThanOrEqual(track.right + 0.5)
  })
})
