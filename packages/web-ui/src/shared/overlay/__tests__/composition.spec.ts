import { describe, expect, it } from 'vite-plus/test'

import { overlayComposition } from '../composition'

describe('overlay composition registry', () => {
  it('contains 查询覆盖自身、shadow DOM、slot 和逻辑后代', () => {
    const parent = document.createElement('div')
    const childPanel = document.createElement('div')
    const grandchildPanel = document.createElement('div')
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.append(childPanel)

    overlayComposition.registerPanel(parent)
    overlayComposition.registerPanel(childPanel, parent)
    overlayComposition.registerPanel(grandchildPanel, childPanel)

    expect(overlayComposition.contains(parent, parent)).toBe(true)
    expect(overlayComposition.contains(parent, childPanel)).toBe(true)
    expect(overlayComposition.contains(parent, grandchildPanel)).toBe(true)
    expect(overlayComposition.contains(parent, document.createElement('div'))).toBe(false)
  })

  it('registerPanelFromAncestry 沿 shadow host 和 slot 找最近 panel', () => {
    const parentPanel = document.createElement('div')
    const childHost = document.createElement('div')
    const childShadow = childHost.attachShadow({ mode: 'open' })
    const childPanel = document.createElement('div')
    childShadow.append(childPanel)
    const slot = document.createElement('slot')
    parentPanel.append(slot, childHost)
    slot.assign?.(childHost)

    overlayComposition.registerPanel(parentPanel)
    const registeredParent = overlayComposition.registerPanelFromAncestry(childPanel, childHost)

    expect(registeredParent).toBe(parentPanel)
    expect(overlayComposition.contains(parentPanel, childPanel)).toBe(true)
  })

  it('unregister 递归清理后代，重挂 parent 不保留 stale ancestry', () => {
    const parent = document.createElement('div')
    const child = document.createElement('div')
    const nextParent = document.createElement('div')
    const target = document.createElement('div')
    child.append(target)

    overlayComposition.registerPanel(parent)
    overlayComposition.registerPanel(child, parent)
    expect(overlayComposition.contains(parent, target)).toBe(true)

    overlayComposition.unregisterPanel(parent)
    expect(overlayComposition.contains(parent, child)).toBe(false)
    expect(overlayComposition.contains(parent, target)).toBe(false)

    overlayComposition.registerPanel(nextParent)
    overlayComposition.registerPanel(child, nextParent)
    expect(overlayComposition.contains(nextParent, target)).toBe(true)
  })
})
