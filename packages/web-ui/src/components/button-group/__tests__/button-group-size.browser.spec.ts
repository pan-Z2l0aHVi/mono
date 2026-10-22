import '@/components/button'
import '@/components/button-group'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { waitForUpdate } from '@/shared/test-utils'

import type { WebUiButton } from '../../button'

afterEach(() => document.body.replaceChildren())

describe('WebUiButtonGroup 控件尺寸（浏览器）', () => {
  it('成员按钮随 --wui-control-size 缩放并保持与轨道的相对尺寸', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)

    const horizontal = document.createElement('web-ui-button-group')
    horizontal.innerHTML = '<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>'
    const vertical = document.createElement('web-ui-button-group')
    vertical.direction = 'vertical'
    vertical.innerHTML = '<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>'
    const standalone = document.createElement('web-ui-button')
    parent.append(horizontal, vertical, standalone)

    const horizontalButton = horizontal.querySelector<WebUiButton>('web-ui-button')!
    const verticalButton = vertical.querySelector<WebUiButton>('web-ui-button')!
    await Promise.all([horizontal, vertical, standalone, horizontalButton, verticalButton].map(waitForUpdate))

    const geometry = () => ({
      horizontalTrack: horizontal.getBoundingClientRect().height,
      horizontalButton: horizontalButton.getBoundingClientRect().height,
      verticalTrack: vertical.getBoundingClientRect().width,
      verticalButton: verticalButton.getBoundingClientRect().height,
      standaloneButton: standalone.getBoundingClientRect().height
    })

    const defaults = geometry()
    expect(defaults.horizontalButton / defaults.horizontalTrack).toBeCloseTo(5 / 6, 2)
    expect(defaults.verticalButton / defaults.verticalTrack).toBeCloseTo(5 / 6, 2)
    expect(defaults.standaloneButton).toBe(defaults.horizontalTrack)

    parent.style.setProperty('--wui-control-size', '48px')
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

    const scaled = geometry()
    expect(scaled.horizontalTrack).toBeGreaterThan(defaults.horizontalTrack)
    expect(scaled.horizontalButton / scaled.horizontalTrack).toBeCloseTo(5 / 6, 2)
    expect(scaled.verticalTrack).toBeGreaterThan(defaults.verticalTrack)
    expect(scaled.verticalButton / scaled.verticalTrack).toBeCloseTo(5 / 6, 2)
    expect(scaled.standaloneButton).toBe(scaled.horizontalTrack)
  })
})
