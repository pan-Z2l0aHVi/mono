import { describe, expect, it } from 'vite-plus/test'

import { findFocusedMenuItem, getEnabledMenuItems, getMenuChildren, moveMenuChildren } from '../menu-tree'

describe('多级菜单树操作', () => {
  it('只迁移合法菜单节点并保留其他节点', () => {
    const source = document.createElement('div')
    const target = document.createElement('div')
    source.innerHTML = '<span>ignored</span><web-ui-dropdown-item>item</web-ui-dropdown-item>'

    moveMenuChildren(source, target)

    expect(source.querySelector('span')).toBeTruthy()
    expect(getMenuChildren(target)).toHaveLength(1)
  })

  it('过滤禁用项并定位跨 Shadow DOM 的焦点项', () => {
    const panel = document.createElement('div')
    const enabled = document.createElement('web-ui-dropdown-item')
    const disabled = document.createElement('web-ui-dropdown-item')
    disabled.setAttribute('disabled', '')
    const root = enabled.attachShadow({ mode: 'open' })
    const button = document.createElement('button')
    root.append(button)
    panel.append(enabled, disabled)
    document.body.append(panel)
    button.focus()

    expect(getEnabledMenuItems(panel)).toEqual([enabled])
    expect(findFocusedMenuItem([panel])).toBe(enabled)

    panel.remove()
  })
})
