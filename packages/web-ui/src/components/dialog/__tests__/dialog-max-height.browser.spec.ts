import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDialog } from '..'

const CONTENT_HEIGHT = 2000

afterEach(() => {
  document.body.replaceChildren()
  document.body.removeAttribute('style')
})

function createTallDialog(): WebUiDialog {
  const component = document.createElement('web-ui-dialog')
  const content = document.createElement('div')
  content.style.cssText = `height: ${CONTENT_HEIGHT}px;`
  component.append(content)
  document.body.append(component)
  return component
}

async function openDialog(component: WebUiDialog): Promise<HTMLDialogElement> {
  component.open = true
  await component.updateComplete
  await new Promise(resolve => requestAnimationFrame(resolve))
  return component.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

describe('--wui-dialog-max-height（浏览器）', () => {
  it('覆写 token 后 dialog 高度被夹住', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '200px')
    const dialog = await openDialog(component)

    // offsetHeight 取布局盒，不受进场 transform: scale(1.1) 影响。
    expect(dialog.offsetHeight).toBe(200)
  })

  it('token 是唯一入口：换一个值得到不同的夹取高度', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '320px')
    const dialog = await openDialog(component)

    expect(dialog.offsetHeight).toBe(320)
  })

  it('未设置 token 时沿用 min(90vh, 90dvh) 默认值', async () => {
    const component = createTallDialog()
    const dialog = await openDialog(component)

    // 测试环境无动态工具栏，dvh 与 vh 等值，因此 min(90vh, 90dvh) 即 90% 视口高。
    expect(dialog.offsetHeight).toBe(Math.round(window.innerHeight * 0.9))
  })

  it('token 写在宿主祖先上也能生效', async () => {
    const host = document.createElement('div')
    host.style.setProperty('--wui-dialog-max-height', '240px')
    document.body.append(host)

    const component = createTallDialog()
    host.append(component)
    const dialog = await openDialog(component)

    expect(dialog.offsetHeight).toBe(240)
  })
})
