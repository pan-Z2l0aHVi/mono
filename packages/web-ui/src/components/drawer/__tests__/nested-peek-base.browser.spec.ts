import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import { NESTED_PEEK_BASE_FALLBACK, PEEK_BASE_VARIABLE } from '@/shared/overlay/nested-drawer-layers'

import type { WebUiDrawer } from '..'

/*
 * 嵌套层叠的对数基准（浏览器）。
 *
 * 堆叠总宽 T(n) = base · ln(n)，depth d 取 base · ln(d + 1)：ln(1) = 0 让单层完全
 * 不受影响，逐层增量 base·ln(1 + 1/d) 递减，因此总宽不随层数线性膨胀。
 *
 * 判据全部是**关系**（单调递减、基准置 0 则塌缩、跨断点重算），没有一处锁像素：
 * 露边的具体像素量是视觉契约（见 nested.browser.spec.ts 的 §「不承接的部分」），
 * 把 A 调大调小都不该让本文件变红。可观察面是新增的**公开** token
 * `--wui-drawer-nested-peek-base` 加 getBoundingClientRect 的左缘——不是
 * `--wui-internal-*`。shrink（缩放居中补偿）与 sizeDiff（上层更宽时的露边补偿）都在
 * 可见左缘上与几何相消，等宽场景下唯一移动台阶的就是 peek 项。
 *
 * ⚠️ 跨断点的判据为什么是**比值**（step / base）而不是大小比较（step 大小关系）：
 * 「有没有真的按新基准重算」这个问题上，大小比较**没有区分力**。实测去掉
 * matchMedia 监听后，栈仍停在旧基准，此时 mobileStep 与 desktopStep 只差
 * 3e-5 px 的浮点尾数，`expect(mobileStep).toBeLessThan(desktopStep)` 照样通过——
 * 断言被噪声满足，是一条假绿。改成比值后，未重算时 step/base 停在
 * 43.2·ln2/28.8 ≈ 1.040，而两端都重算时应同为 ln2 ≈ 0.693，高 50%，稳定变红。
 * （这个比值只是「旧基准 / 新基准」的倍数关系，与 A 的具体取值无关：桌面:窄屏
 * 恒为 3:2，所以未重算时永远比 ln2 高出固定比例，判据不随 A 调参失效。）
 *
 * 同理，本文件里凡是「跨断点重算」相关的断言都不要退回大小/单调比较；
 * 单调递减一类关系断言只描述曲线的形状，无法回答「用的是哪一段基准」。
 */

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function createDrawer(heading: string): WebUiDrawer {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  el.heading = heading
  document.body.appendChild(el)
  return el
}

/*
 * 等待预算：**每个测试一份共享的绝对 deadline**，所有 helper 共用。
 *
 * 为什么必须是共享的而不是每次调用各算一份：这些 helper 是链式嵌套的——
 * `openStack` 逐层打开会调 N 次 `settle`，每次 `settle` 里又逐个 drawer 等
 * `is-visible` 再跑一次 `stabilize`；关闭循环再来 M 次。若每次调用都用
 * 「现在 + 固定时长」，最坏耗时就是 N × M × 固定时长，层数一多预算自己就爆了：
 * 实测四层栈在 turbo 并行负载下，per-test 的 30s 先于内部 deadline 触发，报出来
 * 的是无信息量的 'Test timed out in 30000ms'，而不是「哪一层没收敛」。
 *
 * 改成共享绝对预算后，无论链有多深，总耗时上限就是预算本身，超时也能指到具体
 * 是哪一步等不动。仍然是**有界**轮询：真的不收敛照样失败。
 *
 * 数值只决定「愿意等多久」，不参与任何断言——判据全是关系式的，放宽预算不会让
 * 测试变松，只是不再把机器慢当成行为错。空载下最慢的用例约 2.8s（开 4 层 + 关
 * 3 层，走完整条 450ms 过渡链），这里给到十几倍余量吸收并行抢 CPU。同轮被 turbo
 * 压出负载型 flake 的还有本 task 未触碰的 editable-text 与 overlay-in-dialog，
 * 单独重跑均全绿，佐证这不是本文件的行为缺陷。
 */
interface Budget {
  /** 预算是否已耗尽。所有有界轮询共用这一个时钟。 */
  expired(): boolean
}

function createBudget(totalMs: number): Budget {
  const deadline = performance.now() + totalMs
  return {
    expired: () => performance.now() >= deadline
  }
}

/*
 * 逐层开合的用例（开 4 层 + 关 3 层）走完整条过渡链，预算给 45s；per-test
 * timeout 必须**大于**预算，否则 vitest 会先于预算报 'Test timed out'，抹掉可读的
 * 几何失败信息。仓库同形先例：tap-transition.browser.spec.ts 的慢用例用
 * { timeout: 30_000 }。
 */
const STACK_BUDGET_MS = 45_000
const STACK_TEST_TIMEOUT_MS = 60_000
/*
 * 两层用例（跨断点重算、单层极端基准）不做完整堆叠，各自只跨一次断点往返再重新
 * settle，预算给 20s、per-test 30s。
 */
const PAIR_BUDGET_MS = 20_000
const PAIR_TEST_TIMEOUT_MS = 30_000

/*
 * 量几何前必须等两件事，否则量到的是假位置：
 * 1. `is-visible`——presence 在 showModal 之后一帧才加，而 `translate` 只在
 *    `dialog[open].is-visible` 上生效；没落到打开位时 dialog 还在闭合位移（视口外）。
 * 2. 过渡真正结束——层序变化会让下层 dialog 同步做 450ms translate/scale 过渡，
 *    动画未收敛时量到的是中途值。
 */
async function settle(drawers: WebUiDrawer[], budget: Budget) {
  for (const drawer of drawers) {
    const dialog = getDialog(drawer)
    while (!dialog.open || !dialog.classList.contains('is-visible')) {
      if (budget.expired()) throw new Error('Expected the drawer dialog to reach its open position')
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
    await drawer.updateComplete
  }
  await stabilize(drawers, budget)
}

/*
 * 等几何真正收敛，三重条件缺一不可（都踩过）：
 * 1. `is-visible` 之前，dialog 还在闭合位移（视口外），量到的是假位置；
 * 2. 紧接着取 getAnimations() 可能一份都拿不到——过渡要等下一帧才诞生，
 *    只等动画会立刻返回，于是量到层序生效前的位置（实测左缘 1280 = 完全出屏）；
 * 3. 只等「两帧左缘相同」也不够：层序重算前的旧几何同样是稳定的，会提前返回。
 *
 * 因此每轮都先推进一帧、再等当轮动画全部结束、最后比较几何，且要求连续两轮
 * 都没有在跑的动画且左缘不变。只依赖公开的几何结果，不读任何内部变量。
 */
async function stabilize(drawers: WebUiDrawer[], budget: Budget) {
  let previous = readLefts(drawers)
  while (!budget.expired()) {
    await new Promise(resolve => requestAnimationFrame(resolve))
    await Promise.allSettled(document.getAnimations().map(animation => animation.finished))
    await new Promise(resolve => requestAnimationFrame(resolve))
    const current = readLefts(drawers)
    /*
     * 「已进入视口」是第四条条件，补的是上面第 2 条剩下的那个洞：过渡诞生之前没有任何
     * 动画可等，而归位前 dialog 整块停在视口外——于是「连续两帧几何相同」在开位之前
     * 就成立，稳定判据提前返回，量到出屏位置（CI 实测左缘 1280 = 完全出屏，断言拿它
     * 当基准）。
     *
     * 判据用几何：这几个用例的抽屉都是默认的右侧 placement，打开位必然落在视口内，
     * 所以「左缘 < innerWidth」就是「已经进来」。仍然是公开几何，不读内部状态。
     */
    const entered = current.every(left => left < window.innerWidth - 1)
    const settled = entered && !document.getAnimations().length && current.join() === previous.join()
    previous = current
    if (settled) return
  }
  throw new Error('Expected the drawer stack geometry to settle')
}

function readLefts(drawers: WebUiDrawer[]): number[] {
  return drawers.map(drawer => Number(getDialog(drawer).getBoundingClientRect().left.toFixed(3)))
}

/*
 * 有界轮询：跨断点的重算由 matchMedia 的 change 事件异步驱动，不是同步发生。
 * 轮询「几何是否已按新基准收敛」，超时即失败——这正是区分力的来源：
 * 实测去掉 matchMedia 监听后 step/base 停在 43.2·ln2/28.8 ≈ 1.040，比应有的 ln2 ≈ 0.693
 * 高 50%，永远不会收敛。（早先写成 `mobileStep < desktopStep` 无效：未重算时两者
 * 只差 3e-5 px 的浮点尾数，断言照样通过。）
 */
async function waitForConvergence(probe: () => boolean, message: string, budget: Budget) {
  while (!budget.expired()) {
    if (probe()) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(message)
}
// 逐层打开并等各自就位：层序 depth 按打开顺序计数，同时开会让下层还没进入 top layer。
async function openStack(budget: Budget, ...drawers: WebUiDrawer[]) {
  for (let i = 0; i < drawers.length; i++) {
    drawers[i].open = true
    await drawers[i].updateComplete
    await settle(drawers.slice(0, i + 1), budget)
  }
}

// 由深到浅（先打开的在下层）的左缘序列。
function leftEdges(drawers: WebUiDrawer[]): number[] {
  return drawers.map(drawer => getDialog(drawer).getBoundingClientRect().left)
}

/*
 * 相邻层的可见步进，由顶层往下数。
 *
 * shift 是朝屏幕内侧的负向 translate，所以越深的层左缘越靠左；步进取正值后
 * 等宽下即 base · ln(1 + 1/d)：d=1 是 base·ln2，d=2 是 base·ln(3/2)，d=3 是 base·ln(4/3)，
 * 单调递减。旧的线性实现给出的是全等序列。
 */
function steps(lefts: number[]): number[] {
  // 反转：lefts 由深到浅，d=1 的那一步在序列末尾。
  return lefts
    .slice(1)
    .map((left, index) => left - lefts[index])
    .reverse()
}

function readBase(drawer: WebUiDrawer): number {
  const raw = getComputedStyle(getDialog(drawer)).getPropertyValue(PEEK_BASE_VARIABLE)
  return Number.parseFloat(raw)
}

async function closeTop(drawers: WebUiDrawer[], budget: Budget) {
  const top = drawers[drawers.length - 1]
  top.open = false
  await top.updateComplete
  while (getDialog(top).open) {
    if (budget.expired()) throw new Error('Expected the top drawer dialog to close')
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  await settle(drawers.slice(0, -1), budget)
}

afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

describe('WebUiDrawer 嵌套层叠对数基准（浏览器）', () => {
  it('模块兜底常量与注册项 initialValue 同源', async () => {
    await page.viewport(1280, 720)
    const [drawer] = [createDrawer('base')]
    await openStack(createBudget(PAIR_BUDGET_MS), drawer)

    // 无任何覆盖时读到的就是注册项的 initialValue（token 注册成 <length>，
    // computed style 永远有确定值）。这条断言把 JS 侧常量钉在注册项上，
    // 防止镜像漂移——它是 jsdom 兜底的唯一依据，漂移会让 jsdom 与浏览器分叉。
    // 后果不是像素：一旦漂移，jsdom 下算出的层序与浏览器不同，
    // 于是只在 jsdom 跑的层序断言会给出与真机相反的结论。
    expect(readBase(drawer)).toBe(NESTED_PEEK_BASE_FALLBACK)
  })

  it('窄断点用更小的基准，跨断点后已打开的堆叠按新基准重算', { timeout: PAIR_TEST_TIMEOUT_MS }, async () => {
    await page.viewport(1280, 720)
    const budget = createBudget(PAIR_BUDGET_MS)
    const lower = createDrawer('lower')
    const top = createDrawer('top')
    await openStack(budget, lower, top)

    const desktopBase = readBase(lower)
    const desktopStep = steps(leftEdges([lower, top]))[0]
    expect(desktopStep).toBeGreaterThan(0)

    await page.viewport(390, 844)

    const mobileBase = readBase(lower)
    expect(mobileBase).toBeLessThan(desktopBase)

    /*
     * 跨断点后偏移必须重算，否则已开的栈会停留在旧基准的露边宽度上。
     *
     * 判据取 step / base 而非 step 本身：两层等宽时该比值恒为 ln(2)，跨断点不变，
     * 因此这是纯关系式断言（不锁任何像素）。区分力来自比值的量级差——真重算时
     * 两端都 ≈ 0.693；停在旧基准时是 43.2·ln2 / 28.8 ≈ 1.040，比 ln(2) 高 50%，
     * 远超浮点噪声。
     *
     * （早先写成 `mobileStep < desktopStep` 是无效判据：未重算时两者只差 3e-5 px
     * 的浮点尾数，断言照样通过。重算后 step 从 29.94 掉到 19.96，差 33%。）
     */
    const measureMobileStep = () => steps(leftEdges([lower, top]))[0]
    await waitForConvergence(
      () => Math.abs(measureMobileStep() / mobileBase - desktopStep / desktopBase) < 0.005,
      'Expected the open drawer stack to be recomputed for the narrow-viewport base',
      budget
    )
    const mobileStep = measureMobileStep()
    expect(mobileStep).toBeGreaterThan(0)
    expect(mobileStep / mobileBase).toBeCloseTo(desktopStep / desktopBase, 2)
  })

  it('单层偏移恒为 0：基准改成极端值也不动顶层', { timeout: PAIR_TEST_TIMEOUT_MS }, async () => {
    await page.viewport(1280, 720)
    // 整条用例共用一份预算：跨断点往返、settle、再叠第二层都在同一个上限内。
    const budget = createBudget(PAIR_BUDGET_MS)
    const drawer = createDrawer('single')
    await openStack(budget, drawer)
    const singleLeft = leftEdges([drawer])[0]

    /*
     * ln(1) = 0：把基准放大两个数量级，单层的可见位置必须纹丝不动。
     *
     * 写自定义属性本身**不**触发重算——只有 register / unregister / close 与
     * matchMedia change 四条路径会调 applyLayers。所以这里必须制造一次真实重算，
     * 否则断言读到的仍是打开时的旧几何、恒真（review 指出过的空转判据）。
     * 做法是跨一次断点：外层宿主上的 200px 声明压过 shadow 内的 `@media` 规则，
     * 基准保持 200px 不变，但 applyLayers 确实重跑了一遍——这正是要验的场景。
     */
    drawer.style.setProperty(PEEK_BASE_VARIABLE, '200px')
    await page.viewport(390, 844)
    await page.viewport(1280, 720)
    await settle([drawer], budget)
    expect(readBase(drawer)).toBe(200)
    expect(leftEdges([drawer])[0]).toBeCloseTo(singleLeft, 1)

    // 同一基准下叠第二层，下层才动——说明上面那条不是「基准根本没生效」。
    const top = createDrawer('top')
    top.style.setProperty(PEEK_BASE_VARIABLE, '200px')
    await openStack(budget, top)
    expect(leftEdges([drawer, top])[0]).toBeLessThan(singleLeft)
    expect(leftEdges([drawer, top])[1]).toBeCloseTo(singleLeft, 1)
  })

  it('四层等宽：步进随层数递减，总堆叠宽度次线性增长', { timeout: STACK_TEST_TIMEOUT_MS }, async () => {
    await page.viewport(1280, 720)
    const budget = createBudget(STACK_BUDGET_MS)
    const drawers = [createDrawer('d0'), createDrawer('d1'), createDrawer('d2'), createDrawer('d3')]
    await openStack(budget, ...drawers)

    const [s1, s2, s3] = steps(leftEdges(drawers))

    // 逐层增量递减：ln 的定义性质，线性实现给的是全等序列。
    expect(s1).toBeGreaterThan(s2)
    expect(s2).toBeGreaterThan(s3)

    // 凹性：总宽小于「按首层步进线性外推」的上界，即总宽不随层数线性膨胀。
    const total = s1 + s2 + s3
    expect(total).toBeLessThan(s1 * 3)
  })

  it('基准置 0：四层左缘重合，露边完全塌缩（token → 几何的因果性）', { timeout: STACK_TEST_TIMEOUT_MS }, async () => {
    await page.viewport(1280, 720)
    const budget = createBudget(STACK_BUDGET_MS)
    const drawers = [createDrawer('d0'), createDrawer('d1'), createDrawer('d2'), createDrawer('d3')]
    // 在打开前写：层序计算在 register 时读基准，写在之后不会触发重算。
    for (const drawer of drawers) drawer.style.setProperty(PEEK_BASE_VARIABLE, '0')
    await openStack(budget, ...drawers)

    // 注册成 <length>，消费方的 unitless 0 归一为 0px。
    for (const drawer of drawers) expect(readBase(drawer)).toBe(0)
    for (const step of steps(leftEdges(drawers))) expect(step).toBeCloseTo(0, 1)
  })

  it('关闭顶层后下层逐级回弹到全尺寸', { timeout: STACK_TEST_TIMEOUT_MS }, async () => {
    await page.viewport(1280, 720)
    // 开 4 层 + 关 3 层全程共用一份预算，见 createBudget 上方的说明。
    const budget = createBudget(STACK_BUDGET_MS)
    const single = createDrawer('single')
    await openStack(budget, single)
    const fullLeft = leftEdges([single])[0]

    const drawer = createDrawer('d0')
    await openStack(budget, drawer)
    const stack = [drawer]
    for (const heading of ['d1', 'd2']) {
      const next = createDrawer(heading)
      await openStack(budget, ...stack, next)
      stack.push(next)
    }
    expect(steps(leftEdges(stack))[0]).toBeGreaterThan(0)

    /*
     * 逐层关闭：每一层的下层都回到 depth 0 的全尺寸位置。
     * 先把观测值收集齐再断言——`expect` 写在 while 里会变成 conditional expect
     * （lint: vitest/no-conditional-expect），而且失败时报错不带是哪一层。
     */
    const topLefts: number[] = []
    const remainingSteps: number[] = []
    while (stack.length > 1) {
      await closeTop(stack, budget)
      stack.pop()
      const current = leftEdges(stack)
      topLefts.push(current[current.length - 1])
      if (stack.length > 1) remainingSteps.push(steps(current)[0])
    }

    expect(topLefts).toHaveLength(2)
    for (const left of topLefts) expect(left).toBeCloseTo(fullLeft, 1)
    for (const step of remainingSteps) expect(step).toBeGreaterThan(0)
  })
})
