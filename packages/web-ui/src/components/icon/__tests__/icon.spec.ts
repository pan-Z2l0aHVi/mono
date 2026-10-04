import type { IconifyIcon } from '@iconify/types'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { cleanupElement, mountElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import '..'
import type { WebUiIcon } from '..'

const aIcon: IconifyIcon = { body: '<path d="M3 2h18v20H3z"/>' }

const createIcon = (icon: IconifyIcon = aIcon): WebUiIcon => {
  const el = mountElement<WebUiIcon>('web-ui-icon')
  el.icon = icon
  return el
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('WebUiIcon 组件', () => {
  it('无 icon 时不渲染图形', async () => {
    const el = mountElement<WebUiIcon>('web-ui-icon')
    await waitForUpdate(el)

    expect(queryA11y(el, 'svg')).toBeNull()
    cleanupElement(el)
  })

  // 装饰性图形必须对辅助技术隐藏：图标自身不承载语义，name 来自同层的可访问名称来源。
  it('渲染的 SVG 对辅助技术隐藏', async () => {
    const el = createIcon()
    await waitForUpdate(el)

    const svg = queryA11y(el, 'svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    cleanupElement(el)
  })

  // Iconify 规范里 width/height 缺省即 16。猜成别的值不会报错，只会把图形按错误比例
  // 缩放并偏到画布一角——这正是本组件注释里写明要跟规范一致的那条。
  it('未声明尺寸的图标按 Iconify 默认的 16×16 画布取景', async () => {
    const el = createIcon()
    await waitForUpdate(el)

    expect(queryA11y(el, 'svg')?.getAttribute('viewBox')).toBe('0 0 16 16')
    cleanupElement(el)
  })

  it('声明了尺寸的图标用自带画布，不套默认值', async () => {
    const el = createIcon({ body: '<path d="M4 6h16v2H4z"/>', width: 24, height: 24 })
    await waitForUpdate(el)

    expect(queryA11y(el, 'svg')?.getAttribute('viewBox')).toBe('0 0 24 24')
    cleanupElement(el)
  })

  // size 是消费方（avatar / back-top / layout 的 toggle）依赖的公开 property：
  // 按名写入走 property、attribute 写入回到 property，两条都必须通。
  it('size 双向同步 property 与 attribute', async () => {
    const el = createIcon()
    await waitForUpdate(el)

    expect(el.size).toBe(18)

    el.size = 32
    await waitForUpdate(el)
    expect(el.getAttribute('size')).toBe('32')

    el.setAttribute('size', '24')
    await waitForUpdate(el)
    expect(el.size).toBe(24)
    cleanupElement(el)
  })

  it('spin 用存在语义表达开并反射到 host', async () => {
    const el = createIcon()
    await waitForUpdate(el)
    expect(el.hasAttribute('spin')).toBe(false)

    el.spin = true
    await waitForUpdate(el)
    expect(el.hasAttribute('spin')).toBe(true)

    el.spin = false
    await waitForUpdate(el)
    expect(el.hasAttribute('spin')).toBe(false)
    cleanupElement(el)
  })
})
