import '..'
import '@/components/button'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { afterRenderStep, pollUntil } from '@/shared/test-utils'
import { scrollElementTo } from '@/shared/test-utils/viewport'

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

// 轮询确定性信号；预算与超时诊断由共享 pollUntil 承担（2000ms 的预算在
// 并行跑全仓时被 CPU 竞争吃光过一次，属于假红而不是行为错）。
/*
 * 落稳态观察面用 Web Animations API，不读内部状态标记：
 * `getAnimations()` 对「有动效 vs 没有动效」有完全区分力，过渡跑完即为空集。
 * 不用 `transitionend`：同帧 close→reopen 会取消过渡（净样式无变化），事件不触发，
 * 而组件本身正确落稳态（实测），等待必须对中断路径健壮。
 */
function settle(el: WebUiCollapse): Promise<void> {
  return pollUntil(() => queryTrack(el).getAnimations().length === 0, 'collapse transition did not settle')
}

afterEach(() => document.body.replaceChildren())

/*
 * 本文件只保留浏览器里才能观察到的契约：真实的过渡生命周期（中断/续接/落稳态）、
 * 真实布局下的内容挂载与滚动位置、真实焦点归宿、真实 inert 阻断。
 */
describe('WebUiCollapse 组件（浏览器）', () => {
  it('web-ui-button trigger 的开合状态出现在可访问 button 上', async () => {
    const el = createCollapse('<web-ui-button>Trigger</web-ui-button><div slot="content">Content</div>')
    await el.updateComplete
    const trigger = page.elementLocator(el).getByRole('button', { name: 'Trigger' })
    const button = trigger.element() as HTMLButtonElement

    expect(trigger.length).toBe(1)
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.hasAttribute('aria-controls')).toBe(false)

    button.click()
    await el.updateComplete
    await el.querySelector('web-ui-button')!.updateComplete
    expect(button.getAttribute('aria-expanded')).toBe('true')

    el.disabled = true
    await el.updateComplete
    await el.querySelector('web-ui-button')!.updateComplete
    expect(button.disabled).toBe(true)

    el.disabled = false
    await el.updateComplete
    await el.querySelector('web-ui-button')!.updateComplete
    expect(button.disabled).toBe(false)
  })

  it('替换 disabled trigger 会还原旧 web-ui-button 的状态', async () => {
    const el = createCollapse('<web-ui-button>Trigger</web-ui-button><div slot="content">Content</div>')
    el.disabled = true
    await el.updateComplete

    const trigger = el.querySelector('web-ui-button')!
    await trigger.updateComplete
    const button = trigger.shadowRoot!.querySelector<HTMLButtonElement>('button[part="button"]')!
    expect(button.disabled).toBe(true)

    let clickCount = 0
    trigger.addEventListener('click', () => clickCount++)
    trigger.remove()
    await pollUntil(() => !trigger.hasAttribute('disabled'), 'detached trigger kept its disabled attribute')
    await trigger.updateComplete

    expect(trigger.hasAttribute('aria-expanded')).toBe(false)
    expect(trigger.hasAttribute('aria-controls')).toBe(false)
    button.click()
    expect(clickCount).toBe(1)
  })

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
    await pollUntil(() => queryContentContainer(el).hidden === true, 'content did not hide again')
  })

  // 过渡被中断时若不续接，panel 会卡在中间态：hidden 泄漏或永久 inert。
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
    await scrollElementTo(innerContent, 42)

    el.open = false
    await el.updateComplete
    await pollUntil(() => queryInner(el).hasAttribute('inert'), 'inner never became inert')

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

  // 外层收起不该改写内层的 open 状态：否则重新展开时嵌套 panel 已经莫名开了。
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
    await pollUntil(() => queryContentContainer(el).hidden === true, 'outer content did not hide')

    expect(inner.open).toBe(true)
  })

  // peek 的边缘晕染要真的把背后的画面模糊掉（#221），而 blur 只在下面两件事同时成立时
  // 才会出现在屏幕上：伪元素存在、以及活动长度真的到达了伪元素。
  // 第二条最脆——--wui-collapse-peek-edge-active 一旦以 inherits: false 注册，伪元素读到的是
  // initialValue 0px，mask 塌缩、模糊静默消失，而其余渲染一切照旧（style.css:158 记的就是这条
  // 约束）。所以这里显式比对伪元素与跟踪元素上的同一枚 token，渐变带的色标写法与盒子像素
  // 不在这里判：那是表现细节，由视觉基线承担。
  it('peek 边缘晕染：伪元素带真实背景模糊，且活动长度到达伪元素', async () => {
    const el = document.createElement('web-ui-collapse')
    el.peek = '200px'
    el.innerHTML =
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 600px">Content</div></div>'
    document.body.append(el)
    await el.updateComplete

    const inner = queryInner(el)
    const overlay = getComputedStyle(inner, '::after')
    expect(overlay.content, '晕染伪元素不存在，背后画面无从模糊').not.toBe('none')
    expect(overlay.backdropFilter, '晕染层没有背景模糊').not.toBe('none')
    const active = getComputedStyle(inner).getPropertyValue('--wui-collapse-peek-edge-active')
    expect(active, '收起态活动长度不应是 0').not.toBe('0px')
    expect(
      overlay.getPropertyValue('--wui-collapse-peek-edge-active'),
      'token 没继承到伪元素，渐变会塌缩成不可见'
    ).toBe(active)
  })

  // 展开态活动长度归 0：晕染层随之退场。取错注册参数时伪元素停在 initialValue，
  // 淡出与归零都看不出区别，因此这里同样以伪元素上的读数为准。
  it('展开态晕染层退场：伪元素上的活动长度归 0', async () => {
    const el = document.createElement('web-ui-collapse')
    el.peek = '200px'
    el.innerHTML =
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 600px">Content</div></div>'
    document.body.append(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete
    // peek 展开时 track 自身不产生过渡（两端都是 1fr），渐变带的淡出过渡落在 inner 上，等它跑完。
    await pollUntil(
      () => getComputedStyle(queryInner(el)).getPropertyValue('--wui-collapse-peek-edge-active') === '0px',
      'peek edge band did not fade out'
    )

    const overlay = getComputedStyle(queryInner(el), '::after')
    expect(overlay.getPropertyValue('--wui-collapse-peek-edge-active'), '展开后伪元素仍持有活动长度').toBe('0px')
  })

  // 水平方向的晕染带在右缘：方向错了模糊就压在错误的一侧。
  it('水平 peek：晕染层的渐变方向是 to right', async () => {
    const el = document.createElement('web-ui-collapse')
    el.horizontal = true
    el.peek = '200px'
    el.innerHTML =
      '<button class="trigger">Trigger</button><div slot="content"><div style="width: 600px">Content</div></div>'
    document.body.append(el)
    await el.updateComplete

    expect(getComputedStyle(queryInner(el), '::after').maskImage).toMatch(/^linear-gradient\(to right/)
  })

  it('水平 peek 只裁剪宽度并保留内容自然高度', async () => {
    const el = document.createElement('web-ui-collapse')
    el.horizontal = true
    el.peek = '60px'
    el.innerHTML =
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 200px; width: 300px">Content</div></div>'
    document.body.append(el)
    await el.updateComplete

    const rect = queryInner(el).getBoundingClientRect()
    expect(rect.width).toBeCloseTo(60, 1)
    expect(rect.height).toBeCloseTo(200, 1)
  })

  // 首帧没有 before-change 样式可过渡；这里证明它不会启动一条动画（而不是等它跑完）。
  it('初始带 open attribute 直接落稳态，不播放展开过渡', async () => {
    const el = document.createElement('web-ui-collapse')
    el.setAttribute('open', '')
    el.innerHTML = '<button class="trigger">Trigger</button><div slot="content">Content</div>'
    document.body.append(el)
    await el.updateComplete
    // 单帧不够：ResizeObserver 在 rAF 之后投递，动画可能晚一步才排下。走两个完整渲染步进
    // 再断言「没有动画」，既能抓住晚排的过渡，也不会把已经开跑的过渡等没。
    await afterRenderStep()
    await afterRenderStep()

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
    await pollUntil(() => queryContentContainer(el).hidden === true, 'content did not reach the closed steady state')

    expect(queryTrack(el).getAnimations()).toHaveLength(0)
    expect(queryInner(el).hasAttribute('inert')).toBe(false)
  })
})
