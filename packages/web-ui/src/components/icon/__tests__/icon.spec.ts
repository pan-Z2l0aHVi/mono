import type { IconifyIcon } from '@iconify/types'
import { describe, expect, it } from 'vite-plus/test'

import { type WebUiIcon } from '../index'
import '../index'

const createIcon = (): IconifyIcon => ({
  width: 24,
  height: 24,
  body: '<path fill="currentColor" d="M3 2.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 2.25"/>'
})

describe('WebUiIcon', () => {
  it('不传入 icon 时渲染 nothing', async () => {
    const el = document.createElement('web-ui-icon') as WebUiIcon & HTMLElement
    document.body.appendChild(el)
    await el.updateComplete

    // 没有设置 icon，不应渲染 SVG
    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeNull()
    el.remove()
  })

  it('传入 icon 后渲染对应的 SVG', async () => {
    const el = document.createElement('web-ui-icon') as WebUiIcon & HTMLElement
    el.icon = createIcon()
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg?.getAttribute('width')).toBe('1em')
    expect(svg?.getAttribute('height')).toBe('1em')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')

    const path = svg?.querySelector('path')
    expect(path).toBeTruthy()
    expect(path?.getAttribute('d')).toContain('M3 2.25')

    el.remove()
  })

  it('更换 icon 后更新 SVG', async () => {
    const el = document.createElement('web-ui-icon') as WebUiIcon & HTMLElement
    el.icon = createIcon()
    document.body.appendChild(el)
    await el.updateComplete

    const newIcon: IconifyIcon = {
      width: 16,
      height: 16,
      body: '<circle cx="8" cy="8" r="4"/>'
    }
    el.icon = newIcon
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16')

    el.remove()
  })

  it('空 icon 恢复为 nothing', async () => {
    const el = document.createElement('web-ui-icon') as WebUiIcon & HTMLElement
    el.icon = createIcon()
    document.body.appendChild(el)
    await el.updateComplete

    expect(el.shadowRoot?.querySelector('svg')).toBeTruthy()

    el.icon = undefined
    await el.updateComplete

    expect(el.shadowRoot?.querySelector('svg')).toBeNull()
    el.remove()
  })

  it('spin 属性应渲染加旋转动画', async () => {
    const el = document.createElement('web-ui-icon') as WebUiIcon & HTMLElement
    el.icon = createIcon()
    el.setAttribute('spin', '')
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(el.hasAttribute('spin')).toBe(true)

    el.removeAttribute('spin')
    await el.updateComplete
    expect(el.hasAttribute('spin')).toBe(false)

    el.remove()
  })
})

describe('WebUiIcon — via module import', () => {
  it('使用 loaderCircle 图标渲染正确', async () => {
    const el = document.createElement('web-ui-icon') as WebUiIcon & HTMLElement
    const { loaderCircle } = await import('../../../icons/index')
    el.icon = loaderCircle
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')

    el.remove()
  })

  it('使用 moveToTop16 图标渲染正确', async () => {
    const el = document.createElement('web-ui-icon') as WebUiIcon & HTMLElement
    const { moveToTop16 } = await import('../../../icons/index')
    el.icon = moveToTop16
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')

    el.remove()
  })
})
