import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil } from '@/shared/test-utils'

import '..'
import type { WebUiDialog } from '..'

/*
 * dialog 的高度约束下移到内容区（见 style.css「高度约束下移到内容区」）。
 *
 * 改动前宿主必须复述一个会变的 chrome 高度，footer 那一项就是 --wui-control-size，
 * 触摸端媒体查询会把它从 36 抬到 40，于是宿主的常数立刻腐坏：卡片比 dialog 盒子高
 * 出一大截，内容被裁掉。现在 header / footer 完全由内容撑开，上限只落在内容区。
 *
 * 判据统一取**用户后果**——「内容有没有被裁掉」「卡片有没有溢出」「控件的 focus ring
 * 有没有被裁成残条」「宿主拿到的可用宽度有没有被改窄」——不钉具体像素，也不读
 * getComputedStyle 的 display/padding 取值。调主题 spacing 令牌不该变成改测试。
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

function dialogOf(component: WebUiDialog): HTMLDialogElement {
  return component.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

/** 内容区（`.desc`）的 content box 高度：token 的语义是这个值，不是它的 border box。 */
function descContentHeight(component: WebUiDialog): number {
  const desc = query<HTMLElement>(component, '.desc')
  const styles = getComputedStyle(desc)
  return desc.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
}

async function openAndSettle(component: WebUiDialog): Promise<void> {
  component.open = true
  await component.updateComplete
  const dialog = dialogOf(component)
  // 必须等 transform 归位：进场带 scale(1.1)，未落定时 rect 读数虚高 10%。
  await pollUntil(() => {
    const transform = getComputedStyle(dialog).transform
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
  }, 'enter transform not settled')
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * title 模式的宿主内层，复刻 AddDialog / RestoreDialog 的写法：外层 grid 用
 * `height: 100%` 参与卡片的三行分配。
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
  describe('chrome 由内容撑开', () => {
    it('内容区的上限与 chrome 高低无关：footer 变高时卡片等量长高，内容区不变', async () => {
      // 内容远高于 token，内容区被夹住——这才是宿主的真实工况，也正是改动前
      // `calc(560px - 108px)` 会失配的那一档（108 里含 --wui-control-size）。
      const component = buildTitleMode(3000)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const before = { card: card.offsetHeight, content: descContentHeight(component) }

      // 触摸端的真实取值：`@media (pointer: coarse)` 把 36 抬到 40。
      component.style.setProperty('--wui-control-size', '40px')
      await new Promise(resolve => requestAnimationFrame(resolve))

      const after = { card: card.offsetHeight, content: descContentHeight(component) }
      expect(after.card).toBeGreaterThan(before.card)
      // 这条才是重点：内容区的上限直接来自 token，chrome 变高不改变它。
      expect(after.content).toBe(before.content)
    })

    it('token 是上限而非定值：内容不高时卡片收缩到内容', async () => {
      const component = buildTitleMode(120)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      await openAndSettle(component)
      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const dialog = dialogOf(component)

      // 内容不足时不撑到 token：卡片贴合内容。
      expect(card.offsetHeight).toBeLessThan(560)
      expect(card.offsetHeight).toBe(dialog.offsetHeight)
    })
  })

  describe('上限落在内容区', () => {
    it('内容区自己是滚动容器，溢出时卡片不被 dialog 裁掉', async () => {
      // 刻意不用 buildTitleMode：它那两栏带 overflow: clip，溢出在栏内就被吃掉，
      // 内容区从来没真正滚动过，这种 fixture 验不出滚动容器。
      const component = document.createElement('web-ui-dialog')
      const content = document.createElement('div')
      content.style.cssText = 'height: 3000px;'
      component.append(content)
      document.body.append(component)
      component.style.setProperty('--wui-dialog-max-height', '200px')
      await openAndSettle(component)

      const desc = query<HTMLElement>(component, '.desc')
      expect(desc.scrollHeight).toBeGreaterThan(desc.clientHeight)
      // 只断言上一条的话，overflow 写成 hidden 也能过（hidden 同样让
      // scrollHeight 大于 clientHeight），必须写 scrollTop 才能区分 auto 与 hidden。
      desc.scrollTop = 9999
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(desc.scrollTop).toBeGreaterThan(0)

      // 滚下去之后卡片几何不变：滚动发生在内容区内部，没有把内容顶出 dialog 盒子。
      const card = query<HTMLElement>(component, '.wui-dialog-body')
      expect(card.offsetHeight).toBeLessThanOrEqual(dialogOf(component).offsetHeight)
    })
  })

  describe('作用域：body 模式不受影响', () => {
    it('body 模式下卡片的行分配仍是内容撑开：块高等于各自的 height', async () => {
      const component = document.createElement('web-ui-dialog')
      const heights = [40, 60, 30]
      for (const height of heights) {
        const block = document.createElement('div')
        block.slot = 'body'
        block.style.cssText = `height: ${height}px;`
        component.append(block)
      }
      document.body.append(component)
      await openAndSettle(component)

      // 若 title 模式的 grid 行分配（minmax(0,1fr)）误生效到 body 模式，
      // 多个子元素会被拆成三行均分，块高不再等于各自的 height。
      const blocks = Array.from(component.children) as HTMLElement[]
      expect(blocks.map(block => block.offsetHeight)).toEqual(heights)
    })

    it('body 模式下 card 高度等于内容加内边距，不由 grid 行分配改写', async () => {
      const component = document.createElement('web-ui-dialog')
      component.setAttribute('closable', '')
      const body = document.createElement('section')
      body.slot = 'body'
      body.style.cssText = 'height: 120px;'
      component.append(body)
      document.body.append(component)
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const close = query<HTMLElement>(component, '.wui-dialog-close')
      await (close as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete

      // 卡片高度 = 内容 120 + 上下内边距。内边距随主题变化，所以判据取
      // 「大于内容高度」与「卡片装得下内容」两条，不钉具体差值。
      expect(card.offsetHeight).toBeGreaterThan(120)
      expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight)
    })
  })

  describe('title 模式撑满剩余高度', () => {
    it('两栏等高且拿满内容区的全部高度', async () => {
      const component = buildTitleMode(2000)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      await openAndSettle(component)

      const grid = component.querySelector('div') as HTMLElement
      const columns = Array.from(grid.children) as HTMLElement[]
      expect(columns[0].offsetHeight).toBe(columns[1].offsetHeight)
      // grid 铺满内容区：自身有 focus-ring padding 让位，所以拿 clientHeight 的口径。
      expect(grid.offsetHeight).toBeGreaterThan(0)
      expect(grid.offsetHeight).toBeLessThanOrEqual(query<HTMLElement>(component, '.desc').clientHeight)
    })

    it('全宽控件的 focus ring 不被内容区裁掉，且宿主拿到的可用宽度不被改窄', async () => {
      const component = buildTitleMode(120)
      component.style.setProperty('--wui-dialog-max-height', '560px')
      // 显式设成 8px 而非用默认 6px：这样 padding 断言是真的在跟 token 走，
      // 默认值恰好相同时会退化成恒真。
      component.style.setProperty('--wui-dialog-desc-focus-padding', '8px')
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const desc = query<HTMLElement>(component, '.desc')
      const grid = component.querySelector('div') as HTMLElement
      const cardStyles = getComputedStyle(card)
      const descRect = desc.getBoundingClientRect()
      const gridRect = grid.getBoundingClientRect()

      /*
       * ring 画在 border box 之外 5px（offset 2 + width 3），而内容区既是滚动容器、
       * 又因为有一条轴必须非 visible 而成了裁剪盒。裁掉的是 **padding box**：overflow
       * 的裁剪边在 padding 外沿。只补 `padding-block` 的那版左右 padding 为 0，grid 与
       * padding box 左右沿重合 → 横向余量 0 → 全宽控件的两侧环被裁成 1px 残条。
       * 本用例是那条回归的护栏。
       *
       * 参照系必须朝内：grid 是内容区的内容，落在 padding box 内侧，所以右边与下边
       * 要用内容区减 grid，反过来写会拿到负数。
       */
      const RING = 5
      expect(gridRect.left - descRect.left).toBeGreaterThanOrEqual(RING)
      expect(descRect.right - gridRect.right).toBeGreaterThanOrEqual(RING)
      expect(gridRect.top - descRect.top).toBeGreaterThanOrEqual(RING)
      expect(descRect.bottom - gridRect.bottom).toBeGreaterThanOrEqual(RING)

      /*
       * 负 margin-inline 把 padding-inline 原样扣回去，所以宿主内层拿到的仍是卡片
       * content box 的全宽——补横向余量不能缩小宿主的可用宽度，否则 AddDialog 那种
       * 两栏 grid 的 drop zone 会换行。
       */
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
        // --wui-dialog-desc-gap 是公开 token，宿主可以调到 0。负 margin 会让内容区的
        // 盒模型与 grid 行分配进负值区间，所以必须用 max() 兜住下界。
        expect(parseFloat(getComputedStyle(desc).marginBottom)).toBeGreaterThanOrEqual(0)
        document.body.replaceChildren()
      }
    })
  })

  describe('body 模式：高内容在卡片内部的滚动层里滚', () => {
    it('内容滚到最后一块，卡片不溢出 dialog 盒子', async () => {
      const component = document.createElement('web-ui-dialog')
      const block = document.createElement('div')
      block.slot = 'body'
      block.style.cssText = 'height: 3000px;'
      component.append(block)
      document.body.append(component)
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const content = query<HTMLElement>(component, '.wui-dialog-content')

      // 用户后果一：卡片不许溢出 dialog 盒子。dialog 是 overflow: visible（阴影与关闭
      // 按钮不能由同尺寸的原生 dialog 裁），溢出的那截落在视口之下，够不着也滚不动。
      expect(card.offsetHeight).toBeLessThanOrEqual(dialogOf(component).offsetHeight)

      // 用户后果二：内容自己能滚到最后一块。
      expect(content.scrollHeight).toBeGreaterThan(content.clientHeight)
      content.scrollTop = 99999
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(content.scrollTop).toBeGreaterThan(0)

      /*
       * 上一行区分不出 overflow: hidden —— hidden 下内容照样溢出、scrollTop 照样能被
       * 程序化写动。只有 auto / scroll 才是用户真的滚得动的，所以补读一次计算值。
       */
      expect(['auto', 'scroll']).toContain(getComputedStyle(content).overflowY)
    })

    it('对照组：内容装得下时卡片贴合内容且不产生滚动', async () => {
      const component = document.createElement('web-ui-dialog')
      const block = document.createElement('div')
      block.slot = 'body'
      block.style.cssText = 'height: 120px;'
      component.append(block)
      document.body.append(component)
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const content = query<HTMLElement>(component, '.wui-dialog-content')
      const dialog = dialogOf(component)

      /*
       * 卡片贴合内容，而不是被固定成视口高。只写下界（> 120）区分不出这两种形态：把上限
       * 写成 `height: 100vh` 的变异同样满足下界，也照样不产生滚动（短内容在固定高度里
       * 不溢出），整条用例会全绿——而「内容装得下时贴合内容」正是 README 与 changeset
       * 写下的承诺，必须自己拦得住。上界给到「卡片高度 = 内容 + 内边距」；内边距随主题
       * 走，所以从元素上读回来，不写死数字。
       */
      const contentStyles = getComputedStyle(content)
      const contentBox =
        block.offsetHeight + parseFloat(contentStyles.paddingTop) + parseFloat(contentStyles.paddingBottom)
      expect(card.offsetHeight).toBeCloseTo(contentBox, 0)

      // 与 title 模式的兄弟用例同口径：内容不足时卡片与容器同高。
      expect(card.offsetHeight).toBe(dialog.offsetHeight)

      expect(content.scrollHeight).toBe(content.clientHeight)
      content.scrollTop = 99999
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(content.scrollTop).toBe(0)
    })

    it('关闭按钮不跟随内容滚动', async () => {
      const component = document.createElement('web-ui-dialog')
      component.setAttribute('closable', '')
      const block = document.createElement('div')
      block.slot = 'body'
      block.style.cssText = 'height: 3000px;'
      component.append(block)
      document.body.append(component)
      await openAndSettle(component)

      const card = query<HTMLElement>(component, '.wui-dialog-body')
      const content = query<HTMLElement>(component, '.wui-dialog-content')
      const close = query<HTMLElement>(component, '.wui-dialog-close')

      // 浮在右上角的关闭按钮是卡片的绝对定位子元素；滚动层若错做成卡片自己，
      // 按钮会跟着内容一起滚出视野。量相对卡片的实时几何，不用 offsetTop
      // （offsetTop 是布局值，不随滚动变化，没有区分力）。
      const offset = () => {
        const cardRect = card.getBoundingClientRect()
        const closeRect = close.getBoundingClientRect()
        return {
          top: Math.round(closeRect.top - cardRect.top),
          right: Math.round(cardRect.right - closeRect.right)
        }
      }
      const before = offset()
      content.scrollTop = 99999
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(content.scrollTop).toBeGreaterThan(0)
      expect(offset()).toEqual(before)
    })
  })
})
