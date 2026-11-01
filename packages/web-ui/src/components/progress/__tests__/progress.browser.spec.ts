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

  it('indeterminate 播放循环动画，并随主题 reduced motion 放慢而不停止', async () => {
    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.setAttribute('appearance', 'light')
    theme.motion = 'full'
    const progress = document.createElement('web-ui-progress') as WebUiProgress
    progress.indeterminate = true
    theme.append(progress)
    document.body.append(theme)

    await waitForUpdate(theme)
    await waitForUpdate(progress)
    const indicator = part(progress, 'indicator')
    if (!indicator) throw new Error('progress 缺少公开的 indicator part')

    const full = getComputedStyle(indicator)
    expect(full.animationName).toBe('wui-progress-indeterminate')
    expect(full.animationDuration).toBe('0.8s')

    theme.motion = 'reduced'
    await waitForUpdate(theme)
    await waitForUpdate(progress)
    expect(getComputedStyle(indicator).animationDuration).toBe('1.6s')
  })
})
