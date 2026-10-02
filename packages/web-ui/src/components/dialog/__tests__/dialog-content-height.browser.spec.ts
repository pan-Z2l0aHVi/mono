import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil } from '@/shared/test-utils'

import '..'
import type { WebUiDialog } from '..'

/*
 * dialog 的高度约束下移到内容区（见 style.css「高度约束下移到内容区」）。
 *
 * 改动前宿主必须复述一个会变的 chrome 高度（`calc(var(--wui-dialog-max-height) - 108px)`），
 * 而 footer 那一项就是 --wui-control-size，触摸端媒体查询会把它从 36 抬到 40，
 * 于是宿主的常数立刻腐坏：卡片比 dialog 盒子高出一大截，内容被 dialog 裁掉。
 * 现在 header / footer 完全由内容撑开，上限只落在 `.desc`。
 *
 * 本文件钉住四件事（D1/D2/D3/F），每条断言都指向真实机制而非某个魔数：
 *   D1 footer 随 --wui-control-size 长高，卡片同步长高
 *   D2 token 夹的是内容区本身，且内容区自己是滚动容器
 *   D3 body 模式（无 .desc）逐像素保持改动前的几何
 *   F  title 模式下宿主内层拿满剩余高度，两栏等高
 */

afterEach(() => {
  document.body.replaceChildren()
  document.body.removeAttribute('style')
})

function query<T extends HTMLElement>(component: WebUiDialog, selector: string): T {
  const el = component.shadowRoot?.querySelector(selector) as T | null
  if (!el) throw new Error(`Expected ${selector} to exist.`)
  return el
}

/** `.desc` 的 content box 高度：token 的语义是这个值，不是它的 border box。 */
function descContentHeight(component: WebUiDialog): number {
  const desc = query<HTMLElement>(component, '.desc')
  const styles = getComputedStyle(desc)
  return desc.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
}

/**
 * 打开并等到进场 transform 落定。
 *
 * 必须等 transform 归位：`dialog[open]` 进场时带 `scale(1.1)`，`getBoundingClientRect()`
 * 在那段时间里全部读数虚高 10%。offsetHeight 不受影响，但这里两条路径都用 rect 算间距，
 * 所以统一等到位。
 */
async function openAndSettle(component: WebUiDialog): Promise<void> {
  component.open = true
  await component.updateComplete
  const dialog = query<HTMLDialogElement>(component, 'dialog')
  await pollUntil(() => {
    const transform = getComputedStyle(dialog).transform
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
  }, 'enter transform not settled')
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * title 模式的宿主内层，复刻 AddDialog / RestoreDialog 的写法：
 * 外层 grid 用 `height: 100%` 参与卡片的三行分配。
 */
function buildTitleMode(contentHeight: number): WebUiDialog {
  const component = document.createElement('web-ui-dialog')
  const title = document.createElement('span')
  title.slot = 'title'
  title.textContent = '添加资源'
  const grid = document.createElement('div')
  grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; height: 100%; min-height: 0;'
  for (const label of ['来源', '目标']) {
    const column = document.createElement('section')
    column.style.cssText = 'display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; overflow: clip;'
    const head = document.createElement('div')
    head.style.cssText = 'height: 28px;'
    const body = document.createElement('div')
    body.style.cssText = `height: ${contentHeight}px;`
    body.textContent = label
    column.append(head, body)
    grid.append(column)
  }
  const footer = document.createElement('span')
  footer.slot = 'footer'
  const button = document.createElement('web-ui-button')
  button.textContent = '取消'
  footer.append(button)
  component.append(title, grid, footer)
  document.body.append(component)
  return component
}

describe('dialog 内容区高度约束（浏览器）', () => {
  describe('D1 chrome 由内容撑开', () => {
    it('绑定态下 token 的含义不受 chrome 影响：内容区恒等于 token', async () => {
      // 内容远高于 token，`.desc` 被夹在 max-height 上——这才是宿主的真实工况，
      // 也正是改动前 `calc(560px - 108px)` 会失配的那一档。
      const component = buildTitleMode(3000)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      await openAndSettle(component)

      const footer = query<HTMLElement>(component, '.wui-dialog-footer')
      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const before = {
        footer: footer.offsetHeight,
        card: card.offsetHeight,
        content: descContentHeight(component)
      }

      // 触摸端的真实取值：`@media (pointer: coarse)` 把 36 抬到 40。
      component.style.setProperty('--wui-control-size', '40px')
      await new Promise(resolve => requestAnimationFrame(resolve))

      const after = {
        footer: footer.offsetHeight,
        card: card.offsetHeight,
        content: descContentHeight(component)
      }
      expect(before.footer).toBe(36)
      expect(after.footer).toBe(40)
      // 这条才是重点：`.desc` 的上限直接来自 token，与 footer 多高无关。
      // 改动前宿主写 `calc(var(--wui-dialog-max-height) - 108px)`，那 108 里含
      // footer 的 --wui-control-size，于是触摸端 36→40 会让内容区莫名少 4px。
      // 现在内容区就是 token 本身，chrome 变高只会让卡片等量长高。
      expect(before.content).toBe(560)
      expect(after.content).toBe(560)
      expect(after.card - before.card).toBe(after.footer - before.footer)
    })

    it('非绑定态下内容区保持内容尺寸，卡片跟着 footer 长高', async () => {
      const component = buildTitleMode(120)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      await openAndSettle(component)
      const footer = query<HTMLElement>(component, '.wui-dialog-footer')
      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const before = { footer: footer.offsetHeight, card: card.offsetHeight }

      component.style.setProperty('--wui-control-size', '40px')
      await new Promise(resolve => requestAnimationFrame(resolve))

      // token 是上限而非定值：内容不足时 `.desc` 不撑高，footer 长出来的那 4px
      // 由卡片自己承担，不会凭空把短内容区拉高。
      expect(footer.offsetHeight - before.footer).toBe(4)
      expect(card.offsetHeight - before.card).toBe(4)
    })
  })

  describe('D2 上限落在内容区', () => {
    it('token 夹住 .desc 的 content box，卡片不再超出 dialog 盒子', async () => {
      const component = buildTitleMode(2000)
      component.style.setProperty('--wui-dialog-max-height', '200px')
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const dialog = query<HTMLDialogElement>(component, 'dialog')
      expect(descContentHeight(component)).toBe(200)
      expect(card.offsetHeight).toBeLessThanOrEqual(dialog.offsetHeight)
    })

    it('内容溢出时 .desc 自己是滚动容器，不是靠 dialog 裁掉', async () => {
      // 刻意不用 buildTitleMode：它那两栏带 overflow: clip，溢出在栏内就被吃掉，
      // `.desc` 从来没真正滚动过，这种 fixture 验不出滚动容器。
      const component = document.createElement('web-ui-dialog')
      const content = document.createElement('div')
      content.style.cssText = 'height: 3000px;'
      component.append(content)
      document.body.append(component)
      component.style.setProperty('--wui-dialog-max-height', '200px')
      await openAndSettle(component)
      const desc = query<HTMLElement>(component, '.desc')

      // scrollHeight > clientHeight：内容区确实装不下，两轴没有把溢出吞掉。
      expect(desc.scrollHeight).toBeGreaterThan(desc.clientHeight)
      // 真的能滚。只断言上一条的话，overflow 写成 hidden 也能过（hidden 同样让
      // scrollHeight 大于 clientHeight），必须写 scrollTop 才能区分 auto 与 hidden。
      desc.scrollTop = 9999
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(desc.scrollTop).toBeGreaterThan(0)
      expect(getComputedStyle(desc).overflowY).toBe('auto')
      // 滚下去之后卡片几何不变：滚动发生在内容区内部，没有把内容顶出 dialog 盒子。
      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const dialog = query<HTMLDialogElement>(component, 'dialog')
      expect(card.offsetHeight).toBeLessThanOrEqual(dialog.offsetHeight)
    })

    it('token 越大内容区越高：560 与 452 得到两个不同高度', async () => {
      const heights: number[] = []
      for (const token of ['560px', '452px']) {
        const component = buildTitleMode(3000)
        component.style.setProperty('--wui-dialog-max-height', token)
        await openAndSettle(component)
        heights.push(descContentHeight(component))
        document.body.replaceChildren()
      }
      expect(heights).toEqual([560, 452])
    })

    it('token 大过视口余量时整卡兜底接住，内容区被压到视口内并自己滚', async () => {
      const component = document.createElement('web-ui-dialog')
      const content = document.createElement('div')
      content.style.cssText = 'height: 3000px;'
      component.append(content)
      document.body.append(component)
      // 5000px 远超 896px 视口：此时先触发的是 dialog 的 100dvh 整卡兜底，
      // 而不是 token。卡片必须被压进视口，压缩量由 `.desc` 的 minmax(0,1fr) +
      // min-height: 0 + overflow-y: auto 三者共同承担。
      component.style.setProperty('--wui-dialog-max-height', '5000px')
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const dialog = query<HTMLDialogElement>(component, 'dialog')
      const desc = query<HTMLElement>(component, '.desc')
      expect(dialog.offsetHeight).toBe(window.innerHeight)
      expect(card.offsetHeight).toBeLessThanOrEqual(dialog.offsetHeight)
      // 兜底真的压到了内容区：token 的 5000 没有被放行。
      expect(descContentHeight(component)).toBeLessThan(5000)
      // 且压下来的内容区仍在滚，而不是把溢出推给 dialog 裁掉。
      expect(desc.scrollHeight).toBeGreaterThan(desc.clientHeight)
    })

    it('横向不成为滚动容器：内容溢出时也不该多出一条横向滚动条', async () => {
      const component = document.createElement('web-ui-dialog')
      const content = document.createElement('div')
      content.style.cssText = 'width: 2000px; height: 50px;'
      component.append(content)
      document.body.append(component)
      await openAndSettle(component)
      const desc = query<HTMLElement>(component, '.desc')

      // 只断言「不是 auto」而非「等于 clip」：Chromium 会把 clip 与 overflow-y: auto
      // 配对降级成 hidden（实测），Firefox 保持 clip，两者都不画横向滚动条。
      expect(getComputedStyle(desc).overflowX).not.toBe('auto')
      expect(getComputedStyle(desc).overflowX).not.toBe('scroll')
    })
  })

  describe('D3 作用域：body 模式不受影响', () => {
    it('closable + body slot 的几何与改动前逐像素相同', async () => {
      const component = document.createElement('web-ui-dialog')
      component.setAttribute('closable', '')
      const body = document.createElement('section')
      body.slot = 'body'
      body.style.cssText = 'height: 120px;'
      component.append(body)
      document.body.append(component)
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const dialog = query<HTMLDialogElement>(component, 'dialog')
      const close = query<HTMLElement>(component, '.wui-dialog-close')
      await (close as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete
      const cardRect = card.getBoundingClientRect()
      const closeRect = close.getBoundingClientRect()

      // 120（body）+ 20（上 padding）+ 24（下 padding）= 164
      expect(card.offsetHeight).toBe(164)
      expect(closeRect.top - cardRect.top).toBe(16)
      expect(cardRect.right - closeRect.right).toBe(16)
      // 下面两条是作用域本身的证据：body 模式没有 .desc，两条 :has() 规则必须整条不生效。
      // 少了任一条，display 都会从 block 变成 grid / flex，上面三个数字随之失真。
      expect(getComputedStyle(card).display).toBe('block')
      expect(getComputedStyle(dialog).display).toBe('block')
    })

    it('多个块级 body 子元素的行分配与改动前相同', async () => {
      const component = document.createElement('web-ui-dialog')
      for (const height of [40, 60, 30]) {
        const block = document.createElement('div')
        block.slot = 'body'
        block.style.cssText = `height: ${height}px;`
        component.append(block)
      }
      document.body.append(component)
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const dialog = query<HTMLDialogElement>(component, 'dialog')
      const blocks = Array.from(component.children) as HTMLElement[]
      // 40 + 60 + 30 + 20 + 24 = 174。若 grid 行分配误生效，多个子元素会被
      // 拆成 minmax(0,1fr) 三行，块高不再等于各自的 height。
      expect(blocks.map(block => block.offsetHeight)).toEqual([40, 60, 30])
      expect(card.offsetHeight).toBe(174)
      expect(getComputedStyle(card).display).toBe('block')
      // 单列 flex 与 block 在上面那组数字上等价，所以这一条才是 `dialog:has(.desc)`
      // 作用域的独立证据：把它放宽成无条件的 `dialog`，本用例会从 SURVIVED 变 KILLED。
      expect(getComputedStyle(dialog).display).toBe('block')
    })
  })

  describe('F title 模式撑满剩余高度', () => {
    it('两栏等高且拿满内容区的全部高度', async () => {
      const component = buildTitleMode(2000)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      await openAndSettle(component)

      const grid = component.querySelector('div') as HTMLElement
      const columns = Array.from(grid.children) as HTMLElement[]
      expect(columns[0].offsetHeight).toBe(columns[1].offsetHeight)
      // grid 铺满 .desc 的 content box：grid 自身有 6px 的 focus-ring padding 让位，
      // 所以是 desc 的 clientHeight 减去上下 padding，而不是 descContentHeight。
      expect(grid.offsetHeight).toBe(descContentHeight(component))
    })

    it('内容不高时卡片收缩到内容，两栏仍然等高', async () => {
      const component = buildTitleMode(120)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const dialog = query<HTMLDialogElement>(component, 'dialog')
      const grid = component.querySelector('div') as HTMLElement
      const columns = Array.from(grid.children) as HTMLElement[]
      expect(columns[0].offsetHeight).toBe(columns[1].offsetHeight)
      // token 是上限而非定值：内容不足时卡片贴合内容，不撑到 token。
      expect(card.offsetHeight).toBeLessThan(560)
      expect(card.offsetHeight).toBe(dialog.offsetHeight)
    })

    it('focus-ring 余量不改变 title→内容、内容→footer 的视觉间距', async () => {
      const component = buildTitleMode(120)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const desc = query<HTMLElement>(component, '.desc')
      const title = query<HTMLElement>(component, '.title')
      const footer = query<HTMLElement>(component, '.wui-dialog-footer')
      const cardStyles = getComputedStyle(card)
      const descStyles = getComputedStyle(desc)
      const titleStyles = getComputedStyle(title)
      const cardRect = card.getBoundingClientRect()
      const descRect = desc.getBoundingClientRect()
      const footerRect = footer.getBoundingClientRect()

      // `.desc` 变成滚动容器后，贴在内容区上下沿的控件，其 focus ring
      // （offset 2 + width 3 = 5px）会被 padding box 裁掉，所以补 padding-block: 6px。
      // 代价是卡片凭空长高 12px，因此要用等量负 margin 从外部间距里扣回去。
      // 下面两式就是「扣回去」的证据；24 是 --wui-dialog-desc-gap 的默认值，
      // 改动前 .desc 无 padding 时内容末端到 footer 恰好是这个数。
      const ringPad = parseFloat(getComputedStyle(desc).getPropertyValue('--wui-dialog-desc-focus-padding')) || 6
      expect(parseFloat(descStyles.paddingTop)).toBe(ringPad)
      expect(parseFloat(descStyles.paddingBottom)).toBe(ringPad)
      // margin-top 扣掉上 padding：内容起点仍紧跟 title 的外盒，一像素不差。
      const contentTop = descRect.top - cardRect.top + parseFloat(descStyles.paddingTop)
      expect(contentTop).toBe(
        parseFloat(cardStyles.paddingTop) + title.getBoundingClientRect().height + parseFloat(titleStyles.marginBottom)
      )
      // margin-bottom 从 gap 里扣掉下 padding：内容末端到 footer 仍是完整 24。
      const contentBottom = descRect.bottom - cardRect.top - parseFloat(descStyles.paddingBottom)
      expect(parseFloat(descStyles.marginBottom)).toBe(24 - ringPad)
      expect(footerRect.top - cardRect.top - contentBottom).toBe(24)
    })

    it('focus-ring 余量覆盖四条轴，全宽控件的左右环不再被 .desc 裁掉', async () => {
      const component = buildTitleMode(120)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      // 显式设成 8px 而非用默认 6px：这样 padding 断言是真的在跟 token 走，
      // 默认值恰好相同时会退化成恒真。
      component.style.setProperty('--wui-dialog-desc-focus-padding', '8px')
      const ringPad = 8
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const desc = query<HTMLElement>(component, '.desc')
      const grid = component.querySelector('div') as HTMLElement
      const cardStyles = getComputedStyle(card)
      const descStyles = getComputedStyle(desc)
      const descRect = desc.getBoundingClientRect()
      const gridRect = grid.getBoundingClientRect()

      // ring 画在 border box 之外 5px（offset 2 + width 3），而 `.desc` 既是滚动容器、
      // 又因为有一条轴必须非 visible 而成了裁剪盒。裁掉的是 **padding box**：
      // overflow 的裁剪边在 padding 外沿，不是 border 外沿。`.desc` 没有 border，
      // padding box 与 border box 重合，所以下面的 rect 差就是「内容沿该轴到裁剪边
      // 的距离」——判据是这条距离，不是到 border box 的距离。
      //
      // 参照系必须是「朝内」：grid 是 `.desc` 的内容，落在 padding box **内侧**，
      // 所以右边与下边要用 desc 减 grid，反过来写会拿到负数。
      //
      // 只补 `padding-block` 的那版左右 padding 为 0，grid 与 padding box 左右沿重合
      // → 横向余量 0 → 全宽控件的两侧环被裁成 1px 残条。本用例是那条回归的护栏。
      const ring = 5
      expect(parseFloat(descStyles.paddingLeft)).toBe(ringPad)
      expect(parseFloat(descStyles.paddingRight)).toBe(ringPad)
      expect(parseFloat(descStyles.paddingTop)).toBe(ringPad)
      expect(parseFloat(descStyles.paddingBottom)).toBe(ringPad)
      expect(gridRect.left - descRect.left).toBeGreaterThanOrEqual(ring)
      expect(descRect.right - gridRect.right).toBeGreaterThanOrEqual(ring)
      expect(gridRect.top - descRect.top).toBeGreaterThanOrEqual(ring)
      expect(descRect.bottom - gridRect.bottom).toBeGreaterThanOrEqual(ring)

      // 负 margin-inline 把 padding-inline 原样扣回去：`.desc` 的 border box 外扩
      // 12px、padding 吃回 12px，content box 宽度不变。所以宿主内层拿到的仍是
      // 卡片 content box 的全宽——补横向余量不能缩小宿主的可用宽度，否则
      // AddDialog 那种两栏 grid 的 drop zone 会换行。
      const cardContent = card.clientWidth - parseFloat(cardStyles.paddingLeft) - parseFloat(cardStyles.paddingRight)
      expect(gridRect.width).toBeCloseTo(cardContent, 1)
    })

    it('desc-gap 调到 focus-padding 以下时 margin-bottom 夹在 0，不进负值区间', async () => {
      for (const gap of [24, 8, 4, 0]) {
        const component = buildTitleMode(120)
        component.style.setProperty('--wui-dialog-max-height', '560px')
        component.style.setProperty('--wui-dialog-desc-gap', `${gap}px`)
        await openAndSettle(component)

        const desc = query<HTMLElement>(component, '.desc')
        const styles = getComputedStyle(desc)
        // --wui-dialog-desc-gap 是公开 token，宿主可以调到 0。负 margin 会让
        // .desc 的盒模型与 grid 行分配进负值区间，所以用 max() 兜住下界。
        expect(parseFloat(styles.marginBottom)).toBeGreaterThanOrEqual(0)
        expect(parseFloat(styles.marginBottom)).toBe(Math.max(0, gap - 6))
        document.body.replaceChildren()
      }
    })
  })
})
