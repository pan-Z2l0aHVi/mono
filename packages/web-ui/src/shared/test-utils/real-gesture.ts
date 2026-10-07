/**
 * 真实指针手势（仅 browser mode）。
 *
 * browser mode 的测试跑在 iframe 里，而 `userEvent.dblClick` 走 Playwright locator：
 * overlay 打开后遮罩盖住触发点，locator 的 actionability 检查会一直等到超时。
 * 这里直接用 CDP `Input.dispatchMouseEvent` 派发真实鼠标事件——不经过 locator 的
 * 命中检查，因此能在 overlay 打开后照样把双击打到触发点上。
 *
 * 单独建模块而不是并入 `test-utils/index.ts`：CDP session 只在 browser runner 下
 * 存在，而 `index.ts` 同时被 jsdom 契约测试引用。
 */
import { cdp } from 'vite-plus/test/browser-playwright/context'

/**
 * `cdp()` 返回值的导出类型是压缩过的（`send` 没被声明出来），这里只按实际用到的
 * 最小结构描述。playwright provider 下它就是一个带 `send` 的 CDP session。
 */
interface CdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>
}

interface Point {
  x: number
  y: number
}

/**
 * iframe 内的 client 坐标 → 主 frame 视口坐标。
 *
 * CDP 的 `Input.dispatchMouseEvent` 用主 frame 的视口坐标，而测试跑在 iframe 里，
 * 所以要经过「iframe 在主 frame 中的位置 + 缩放」这一步。缩放不能省：browser
 * runner 会给测试 iframe 的父节点套一层 `transform: scale(...)`（实测 720/896 ≈
 * 0.8036），只加偏移不乘缩放的话，真实落点会整体偏出约 24%。偏出的量与目标盒子
 * 的大小成正比，所以大靶子（如整块触发卡片）看起来还正常，小靶子（面板里一行标题）
 * 就会静默打到别处。
 *
 * 反推依据：实测 `Input.dispatchMouseEvent(20,20)` 在 iframe 内收到的
 * `clientX/clientY` 是 24，`(100,100)` → 124，`(200,300)` → `(248,373)`，
 * 即 client = sent / scale，方向与下面的换算一致。
 */
function toViewportPoint(x: number, y: number): Point {
  const frame = window.frameElement as HTMLElement | null
  const rect = frame?.getBoundingClientRect()
  if (!rect || !rect.width || !rect.height) return { x, y }
  const scaleX = rect.width / window.innerWidth
  const scaleY = rect.height / window.innerHeight
  return { x: rect.left + x * scaleX, y: rect.top + y * scaleY }
}

/**
 * 派发一次真实的双击手势。
 *
 * Chrome 只对自己产生的「活手势选区」在 `showModal()` 时做选区重解析，脚本合成的
 * 选区不会（`dispatchEvent(new MouseEvent('dblclick'))` 也不会），所以要复现双击
 * 选区相关的行为只能用真实输入事件。
 */
export async function realDoubleClick(target: Element): Promise<void> {
  const client = cdp() as unknown as CdpSession
  const rect = target.getBoundingClientRect()
  const { x, y } = toViewportPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)

  for (const clickCount of [1, 2]) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount,
      buttons: 1
    })
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount,
      buttons: 0
    })
  }
}

/**
 * 用真实鼠标拖拽把一个节点的全部文字选起来。
 *
 * 用真实拖拽而不是 `Range` + `addRange()` 来断言「这段文字仍可选」：程序化选区
 * **绕开** `user-select`，所以一旦有人把面板一刀切成 `user-select: none`，
 * 程序化写法照样绿，守不住它声称要守的那件事。真实拖拽走的是浏览器自己的命中与
 * 选择判定，`user-select: none` 会真的选不出东西。
 *
 * 前提：节点此时必须有非空布局盒（面板已显示、打开动画已收敛），否则
 * `getClientRects()` 为空并直接抛错，而不是静默通过。
 */
export async function realDragSelectText(node: Node): Promise<void> {
  const client = cdp() as unknown as CdpSession
  const range = document.createRange()
  range.selectNodeContents(node)
  const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0)
  if (rects.length === 0) {
    throw new Error('realDragSelectText: target node has no laid-out text box')
  }

  const first = rects[0]
  const last = rects[rects.length - 1]
  const from = toViewportPoint(first.left + 1, first.top + first.height / 2)
  const to = toViewportPoint(last.right - 1, last.top + last.height / 2)

  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: from.x,
    y: from.y,
    button: 'none',
    buttons: 0
  })
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: from.x,
    y: from.y,
    button: 'left',
    clickCount: 1,
    buttons: 1
  })
  // 单次 jump 没有中间 move 时浏览器仍按拖拽处理，但分段更贴近真实指针轨迹。
  const steps = 4
  for (let step = 1; step <= steps; step++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps,
      button: 'left',
      buttons: 1
    })
  }
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: to.x,
    y: to.y,
    button: 'left',
    clickCount: 1,
    buttons: 0
  })
}

/**
 * 等 overlay 的打开过渡收敛，再去量它的布局盒。
 *
 * 必须在测量**之前**等：dialog / drawer 打开时面板带着 `transform: scale(...)`
 * 进场，`getClientRects()` 量到的是动画当刻的盒子，而 CDP 事件真正落下去还要再过
 * 几毫秒——这中间盒子还在缩，坐标就偏了。实测偏出去的量足以让 press 落到相邻的
 * 另一段文字上（一度表现为「按下落进正文里、拖不动」）。
 *
 * 用动画本身收敛作为信号，不用固定 sleep：WAAPI 动画在并行负载下完成时间不可预测。
 */
export async function waitForOpenTransition(el: Element): Promise<void> {
  await new Promise(resolve => requestAnimationFrame(resolve))
  const dialog = el.shadowRoot?.querySelector('dialog')
  await Promise.all((dialog?.getAnimations({ subtree: true }) ?? []).map(animation => animation.finished))
}

export interface RealTouchPressOptions {
  /** 按住时长（ms）。默认 600ms。 */
  holdMs?: number
  /** 按住期间先位移的像素数，用于验证位移取消长按。 */
  moveBy?: number
  /** 位移发生在按下后的多少毫秒，默认取按住时长的一半。 */
  moveAfterMs?: number
}

/**
 * 用 CDP `Input.dispatchTouchEvent` 派发一次真实触屏按压手势。
 *
 * 合成 `PointerEvent` 触发不了浏览器的**手势识别**：长按判定、原生 contextmenu 的
 * 补发时机、触屏的隐式指针捕获，都是引擎在输入管线上做的，脚本事件走不到那一步。
 * Playwright 的 `touchscreen.tap()` 也不行——它按下即抬起，产生不了一段按住时长，
 * 于是长按永远不会触发。真实长按只能自己按时间轴分步派发。
 *
 * browser project 没有配 `contextOptions.hasTouch`，默认上下文是 mouse-only：
 * 此时 `Input.dispatchTouchEvent` 派下去的事件不会转成 touch/pointer 事件，页面
 * 一个事件都收不到（实测长按与原生 contextmenu 都不会触发）。所以这里先按会话
 * 打开触控仿真，派完再关掉。
 *
 * 派发前装一个 capture 监听器做前置校验：真的收到 `touchstart` 才继续，
 * 收不到就直接抛错。这与 `pnpm agent:verify touch-flow` 的「零事件 → fail」是同一条
 * 纪律——mouse-only 环境下的「长按没反应」不能当成产品结论。
 */
export async function realTouchPress(target: Element, options: RealTouchPressOptions = {}): Promise<void> {
  const client = cdp() as unknown as CdpSession
  const { holdMs = 600, moveBy = 0, moveAfterMs } = options
  const rect = target.getBoundingClientRect()
  const origin = toViewportPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
  const point = (x: number, y: number) => ({
    x,
    y,
    id: 1,
    radiusX: 12,
    radiusY: 12,
    force: 1
  })

  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  let sawTouchStart = false
  const record = () => {
    sawTouchStart = true
  }
  window.addEventListener('touchstart', record, { capture: true, passive: true })
  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [point(origin.x, origin.y)]
    })
    if (!sawTouchStart) {
      throw new Error(
        'Real touch press received no touchstart: this is a mouse-only input environment, ' +
          'so any conclusion drawn from it would be void (see docs/agents/browser-verification.md).'
      )
    }

    const pressedAt = performance.now()
    if (moveBy > 0) {
      await new Promise(resolve => setTimeout(resolve, moveAfterMs ?? Math.floor(holdMs / 2)))
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [point(origin.x + moveBy, origin.y + moveBy)]
      })
    }

    // holdMs 是「总按住时长」，位移之后仍要保持到该时长，否则证不了「位移后计时器
    // 真的被取消」——提前抬手只会同时满足两种实现。
    const remaining = holdMs - (performance.now() - pressedAt)
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining))
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    window.removeEventListener('touchstart', record, { capture: true })
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }
}
