import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser'

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

/** Chrome 对 transparent 的计算值表示；thumb 按压态底色与 trigger 层无灰底断言复用。 */
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
async function mount(appearance: 'light' | 'dark', motion?: 'reduced', variant?: string): Promise<Look> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.setAttribute('appearance', appearance)
  if (motion) theme.setAttribute('motion', motion)

  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'a'
  if (variant !== undefined) segmented.variant = variant
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

/** inset 轨道底色的期望值：#169 追加验收要求浅色与 page 同色（凹感由常驻环与投影承担），
    深色保持 surface-raised 的「比页面高一档」elevation。 */
function expectedInsetTrack(theme: WebUiTheme, appearance: 'light' | 'dark'): string {
  return resolveToken(theme, appearance === 'light' ? '--wui-color-page' : '--wui-color-surface-raised')
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

/** trigger 可交互面的文字计算色。 */
function triggerTextColor(trigger: WebUiSegmentedTrigger): string {
  return getComputedStyle(activeSurface(trigger)).color
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

type GestureSample = {
  stage: string
  thumb: string
  thumbBackdrop: string
  triggers: string[]
}

/** 拆出 box-shadow 计算值里的 inset 层（颜色 token 开头），用于观测高光层。 */
function insetLayers(boxShadow: string): string[] {
  return boxShadow
    .split(/,(?![^(]*\))/)
    .filter(layer => layer.includes('inset'))
    .map(layer => layer.trim())
}

/**
 * vitest 4.1.11 发布形态的 CDPSession 类型是空接口（send 等运行时成员未声明），
 * 按 CDP 协议补上本测试用到的最大集。
 */
interface CdpSession {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>
}

/** 同一帧采样双侧底色：thumb（指示器）与每个 trigger 的可交互面。 */
function sampleBothLayers(look: Look): Omit<GestureSample, 'stage'> {
  return {
    thumb: getComputedStyle(look.indicator).backgroundColor,
    thumbBackdrop: getComputedStyle(look.indicator).backdropFilter,
    triggers: look.triggers.map(trigger => {
      const surface = queryA11y(trigger, '[role="option"]')
      if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
      return getComputedStyle(surface).backgroundColor
    })
  }
}

/** 测试代码运行在 tester iframe 内；CDP 的 Input 事件用顶层页面坐标，需叠加 iframe 偏移。 */
async function toPagePoint(x: number, y: number): Promise<{ x: number; y: number }> {
  const frame = window.frameElement
  const offset = frame ? frame.getBoundingClientRect() : { left: 0, top: 0 }
  return { x: offset.left + x, y: offset.top + y }
}

/**
 * 真实鼠标手势：hover 已选项 → 按下 → 分步拖拽越过 6px 阈值 → 松手，逐阶段采样双侧底色。
 *
 * 合成 PointerEvent 不触发 :active/:hover（Chrome 只对真实输入设置这两个原生状态），而
 * trigger 层灰底正挂在 :hover/:active 上——#150「灰底在 thumb 层」要求它彻底消失，只能
 * 用 CDP Input.dispatchMouseEvent 的真实输入锁定，合成事件的用例覆盖不到这条路径。
 */
async function sampleRealPressDrag(look: Look, pressedFrames: number): Promise<GestureSample[]> {
  const session = cdp() as unknown as CdpSession
  const { segmented } = look
  const { x, y } = activeTriggerCenter(look.activeTrigger)
  const samples: GestureSample[] = []

  const settle = async (stage: string) => {
    await waitForUpdate(segmented)
    await waitForFrame()
    samples.push({ stage, ...sampleBothLayers(look) })
  }

  const press = await toPagePoint(x, y)
  await session.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: press.x, y: press.y })
  await settle('hover')

  await session.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: press.x,
    y: press.y,
    button: 'left',
    buttons: 1,
    clickCount: 1
  })
  for (let frame = 0; frame < pressedFrames; frame += 1) await settle('pressed')

  // 分步移动：模拟真实拖拽轨迹，并保证 pointer 逐段越过意图死区进入拖拽态
  for (let step = 1; step <= 4; step += 1) {
    const point = await toPagePoint(x + step * 10, y)
    await session.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: point.x,
      y: point.y,
      button: 'left',
      buttons: 1
    })
    if (step >= 2) await settle('dragging')
  }

  const release = await toPagePoint(x + 40, y)
  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: release.x,
    y: release.y,
    button: 'left',
    buttons: 0,
    clickCount: 1
  })
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

/** WCAG 对比度：两个 rgb() 计算值的相对亮度比。文字色断言复用（≥3:1 非文本/大字底线）。 */
function contrastRatio(a: string, b: string): number {
  const luminance = (color: string) => {
    const parts = color.match(/[\d.]+/g)
    if (!parts) throw new Error(`无法解析颜色：${color}`)
    const [r, g, blue] = parts.slice(0, 3).map(Number)
    const channel = (v: number) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(blue)
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('WebUiSegmented 视觉规范（浏览器）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    describe(`${appearance} 主题`, () => {
      it('轨道是不透明实体面：浅色与 page 同色、深色保持 surface-raised，无 backdrop blur', async () => {
        const { theme, track } = await mount(appearance)

        const expected = expectedInsetTrack(theme, appearance)
        expect(expected, 'inset 轨道底色 token 应解析为可见颜色').not.toBe(TRANSPARENT)

        const style = getComputedStyle(track)
        expect(style.backgroundColor, 'inset 轨道底色偏离契约').toBe(expected)
        expect(style.backdropFilter, '实体轨道不得残留 backdrop blur').toBe('none')
      })

      it('轨道的玻璃描边全状态恒定：静止/按压/拖拽同值', async () => {
        const look = await mount(appearance)

        const sample = () => {
          const style = getComputedStyle(look.track)
          return {
            bg: style.backgroundColor,
            backdrop: style.backdropFilter,
            insets: insetLayers(style.boxShadow),
            ring: getComputedStyle(look.track, '::before').opacity
          }
        }

        // 实体化之后采样面均匀，按压态不再需要压制轨道的边缘装饰：三种状态下
        // 底色、blur、inset 高光与描边环必须逐项同值（环常驻 1、高光常驻不透明）。
        const rest = sample()
        const release = await holdPressed(look)
        const pressed = sample()
        const { x, y } = activeTriggerCenter(look.activeTrigger)
        window.dispatchEvent(pointer('pointermove', x + 20, y))
        await waitForUpdate(look.segmented)
        const dragging = sample()
        await release()

        for (const [name, state] of [
          ['按压态', pressed],
          ['拖拽态', dragging]
        ] as const) {
          expect(state.bg, `${name}轨道底色漂移`).toBe(rest.bg)
          expect(state.backdrop, `${name}轨道 backdrop 漂移`).toBe('none')
          expect(state.insets, `${name}轨道 inset 高光被压制`).toStrictEqual(rest.insets)
          expect(state.ring, `${name}轨道描边环透明度漂移`).toBe(rest.ring)
        }
        expect(rest.insets.length, '轨道应保留三条 inset 高光').toBe(3)
        expect(
          rest.insets.every(layer => !layer.startsWith(TRANSPARENT)),
          '静止态轨道 inset 高光不得透明'
        ).toBe(true)
        expect(rest.ring, '轨道描边环应常驻完全显示').toBe('1')
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

      it('文字色：选中与未选中同为 text-secondary，与轨道底对比度 ≥ 3:1', async () => {
        const { theme, track, activeTrigger, triggers } = await mount(appearance)

        const secondaryToken = resolveToken(theme, '--wui-color-text-secondary')

        expect(triggerTextColor(activeTrigger), '选中项文字应保持 text-secondary').toBe(secondaryToken)
        for (const trigger of triggers.slice(1)) {
          expect(triggerTextColor(trigger), '未选中项文字应保持 text-secondary').toBe(secondaryToken)
        }

        // 文字色可辨度底线（WCAG 非文本/大字 3:1）；实测值随报告给出。
        const ratio = contrastRatio(triggerTextColor(activeTrigger), getComputedStyle(track).backgroundColor)
        expect(ratio, `文字与轨道底对比度不足：${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
      })

      it('按住已选项：thumb 全程全透明，无灰色中间帧', async () => {
        const look = await mount(appearance)

        const samples = await sampleWhilePressed(look, 12)
        expect(samples).toHaveLength(12)
        expect(
          samples.every(sample => sample === TRANSPARENT),
          `采样到非透明帧：${samples.join(' | ')}`
        ).toBe(true)
      })

      it('拖拽已选项：thumb 全程全透明，无灰色中间帧', async () => {
        const look = await mount(appearance)

        const samples = await sampleWhileDragging(look, 12)
        expect(samples).toHaveLength(12)
        expect(
          samples.every(sample => sample === TRANSPARENT),
          `采样到非透明帧：${samples.join(' | ')}`
        ).toBe(true)
      })

      it('按住已选项：选中项文字保持 text-secondary，不着 accent', async () => {
        const look = await mount(appearance)
        const { theme, activeTrigger } = look
        const secondaryToken = resolveToken(theme, '--wui-color-text-secondary')

        const release = await holdPressed(look)

        const samples: string[] = []
        for (let frame = 0; frame < 6; frame += 1) {
          await waitForFrame()
          samples.push(triggerTextColor(activeTrigger))
        }
        await release()

        expect(
          samples.every(color => color === secondaryToken),
          `按住态文字色偏离 text-secondary：${samples.join(' | ')}`
        ).toBe(true)
      })

      it('拖拽中：所有标签文字保持 text-secondary，不随指示器覆盖着色', async () => {
        const look = await mount(appearance)
        const { theme, segmented, triggers } = look
        const secondaryToken = resolveToken(theme, '--wui-color-text-secondary')
        const nextTrigger = triggers[1]

        const release = await holdPressed(look)

        // 指针移到下一项中心：指示器跟过去，被它盖住的正是下一项
        const target = activeTriggerCenter(nextTrigger)
        window.dispatchEvent(pointer('pointermove', target.x, target.y))
        await waitForUpdate(segmented)

        // 逐帧采样全部标签：被指示器盖住的项同样不得着色，accent 逻辑已整体移除
        const samples: string[][] = []
        for (let frame = 0; frame < 6; frame += 1) {
          await waitForFrame()
          samples.push(look.triggers.map(triggerTextColor))
        }

        await release()

        expect(
          samples.every(colors => colors.every(color => color === secondaryToken)),
          `拖拽态出现非 text-secondary 文字色：${samples.map(colors => colors.join(' | ')).join(' / ')}`
        ).toBe(true)
      })

      it('松手后：新选中项文字仍为 text-secondary', async () => {
        const look = await mount(appearance)
        const { theme, segmented, activeTrigger, triggers } = look
        const secondaryToken = resolveToken(theme, '--wui-color-text-secondary')
        const nextTrigger = triggers[1]

        // 不用 holdPressed 的收尾：它的 pointerup 发在原始按下点（deltaX=0，回弹到原项），
        // 这里要证的是「在拖动落点松手」的提交路径，pointerup 必须发在落点上。
        const target = activeTriggerCenter(nextTrigger)
        const from = activeTriggerCenter(activeTrigger)
        activeSurface(activeTrigger).dispatchEvent(pointer('pointerdown', from.x, from.y))
        await waitForUpdate(segmented)
        window.dispatchEvent(pointer('pointermove', target.x, target.y))
        await waitForUpdate(segmented)
        window.dispatchEvent(pointer('pointerup', target.x, target.y))
        await waitForUpdate(segmented)

        // 落在下一项中心：吸附目标即下一项（速度再快也是向前甩一项，目标一致）
        expect(segmented.value, '松手后应选中拖动落点的选项').toBe(nextTrigger.value)
        expect(nextTrigger.checked, '新选中项应置 checked').toBe(true)
        await pollUntil(
          () => look.triggers.every(trigger => triggerTextColor(trigger) === secondaryToken),
          '松手后仍有标签不是 text-secondary'
        )
      })

      it('真实按压/拖拽全程：thumb 与所有 trigger 均无灰色 bg', async () => {
        const look = await mount(appearance)

        const samples = await sampleRealPressDrag(look, 4)
        const stages = new Set(samples.map(sample => sample.stage))
        expect(
          stages.has('hover') && stages.has('pressed') && stages.has('dragging'),
          `手势未覆盖全部阶段：${[...stages].join(' | ')}`
        ).toBe(true)

        // 反虚跳：真实输入必须真的把组件带进按压/拖拽态（thumb 的玻璃 blur 已打开），
        // 否则下面的无色断言只是对一条从未发生的手势空转。
        expect(
          samples.some(sample => sample.stage !== 'hover' && sample.thumbBackdrop.includes('blur(4px)')),
          '按压/拖拽态 thumb 未见 backdrop blur，手势可能未真正生效'
        ).toBe(true)

        // hover 阶段（尚未按下）thumb 处于静止实色灰，是设计内的静止态；按下/拖拽必须落在
        // 全透明——残留灰底或中途跳变到其他值都算违约。
        const offenders = samples.filter(
          sample =>
            sample.triggers.some(bg => bg !== TRANSPARENT) || (sample.stage !== 'hover' && sample.thumb !== TRANSPARENT)
        )
        expect(
          offenders,
          `以下采样 thumb/trigger 底色偏离契约：\n${offenders
            .map(o => `${o.stage}: thumb=${o.thumb} | triggers=${o.triggers.join(' , ')}`)
            .join('\n')}`
        ).toHaveLength(0)
      })
    })
  }

  describe('variant prop', () => {
    for (const appearance of ['light', 'dark'] as const) {
      describe(`${appearance} 主题`, () => {
        it('默认 inset；非法值回退 inset；attribute 可切 raised', async () => {
          const { segmented } = await mount(appearance)

          expect(segmented.variant, '默认应为 inset').toBe('inset')
          expect(segmented.getAttribute('variant'), '默认值应反射到 attribute').toBe('inset')

          segmented.variant = 'bogus'
          await waitForUpdate(segmented)
          expect(segmented.variant, '非法值应回退到 inset').toBe('inset')
          expect(segmented.getAttribute('variant'), '回退值应反射到 attribute').toBe('inset')

          segmented.setAttribute('variant', 'raised')
          await waitForUpdate(segmented)
          expect(segmented.variant, 'attribute 应驱动 property').toBe('raised')
        })

        it('inset 变体：实体轨道 + 常驻环投影 + 灰 thumb，按压透明', async () => {
          const look = await mount(appearance)
          const { theme, track, indicator } = look
          const raisedToken = expectedInsetTrack(theme, appearance)
          const segmentedToken = resolveToken(theme, '--wui-color-surface-segmented')

          const rest = getComputedStyle(track)
          expect(rest.backgroundColor, 'inset 轨道底色偏离契约').toBe(raisedToken)
          expect(rest.backdropFilter).toBe('none')
          expect(rest.boxShadow, 'inset 轨道应保留投影').not.toBe('none')
          expect(getComputedStyle(track, '::before').opacity, 'inset 轨道应保留描边环').toBe('1')
          expect(getComputedStyle(indicator).backgroundColor).toBe(segmentedToken)

          const release = await holdPressed(look)
          await waitForFrame()
          await waitForFrame()
          const pressed = getComputedStyle(indicator)
          expect(pressed.backgroundColor, 'inset 按压态 thumb 应全透明').toBe(TRANSPARENT)
          expect(pressed.backdropFilter).toContain('blur(4px)')
          // transform 走 80ms 过渡：轮询到放大落地，不断言中间帧
          await pollUntil(
            () => getComputedStyle(indicator).transform.startsWith('matrix(1.5'),
            'inset 按压态 thumb 未放大到 1.5x'
          )
          // 按压不改变轨道装饰
          expect(getComputedStyle(track, '::before').opacity, 'inset 按压态环应恒定').toBe('1')
          expect(getComputedStyle(track).boxShadow, 'inset 按压态投影应恒定').not.toBe('none')
          await release()
        })

        it('raised 变体：flat 灰轨道 + 白 thumb + 柔投影，按压透明', async () => {
          const look = await mount(appearance, undefined, 'raised')
          const { theme, track, indicator } = look
          const segmentedToken = resolveToken(theme, '--wui-color-surface-segmented')
          const selectedToken = resolveToken(theme, '--wui-color-surface-selected')

          const rest = getComputedStyle(track)
          expect(rest.backgroundColor, 'raised 轨道应为 surface-segmented 实色').toBe(segmentedToken)
          expect(rest.backdropFilter, 'raised 轨道无 backdrop blur').toBe('none')
          expect(rest.boxShadow, 'raised 轨道无投影').toBe('none')
          expect(getComputedStyle(track, '::before').opacity, 'raised 轨道无描边环').toBe('0')

          const thumb = getComputedStyle(indicator)
          expect(thumb.backgroundColor, 'raised 静止 thumb 应为 surface-selected 实体').toBe(selectedToken)
          expect(thumb.backdropFilter, 'raised 静止 thumb 无 blur').toBe('none')
          expect(thumb.boxShadow, 'raised 静止 thumb 应带柔投影').not.toBe('none')

          const release = await holdPressed(look)
          await waitForFrame()
          await waitForFrame()
          const pressed = getComputedStyle(indicator)
          expect(pressed.backgroundColor, 'raised 按压态 thumb 应全透明').toBe(TRANSPARENT)
          expect(pressed.backdropFilter).toContain('blur(4px)')
          await pollUntil(
            () => getComputedStyle(indicator).transform.startsWith('matrix(1.5'),
            'raised 按压态 thumb 未放大到 1.5x'
          )
          // 按压同样不改变轨道：flat 灰轨道三态同值
          expect(getComputedStyle(track, '::before').opacity, 'raised 按压态环应恒定').toBe('0')
          expect(getComputedStyle(track).boxShadow, 'raised 按压态投影应恒定').toBe('none')
          await release()
        })
      })
    }
  })

  describe('文字色契约（#169：两个 variant 一律 text-secondary，无 accent 着色）', () => {
    for (const appearance of ['light', 'dark'] as const) {
      describe(`${appearance} 主题`, () => {
        for (const variant of ['inset', 'raised'] as const) {
          it(`${variant} 变体：选中项文字为灰，按压/拖拽全程不着 accent`, async () => {
            const look = await mount(appearance, undefined, variant)
            const { theme, segmented, activeTrigger, triggers } = look
            const secondaryToken = resolveToken(theme, '--wui-color-text-secondary')

            // 静止态：checked 与未选中项同档灰
            expect(triggerTextColor(activeTrigger), '选中项文字应为 text-secondary').toBe(secondaryToken)
            for (const trigger of triggers.slice(1)) {
              expect(triggerTextColor(trigger), '未选中项文字应为 text-secondary').toBe(secondaryToken)
            }

            // 按压并拖到下一项：被指示器盖住的项同样保持灰色。逐帧采样而不是只看终值——
            // 单点采样证明不了「覆盖不上色」。
            const release = await holdPressed(look)
            const target = activeTriggerCenter(triggers[1])
            window.dispatchEvent(pointer('pointermove', target.x, target.y))
            await waitForUpdate(segmented)

            const samples: string[][] = []
            for (let frame = 0; frame < 6; frame += 1) {
              await waitForFrame()
              samples.push(look.triggers.map(triggerTextColor))
            }
            await release()

            expect(
              samples.every(colors => colors.every(color => color === secondaryToken)),
              `${variant} 下文字色偏离 text-secondary：${samples.map(colors => colors.join(' | ')).join(' / ')}`
            ).toBe(true)
          })
        }
      })
    }
  })

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
