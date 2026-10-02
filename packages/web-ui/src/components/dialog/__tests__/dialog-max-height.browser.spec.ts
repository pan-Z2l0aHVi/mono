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

function query<T extends HTMLElement>(component: WebUiDialog, selector: string): T {
  const el = component.shadowRoot?.querySelector(selector) as T | null
  if (!el) throw new Error(`Expected ${selector} to exist.`)
  return el
}

/**
 * token 的语义是**内容区**高度（README 有记录），不是整卡高度。内容区拿到的是
 * `.desc` 的 content box —— token 不该为 focus-ring 余量的 padding-block 买单，
 * 所以这里扣掉 padding 再断言。
 */
function descContentHeight(component: WebUiDialog): number {
  const desc = query<HTMLElement>(component, '.desc')
  const styles = getComputedStyle(desc)
  return desc.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
}

/**
 * chrome = 卡片里除内容区以外的全部高度（上下 padding + title + 它的下边距 +
 * 内容区的外边距 + footer + 内容区自身的 focus-ring padding-block）。逐项实测而不写死
 * 常数：本用例的 fixture 没有 title 与 footer 内容，实测 chrome 是 84；带真实标题与
 * footer 的宿主是 142（见 dialog-content-height.browser.spec.ts）。写死任一个都会在
 * 另一处失真。
 *
 * 注意 ring padding 计入 chrome：它在 `.desc` 的 border box 内、content box 外，
 * 所以「卡片 = 内容区 + chrome」里的 chrome 必须含它，否则会少算 12。
 */
function chromeHeight(component: WebUiDialog): number {
  const cardStyles = getComputedStyle(query<HTMLElement>(component, '.wui-dialog-body'))
  const descStyles = getComputedStyle(query<HTMLElement>(component, '.desc'))
  const title = query<HTMLElement>(component, '.title')
  return (
    parseFloat(cardStyles.paddingTop) +
    parseFloat(cardStyles.paddingBottom) +
    parseFloat(descStyles.paddingTop) +
    parseFloat(descStyles.paddingBottom) +
    title.offsetHeight +
    parseFloat(getComputedStyle(title).marginBottom) +
    parseFloat(descStyles.marginTop) +
    parseFloat(descStyles.marginBottom) +
    query<HTMLElement>(component, '.wui-dialog-footer').offsetHeight
  )
}

describe('--wui-dialog-max-height（浏览器）', () => {
  it('覆写 token 后内容区被夹到 token，且卡片不再超出 dialog 盒子', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '200px')
    const dialog = await openDialog(component)
    const card = query<HTMLElement>(component, '.wui-dialog-body')

    expect(descContentHeight(component)).toBe(200)
    // offsetHeight 取布局盒，不受进场 transform: scale(1.1) 影响。
    expect(card.offsetHeight).toBe(200 + chromeHeight(component))
    // 约束落在内容区而非整卡：卡片被 dialog 盒子完整容纳，不再像改动前那样溢出。
    expect(card.offsetHeight).toBeLessThanOrEqual(dialog.offsetHeight)
  })

  it('token 是唯一入口：换一个值得到不同的内容区高度', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '320px')
    await openDialog(component)

    expect(descContentHeight(component)).toBe(320)
  })

  it('内容区自己滚，不会把卡片顶出 dialog 盒子', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '200px')
    await openDialog(component)
    const desc = query<HTMLElement>(component, '.desc')

    expect(desc.scrollHeight).toBeGreaterThan(desc.clientHeight)
    desc.scrollTop = 9999
    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(desc.scrollTop).toBeGreaterThan(0)
  })

  it('未设置 token 时内容区沿用 min(90vh, 90dvh) 默认值', async () => {
    const component = createTallDialog()
    await openDialog(component)

    // 测试环境无动态工具栏，dvh 与 vh 等值，因此 min(90vh, 90dvh) 即 90% 视口高。
    expect(descContentHeight(component)).toBe(Math.round(window.innerHeight * 0.9))
  })

  it('token 写在宿主祖先上也能生效', async () => {
    const host = document.createElement('div')
    host.style.setProperty('--wui-dialog-max-height', '240px')
    document.body.append(host)

    const component = createTallDialog()
    host.append(component)
    await openDialog(component)

    expect(descContentHeight(component)).toBe(240)
  })
})
