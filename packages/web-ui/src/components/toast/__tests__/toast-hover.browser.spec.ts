import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { pollUntil, waitForAnimationsToFinish } from '@/shared/test-utils'

import { toast } from '..'

function fallbackRoot(): ShadowRoot | null {
  return document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function findToast(id: string) {
  return Array.from(fallbackRoot()?.querySelectorAll('web-ui-toast') ?? []).find(el => el.toastId === id)
}

/** toast 是否落在屏幕左下角：搬运的判据看在屏上的位置，不是挂在哪个内部容器里。 */
function isInBottomLeft(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  return rect.top + rect.height / 2 > innerHeight / 2 && rect.left < innerWidth / 2
}

/** 等 manager 已挂载并完成 show，生命周期计时由轻层 fake clock 验证。 */
async function waitMounted(id: string): Promise<void> {
  await pollUntil(() => findToast(id)?.visible === true, `toast ${id} did not become visible`)
}

// 真实指针需要一处「别处」才能移开：固定定位在左下角，避开 top-right 的 toast。
function createAwayTarget(): HTMLElement {
  const away = document.createElement('div')
  away.id = 'away-target'
  away.style.cssText = 'position:fixed;left:0;bottom:0;width:32px;height:32px;z-index:2147483647'
  document.body.appendChild(away)
  return away
}

// ── 可观察状态 helpers ──────────────────────────────────────────────
// 只看公开面：`visible` / `hoverPaused` 与 toast 是否还在 DOM 里。内部计时字段
// （remaining / close timer / deadline）不是契约——用户能观察到的是「悬停暂停、
// 移开后恢复自动关闭」，而精确到毫秒的「续跑 vs 重启」没有公开观测口。

afterEach(() => {
  toast._reset()
  document.body.replaceChildren()
})

// 临时把 Element.moveBefore 摘成 undefined，逼 manager 的 relocateToast 走降级分支
//（manager.ts:127-131）。返回恢复函数。moveBefore 可能定义在原型链某处，沿链找到再覆写。
function disableMoveBefore(): () => void {
  let proto: object | null = HTMLElement.prototype
  let owner: object | null = null
  let desc: PropertyDescriptor | undefined
  while (proto) {
    const found = Object.getOwnPropertyDescriptor(proto, 'moveBefore')
    if (found) {
      owner = proto
      desc = found
      break
    }
    proto = Object.getPrototypeOf(proto) as object | null
  }
  const target = owner ?? HTMLElement.prototype
  Object.defineProperty(target, 'moveBefore', { configurable: true, writable: true, value: undefined })
  return () => {
    if (owner && desc) Object.defineProperty(target, 'moveBefore', desc)
    else Reflect.deleteProperty(target, 'moveBefore')
  }
}

/*
 * jsdom 里只能合成 pointerenter/pointerleave，事件序列和真实指针不是一回事（真实指针离开时
 * 还有 document 级的 pointerout/pointerleave）。这里用真实鼠标复现用户报的场景：
 * hover 上去再移开，必须正确进入和结束暂停，并恢复自动关闭。
 *
 * CI 上游标位置继承自上一个测试文件：若停在 toast 将出现的位置，挂载后 Chromium 命中测试
 * 补发 pointerenter → 暂停。每条用例在创建 toast 前先把指针停靠到无关的 away 目标，使
 * 「暂停发生点」确定化。
 */
// 真实指针的命中测试可能晚于 hover() 调用若干帧（并行文件共用同一个游标时更明显），
// 因此「已进入暂停」用轮询等，而不是 hover() 之后当场读一次。
async function waitHoverPaused(el: NonNullable<ReturnType<typeof findToast>>, label: string): Promise<void> {
  await pollUntil(() => el.hoverPaused === true, label, 1500)
}

describe('toast 悬停暂停（浏览器）', () => {
  it('悬停期间不关闭，移开后恢复自动关闭', async () => {
    const away = createAwayTarget()
    await page.elementLocator(away).hover()
    const duration = 300
    const id = toast.info('悬停我', { id: 'hover', position: 'top-right', duration: 0 })
    await waitMounted(id)

    const el = findToast(id)
    // 缺元素当场红：否则 `el as Element` 把 undefined 交给 hover()，失败点漂到后面的
    // 「是否关闭」轮询里，分不清是没挂上还是没关闭。
    if (!el) throw new Error(`toast ${id} was not mounted into the overlay root`)

    await page.elementLocator(el).hover()
    await waitHoverPaused(el, '真实指针悬停后未进入暂停态')

    // 在指针已就位后启用自动关闭，避免 hover 准备本身耗尽 duration。
    toast({ id, message: '悬停我', duration })
    expect(el.hoverPaused).toBe(true)
    expect(findToast(id)?.visible).toBe(true)

    // 移开指针后恢复自动关闭。
    await page.elementLocator(away).hover()
    await pollUntil(() => findToast(id) === undefined, 'toast did not leave the DOM after hover ended')
  })

  /*
   * 搬迁会把 toast 从指针底下移走，Chromium 重新命中测试后补发边界事件，悬停随即结束 ——
   * 这是期望行为：暂停的语义是「指针还在上面」，不是「这条 toast 被豁免」。要守住的是
   * 搬迁不得把 toast 从屏上抹掉，且之后仍能自动关闭。
   */
  it('悬停期间搬迁：不消失，悬停结束后仍能自动关闭', async () => {
    const away = createAwayTarget()
    await page.elementLocator(away).hover()
    const id = toast.info('悬停并搬迁', { id: 'hover-move', position: 'top-right', duration: 0 })
    await waitMounted(id)

    const hovered = findToast(id)
    if (!hovered) throw new Error(`toast ${id} was not mounted into the overlay root`)
    await page.elementLocator(hovered).hover()
    await waitHoverPaused(hovered, '真实指针悬停后未进入暂停态')

    // 悬停期间搬迁（真实 Chromium 走 moveBefore + connectedMoveCallback）。
    toast({ id, message: '悬停并搬迁', position: 'bottom-left' })
    await pollUntil(() => {
      const el = findToast(id)
      return el !== undefined && isInBottomLeft(el)
    }, 'toast was not relocated to bottom-left')

    expect(findToast(id)?.visible).toBe(true)
    await page.elementLocator(away).hover()
    await pollUntil(() => findToast(id)?.hoverPaused === false, 'relocation did not end native hover')
    toast({ id, message: '悬停并搬迁', duration: 300 })
    await pollUntil(() => findToast(id) === undefined, 'toast did not leave the DOM after hover ended')
  })

  /*
   * 挂载时指针已压在 toast 将出现的位置（issue #140 路径②）：入场后 show() 见到悬停态已置位，
   * 直接进入暂停、不点火计时。用真实鼠标把指针移到（尚未 show、opacity:0 的）元素上建立
   * 悬停态，再手动调用 show()（等价于 manager 在 rAF 里的那次 show），确定性地命中该分支。
   * 浏览器层证明真实指针在 show 之前进入暂停，计时不启动由 jsdom 的 fake clock 承接。
   */
  it('挂载时指针已压上：入场直接进入悬停暂停，不点火计时', async () => {
    const el = document.createElement('web-ui-toast')
    const duration = 1000
    el.duration = duration
    el.message = '挂载即悬停'
    document.body.appendChild(el)
    await el.updateComplete

    await page.elementLocator(el).hover()
    await pollUntil(() => el.hoverPaused === true, '真实指针悬停后未进入暂停态', 1500)

    el.show()
    await el.updateComplete

    expect(el.visible).toBe(true)
    expect(el.hoverPaused).toBe(true)
  })

  /*
   * 不支持 moveBefore 的引擎（browserslist 覆盖的 Chrome 111-120 / Safari 16.4-17.x）上，
   * manager 的搬迁走降级分支（manager.ts:127-131）：pauseAutoClose → appendChild →
   * resumeAutoClose。老引擎没有 connectedMoveCallback，appendChild 搬迁就是一次真正的
   * 摘出重插：disconnectedCallback 先摘掉 document 兜底（toast.ts:81），connectedCallback
   * 再靠 :74 把它挂回来。少了这一行，搬迁后这条 toast 再也检测不到指针离开，永久停留。
   *
   * 测试环境是有 moveBefore 的 Chromium，本条摘掉 Element.moveBefore 逼 manager 走降级
   * 分支，复现受支持引擎上的这条主路径。Chromium 会把同任务内 remove+insert 的 reactions
   * 在同一微任务 checkpoint 内依次刷完，观测不到「兜底已摘」的中间相位，因此降级分支的
   * 插入被推迟到 remove 的 reactions 刷新之后：两个相位的先后顺序与老引擎一致，只是中间
   * 多出一段可观测的间隔。给自定义元素回调计数不可行——Chromium 既不读实例属性、也不读
   * define 之后的原型覆写，故全部改用可观察状态断言。
   */
  it('无 moveBefore 引擎悬停中搬迁：connectedCallback 重挂 document 兜底，指针离开后仍能结束暂停', async () => {
    const away = createAwayTarget()
    // 真实指针停到无关位置：搬迁时元素若在光标底下，Chromium 补发的 pointerleave 会提前
    // 结束悬停，「悬停中被搬迁」这个前提就构造不出来。
    await page.elementLocator(away).hover()
    const id = toast.info('降级搬迁', { id: 'fallback-move', position: 'top-right', duration: 0 })
    await waitMounted(id)
    const el = findToast(id)
    if (!el) throw new Error(`toast ${id} was not mounted into the overlay root`)

    // 等入场过渡收敛再建立悬停：搬迁的前提是「指针压在已经就位（transform 落定）的 toast
    // 上」。「等 400ms」只是在赌 `--wui-duration-toast-enter` 的当前值，改 token 就会让这条
    // 用例在动画中途就取事件；收敛判据可直接观察（subtree 里没有还在跑的过渡）。
    if (!(await waitForAnimationsToFinish(el))) {
      throw new Error('toast entrance transition was still running when the budget ran out')
    }

    // 合成 pointerenter 建立悬停暂停：真实光标停在 away，搬迁补发的事件不会来打断。
    el!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    expect(el!.hoverPaused).toBe(true)

    // 正对照：兜底挂着时，「指针移到别处」的 pointerover 能结束暂停。没有这一步，
    // 相位一的「暂停保持」分不清是兜底被摘掉，还是这个合成事件本就无人受理。
    document.body.dispatchEvent(new PointerEvent('pointerover', { pointerType: 'mouse', bubbles: true }))
    expect(el!.hoverPaused).toBe(false)
    // 重新暂停，作为搬迁前的前提。
    el!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    expect(el!.hoverPaused).toBe(true)

    /*
     * 降级搬迁的两个相位由用例自己掌握时刻：拦截 appendChild 时只把「重插」这一步存下来，
     * 摘出照做；相位一断言完再显式发起重插。
     *
     * 不用定时器把重插推后：定时器窗口（哪怕只有 60ms）会让「此刻已摘出」变成一条隐含
     * 前提——合成帧机会被负载拉长时窗口先到期、元素已经重插，断言就在核对一个假前提。
     */
    let reinsert: (() => void) | undefined
    const restoreMove = disableMoveBefore()
    const originalAppend = Node.prototype.appendChild as (this: Node, node: Node) => Node
    const appendDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'appendChild')
    Object.defineProperty(Node.prototype, 'appendChild', {
      configurable: true,
      writable: true,
      value: function appendChildWithLegacyMove(this: Node, node: Node): Node {
        // 只拦截本条 toast 的降级搬迁：先真正摘出（disconnect），重插留给用例在相位一
        // 之后显式发起（connect），复现老引擎「摘出重插」的两个相位。
        if (node === el && node.parentElement?.isConnected) {
          // 箭头函数继承外层函数的 this：调用 appendChild 的那个节点就是重插的目标。
          reinsert = () => originalAppend.call(this, node)
          ;(node as ChildNode).remove()
          return node
        }
        return originalAppend.call(this, node)
      }
    })
    try {
      toast({ id, message: '降级搬迁', position: 'bottom-left' })
    } finally {
      if (appendDesc) Object.defineProperty(Node.prototype, 'appendChild', appendDesc)
      else Reflect.deleteProperty(Node.prototype, 'appendChild')
      restoreMove()
    }
    if (!reinsert) throw new Error('降级搬迁没有走到 appendChild 路径')

    // 摘出引发的 reactions 先刷完：兜底监听的摘除与计时的清空都在这一拍落地，之后
    // document 上才真的没人受理 pointerover。
    await el!.updateComplete

    /*
     * 相位一：摘出已发生（disconnectedCallback 跑过，document 兜底随之摘掉）——此刻
     * 「指针移到别处」的 pointerover 无人受理，暂停必须保持。若兜底还在，正对照已经证明
     * 这个合成事件能结束暂停，这里就会翻成 false。
     */
    expect(el!.isConnected).toBe(false)
    document.body.dispatchEvent(new PointerEvent('pointerover', { pointerType: 'mouse', bubbles: true }))
    expect(el!.hoverPaused).toBe(true)

    /*
     * 相位二：重插落地（connectedCallback 跑过）；暂停态保持
     *（resumeAutoClose 在悬停中提前 return，计时器保持熄灭）。
     */
    reinsert()
    await el!.updateComplete
    expect(el!.isConnected).toBe(true)
    expect(el!.hoverPaused).toBe(true)

    /*
     * document 兜底已被 connectedCallback 重挂：pointerover 能结束暂停并恢复自动关闭。
     * 少了这一步，搬迁后 document 监听已随 disconnectedCallback 摘掉，这个合成
     * pointerover 无人受理，悬停永不结束、toast 永不自动退场。
     */
    toast({ id, message: '降级搬迁', position: 'bottom-left', duration: 300 })
    await el.updateComplete
    document.body.dispatchEvent(new PointerEvent('pointerover', { pointerType: 'mouse', bubbles: true }))
    expect(el!.hoverPaused).toBe(false)
    await pollUntil(() => findToast(id) === undefined, 'auto-close did not resume after fallback reattach')
  })
})
