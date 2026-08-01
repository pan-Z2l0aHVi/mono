import { afterEach, describe, expect, it } from 'vite-plus/test'

import { createOverlayPortal, resolveOverlayContainer } from '../portal'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('浮层 Portal', () => {
  it('显式容器优先于主题和 fallback root', () => {
    const target = document.createElement('div')
    const container = document.createElement('div')
    document.body.append(target, container)

    const resolved = resolveOverlayContainer(container, target)

    expect(resolved).toBe(container)
  })

  it('迁移内容并在销毁前恢复到原组件', () => {
    const target = document.createElement('div')
    const content = document.createElement('button')
    const container = document.createElement('div')
    target.append(content)
    document.body.append(target, container)

    const portal = createOverlayPortal({ container, target, style: '', className: 'panel' })
    portal.moveContent([content])

    expect(portal.panel.dataset.wuiPresence).toBe('entering')
    expect(portal.panel.contains(content)).toBe(true)

    portal.restoreContent()
    portal.remove()

    expect(target.contains(content)).toBe(true)
    expect(container.childElementCount).toBe(0)
  })

  it('可将受跟踪内容迁移到面板内的指定容器', () => {
    const target = document.createElement('div')
    const content = document.createElement('button')
    const container = document.createElement('div')
    target.append(content)
    document.body.append(target, container)

    const portal = createOverlayPortal({ container, target, style: '', className: 'panel' })
    const scroll = document.createElement('div')
    portal.panel.append(scroll)
    portal.moveContent([content], scroll)

    expect(scroll.contains(content)).toBe(true)

    portal.restoreContent()
    portal.remove()

    expect(target.contains(content)).toBe(true)
  })
})
