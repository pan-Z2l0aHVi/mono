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

/**
 * 再等 n 帧。
 *
 * 让位量不来自布局本身，而来自 ResizeObserver 回调写回的自定义属性：那一节被重新隐藏后，
 * 观察者要等一次尺寸回调才把让位量归零。`settleGeometry` 量的是 dialog 矩形，收敛时那一节
 * 可能刚好已隐藏、属性却还没回写，所以这里再跨几帧把这条链路走完。按帧等而不是 sleep：
 * 高负载下帧变慢，等待随之拉长而不是提前落空。
 */
async function settleFrames(frames: number) {
  for (let i = 0; i < frames; i++) await new Promise(resolve => requestAnimationFrame(resolve))
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

  it('A6 几何让开 + R1 状态机入口', async () => {
    const el = await mountDrawer({ placement: 'bottom', header: true })
    const header = query(el, '.wui-drawer-header')
    const zone = query(el, '.wui-drawer-drag-zone')
    const headerRect = header.getBoundingClientRect()
    const zoneRect = zone.getBoundingClientRect()

    // 命中测试层面的判据：header **起始带**（面板端头那 20px 内的条）的顶层元素不是热区。
    //
    // 探针取 `headerRect.top + 4` 而非中线：header ≥56px、zone 只有 20px，`top: 0` 回归
    // 只盖住 0–20px 那一条，中线（≥28px）根本不在其内——探针放中线会对这条回归天然瞎，
    // 恒绿。移到起始带后：修复态 zone 已在 header 之下（≥ header bottom），探针落在 header
    // 内、不在 zone 内；`top: 0` 变异态 zone 盖回起始带，探针才落进 zone、断言随之变红。
    //
    // 这条只守「起始带没被 zone 盖住」这一局部命中关系；「zone 让开 header 整体」由紧挨着的
    // 矩形判据（zoneRect.top ≥ headerRect.bottom）承重，两者不可互相替代。
    //
    // 必须在 shadowRoot 上问：`document.elementFromPoint` 穿透 shadow root 时只返回
    // 宿主 `web-ui-drawer`，而 `zone.contains(host)` 恒为 false——这条断言曾经恒真、
    // 永不失败，正是本文件头部与新 spec 都点名禁用的写法。
    const hit = el.shadowRoot?.elementFromPoint(headerRect.left + headerRect.width / 2, headerRect.top + 4) ?? null
    expect(zone.contains(hit), 'header 起始带仍命中拖拽热区').toBe(false)
    expect(zoneRect.top, `zone top=${zoneRect.top} header bottom=${headerRect.bottom}`).toBeGreaterThanOrEqual(
      headerRect.bottom - EPS
    )

    /*
     * 这一段随「header 整块可拖」翻转了方向：早前它断言 header 上的 pointerdown
     * **不**起拖拽，现在断言**会**起拖拽——热区让开之后，header 改由自己接手势。
     *
     * 必须显式给 isPrimary: true：PointerEvent 构造函数的默认值是 false，而手势层
     * 第一道闸门就是 `e.isPrimary === false` 直接退出。漏掉它这条断言会在任何实现下
     * 都恒绿（旧写法就是这么悄悄失去证伪能力的）。
     */
    header.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        clientX: headerRect.left + headerRect.width / 2,
        clientY: headerRect.top + headerRect.height / 2
      })
    )
    await el.updateComplete
    expect(getDialog(el).classList.contains('is-dragging'), 'header 上的 pointerdown 没有进入拖拽').toBe(true)
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

  it('断开期间清空 footer，重连后热区让位量归零', async () => {
    // footer 是 `top` placement 的对位：`bottom` 贴顶边让开 header，`top` 贴底边让开 footer。
    const el = await mountDrawer({ placement: 'top', footer: true })
    const dialog = getDialog(el)
    // 让位量相对**面板**量，与本文件既有用例同一口径：bottom placement 是下沿锚定的，
    // 面板自身长度会变，拿视口绝对坐标会把「让位归零」与「面板动了」混成同一现象。
    const avoid = () =>
      dialog.getBoundingClientRect().bottom - query(el, '.wui-drawer-drag-zone').getBoundingClientRect().bottom
    const withFooter = avoid()
    expect(withFooter, `有 footer 时让位=${withFooter}`).toBeGreaterThan(64)

    el.remove()
    el.querySelector('[slot="footer"]')!.remove()
    document.body.append(el)
    await el.updateComplete
    await pollUntil(() => getDialog(el).classList.contains('is-visible'), 'drawer did not become visible after remount')
    await settleGeometry(el)
    await settleFrames(3)

    /*
     * 判据是**关系**：重连后的让位量与「从来没有 footer」是同一几何（同为本文件紧挨着的
     * 那条用例的终点），而不是钉某个像素值。让位量取自 offsetHeight，浏览器实测 32px 的空节
     * 也会让位——正是本缺陷用户可感知的那条死带。
     */
    expect(Math.abs(avoid()), `重连后让位=${avoid()}`).toBeLessThanOrEqual(EPS)
  })
})
