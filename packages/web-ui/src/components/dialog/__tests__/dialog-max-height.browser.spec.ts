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
 * 内容区（`.desc`）的 content box 高度：token 的语义是这个值，不是 border box
 * （后者含 focus-ring 余量的 padding）。
 */
function descContentHeight(component: WebUiDialog): number {
  const desc = query<HTMLElement>(component, '.desc')
  const styles = getComputedStyle(desc)
  return desc.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
}

/**
 * `--wui-dialog-max-height` 是公开 token（README 有记录），语义是**内容区**高度上限。
 *
 * 这里的判据全部是「内容有没有丢」与「卡片有没有被挤出视口」两条用户后果，
 * 不钉具体像素：token 值本身会被主题覆盖，改主题不该变成改测试。
 */
describe('--wui-dialog-max-height', () => {
  it('覆写 token 后卡片不再超出 dialog 盒子', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '200px')
    const dialog = await openDialog(component)
    const card = query<HTMLElement>(component, '.wui-dialog-body')

    // 约束落在内容区而非整卡：卡片被 dialog 盒子完整容纳。
    // 历史回归是把上限写在宿主复述的 chrome 常数上，触摸端 --wui-control-size
    // 从 36 抬到 40 后卡片比 dialog 盒子高出一截，内容被裁掉。
    expect(card.offsetHeight).toBeLessThanOrEqual(dialog.offsetHeight)
    expect(descContentHeight(component)).toBeLessThanOrEqual(200)
  })

  it('token 是唯一入口：换一个值得到不同的内容区高度', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '200px')
    await openDialog(component)
    const short = descContentHeight(component)
    document.body.replaceChildren()

    const taller = createTallDialog()
    taller.style.setProperty('--wui-dialog-max-height', '480px')
    await openDialog(taller)

    // 只断言「更大的 token 给出更高的内容区」并夹在两个 token 之间，不钉具体值。
    const tall = descContentHeight(taller)
    expect(tall).toBeGreaterThan(short)
    expect(tall).toBeLessThanOrEqual(480)
  })

  it('内容区自己滚，不会把卡片顶出 dialog 盒子', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '200px')
    const dialog = await openDialog(component)
    const desc = query<HTMLElement>(component, '.desc')

    expect(desc.scrollHeight).toBeGreaterThan(desc.clientHeight)
    // auto 与 hidden 都让下述两条成立：内容同样溢出，scrollTop 也同样能被程序化写动，
    // 所以这两条区分不出 hidden（见下方：Chromium 会把 clip 与 auto 降级成 hidden）。
    desc.scrollTop = 9999
    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(desc.scrollTop).toBeGreaterThan(0)

    const card = query<HTMLElement>(component, '.wui-dialog-body')
    expect(card.offsetHeight).toBeLessThanOrEqual(dialog.offsetHeight)
  })

  it('token 大过视口余量时整卡兜底接住，内容区被压到视口内并自己滚', async () => {
    const component = createTallDialog()
    component.style.setProperty('--wui-dialog-max-height', '5000px')
    const dialog = await openDialog(component)
    const desc = query<HTMLElement>(component, '.desc')
    const card = query<HTMLElement>(component, '.wui-dialog-body')

    // 5000px 远超视口：先触发的是 dialog 的 100dvh 整卡兜底，而不是 token。
    // 卡片必须被压进视口，且压缩量由内容区承担 —— token 没有被放行。
    expect(dialog.offsetHeight).toBeLessThanOrEqual(window.innerHeight)
    expect(card.offsetHeight).toBeLessThanOrEqual(dialog.offsetHeight)
    expect(descContentHeight(component)).toBeLessThan(5000)
    expect(desc.scrollHeight).toBeGreaterThan(desc.clientHeight)
  })

  it('宽内容不产生横向滚动条', async () => {
    const component = createTallDialog()
    const content = component.firstElementChild as HTMLElement
    content.style.cssText = 'width: 2000px; height: 50px;'
    const dialog = await openDialog(component)

    // 外层盒子不越出视口。
    expect(dialog.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)

    /*
     * 内容区横向不滚动。横向滚动条出现在 `.desc` 而不是外层，所以上一条证明不了这一半
     * ——外层不越界与内层多出滚动条完全可以同时成立。
     *
     * 这里只能读 overflowX 计算值。实测过其它候选，都区分不出 clip 与 auto：
     *   - scrollWidth 两种取值下都是 2012（clip/hidden 不改变 scrollWidth 的内容口径）；
     *   - 写 scrollLeft 后两种取值下都是 1688（hidden 同样允许程序化滚动）；
     *   - offsetHeight - clientHeight 都是 0（headless Chromium 不占滚动条槽）。
     *
     * 断言写成「不是 auto / 不是 scroll」而不是「等于 clip」：Chromium 会把 clip 与本
     * 规则下面的 overflow-y: auto 配对降级成 hidden，Firefox 保持 clip，两者都不画
     * 横向滚动条，但计算值不同。
     */
    const desc = query<HTMLElement>(component, '.desc')
    const overflowX = getComputedStyle(desc).overflowX
    expect(overflowX).not.toBe('auto')
    expect(overflowX).not.toBe('scroll')
  })

  it('token 写在宿主祖先上也能生效', async () => {
    const host = document.createElement('div')
    host.style.setProperty('--wui-dialog-max-height', '240px')
    document.body.append(host)

    const component = createTallDialog()
    host.append(component)
    await openDialog(component)

    expect(descContentHeight(component)).toBeLessThanOrEqual(240)
  })
})
