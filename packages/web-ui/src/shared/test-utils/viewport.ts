/**
 * 视口与滚动的**期待驱动**设置点（仅 browser mode）。
 *
 * 单独建模块而不是并入 `test-utils/index.ts`：`vite-plus/test/browser` 的 `page`
 * 只在 browser runner 下存在，而 `index.ts` 同时被 jsdom 契约测试引用。
 *
 * ## 为什么 `await page.viewport(w, h)` 之后不能立刻量
 *
 * `page.viewport()` 走的是一条**跨文档的往返**：测试 iframe 把请求 post 给
 * orchestrator，orchestrator 改 iframe 外层容器的 CSS 尺寸，再 post 一句
 * `viewport:done` 回来。往返完成只证明「尺寸已经写进 orchestrator 的样式」，
 * **不证明 iframe 已经按新尺寸重新布局**——那要等 orchestrator 文档完成一次布局，
 * 再由引擎重算 iframe 的 viewport。负载下这段窗口会被拉长，于是
 * `window.innerWidth` 在 `await page.viewport(...)` 返回后仍可能是旧值。
 *
 * 形态是「几百像素」而不是 1px：`expected 952 to be close to 1280`。
 * 本模块等的是**期待值本身**（`window.innerWidth/innerHeight` 等于目标），
 * 而不是「等一段时间没变化」——后者在视口根本没生效时同样成立。
 */

import { page } from 'vite-plus/test/browser'

import type { SettleExpectation } from './index'
import { afterRenderStep, pollUntil } from './index'

/**
 * 换视口并等它**真的生效**。
 *
 * 等两件事，顺序不能换：
 *  1. `window.innerWidth / innerHeight` 等于目标——iframe 已按新尺寸布局；
 *  2. 再让出一个完整渲染步进——依赖视口的 media query 监听、ResizeObserver
 *     回调与它们引起的样式重算都在这一步里派发。
 *
 * 只做第 1 步仍不够：视口驱动的组件（响应式断点、滚动锁定、可见区计算）会在
 * 尺寸生效后的下一次渲染步进里才把状态写回，第 2 步等的就是那个写回。
 */
export async function setViewport(width: number, height: number, timeoutMs = 5000): Promise<void> {
  await page.viewport(width, height)
  await pollUntil(
    () => window.innerWidth === width && window.innerHeight === height,
    () => `viewport did not reach ${width}x${height} (read ${window.innerWidth}x${window.innerHeight})`,
    timeoutMs
  )
  await afterRenderStep()
}

/**
 * 滚窗口并等 `window.scrollY` 等于目标。
 *
 * `scroll-behavior: smooth` 或被测组件自己的滚动过渡会让滚动**不是瞬时的**，
 * 因此这里等的是落定位置，不是「滚动事件派发过了」。
 */
export async function scrollWindowTo(top: number, timeoutMs = 5000): Promise<void> {
  window.scrollTo(0, top)
  await pollUntil(
    () => Math.round(window.scrollY) === top,
    () => `window.scrollY did not reach ${top} (read ${window.scrollY})`,
    timeoutMs
  )
  await afterRenderStep()
}

/**
 * 滚元素并等 `scrollTop` 等于目标。
 *
 * 目标可滚动量不足时浏览器会停在最大值，此时 `scrollTop` 到不了目标值——
 * 那是「内容不够长」的测试前提问题，本函数如实报错，不改成「等到不动为止」
 * （那正是本轮要消除的假稳定形态）。
 */
export async function scrollElementTo(el: Element, top: number, timeoutMs = 5000): Promise<void> {
  el.scrollTop = top
  await pollUntil(
    () => Math.round(el.scrollTop) === top,
    () => `scrollTop did not reach ${top} (read ${el.scrollTop} of ${(el as HTMLElement).scrollHeight})`,
    timeoutMs
  )
  await afterRenderStep()
}

/**
 * 滚元素到底并等它真的到底。
 *
 * `scrollTop = 99999` 是「滚到底」的惯用写法，但**赋值与落定之间隔着一个渲染步进**：
 * 同一段代码里紧接着读 `scrollTop` 读到的是浏览器钳制后的值，而依赖滚动位置的
 * 布局（sticky 让位量、可见区计算）要再过一个渲染步进才跟上。这里等的是
 * `scrollTop >= scrollHeight - clientHeight` 这个**期待值**，不是「不动了」。
 *
 * 若元素根本不可滚（内容不超过容器），该期待值在赋值那一刻就成立，本函数立即返回——
 * 那是合法的「已经在底部」，不是等待失败。真正想断言「内容溢出了」的用例应当
 * 另外断 `scrollHeight > clientHeight`。
 */
export async function scrollElementToEnd(el: Element, timeoutMs = 5000): Promise<void> {
  const box = el as HTMLElement
  box.scrollTop = box.scrollHeight
  await pollUntil(
    () => box.scrollTop >= box.scrollHeight - box.clientHeight,
    () =>
      `element did not scroll to its end (read ${box.scrollTop} of ${box.scrollHeight}, client ${box.clientHeight})`,
    timeoutMs
  )
  await afterRenderStep()
}

/**
 * 期待：给定的盒子都**已布局、且完整落在视口内**。
 *
 * 这是命中测试与几何断言最常缺的那条期待值。`elementFromPoint` 在坐标落到视口外
 * 时返回 `null`，于是「胶囊中心命中的是 null」这类失败与「热边没盖住胶囊」在
 * 读数上完全一样——后者是真缺陷，前者只是**还没进到该有的布局状态就开始量了**。
 * 把「盒子已布局且在视口内」写成期待值，两者在等待阶段就被分开了：真缺陷会一直
 * 不成立并带读数超时，状态没到位的则等到位为止。
 *
 * 「已布局」这条是必要的：`display: none` 的元素矩形全零且落在 (0,0)，
 * 四条包含关系**全部平凡成立**——那正是本 helper 要隔离掉的
 * 「状态没到位」。所以面积判据是「宽高里至少有一条为正」而不是「面积大于零」：
 * `drag-bar-edge-inset` 有一条用例把 `--wui-drawer-drag-bar-length` 设成 `0px`
 * 来验证「缩短把手是唯一可测的杠杆」，那一刻胶囊与端头热边的宽度真的就是 0，
 * 但高度仍然是正的。
 *
 * 容差 0.5px：`getBoundingClientRect()` 返回 LayoutUnit 量化值（1/64 px），
 * 而被测目标常常正好贴视口边缘（drawer 面板是 `inset: 0` + `100dvh`），
 * 差一个 1/64px 就够把「已经就位」判成「还没就位」，然后一路等到超时。
 */
const CONTAINMENT_EPSILON = 0.5

export function expectInsideViewport(targets: ReadonlyArray<Element | null | undefined>): SettleExpectation {
  const boxes = () =>
    targets
      .filter((target): target is Element => !!target && target.isConnected)
      .map(target => {
        const raw = target.className
        const classes = typeof raw === 'string' ? raw.trim() : ''
        return {
          name: target.tagName.toLowerCase() + (classes ? `.${classes.split(/\s+/).join('.')}` : ''),
          rect: target.getBoundingClientRect()
        }
      })

  const isLaidOutAndContained = ({ rect }: { rect: DOMRect }) =>
    (rect.width > 0 || rect.height > 0) &&
    rect.top >= -CONTAINMENT_EPSILON &&
    rect.left >= -CONTAINMENT_EPSILON &&
    rect.bottom <= window.innerHeight + CONTAINMENT_EPSILON &&
    rect.right <= window.innerWidth + CONTAINMENT_EPSILON

  return {
    check: () => {
      const observed = boxes()
      return observed.length > 0 && observed.every(isLaidOutAndContained)
    },
    describe: () =>
      `viewport ${window.innerWidth}x${window.innerHeight}; ` +
      boxes()
        .map(
          box =>
            `${box.name} @ ${box.rect.left.toFixed(2)},${box.rect.top.toFixed(2)} ${box.rect.width.toFixed(2)}x${box.rect.height.toFixed(2)}`
        )
        .join('; ')
  }
}
