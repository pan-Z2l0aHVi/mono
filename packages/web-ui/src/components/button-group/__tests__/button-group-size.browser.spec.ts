import '@/components/button'
import '@/components/button-group'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiButton } from '../../button'

afterEach(() => document.body.replaceChildren())

describe('WebUiButtonGroup 控件尺寸（浏览器）', () => {
  it('成员按钮随 --wui-control-size 缩放，垂直轨道覆盖最长成员', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)

    const horizontal = document.createElement('web-ui-button-group')
    horizontal.innerHTML = '<web-ui-button>A wide text button</web-ui-button><web-ui-button>B</web-ui-button>'
    const vertical = document.createElement('web-ui-button-group')
    vertical.direction = 'vertical'
    vertical.innerHTML = '<web-ui-button>A wide text button</web-ui-button><web-ui-button>B</web-ui-button>'
    const standalone = document.createElement('web-ui-button')
    parent.append(horizontal, vertical, standalone)

    const horizontalButton = horizontal.querySelector<WebUiButton>('web-ui-button')!
    const verticalButton = vertical.querySelector<WebUiButton>('web-ui-button')!
    await Promise.all([horizontal, vertical, standalone, horizontalButton, verticalButton].map(waitForUpdate))

    const geometry = () => ({
      horizontalTrack: horizontal.getBoundingClientRect().height,
      horizontalButton: horizontalButton.getBoundingClientRect().height,
      verticalTrack: vertical.getBoundingClientRect().width,
      verticalButtonWidth: verticalButton.getBoundingClientRect().width,
      verticalButton: verticalButton.getBoundingClientRect().height,
      standaloneButton: standalone.getBoundingClientRect().height
    })

    // 组内成员嵌在轨道里（轨道比成员高），与独立按钮同高；轨道始终容纳最高的成员。
    const defaults = geometry()
    expect(defaults.horizontalTrack).toBeGreaterThan(defaults.horizontalButton)
    expect(defaults.verticalTrack).toBeGreaterThanOrEqual(defaults.verticalButtonWidth)
    expect(defaults.verticalTrack).toBeGreaterThan(defaults.horizontalTrack)
    expect(defaults.standaloneButton).toBe(defaults.horizontalTrack)

    parent.style.setProperty('--wui-control-size', '48px')
    await waitForFrame()

    const scaled = geometry()
    expect(scaled.horizontalTrack).toBeGreaterThan(defaults.horizontalTrack)
    expect(scaled.horizontalTrack).toBeGreaterThan(scaled.horizontalButton)
    expect(scaled.verticalButton).toBeGreaterThan(defaults.verticalButton)
    expect(scaled.verticalTrack).toBeGreaterThanOrEqual(scaled.verticalButtonWidth)
    expect(scaled.standaloneButton).toBe(scaled.horizontalTrack)
  })

  it('垂直图标轨道至少宽为一个控件尺寸', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)

    const vertical = document.createElement('web-ui-button-group')
    vertical.direction = 'vertical'
    vertical.innerHTML =
      '<web-ui-button icon aria-label="A">A</web-ui-button><web-ui-button icon aria-label="B">B</web-ui-button>'
    parent.append(vertical)
    await waitForUpdate(vertical)

    expect(vertical.getBoundingClientRect().width).toBeCloseTo(36, 0)

    parent.style.setProperty('--wui-control-size', '48px')
    await waitForFrame()
    expect(vertical.getBoundingClientRect().width).toBeCloseTo(48, 0)
  })
})
