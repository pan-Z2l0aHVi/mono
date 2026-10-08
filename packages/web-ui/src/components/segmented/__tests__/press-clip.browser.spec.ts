import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/segmented-trigger'
import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import { pollUntil, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'

/*
 * segmented 按压越界守卫（浏览器）。
 *
 * 缺陷形态：按住（或拖拽）时指示器按 `scale(1.5)` 放大，横向越出轨道 `0.25×胶囊宽 − 4`
 * （52 宽的胶囊 → 9px）。**任何** overflow 非 visible 的祖先都在自己的 padding box 上裁剪，
 * 所以契约是「胶囊的可视盒落在沿 flat tree 向上的每一个裁剪祖先的 padding box 内」。
 * interweave 的设置 dialog 曾在 `.desc`（padding 6px）里再套一层**侧向 padding 为 0** 的
 * 滚动宿主，于是组件级守卫全绿、应用里那 9px 照样被切平（t-0081 实测，t-0084 复测 9.9px）。
 * 只量 `.desc` 自己那一层补不上这个缺口——必须沿祖先链逐层走。
 *
 * 这里把判据钉成**可证伪**的两档：余量足够（24px，与 dialog chrome 同）的容器必须通过，
 * 零余量容器必须触发**同一条**断言。只留前者的话，一个恒真断言（读错盒子、祖先链压根
 * 没收集到、或几何根本没量到放大态）同样会绿。
 *
 * 静止态的轨道玻璃投影（`.wui-glass` 的 `0 8px 32px`，横向最多外扩半个模糊半径）在零余量
 * 容器里同样被裁——这是 t-0081 记下的「不用按住也看得见」的那一处，一并钉住。
 *
 * 必须 browser mode：裁剪发生在布局与合成层，jsdom 没有盒子。
 */

const EPS = 0.5

afterEach(() => {
  document.body.replaceChildren()
})

interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

function rectOf(element: Element): Rect {
  const rect = element.getBoundingClientRect()
  return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
}

function describeElement(element: Element): string {
  const className = typeof element.className === 'string' ? element.className.trim() : ''
  return element.tagName.toLowerCase() + (className ? `.${className.split(/\s+/).join('.')}` : '')
}

/**
 * 沿 flat tree（跨 shadow 边界）向上收集每一个 overflow-x / overflow-y 计算值不为 visible
 * 的祖先。
 *
 * 必须读**计算值**：`scrollTop > 0` 与 `scrollHeight > clientHeight` 都区分不出
 * `overflow: hidden`，而那正是应用里真正在裁的那一层。
 */
function clippingAncestors(element: Element): Element[] {
  const ancestors: Element[] = []
  let node: Element | null = element
  while (node) {
    let parent: Element | null = node.parentElement
    if (!parent) {
      const root = node.getRootNode()
      if (!(root instanceof ShadowRoot)) break
      parent = root.host
    }
    const style = getComputedStyle(parent)
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') ancestors.push(parent)
    node = parent
  }
  return ancestors
}

/** 可视盒越出某个祖先 padding box 的量（正数 = 越界）。 */
function overshootOf(ancestor: Element, box: Rect): Rect {
  // 本用例的容器没有 border，rect 即 padding box。
  const padding = ancestor.getBoundingClientRect()
  return {
    left: padding.left - box.left,
    right: box.right - padding.right,
    top: padding.top - box.top,
    bottom: box.bottom - padding.bottom
  }
}

function maxOvershoot(rect: Rect): number {
  return Math.max(rect.left, rect.right, rect.top, rect.bottom)
}

/**
 * 守卫本体：可视盒必须落在沿 flat tree 向上的每一个裁剪祖先的 padding box 内。
 * 返回越界祖先的说明；空数组即通过。
 */
function clipOffenders(element: Element, box: Rect): string[] {
  return clippingAncestors(element)
    .filter(ancestor => maxOvershoot(overshootOf(ancestor, box)) > EPS)
    .map(ancestor => `${describeElement(ancestor)} ${JSON.stringify(overshootOf(ancestor, box))}`)
}

/**
 * 轨道玻璃投影的横向外扩量。`0 8px 32px` 这类阴影在自身盒外铺半个模糊半径，取计算值里
 * 最大的长度除以 2 作上界；一旦阴影配方变大，要求消费方的余量跟着变大，不会静默失效。
 */
function shadowReachX(element: Element): number {
  const lengths = [...getComputedStyle(element).boxShadow.matchAll(/(-?[\d.]+)px/g)].map(match =>
    Math.abs(Number(match[1]))
  )
  return lengths.length ? Math.max(...lengths) / 2 : 0
}

function inflateX(rect: Rect, by: number): Rect {
  return { ...rect, left: rect.left - by, right: rect.right + by }
}

interface Harness {
  container: HTMLElement
  segmented: WebUiSegmented
  trigger: WebUiSegmentedTrigger
  indicator: HTMLElement
  track: HTMLElement
}

async function mountInContainer(padding: number): Promise<Harness> {
  const container = document.createElement('div')
  container.dataset.testid = 'clip-box'
  container.style.overflowY = 'auto'
  container.style.padding = `${padding}px`

  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'general'
  const trigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  trigger.value = 'general'
  trigger.textContent = '通用'
  segmented.append(trigger)
  container.append(segmented)
  document.body.append(container)

  await waitForUpdate(segmented)
  const indicator = segmented.shadowRoot?.querySelector('.wui-segmented-indicator') as HTMLElement | null
  const track = queryA11y(segmented, '[role="listbox"]')
  if (!indicator || !(track instanceof HTMLElement)) throw new Error('未找到 segmented 的轨道或指示器')
  await pollUntil(() => indicator.getBoundingClientRect().width > 0, '指示器未完成定位')
  return { container, segmented, trigger, indicator, track }
}

/** 按住最左那颗：走组件自己的 pointerdown 路径，与真实按压同一入口。 */
async function pressFirst({ segmented, trigger, indicator }: Harness): Promise<number> {
  const surface = queryA11y(trigger, '[role="option"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
  const rect = surface.getBoundingClientRect()
  const restWidth = indicator.getBoundingClientRect().width
  const track = queryA11y(segmented, '[role="listbox"]')
  if (!(track instanceof HTMLElement)) throw new Error('未找到 segmented 的轨道面')
  track.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      isPrimary: true,
      pointerId: 1,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    })
  )
  await waitForUpdate(segmented)
  // 放大是过渡而非瞬变：等它**落定**到 scale(1.5)（指示器可视盒同步放大 1.5 倍）再量。
  // 判据卡在 1.4999 倍而不是一个宽松区间，是为了让「按住态」= 过渡终值这件事对断言可见：
  // 采样到过渡中途，下面的越界量会随采样时刻漂移、与几何期望值差出一帧的量。
  await pollUntil(() => indicator.getBoundingClientRect().width >= restWidth * 1.4999, '指示器未进入按住的放大态')
  return restWidth
}

describe('WebUiSegmented 按压越界守卫（浏览器）', () => {
  it('零余量滚动容器：按住最左的胶囊越出容器 padding box（同一条断言在此真红）', async () => {
    const harness = await mountInContainer(0)
    const restWidth = await pressFirst(harness)

    const pressed = rectOf(harness.indicator)
    // 与字形无关的精确期望：胶囊在轨道里横向内缩一个轨道 padding，`scale(1.5)` 绕中心放大后
    // 左沿相对静止位外移「宽增的一半」= `0.25 × 胶囊宽`，越出零 padding 容器的量因此是
    // `0.25 × 胶囊宽 − 轨道内缩`。两个因子都取实测/计算值：字体度量让胶囊变宽变窄时，
    // 等号两边同步移动，所以这条在任何字体下都成立，不需要按平台调阈值。
    const trackInset = Number.parseFloat(getComputedStyle(harness.track).paddingLeft)
    expect(
      overshootOf(harness.container, pressed).left,
      '胶囊左沿越出零 padding 容器的量应为 0.25×胶囊宽 − 轨道内缩'
    ).toBeCloseTo(0.25 * restWidth - trackInset, 1)

    // 守卫本体在此为红——与下一档用的是同一条断言（clipOffenders 非空 = 断言失败）。
    expect(clipOffenders(harness.indicator, pressed), '守卫应报出越界祖先').not.toEqual([])

    // 静止态：轨道玻璃投影同样被裁（不必按住）。
    expect(shadowReachX(harness.track), '轨道应有玻璃投影').toBeGreaterThan(0)
    const trackBox = inflateX(rectOf(harness.track), shadowReachX(harness.track))
    expect(clipOffenders(harness.track, trackBox), '静止态轨道投影应被裁').not.toEqual([])
  })

  it('余量足够的容器：同一断言通过（按住胶囊与静止态轨道投影都在盒内）', async () => {
    const harness = await mountInContainer(24)
    await pressFirst(harness)

    expect(clipOffenders(harness.indicator, rectOf(harness.indicator))).toEqual([])
    expect(clipOffenders(harness.track, inflateX(rectOf(harness.track), shadowReachX(harness.track)))).toEqual([])
  })
})
