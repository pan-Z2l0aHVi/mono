import type { IconifyIcon } from '@iconify/types'
import { describe, expect, it } from 'vite-plus/test'

import '..'

const createIcon = (): IconifyIcon => ({
  body: '<path fill="currentColor" d="M3 2.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 2.25"/>'
})

describe('WebUiIcon', () => {
  it('不传入 icon 时渲染 nothing', async () => {
    const el = document.createElement('web-ui-icon')
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeNull()
    el.remove()
  })

  it('传入 icon 后渲染对应的 SVG', async () => {
    const el = document.createElement('web-ui-icon')
    el.icon = createIcon()
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')

    const path = svg?.querySelector('path')
    expect(path).toBeTruthy()
    expect(path?.getAttribute('d')).toContain('M3 2.25')

    el.remove()
  })

  it('更换 icon 后更新 SVG', async () => {
    const el = document.createElement('web-ui-icon')
    el.icon = createIcon()
    document.body.appendChild(el)
    await el.updateComplete

    const newIcon: IconifyIcon = {
      body: '<circle cx="8" cy="8" r="4"/>'
    }
    el.icon = newIcon
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')

    el.remove()
  })

  it('空 icon 恢复为 nothing', async () => {
    const el = document.createElement('web-ui-icon')
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
    const el = document.createElement('web-ui-icon')
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

  it('width/height 属性应设置 SVG 尺寸', async () => {
    const el = document.createElement('web-ui-icon')
    el.icon = createIcon()
    el.width = 32
    el.height = 32
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('width')).toBe('32')
    expect(svg?.getAttribute('height')).toBe('32')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')

    el.remove()
  })

  it('color 属性应设置 SVG 颜色', async () => {
    const el = document.createElement('web-ui-icon')
    el.icon = createIcon()
    el.color = 'red'
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(el.style.getPropertyValue('--wui-icon-color')).toBe('red')

    el.remove()
  })

  it('未设置 width/height 时使用默认值 16', async () => {
    const el = document.createElement('web-ui-icon')
    el.icon = createIcon()
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('width')).toBe('16')
    expect(svg?.getAttribute('height')).toBe('16')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')

    el.remove()
  })
})

describe('WebUiIcon — via module import', () => {
  it('使用 lucideLoaderCircle 图标渲染正确', async () => {
    const el = document.createElement('web-ui-icon')
    const { lucideLoaderCircle } = await import('../../../icons')
    el.icon = lucideLoaderCircle
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')

    el.remove()
  })

  it('使用 lucideArrowUpToLine 图标渲染正确', async () => {
    const el = document.createElement('web-ui-icon')
    const { lucideArrowUpToLine } = await import('../../../icons')
    el.icon = lucideArrowUpToLine
    document.body.appendChild(el)
    await el.updateComplete

    const svg = el.shadowRoot?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')

    el.remove()
  })
})
