import '@/components/progress'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiProgress } from '@/components/progress'
import type { WebUiTheme } from '@/components/theme'
import { waitForUpdate } from '@/shared/test-utils'

function mountProgress(value = 25, max = 100): { host: HTMLDivElement; progress: WebUiProgress } {
  const host = document.createElement('div')
  host.style.width = '240px'
  const progress = document.createElement('web-ui-progress') as WebUiProgress
  progress.value = value
  progress.max = max
  progress.style.setProperty('--wui-duration-trigger', '0ms')
  host.append(progress)
  document.body.append(host)
  return { host, progress }
}

const part = (progress: WebUiProgress, name: string): HTMLElement | null =>
  progress.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`) ?? null

afterEach(() => {
  document.body.replaceChildren()
})

describe('web-ui-progress（浏览器）', () => {
  it('铺满宿主，indicator 宽度按 value/max 计算', async () => {
    const { host, progress } = mountProgress()
    await waitForUpdate(progress)

    const track = part(progress, 'track')
    const indicator = part(progress, 'indicator')
    if (!track || !indicator) throw new Error('progress 缺少公开的 track / indicator part')

    expect(progress.getBoundingClientRect().width).toBeCloseTo(host.getBoundingClientRect().width, 0)
    expect(indicator.getBoundingClientRect().width / track.getBoundingClientRect().width).toBeCloseTo(0.25, 2)
  })

  it('旧 indeterminate attribute 不再启动动画，sport 仍生效', async () => {
    const { progress } = mountProgress(35)
    await waitForUpdate(progress)
    progress.setAttribute('indeterminate', '')

    const indicator = part(progress, 'indicator')
    if (!indicator) throw new Error('progress 缺少公开的 indicator part')
    expect(getComputedStyle(indicator).animationName).toBe('none')
    expect(getComputedStyle(indicator).animationDuration).toBe('0s')
    expect(indicator.getAnimations()).toHaveLength(0)
    expect(progress.getAttribute('aria-valuenow')).toBe('35')

    progress.sport = true
    await waitForUpdate(progress)
    expect(getComputedStyle(indicator).animationName).toBe('wui-progress-sport')
  })

  it('旧 indeterminate attribute 与 sport 并存时只保留 sport 动画', async () => {
    const { progress } = mountProgress(35)
    progress.setAttribute('indeterminate', '')
    progress.sport = true
    await waitForUpdate(progress)

    const indicator = part(progress, 'indicator')
    if (!indicator) throw new Error('progress 缺少公开的 indicator part')
    const style = getComputedStyle(indicator)
    expect(style.animationName).toBe('wui-progress-sport')
    expect(style.animationDuration).toBe('1s')
    expect(indicator.getAnimations()).toHaveLength(1)
    expect(Number.parseFloat(indicator.style.getPropertyValue('--wui-progress-sport-shift'))).toBeCloseTo(10000 / 35, 2)
    expect(progress.getAttribute('aria-valuenow')).toBe('35')
  })

  it('sport 按进度定宽、方角，并用非线性缓动循环滑动', async () => {
    const { progress } = mountProgress(35)
    progress.sport = true
    await waitForUpdate(progress)

    const track = part(progress, 'track')
    const indicator = part(progress, 'indicator')
    if (!track || !indicator) throw new Error('progress 缺少公开的 track / indicator part')

    const style = getComputedStyle(indicator)
    expect(indicator.getBoundingClientRect().width / track.getBoundingClientRect().width).toBeCloseTo(0.35, 2)
    expect(style.animationName).toBe('wui-progress-sport')
    expect(style.animationIterationCount).toBe('infinite')
    expect(style.animationTimingFunction).toBe('cubic-bezier(0.65, 0, 0.35, 1)')
    expect(style.animationDuration).toBe('1s')
    expect(style.borderRadius).toBe('0px')

    const shift = Number.parseFloat(indicator.style.getPropertyValue('--wui-progress-sport-shift'))
    expect(shift).toBeCloseTo(10000 / 35, 2)

    const animation = indicator.getAnimations()[0] as CSSAnimation | undefined
    if (!animation || animation.animationName !== 'wui-progress-sport') {
      throw new Error('sport 未启动 wui-progress-sport 动画')
    }
    const timing = animation.effect?.getComputedTiming()
    expect(timing?.iterations).toBe(Infinity)

    const trackRect = track.getBoundingClientRect()
    const duration = Number(timing?.duration ?? 0)
    animation.pause()

    animation.currentTime = 0
    const atStart = indicator.getBoundingClientRect()
    expect(atStart.right).toBeLessThanOrEqual(trackRect.left + 1)

    animation.currentTime = duration / 2
    const atMiddle = indicator.getBoundingClientRect()
    expect(atMiddle.left).toBeGreaterThanOrEqual(trackRect.left - 1)
    expect(atMiddle.right).toBeLessThanOrEqual(trackRect.right + 1)
    expect(atMiddle.width / trackRect.width).toBeCloseTo(0.35, 2)

    animation.currentTime = duration - 1
    const atEnd = indicator.getBoundingClientRect()
    expect(atEnd.left).toBeGreaterThanOrEqual(trackRect.right - 2)
  })

  it('sport 循环随主题 reduced motion 放慢而不停止', async () => {
    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.setAttribute('appearance', 'light')
    theme.motion = 'full'
    const progress = document.createElement('web-ui-progress') as WebUiProgress
    progress.value = 35
    progress.sport = true
    theme.append(progress)
    document.body.append(theme)

    await waitForUpdate(theme)
    await waitForUpdate(progress)
    const indicator = part(progress, 'indicator')
    if (!indicator) throw new Error('progress 缺少公开的 indicator part')

    expect(getComputedStyle(indicator).animationName).toBe('wui-progress-sport')
    expect(getComputedStyle(indicator).animationDuration).toBe('1s')

    theme.motion = 'reduced'
    await waitForUpdate(theme)
    await waitForUpdate(progress)
    expect(getComputedStyle(indicator).animationDuration).toBe('2s')
  })

  it('极小进度不写出非有限位移', async () => {
    const { progress } = mountProgress(1e-300, 1e10)
    progress.sport = true
    await waitForUpdate(progress)

    const indicator = part(progress, 'indicator')
    if (!indicator) throw new Error('progress 缺少公开的 indicator part')
    expect(indicator.style.getPropertyValue('--wui-progress-sport-shift')).not.toContain('Infinity')
  })

  it('运行时改变 value 后仍播放 sport 动画且位移有限', async () => {
    const { progress } = mountProgress(35)
    progress.sport = true
    await waitForUpdate(progress)

    progress.value = 70
    await waitForUpdate(progress)

    const indicator = part(progress, 'indicator')
    if (!indicator) throw new Error('progress 缺少公开的 indicator part')
    expect(getComputedStyle(indicator).animationName).toBe('wui-progress-sport')
    expect(Number.isFinite(Number.parseFloat(indicator.style.getPropertyValue('--wui-progress-sport-shift')))).toBe(
      true
    )
  })
})
