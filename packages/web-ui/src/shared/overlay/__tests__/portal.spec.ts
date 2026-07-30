import { afterEach, describe, expect, it } from 'vite-plus/test'

import { createOverlayPortal, resolveOverlayContainer } from '../portal'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('overlay portal', () => {
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

    expect(portal.panel.contains(content)).toBe(true)

    portal.restoreContent()
    portal.remove()

    expect(target.contains(content)).toBe(true)
    expect(container.childElementCount).toBe(0)
  })
})
