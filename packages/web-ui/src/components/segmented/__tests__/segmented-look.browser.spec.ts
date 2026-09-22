import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/button'
import '@/components/segmented-trigger'
import '@/components/theme'
import type { WebUiButton } from '@/components/button'
import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import type { WebUiTheme } from '@/components/theme'
import { pollUntil, queryA11y, waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'

afterEach(() => document.body.replaceChildren())

/** Chrome 对 transparent 的计算值表示；thumb 按下/拖拽态必须全程是这个值。 */
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

type Look = {
  theme: WebUiTheme
  segmented: WebUiSegmented
  triggers: WebUiSegmentedTrigger[]
  track: HTMLElement
  indicator: HTMLElement
  activeTrigger: WebUiSegmentedTrigger
}

/**
 * 视觉规范夹具：segmented 挂在 web-ui-theme 作用域内，token 才按主题解析。
 *
 * 观察面是 shadow 内部元素的计算样式，属「视觉/动效契约」对 §5「禁止断言 shadow 内部
 * 结构与 CSS class」的例外：轨道可按公开语义 role="listbox" 定位，指示器没有公开 role，
 * 只能按内部类名取（segmented-gesture.browser.spec.ts 对同一元素同法）。
 */
async function mount(appearance: 'light' | 'dark', motion?: 'reduced'): Promise<Look> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.setAttribute('appearance', appearance)
  if (motion) theme.setAttribute('motion', motion)

  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'a'
  const triggers = (['a', 'b', 'c'] as const).map(value => {
    const trigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
    trigger.value = value
    trigger.textContent = value
    return trigger
  })
  segmented.append(...triggers)
  theme.append(segmented)
  document.body.append(theme)

  // 首帧渲染后才取 shadow 内部元素：Lit 的 shadow root 在 update 前是空的。
  await waitForUpdate(segmented)
  const shadowRoot = segmented.shadowRoot
  if (!shadowRoot) throw new Error('segmented 未渲染 shadow root')
  const indicator = shadowRoot.querySelector('.wui-segmented-indicator') as HTMLElement
  // 指示器定位走 afterSync 的 rAF，首帧之后才有 left/width；栈序断言依赖它真的盖在选项上。
  await pollUntil(() => indicator.getBoundingClientRect().width > 0, '指示器未完成定位')
  return {
    theme,
    segmented,
    triggers,
    track: shadowRoot.querySelector('[role="listbox"]') as HTMLElement,
    indicator,
    activeTrigger: triggers[0]
  }
}

/** 把 theme token 解析成计算值：探针挂在 theme 作用域内，与组件走同一条继承链。 */
function resolveToken(theme: WebUiTheme, token: string): string {
  const probe = document.createElement('div')
  probe.style.backgroundColor = `var(${token})`
  theme.append(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
}

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    isPrimary: true,
    pointerId: 1,
    clientX: x,
    clientY: y
  })
}

/** 已选项的可交互面：合成指针事件的派发目标。 */
function activeSurface(trigger: WebUiSegmentedTrigger): HTMLElement {
  const surface = queryA11y(trigger, '[role="option"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
  return surface
}

/** 已选项可交互面的中心点：合成指针事件的落点。 */
function activeTriggerCenter(trigger: WebUiSegmentedTrigger): { x: number; y: number } {
  const rect = activeSurface(trigger).getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/**
 * 按住已选项并提交 is-pressed，返回松手收尾函数。
 * 采样起点在 Lit 提交 is-pressed 之后：要证的是「按下态持续期间的表现」，
 * 而不是 class 尚未落地的那一两帧。
 */
async function holdPressed(look: Look): Promise<() => Promise<void>> {
  const { segmented, activeTrigger } = look
  const { x, y } = activeTriggerCenter(activeTrigger)
  const surface = activeSurface(activeTrigger)

  surface.dispatchEvent(pointer('pointerdown', x, y))
  await waitForUpdate(segmented)

  return async () => {
    window.dispatchEvent(pointer('pointerup', x, y))
    await waitForUpdate(segmented)
  }
}

/** 按住已选项，逐帧采样 thumb 底色，松手收尾。 */
async function sampleWhilePressed(look: Look, frames: number): Promise<string[]> {
  const { indicator } = look
  const release = await holdPressed(look)

  const samples: string[] = []
  for (let frame = 0; frame < frames; frame += 1) {
    await waitForFrame()
    samples.push(getComputedStyle(indicator).backgroundColor)
  }

  await release()
  return samples
}

/** 按住已选项并拖拽越过 6px 阈值，逐帧采样 thumb 底色，松手收尾。 */
async function sampleWhileDragging(look: Look, frames: number): Promise<string[]> {
  const { segmented, activeTrigger, indicator } = look
  const release = await holdPressed(look)
  const { x, y } = activeTriggerCenter(activeTrigger)
  window.dispatchEvent(pointer('pointermove', x + 20, y))
  await waitForUpdate(segmented)

  const samples: string[] = []
  for (let frame = 0; frame < frames; frame += 1) {
    await waitForFrame()
    samples.push(getComputedStyle(indicator).backgroundColor)
  }

  await release()
  return samples
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

describe('WebUiSegmented 视觉规范（浏览器）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    describe(`${appearance} 主题`, () => {
      it('轨道底色取 .wui-glass 默认玻璃底，与 glass button 同值', async () => {
        const { theme, track } = await mount(appearance)

        const glassButton = document.createElement('web-ui-button') as WebUiButton
        glassButton.setAttribute('variant', 'glass')
        theme.append(glassButton)
        await waitForUpdate(glassButton)
        const buttonSurface = glassButton.shadowRoot?.querySelector('button')
        if (!(buttonSurface instanceof HTMLElement)) throw new Error('glass button 未渲染按钮面')

        const glassToken = resolveToken(theme, '--wui-color-surface-glass')
        expect(glassToken, 'glass token 应解析为可见颜色').not.toBe(TRANSPARENT)

        const trackBg = getComputedStyle(track).backgroundColor
        expect(trackBg).toBe(glassToken)
        expect(trackBg).toBe(getComputedStyle(buttonSurface).backgroundColor)
      })

      it('静止态 thumb 是纯灰底：玻璃输出全部关闭', async () => {
        const { theme, indicator } = await mount(appearance)

        const segmentedToken = resolveToken(theme, '--wui-color-surface-segmented')
        expect(segmentedToken, 'segmented token 应解析为可见颜色').not.toBe(TRANSPARENT)

        const style = getComputedStyle(indicator)
        expect(style.backgroundColor).toBe(segmentedToken)
        expect(style.backdropFilter, '静止态不得残留 backdrop blur').toBe('none')
        expect(style.boxShadow, '静止态不得残留玻璃投影与 inset 高光').toBe('none')
        expect(getComputedStyle(indicator, '::before').opacity, '静止态不得绘制玻璃描边环').toBe('0')
      })

      it('文字色取 --wui-color-text-secondary，未随 thumb 改动漂移', async () => {
        const { theme, activeTrigger } = await mount(appearance)

        const surface = queryA11y(activeTrigger, '[role="option"]')
        if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')

        const secondaryToken = resolveToken(theme, '--wui-color-text-secondary')
        expect(getComputedStyle(surface).color).toBe(secondaryToken)
      })

      it('按住已选项：thumb 全程全透明，无灰色 tint 中间帧', async () => {
        const look = await mount(appearance)

        const samples = await sampleWhilePressed(look, 12)
        expect(samples).toHaveLength(12)
        expect(
          samples.every(sample => sample === TRANSPARENT),
          `采样到非全透明帧：${samples.join(' | ')}`
        ).toBe(true)
      })

      it('拖拽已选项：thumb 全程全透明，无灰色 tint 中间帧', async () => {
        const look = await mount(appearance)

        const samples = await sampleWhileDragging(look, 12)
        expect(samples).toHaveLength(12)
        expect(
          samples.every(sample => sample === TRANSPARENT),
          `采样到非全透明帧：${samples.join(' | ')}`
        ).toBe(true)
      })
    })
  }

  it('按下态保留 backdrop blur 与玻璃描边环/高光', async () => {
    const look = await mount('light')

    const release = await holdPressed(look)
    await waitForFrame()
    await waitForFrame()

    const style = getComputedStyle(look.indicator)
    expect(style.backdropFilter).toContain('blur(4px)')
    expect(style.boxShadow).not.toBe('none')
    expect(style.boxShadow).toContain('inset')

    await release()
  })

  it('按压态玻璃描边环淡入到完全显示，切换不生硬', async () => {
    const look = await mount('light')
    const release = await holdPressed(look)

    const samples: number[] = []
    for (let frame = 0; frame < 6; frame += 1) {
      await waitForFrame()
      samples.push(Number(getComputedStyle(look.indicator, '::before').opacity))
    }
    await release()

    expect(samples[samples.length - 1], '按压态描边环应淡入到完全显示').toBe(1)
    expect(samples[0], '描边环应随过渡淡入，而不是整层跳出').toBeLessThan(1)
    expect(
      samples.every((value, index) => index === 0 || value >= samples[index - 1]),
      `描边环透明度出现回退：${samples.join(' | ')}`
    ).toBe(true)
  })

  it('栈序契约：rest / 按住 / 拖拽 / 松开下文字都不被 thumb 遮挡', async () => {
    const look = await mount('light')

    // thumb 滑到哪个选项上方，那个选项的文字就必须仍在最上层；thumb 一旦盖住文字，
    // 该选项的命中就会从自身 trigger 变成 segmented。命中测试是唯一能观测栈序的运行时证据。
    const expectTextVisible = (state: string) => {
      const hits = look.triggers.map(trigger => {
        const { x, y } = activeTriggerCenter(trigger)
        return { label: trigger.textContent ?? '', hit: document.elementFromPoint(x, y) }
      })
      expect(
        hits.every(({ hit }, index) => belongsToTrigger(hit, look.triggers[index])),
        `${state} 下文字被 thumb 遮挡：${hits.map(({ label, hit }) => `「${label}」→ ${describeHit(hit)}`).join(' | ')}`
      ).toBe(true)
    }

    expectTextVisible('静止态')

    const release = await holdPressed(look)
    expectTextVisible('按住态')

    const { x, y } = activeTriggerCenter(look.activeTrigger)
    window.dispatchEvent(pointer('pointermove', x + 20, y))
    await waitForUpdate(look.segmented)
    expectTextVisible('拖拽态')

    await release()
    expectTextVisible('松开后')
  })

  it('栈序契约：thumb 不沉到 track 内容之下', async () => {
    const look = await mount('light')

    // 命中测试观测不到这个方向：track 的背景永远画在子节点之前，::before 又是
    // pointer-events: none，唯一能把 thumb 压掉的写法是负 z-index，故直接锁定非负。
    const zIndex = Number(getComputedStyle(look.indicator).zIndex)
    expect(Number.isFinite(zIndex) ? zIndex : 0, 'thumb 不得用负 z-index 沉到 track 内容之下').toBeGreaterThanOrEqual(0)

    const slot = look.segmented.shadowRoot?.querySelector('slot')
    expect(slot, 'segmented 应渲染 slot 承载 triggers').toBeTruthy()
    expect(
      look.indicator.compareDocumentPosition(slot as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
      'thumb 必须先于 slotted triggers 渲染，trigger 的 z-index: 1 才压得住 thumb'
    ).toBeTruthy()
  })

  it('松开后 thumb 淡回静止灰底', async () => {
    const look = await mount('light')

    const restingBg = resolveToken(look.theme, '--wui-color-surface-segmented')
    await sampleWhilePressed(look, 2)

    // 淡回由静止态规则的 background-color 过渡承担（按下态刻意不含该属性）
    await pollUntil(() => getComputedStyle(look.indicator).backgroundColor === restingBg, '松开后 thumb 未回到静止灰底')
    expect(getComputedStyle(look.indicator).backgroundColor).toBe(restingBg)
  })

  it('reduced motion 下按住即全透明、松开即回灰', async () => {
    const look = await mount('light', 'reduced')

    const restingBg = resolveToken(look.theme, '--wui-color-surface-segmented')
    const samples = await sampleWhilePressed(look, 3)
    expect(samples.every(sample => sample === TRANSPARENT)).toBe(true)

    await pollUntil(
      () => getComputedStyle(look.indicator).backgroundColor === restingBg,
      'reduced 下松开后 thumb 未回到静止灰底'
    )
    expect(getComputedStyle(look.indicator).backgroundColor).toBe(restingBg)
  })
})
