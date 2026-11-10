import '..'

import { afterEach, expect, it } from 'vite-plus/test'

import { pollUntil } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

it('放大关闭按钮时长标题不会与按钮重叠', async () => {
  const drawer = document.createElement('web-ui-drawer')
  drawer.closable = true
  drawer.heading = '这是一条足够长的标题，长到需要换行才能完整展示并且不能被关闭按钮遮挡'
  drawer.style.setProperty('--wui-drawer-width', '260px')
  drawer.style.setProperty('--wui-drawer-close-size', '44px')
  document.body.append(drawer)
  drawer.open = true
  await drawer.updateComplete
  const button = drawer.shadowRoot!.querySelector<HTMLElement>('.wui-drawer-close')!
  const title = drawer.shadowRoot!.querySelector<HTMLElement>('.wui-drawer-heading')!
  await pollUntil(() => button.getBoundingClientRect().width > 40, '关闭按钮未完成布局')
  const buttonBox = button.getBoundingClientRect()
  const titleBox = title.getBoundingClientRect()
  expect(titleBox.height).toBeGreaterThan(parseFloat(getComputedStyle(title).lineHeight) * 1.5)
  expect(titleBox.right).toBeLessThanOrEqual(buttonBox.left)
})
