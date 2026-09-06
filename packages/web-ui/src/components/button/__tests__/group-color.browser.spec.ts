import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/button-group'

import '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiButton 分组颜色', () => {
  it('分组中的 danger 按钮保留 danger 文本颜色', async () => {
    const group = document.createElement('web-ui-button-group')
    group.innerHTML = '<web-ui-button>预览</web-ui-button><web-ui-button variant="danger">删除</web-ui-button>'
    document.body.append(group)
    const buttons = group.querySelectorAll('web-ui-button')
    await Promise.all([...buttons].map(button => button.updateComplete))

    const inner = buttons[1].shadowRoot?.querySelector('button')
    expect(inner).toBeTruthy()
    expect(getComputedStyle(inner!).color).toBe('rgb(220, 38, 38)')
  })

  it('分组中的按钮尊重宿主传入的 --wui-button-color', async () => {
    const group = document.createElement('web-ui-button-group')
    const preview = document.createElement('web-ui-button')
    const remove = document.createElement('web-ui-button')
    remove.textContent = '删除'
    remove.style.setProperty('--wui-button-color', '#123456')
    group.append(preview, remove)
    document.body.append(group)
    await Promise.all([preview.updateComplete, remove.updateComplete])

    const inner = remove.shadowRoot?.querySelector('button')
    expect(getComputedStyle(inner!).color).toBe('rgb(18, 52, 86)')
  })
})
