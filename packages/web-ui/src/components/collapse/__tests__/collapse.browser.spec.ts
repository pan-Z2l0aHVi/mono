import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiCollapse } from '..'

function createCollapse(
  html = '<button class="trigger">Trigger</button><div slot="content">Content</div>'
): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.innerHTML = html
  document.body.append(el)
  return el
}

function queryContentContainer(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-content')!
}

function queryInner(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-inner')!
}

function queryTrack(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-track')!
}

// 轮询确定性信号；超时走 promise reject（不能在 promise 外 throw）。
function waitFor(predicate: () => boolean, message = 'waitFor timeout', timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const step = (): void => {
      if (predicate()) return resolve()
      if (performance.now() - start > timeoutMs) return reject(new Error(message))
      setTimeout(step, 16)
    }
    step()
  })
}

/*
 * 落稳态观察面用 Web Animations API，不读内部状态标记：
 * `getAnimations()` 对「有动效 vs 没有动效」有完全区分力，过渡跑完即为空集。
 * 不用 `transitionend`：同帧 close→reopen 会取消过渡（净样式无变化），事件不触发，
 * 而组件本身正确落稳态（实测），等待必须对中断路径健壮。
 */
function settle(el: WebUiCollapse): Promise<void> {
  return waitFor(() => queryTrack(el).getAnimations().length === 0, 'collapse transition did not settle')
}

afterEach(() => document.body.replaceChildren())

/*
 * 本文件只保留浏览器里才能观察到的契约：真实的过渡生命周期（中断/续接/落稳态）、
 * 真实布局下的内容挂载与滚动位置、真实焦点归宿、真实 inert 阻断。
 */
describe('WebUiCollapse 组件（浏览器）', () => {
  it('展开收起切换内容可见性', async () => {
    const el = createCollapse()
    await el.updateComplete
    expect(queryContentContainer(el).hidden).toBe(true)

    el.open = true
    await el.updateComplete
    await settle(el)
    expect(queryContentContainer(el).hidden).toBe(false)

    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hidden === true, 'content did not hide again')
  })

  // 过渡被中断时若不续接，面板会卡在中间态：hidden 泄漏或永久 inert。
  it('关闭过渡中重新打开：中断续接完整展开，无 hidden 泄漏', async () => {
    const el = createCollapse()
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await settle(el)

    el.open = false
    await el.updateComplete
    el.open = true
    await el.updateComplete
    await settle(el)

    expect(el.open).toBe(true)
    expect(el.hasAttribute('open')).toBe(true)
    expect(queryContentContainer(el).hidden).toBe(false)
  })

  // keep-mounted 存在的理由：收起后内容仍在文档里，滚动位置不能丢。
  it('keep-mounted 收起稳态保留内容挂载，内部滚动位置不丢', async () => {
    const el = document.createElement('web-ui-collapse')
    el.keepMounted = true
    el.innerHTML =
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 100px; overflow-y: auto">Content<div style="height: 300px"></div></div></div>'
    document.body.append(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await settle(el)

    const innerContent = el.querySelector('div[style]') as HTMLElement
    innerContent.scrollTop = 42

    el.open = false
    await el.updateComplete
    await waitFor(() => queryInner(el).hasAttribute('inert'), 'inner never became inert')

    expect(queryContentContainer(el).hidden).toBe(false)
    expect(innerContent.scrollTop).toBe(42)

    el.open = true
    await el.updateComplete
    await settle(el)
    expect(innerContent.scrollTop).toBe(42)
  })

  // peek 的可见后果：内容留在文档里（区别于默认关闭态的 hidden），但 inert 让里面的
  // 控件拿不到焦点；展开后焦点必须重新可达。真实布局下的裁剪长度不在此处断言。
  it('peek：露出的内容是只读预览，展开后恢复可交互', async () => {
    const el = document.createElement('web-ui-collapse')
    el.peek = '100px'
    el.innerHTML =
      '<button class="trigger">Trigger</button><div slot="content"><button class="inside" style="height: 200px">Inside</button></div>'
    document.body.append(el)
    await el.updateComplete

    const inside = el.querySelector<HTMLButtonElement>('button.inside')!
    expect(queryContentContainer(el).hidden).toBe(false)
    inside.focus()
    expect(document.activeElement).not.toBe(inside)

    el.open = true
    await el.updateComplete
    await settle(el)

    inside.focus()
    expect(document.activeElement).toBe(inside)
  })

  // 外层收起不该改写内层的 open 状态：否则重新展开时嵌套面板已经莫名开了。
  it('嵌套 collapse：外层收起只裁剪内容，不改写内层 open', async () => {
    const el = createCollapse(
      '<button class="trigger">Outer</button><div slot="content"><web-ui-collapse id="inner"><button class="trigger">Inner</button><div slot="content">InnerContent</div></web-ui-collapse></div>'
    )
    await el.updateComplete
    const inner = el.querySelector<WebUiCollapse>('#inner')!
    await inner.updateComplete

    el.open = true
    await el.updateComplete
    await settle(el)
    inner.open = true
    await inner.updateComplete
    await settle(inner)
    expect(inner.open).toBe(true)

    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hidden === true, 'outer content did not hide')

    expect(inner.open).toBe(true)
  })

  // 首帧没有 before-change 样式可过渡；这里证明它不会启动一条动画（而不是等它跑完）。
  it('初始带 open attribute 直接落稳态，不播放展开过渡', async () => {
    const el = document.createElement('web-ui-collapse')
    el.setAttribute('open', '')
    el.innerHTML = '<button class="trigger">Trigger</button><div slot="content">Content</div>'
    document.body.append(el)
    await el.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    expect(el.open).toBe(true)
    expect(queryContentContainer(el).hidden).toBe(false)
    expect(queryTrack(el).getAnimations()).toHaveLength(0)
  })

  // 断连会清掉兜底定时器，稳态就落不下去；重连时组件必须自我收敛，否则容器会永久保持
  // 打开态的可见性。
  it('关闭动画中断后断连-重连：清瞬态并落到关闭稳态，无残留', async () => {
    const el = createCollapse()
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await settle(el)

    el.open = false
    await el.updateComplete
    // 进入关闭动画后立刻卸载——兜底定时器被清，稳态不落
    expect(queryContentContainer(el).hidden).toBe(false)
    el.remove()

    document.body.append(el)
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hidden === true, 'content did not reach the closed steady state')

    expect(queryTrack(el).getAnimations()).toHaveLength(0)
    expect(queryInner(el).hasAttribute('inert')).toBe(false)
  })
})
