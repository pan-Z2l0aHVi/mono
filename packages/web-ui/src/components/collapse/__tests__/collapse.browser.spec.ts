import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/collapse-content'
import '@/components/collapse-trigger'
import '@/components/theme'
import type { WebUiCollapseContent } from '@/components/collapse-content'
import type { WebUiCollapseTrigger } from '@/components/collapse-trigger'

import type { WebUiCollapse } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 轮询确定性信号；超时走 promise reject（不能在 promise 外 throw）。
function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const step = (): void => {
      if (predicate()) return resolve()
      if (performance.now() - start > timeoutMs) return reject(new Error('waitFor timeout'))
      setTimeout(step, 16)
    }
    step()
  })
}

function queryTrigger(el: WebUiCollapse): WebUiCollapseTrigger {
  return el.querySelector<WebUiCollapseTrigger>('web-ui-collapse-trigger')!
}

function queryContent(el: WebUiCollapse): WebUiCollapseContent {
  return el.querySelector<WebUiCollapseContent>('web-ui-collapse-content')!
}

function queryInnerButton(el: WebUiCollapse): HTMLButtonElement {
  return queryTrigger(el).shadowRoot!.querySelector('button')!
}

function queryTrack(el: WebUiCollapse): HTMLElement {
  // 宿主为 display: contents（垂直）无盒子；动画尺寸以内部 track 为准。
  return queryContent(el).shadowRoot!.querySelector('.wui-collapse-track')!
}

function trackHeight(el: WebUiCollapse): number {
  return queryTrack(el).getBoundingClientRect().height
}

function trackWidth(el: WebUiCollapse): number {
  return queryTrack(el).getBoundingClientRect().width
}

// grid 过渡结束信号：直接监听 track 的 transitionend（含 rows/columns 两种轴向）。
function onceTransitionEnds(el: WebUiCollapse): Promise<void> {
  return new Promise(resolve => {
    const track = queryTrack(el)
    const handler = (event: TransitionEvent) => {
      if (event.propertyName === 'grid-template-rows' || event.propertyName === 'grid-template-columns') {
        track.removeEventListener('transitionend', handler)
        resolve()
      }
    }
    track.addEventListener('transitionend', handler)
  })
}

/*
 * 展开稳态：presence=open 且 track 高度到达预期值。
 * 不用 transitionend：同帧 close→reopen 会取消过渡（净样式无变化），事件不触发，
 * 组件本身正确落稳态（debug 实证），等待必须对中断路径健壮。
 */
async function waitForOpenSettled(el: WebUiCollapse, expectedHeight: number) {
  await waitFor(() => queryTrack(el).getAttribute('data-wui-presence') === 'open')
  await waitFor(() => trackHeight(el) === expectedHeight)
  await nextFrame()
}

// 三个 shadow/根元素全部完成本轮渲染。
async function waitForUpdateAll(el: WebUiCollapse) {
  await el.updateComplete
  await queryTrigger(el).updateComplete
  await queryContent(el).updateComplete
}

afterEach(() => document.body.replaceChildren())

describe('WebUiCollapse 组件（浏览器）', () => {
  it('展开时高度从 0 过渡到内容高度，收起后归零', async () => {
    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content><div style="height: 80px">Content</div></web-ui-collapse-content>'
    document.body.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    // 关闭稳态：hidden，高度 0
    expect(trackHeight(el)).toBe(0)

    const opened = onceTransitionEnds(el)
    el.open = true
    await waitForUpdateAll(el)
    await opened
    await nextFrame()

    expect(trackHeight(el)).toBe(80)
    expect(queryContent(el).hasAttribute('hidden')).toBe(false)

    el.open = false
    await waitForUpdateAll(el)
    await waitFor(() => queryContent(el).hasAttribute('hidden'))

    expect(trackHeight(el)).toBe(0)
  })

  it('关闭过渡中重新打开：中断续接完整展开无 hidden 泄漏', async () => {
    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content><div style="height: 60px">Content</div></web-ui-collapse-content>'
    document.body.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    el.open = true
    await waitForUpdateAll(el)
    await waitForOpenSettled(el, 60)
    expect(trackHeight(el)).toBe(60)

    // 展开完成后立即关闭再立即重开（中断收起动画）
    el.open = false
    await waitForUpdateAll(el)
    el.open = true
    await waitForUpdateAll(el)
    await waitForOpenSettled(el, 60)

    expect(el.open).toBe(true)
    expect(queryContent(el).hasAttribute('hidden')).toBe(false)
    expect(trackHeight(el)).toBe(60)
  })

  it('keep-mounted 收起稳态保留内容可测量且滚动位置不丢', async () => {
    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content keep-mounted><div style="height: 100px; overflow-y: auto">Content<div style="height: 300px"></div></div></web-ui-collapse-content>'
    document.body.append(el)
    await el.updateComplete
    const content = queryContent(el)
    await content.updateComplete

    el.open = true
    await waitForUpdateAll(el)
    await waitForOpenSettled(el, 100)

    // 内容内部滚动后收起：keep-mounted 应保留 scrollTop
    const inner = content.querySelector('div') as HTMLElement
    inner.scrollTop = 42
    expect(inner.scrollTop).toBe(42)

    el.open = false
    await waitForUpdateAll(el)
    await waitFor(() => content.shadowRoot!.querySelector('.wui-collapse-inner')?.getAttribute('inert') !== null)

    expect(content.hasAttribute('hidden')).toBe(false)
    expect(inner.scrollTop).toBe(42)

    // 重新展开内容完整可见，滚动位置仍在
    el.open = true
    await waitForUpdateAll(el)
    await waitForOpenSettled(el, 100)
    expect(trackHeight(el)).toBe(100)
    expect(inner.scrollTop).toBe(42)
  })

  it('horizontal 沿宽度展开收起', async () => {
    const el = document.createElement('web-ui-collapse')
    el.horizontal = true
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content><div style="width: 120px; height: 30px; white-space: nowrap">Content</div></web-ui-collapse-content>'
    document.body.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    expect(trackWidth(el)).toBe(0)

    const opened = onceTransitionEnds(el)
    el.open = true
    await waitForUpdateAll(el)
    await opened

    expect(trackWidth(el)).toBe(120)

    el.open = false
    await waitForUpdateAll(el)
    await waitFor(() => queryContent(el).hasAttribute('hidden'))
    expect(trackWidth(el)).toBe(0)
  })

  it('键盘 Enter/Space 语义（button click）切换并派发事件', async () => {
    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content>Content</web-ui-collapse-content>'
    document.body.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    const button = queryInnerButton(el)
    const events: CustomEvent[] = []
    el.addEventListener('open-change', e => events.push(e as CustomEvent))

    button.click() // 键盘激活 button 走同一条 click 事件路径
    await waitForUpdateAll(el)

    expect(el.open).toBe(true)
    expect(events).toHaveLength(1)
    expect((events[0] as CustomEvent<{ open: boolean }>).detail.open).toBe(true)

    button.click()
    await waitForUpdateAll(el)
    expect(el.open).toBe(false)
    expect(events).toHaveLength(2)
  })

  it('嵌套 collapse：内层展开外层跟随，外层收起裁剪内层', async () => {
    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Outer</web-ui-collapse-trigger><web-ui-collapse-content><div><div style="height: 100px">Body</div><web-ui-collapse id="inner"><web-ui-collapse-trigger>Inner</web-ui-collapse-trigger><web-ui-collapse-content><div style="height: 50px">InnerContent</div></web-ui-collapse-content></web-ui-collapse></div></web-ui-collapse-content>'
    document.body.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    const inner = document.getElementById('inner') as WebUiCollapse
    await inner.updateComplete
    await inner.querySelector<WebUiCollapseContent>('web-ui-collapse-content')!.updateComplete

    const outerOpened = onceTransitionEnds(el)
    el.open = true
    await waitForUpdateAll(el)
    await outerOpened
    // 内层 trigger 按钮（约 18px 行高）计入外层内容高度
    expect(trackHeight(el)).toBe(118)

    // 内层展开：外层高度跟随增长
    const innerOpened = onceTransitionEnds(inner)
    inner.open = true
    await waitForUpdateAll(inner)
    await innerOpened
    await nextFrame()
    expect(trackHeight(el)).toBe(168)
    expect(trackHeight(inner)).toBe(50)

    // 外层收起：整体归零（内层仍 open 但被外层 hidden 裁剪）
    el.open = false
    await waitForUpdateAll(el)
    await waitFor(() => queryContent(el).hasAttribute('hidden'))
    expect(trackHeight(el)).toBe(0)
    expect(inner.open).toBe(true)
  })

  it('disabled 时 trigger 内部 button 不可点击且 open 不变', async () => {
    const el = document.createElement('web-ui-collapse')
    el.disabled = true
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content>Content</web-ui-collapse-content>'
    document.body.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    const button = queryInnerButton(el)
    expect(button.disabled).toBe(true)

    button.click()
    await waitForUpdateAll(el)
    expect(el.open).toBe(false)
  })

  it('aria-controls 指向 content id，aria-expanded 同步', async () => {
    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content>Content</web-ui-collapse-content>'
    document.body.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    const button = queryInnerButton(el)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.getAttribute('aria-controls')).toBe(queryContent(el).id)

    el.open = true
    await waitForUpdateAll(el)
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })
})
