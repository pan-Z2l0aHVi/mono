import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import { toast } from '..'

function fallbackRoot(): ShadowRoot | null {
  return document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function findToast(id: string) {
  return Array.from(fallbackRoot()?.querySelectorAll('web-ui-toast') ?? []).find(el => el.toastId === id)
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

// 批量挂载是微任务，show() 在其后的 rAF 里。
async function waitMounted(): Promise<void> {
  await Promise.resolve()
  await nextFrame()
  await nextFrame()
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 退场收尾走 CSS transitionend 或时长兜底定时器，固定 sleep 会在并行负载下失配，以条件收敛代替。
async function waitFor(condition: () => boolean, message: string, timeoutMs = 3000): Promise<void> {
  const start = performance.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (condition()) return resolve()
      if (performance.now() - start > timeoutMs) return reject(new Error(message))
      setTimeout(tick, 25)
    }
    tick()
  })
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
// TS private 字段运行时可读；用 unknown 双重转型避免 any。
type ToastTiming = {
  _deadline?: number
  _pausedRemaining?: number
  _closeTimer?: ReturnType<typeof setTimeout>
}

function timingOf(id: string): ToastTiming | undefined {
  return findToast(id) as unknown as ToastTiming | undefined
}

// 等待真正续跑：暂停态解除且 close timer 已重新点火。
async function waitResumed(id: string, message: string): Promise<void> {
  await waitFor(
    () => {
      const t = timingOf(id)
      return !!t && t._pausedRemaining === undefined && t._closeTimer !== undefined
    },
    message,
    2500
  )
}

/*
 * 等待剩余时间进入可暂停窗口 (400, 1200)，并把收敛时刻的剩余值作为基准交回调用方。
 *
 * 上限 1200 保证「续跑 vs 重启满时长(3000)」仍可分辨；下限是必需的：并行负载压住主线程时
 * 墙钟会直接越过 deadline，此时剩余为负仍满足「< 1200」，测试就带着一个已到期的基准继续
 * 跑，之后「toast 提前关闭」的失败与真实缺陷再也分不开。越过下限即刻失败并给出剩余值。
 */
async function waitApproaching(id: string, message: string): Promise<number> {
  const start = performance.now()
  for (;;) {
    const deadline = timingOf(id)?._deadline
    if (deadline !== undefined) {
      const remaining = deadline - Date.now()
      if (remaining > 400 && remaining < 1200) return remaining
      if (remaining <= 400)
        throw new Error(
          `${message}: deadline was overshot before the pause window (remaining ${Math.round(remaining)}ms)`
        )
    }
    if (performance.now() - start > 2500) throw new Error(message)
    await wait(25)
  }
}

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
 * hover 上去再移开，倒计时必须按剩余时间续跑，而不是重启满时长、也不是永久停留。
 *
 * 「续跑 vs 重启」判定不依赖墙钟：移开后读组件内部 _deadline，续跑时它同步等于
 * Date.now() + pausedRemaining（暂停基准由 waitApproaching 收敛到 400–1200ms），重启满时长
 * 的回归会给出 ≈duration（3000ms）。两者差距远超任何 CI 负载抖动。
 *
 * CI 上游标位置继承自上一个测试文件：若停在 toast 将出现的位置，挂载后 Chromium 命中测试
 * 补发 pointerenter → 暂停，此刻剩余 ≈ 满时长，deadline 断言必然失败。每条用例在创建
 * toast 前先把指针停靠到无关的 away 目标，使「暂停发生点」确定化。
 */
describe('toast 悬停暂停（浏览器）', () => {
  it('悬停期间不关闭，移开后按剩余时间关闭', async () => {
    const away = createAwayTarget()
    // CI 上游标位置继承自上一个测试文件：若停在 toast 将出现的位置，挂载即触发悬停暂停
    //（剩余=满时长，show() 的设计行为），用例前提被破坏。先停靠到无关位置再创建 toast，
    // 让「暂停发生点」落在用例控制的 hover 时刻。
    await page.elementLocator(away).hover()
    const id = toast.info('悬停我', { id: 'hover', position: 'top-right', duration: 3000 })
    await waitMounted()

    const el = findToast(id)
    expect(el).toBeDefined()

    // 等 deadline 逼近（剩余落在 400–1200ms）再悬停：固定 sleep 的 margin 仅 600ms，CI 停顿可越过
    // 3000ms deadline 使 toast 先行关闭。收敛后仍有 ~1200ms 给 hover 派发。
    const remainingBeforePause = await waitApproaching(id, 'deadline did not approach')
    await page.elementLocator(el as Element).hover()

    // 越过原计时点（3000ms）后仍应停留 —— 悬停暂停生效。
    await wait(800)
    expect(findToast(id)?.visible).toBe(true)

    // 移开指针。续跑判定为可观察状态：resumeAutoClose() 同步按暂停时剩余重置 deadline，
    // 必然小于暂停前捕获的 remainingBeforePause；重启满时长的回归给出 ≈3000ms，必然大于它。
    await page.elementLocator(away).hover()
    await waitResumed(id, 'pointerleave 后未恢复自动关闭')
    const resumed = timingOf(id)?._deadline
    expect(resumed).toBeDefined()
    expect(resumed! - Date.now()).toBeLessThan(remainingBeforePause)
    await waitFor(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close', 4000)
  })

  /*
   * 搬迁会把 toast 从指针底下移走，Chromium 重新命中测试后补发边界事件，悬停随即结束 ——
   * 这是期望行为：暂停的语义是「指针还在上面」，不是「这条 toast 被豁免」。真正要守住的是
   * 这条路径的两个退化：搬迁吞掉剩余时间导致立刻关闭，或搬迁重启满时长。
   * 「续跑 vs 重启」通过 _deadline 读取判定：续跑剩余必然小于暂停前剩余，重启满时长 ≈3000ms。
   */
  it('悬停期间搬迁：剩余时间不丢，也不重启满时长', async () => {
    const away = createAwayTarget()
    await page.elementLocator(away).hover()
    const id = toast.info('悬停并搬迁', { id: 'hover-move', position: 'top-right', duration: 3000 })
    await waitMounted()

    // 与第一条用例同法：等剩余进入 400–1200ms 可暂停窗口，并以收敛时刻的剩余作为基准。
    const remainingBeforePause = await waitApproaching(id, 'deadline did not approach')
    await page.elementLocator(findToast(id) as Element).hover()
    await wait(100)

    // 悬停期间搬迁（真实 Chromium 走 moveBefore + connectedMoveCallback）。补丁对已挂载
    // 元素同步生效；但并行负载下若悬停暂停未赶上、元素已进入退场，补丁会走 pendingBatch
    // 延迟路径——以条件收敛判定搬迁，不用固定帧数。
    toast({ id, message: '悬停并搬迁', position: 'bottom-left' })
    await waitFor(
      () => findToast(id)?.parentElement?.dataset.wuiToastPosition === 'bottom-left',
      'toast was not relocated to bottom-left'
    )

    // 搬迁不得把 toast 从屏上抹掉。剩余时间是否被吞掉不由这里等待判定（固定 sleep 在并行
    // 负载下会把自己睡过期），交给下面续跑后的 deadline 读数。
    expect(findToast(id)?.visible).toBe(true)

    // 搬迁后 Chromium 重命中补发 pointerleave，悬停结束；等真正续跑再读 deadline。
    await waitResumed(id, '搬迁后未恢复自动关闭')
    const resumedAfterMove = timingOf(id)?._deadline
    expect(resumedAfterMove).toBeDefined()
    // 「不吞时间」= 续跑剩余仍是未来时刻（吞成 0 会走 dismiss 且不装 timer，waitResumed 先失败）；
    // 「不重启满时长」= 必然小于暂停前捕获的 remainingBeforePause（重启给出 ≈3000ms）。
    expect(resumedAfterMove! - Date.now()).toBeGreaterThan(0)
    expect(resumedAfterMove! - Date.now()).toBeLessThan(remainingBeforePause)
    await waitFor(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close', 4000)
  })

  /*
   * 挂载时指针已压在 toast 将出现的位置（issue #140 路径②，toast.ts:175-179）：入场后 show()
   * 见到 _hoverPaused 已置位，直接记下剩余时长并 return，不点火计时。全仓 spec 里这条
   * 「入场即暂停」分支零覆盖——现有用例反而先把光标停到中性位置来回避它（toast-upsert 的
   * neutral park）。用真实鼠标把指针移到（尚未 show、opacity:0 的）元素上建立悬停态，再手动
   * 调用 show()（等价于 manager 在 rAF 里的那次 show），确定性地命中该分支：_closeTimer
   * 从未被创建，而不是「创建后被暂停清掉」。
   */
  it('挂载时指针已压上：入场直接进入悬停暂停，不点火计时', async () => {
    const el = document.createElement('web-ui-toast')
    el.duration = 3000
    el.message = '挂载即悬停'
    document.body.appendChild(el)
    await el.updateComplete

    // 真实指针移到元素上：组件自己的 pointerenter 监听置位 _hoverPaused 并挂上 document 兜底。
    await page.elementLocator(el).hover()
    expect(el.hoverPaused).toBe(true)

    // 入场：此刻 _hoverPaused 已为 true，show() 走暂停分支而非 startAutoClose()。
    el.show()
    await el.updateComplete

    const timing = el as unknown as { _closeTimer?: unknown; _pausedRemaining?: number }
    expect(timing._closeTimer).toBeUndefined()
    // 剩余记为整段时长，等指针离开后才续跑。
    expect(timing._pausedRemaining).toBe(3000)

    // 越过整个 duration 仍未退场：暂停态没有在倒计时。
    await wait(3400)
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
    const id = toast.info('降级搬迁', { id: 'fallback-move', position: 'top-right', duration: 3000 })
    await waitMounted()
    const el = findToast(id)
    expect(el).toBeDefined()

    // 等 rAF 里的 show() 把计时器点起来：下面「续跑 vs 重启」以暂停时剩余为基准。
    await waitFor(() => timingOf(id)?._closeTimer !== undefined, 'auto-close timer was not started')
    // 留出可分辨的已走时长：暂停时剩余 < 2900ms，「重启满时长（≈3000ms）」才判得出来。
    await wait(400)

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

    const restoreMove = disableMoveBefore()
    const originalAppend = Node.prototype.appendChild as (this: Node, node: Node) => Node
    const appendDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'appendChild')
    Object.defineProperty(Node.prototype, 'appendChild', {
      configurable: true,
      writable: true,
      value: function appendChildWithLegacyMove(this: Node, node: Node): Node {
        // 只拦截本条 toast 的降级搬迁：先真正摘出（disconnect），插入推迟到它的
        // reactions 刷新之后（connect），复现老引擎「摘出重插」的两个相位。
        if (node === el && node.parentElement?.isConnected) {
          setTimeout(() => originalAppend.call(this, node), 60)
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
    // custom element reactions 在微任务 checkpoint 刷新，等一个更新周期再断言。
    await el!.updateComplete
    await wait(0)

    /*
     * 相位一：摘出已发生（disconnectedCallback 跑过，document 兜底随之摘掉）——此刻
     * 「指针移到别处」的 pointerover 无人受理，暂停必须保持。若兜底还在，正对照已经证明
     * 这个合成事件能结束暂停，这里就会翻成 false。
     */
    expect(el!.isConnected).toBe(false)
    document.body.dispatchEvent(new PointerEvent('pointerover', { pointerType: 'mouse', bubbles: true }))
    expect(el!.hoverPaused).toBe(true)

    /*
     * 相位二：重插落地（connectedCallback 跑过）。搬迁后落在 bottom-left 容器；暂停态
     * 连同剩余时间一起保留（resumeAutoClose 在悬停中提前 return，计时器保持熄灭）。
     */
    await waitFor(
      () => el!.parentElement?.dataset.wuiToastPosition === 'bottom-left',
      'degraded relocate did not re-insert the toast'
    )
    expect(el!.hoverPaused).toBe(true)
    const pausedRemaining = timingOf(id)?._pausedRemaining
    expect(pausedRemaining).toBeGreaterThan(0)
    expect(pausedRemaining).toBeLessThan(2900)
    expect(timingOf(id)?._closeTimer).toBeUndefined()

    /*
     * document 兜底已被 connectedCallback:74 重挂：pointerover 能结束暂停，并按暂停时
     * 剩余续跑。少了 :74，搬迁后 document 监听已随 disconnectedCallback 摘掉，这个合成
     * pointerover 无人受理，悬停永不结束。
     */
    document.body.dispatchEvent(new PointerEvent('pointerover', { pointerType: 'mouse', bubbles: true }))
    expect(el!.hoverPaused).toBe(false)
    expect(timingOf(id)?._pausedRemaining).toBeUndefined()
    expect(timingOf(id)?._closeTimer).toBeDefined()
    const resumedRemaining = (timingOf(id)?._deadline ?? 0) - Date.now()
    expect(resumedRemaining).toBeGreaterThan(0)
    expect(resumedRemaining).toBeLessThan(2900)
  })
})
