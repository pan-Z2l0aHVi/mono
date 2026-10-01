import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { pollUntil } from '@/shared/test-utils'

import type { DrawerPlacement, WebUiDrawer } from '..'

/*
 * 上下 placement 的拖拽热区必须让开 panel 端头上的 header / footer。
 *
 * 缺陷形态：热区是 dialog 的绝对定位兄弟节点，`placement=bottom` 时 `top: 0`——与 header
 * 起点完全重合。热区 z-index 高于 panel 主体，于是 header 上的按钮既点不到、按下也开不了拖拽，
 * 整条 header 被一条 20px 宽的透明带盖住。`placement=top` 是同一条缺陷的镜像，压的是 footer。
 *
 * 判据全部取**几何关系**（热区端边与那一节的边界），不读 `--wui-internal-drawer-*-inset`：
 * 那个属性是实现手段，且让位量写成「高度 + 间距」的 calc，读它等于把断言抄回实现。
 *
 * 之所以必须 browser mode：让开量来自 offsetHeight 与 CSS 绝对定位偏移，jsdom 没有布局，
 * 两边都是 0，断言会无条件通过。
 */

const EPS = 0.5

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function query(el: WebUiDrawer, selector: string): HTMLElement {
  return el.shadowRoot?.querySelector(selector) as HTMLElement
}

async function mountDrawer(options: {
  placement: DrawerPlacement
  header?: boolean
  footer?: boolean
  headerHeight?: number
  dragZoneInset?: string
}): Promise<WebUiDrawer> {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  el.placement = options.placement
  el.draggable = true
  el.innerHTML = [
    options.header
      ? `<div slot="header" style="height:${options.headerHeight ?? 56}px;display:flex;align-items:center">标题</div>`
      : '',
    options.footer ? '<div slot="footer" style="height:64px">操作</div>' : '',
    '<div style="width:200px;height:180px">正文</div>'
  ].join('')
  if (options.dragZoneInset !== undefined) {
    el.style.setProperty('--wui-drawer-drag-zone-inset', options.dragZoneInset)
  }
  document.body.appendChild(el)
  el.open = true
  await el.updateComplete
  await pollUntil(() => getDialog(el).classList.contains('is-visible'), 'drawer did not become visible')
  await settleGeometry(el)
  return el
}

/**
 * 等打开过渡收敛到终态几何。
 *
 * 只等 `is-visible` 不够：进场过渡还在跑时量到的是中间帧，`placement=top` 的闭合位移是
 * `translateY(-100% - inset)`，未收敛时 footer 的顶边会读成视口上方的负值（实测 -97px），
 * 断言于是拿一个动画中间态去和终态比较。判据取「dialog 矩形连续两次采样不再变化」——
 * 本文件量的就是几何本身，按几何收敛即可（与 drag-bar-inset.browser.spec.ts 同一条理由）。
 */
async function settleGeometry(el: WebUiDrawer, timeoutMs = 5000) {
  const dialog = getDialog(el)
  const start = performance.now()
  let previous = dialog.getBoundingClientRect()
  let stableSamples = 0
  while (stableSamples < 2) {
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => setTimeout(resolve, 32))
    const current = dialog.getBoundingClientRect()
    stableSamples =
      Math.abs(current.top - previous.top) < 0.01 &&
      Math.abs(current.bottom - previous.bottom) < 0.01 &&
      Math.abs(current.left - previous.left) < 0.01 &&
      Math.abs(current.right - previous.right) < 0.01
        ? stableSamples + 1
        : 0
    previous = current
    if (performance.now() - start > timeoutMs) throw new Error('drawer geometry did not settle')
  }
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer 拖拽热区避让 header / footer（浏览器）', () => {
  it('bottom placement 的热区顶端不落在 header 上（核心判据）', async () => {
    const el = await mountDrawer({ placement: 'bottom', header: true })
    const header = query(el, '.wui-drawer-header').getBoundingClientRect()
    const zone = query(el, '.wui-drawer-drag-zone').getBoundingClientRect()

    // 热区整体在 header 之下，而不是与它起点重合。
    expect(zone.top, `header bottom=${header.bottom} zone top=${zone.top}`).toBeGreaterThanOrEqual(header.bottom - EPS)
  })

  it('top placement 的热区底端不落在 footer 上（对称）', async () => {
    const el = await mountDrawer({ placement: 'top', footer: true })
    const footer = query(el, '.wui-drawer-footer').getBoundingClientRect()
    const zone = query(el, '.wui-drawer-drag-zone').getBoundingClientRect()

    expect(zone.bottom, `footer top=${footer.top} zone bottom=${zone.bottom}`).toBeLessThanOrEqual(footer.top + EPS)
  })

  it('热区与被让开的那一节之间留有可调的呼吸间距，且间距可被 token 改写', async () => {
    const withDefault = await mountDrawer({ placement: 'bottom', header: true })
    const defaultGap =
      query(withDefault, '.wui-drawer-drag-zone').getBoundingClientRect().top -
      query(withDefault, '.wui-drawer-header').getBoundingClientRect().bottom
    withDefault.remove()

    const widened = await mountDrawer({ placement: 'bottom', header: true, dragZoneInset: '18px' })
    const wideGap =
      query(widened, '.wui-drawer-drag-zone').getBoundingClientRect().top -
      query(widened, '.wui-drawer-header').getBoundingClientRect().bottom

    // 默认值与 --wui-space-1（4px）同源；真机调参只改 token，不回滚代码。
    expect(Math.abs(defaultGap - 4), `默认间距=${defaultGap}`).toBeLessThanOrEqual(EPS)
    expect(Math.abs(wideGap - 18), `覆盖后间距=${wideGap}`).toBeLessThanOrEqual(EPS)
  })

  it('header 高度变化后热区跟着让位（窄屏断点改写高度的路径）', async () => {
    const el = await mountDrawer({ placement: 'bottom', header: true })
    const header = query(el, '.wui-drawer-header')
    const dialog = getDialog(el)
    // 让位量必须相对**面板**量，不能用视口绝对坐标：`bottom` placement 是下沿锚定的，
    // header 变矮时面板自身向上长，恰好把热区的视口 top 顶回原处（实测 672 → 672）。
    // 拿绝对坐标断言会把「热区让位失效」与「面板动了」混成同一个现象。
    const avoidBefore = () =>
      query(el, '.wui-drawer-drag-zone').getBoundingClientRect().top - dialog.getBoundingClientRect().top
    const before = avoidBefore()

    // 模拟 consumer 在窄屏把 header 压到更矮（或反过来加高）。
    header.style.height = '20px'
    await pollUntil(() => avoidBefore() < before - 4, 'drag zone did not follow header resize')
    const after = avoidBefore()
    expect(after, `让位量 before=${before} after=${after}`).toBeLessThan(before)
    // 让位量恒等于该节高度 + 间距，而不是别的什么数。
    expect(
      Math.abs(after - (header.offsetHeight + 4)),
      `header=${header.offsetHeight} 让位量=${after}`
    ).toBeLessThanOrEqual(EPS)
  })

  it('header 上的 pointerdown 不触发拖拽', async () => {
    const el = await mountDrawer({ placement: 'bottom', header: true })
    const header = query(el, '.wui-drawer-header')
    const zone = query(el, '.wui-drawer-drag-zone')
    const headerRect = header.getBoundingClientRect()
    const zoneRect = zone.getBoundingClientRect()

    // 命中测试层面的判据：header 中线处的顶层元素不是热区。
    const hit = document.elementFromPoint(
      headerRect.left + headerRect.width / 2,
      headerRect.top + headerRect.height / 2
    )
    expect(zone.contains(hit), 'header 中线处仍命中拖拽热区').toBe(false)
    expect(zoneRect.top, `zone top=${zoneRect.top} header bottom=${headerRect.bottom}`).toBeGreaterThanOrEqual(
      headerRect.bottom - EPS
    )

    header.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }))
    await el.updateComplete
    // 没有 is-dragging 即没有进入拖拽；几何断言已在上面覆盖命中关系，这里只钉住状态机入口。
    expect(getDialog(el).classList.contains('is-dragging')).toBe(false)
  })

  it('左右 placement 的几何完全不受影响', async () => {
    for (const placement of ['right', 'left'] as const) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const dialog = getDialog(el).getBoundingClientRect()
      const zone = query(el, '.wui-drawer-drag-zone').getBoundingClientRect()

      // 仍是整条竖边上的 20px 通条，不因 header / footer 的存在而缩短或偏移。
      expect(Math.abs(zone.height - dialog.height), `${placement} zone 高=${zone.height}`).toBeLessThanOrEqual(EPS)
      expect(Math.abs(zone.width - 20), `${placement} zone 宽=${zone.width}`).toBeLessThanOrEqual(EPS)
      expect(
        Math.abs(placement === 'right' ? zone.left - dialog.left : dialog.right - zone.right),
        `${placement} 内缘偏移不符`
      ).toBeLessThanOrEqual(EPS)
      el.remove()
    }
  })

  it('没有 header / footer 时热区回到面板端头（让位量为 0）', async () => {
    for (const placement of ['bottom', 'top'] as const) {
      const el = await mountDrawer({ placement })
      const dialog = getDialog(el).getBoundingClientRect()
      const zone = query(el, '.wui-drawer-drag-zone').getBoundingClientRect()

      expect(
        Math.abs(placement === 'bottom' ? zone.top - dialog.top : dialog.bottom - zone.bottom),
        `${placement} 无头尾时让位=${placement === 'bottom' ? zone.top - dialog.top : dialog.bottom - zone.bottom}`
      ).toBeLessThanOrEqual(EPS)
      el.remove()
    }
  })
})
