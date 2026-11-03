/*
 * drawer 打开时整页让开（iOS push 式）。
 *
 * 「让开」的方向 = drawer 闭合方向的反向：右侧 drawer 从右进场并把页面往左推，视口
 * 右缘因此空出一条给 drawer，页面左缘同步滑出屏幕。轴向与符号都由 drawer 给出
 * （取自 `_dragAxis` / `_dragCloseSign`），两处共用同一张符号表，placement 加一挡不会分叉。
 *
 * 落点是 documentElement，这是选择而非实现细节：整页只有那一个盒子，消费方零配置。
 * 代价与实测结论都在 drawer 示例文档（`docs/drawer.md` / `docs/drawer.CN.md`）的
 * page-shift 小节里（fixed 内容跟着走、top layer 的 dialog 不受影响）。
 *
 * 写在独立属性 `translate` 而不是 `transform` 上：`transform` 让给 shake 的 WAAPI 关键帧，
 * 两者天然复合而非互相覆写（实测内联 `translate: -24px 0px` 叠加进行中的
 * `transform: translate(-5.97px, 0px)` 得到 -29.97px，纵向那条轴同样相加）。drawer 自己的
 * nested 层叠也是同一套独立属性。
 *
 * 让开量由内部公式给出，不暴露可调 token：1 个轴单位 a 在 left/right 上是 `1vw`、在
 * top/bottom 上是 `1vh`；按打开顺序，第 1 层让开 16a，之后每层减半（16a、8a、4a、2a……）。
 * 位移以 `vw` / `vh` 写进 documentElement，转屏或地址栏收起时由浏览器跟着重算，页面
 * 不必自己再跑一遍；关闭中间层后，剩余层按新的打开顺序重新分配系数。等比和收敛到 32a，
 * 不会超过。
 *
 * 静止态与动效分家：
 * - 静止态 = documentElement 的内联 translate，drawer 打开期间一直保留，因此重挂载、
 *   脚本读取都只看这一处；
 * - 动效 = WAAPI，起点取当前计算值、终点写死成同一个静止值，fill 用默认 `none`。
 *   动画期间关键帧压过内联（动画 origin 优先级更高），结束后内联接管且两者同值，
 *   所以不存在 JS→CSS 交接跳变。drawer 里那条「收尾不用 WAAPI」的理由（要从手指所在的
 *   当前值起步、并把 before-change style 交给 CSS 过渡）在这里不成立：本模块没有中途
 *   抓取，两个端点都由自己给出。
 * - 最后一层释放时终点用**接管前测得的计算值**而不是 `none`：消费方样式若给 html 写过
 *   translate，还原内联后算出来的就是那个值，动画终值必须与它一致，否则收尾瞬间会跳。
 *
 * 进行中的动画靠 id 认领并在每次同步前取消，模块因此不持有 Animation 引用；
 * 与 shake 的重新触发同一做法。
 *
 * 多层同时开启 page-shift（嵌套或同级）时逐层累加：每打开一层，页面在原来的方向上再让开
 * 这一层的量；关闭任意一层后剩余层重排，页面回落到按新顺序算出的和。
 *
 * reduce 下整套不生效，连静止位移也不写：drawer 自己的 CSS 在 reduce 下把 panel 的
 * transform/translate/scale 全部归零，页面单独滑出去会读成一个缺陷。
 */

import { definePlugin } from '@greypan/js-kit'

import { prefersReducedMotion } from '@/shared/theme/reduced-motion'

const ENTER_DURATION_VARIABLE = '--wui-duration-drawer-enter'
const EXIT_DURATION_VARIABLE = '--wui-duration-drawer-exit'
// 与 drawer/style.css 里 `var(--wui-duration-drawer-*, <fallback>)` 的同一条兜底。
const ENTER_DURATION_FALLBACK = 280
const EXIT_DURATION_FALLBACK = 240
const EASE_VARIABLE = '--wui-ease-enter'
const EASE_FALLBACK = 'cubic-bezier(0.23, 1, 0.32, 1)'
// 合法 easing 的形状：关键字，或 cubic-bezier() / steps() 函数式。
const EASE_PATTERN = /^(linear|ease(-in|-out)?|step-(start|end))$|^(cubic-bezier|steps)\(/

const PAGE_SHIFT_ANIMATION_ID = 'wui-drawer-page-shift'

/** 第 1 层让开 16 个轴单位 a。 */
const PAGE_SHIFT_BASE = 16
/** 每多打开一层，这一层的让开量减半。 */
const PAGE_SHIFT_DECAY = 0.5

type PageShiftAxis = 'x' | 'y'
/** `'enter'` 用进场时长，`'exit'` 用退场时长，`'instant'` 不动画（断连时页面归位）。 */
type PageShiftMotion = 'enter' | 'exit' | 'instant'

interface PageShiftEntry {
  host: HTMLElement
  getAxis: () => PageShiftAxis
  getSign: () => number
}

const stack: PageShiftEntry[] = []
/*
 * 接管前的页面状态，只在栈由空变非空那一次采样：
 * - `inline` 是 html 上原有的内联值，最后一层释放时原样写回（空串即 removeProperty）；
 * - `neutral` 是当时的计算值，用作最后一层的动画终值。
 */
let takeover: { inline: string; neutral: string } | null = null

/*
 * 时长 token 没有注册，computed style 给的是变量替换后的字面量（主题里是 `280ms`）。
 * 万一它被注册成 <time>，序列化为规范单位秒（`0.28s`），parseFloat 只取数字会丢单位，
 * 所以按后缀补一次换算：两种写法读出来是同一个毫秒数。
 */
function readDuration(host: HTMLElement, property: string, fallback: number): number {
  const raw = getComputedStyle(host).getPropertyValue(property).trim()
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) return fallback
  return raw.endsWith('ms') ? value : value * 1000
}

/*
 * CSS 侧一条无效的 easing 声明会被直接忽略，WAAPI 却对非法 easing 抛 TypeError。
 * 这里只接受关键字与 cubic-bezier()/steps() 两种形状，其余退回与 style.css 相同的默认曲线。
 */
function readEase(host: HTMLElement): string {
  const raw = getComputedStyle(host).getPropertyValue(EASE_VARIABLE).trim()
  return EASE_PATTERN.test(raw) ? raw : EASE_FALLBACK
}

/*
 * 总让开量：按打开顺序，第 n 层贡献 16a / 2^(n-1)，横轴累加到 vw、纵轴累加到 vh。
 * 关闭中间层后剩余层重新排名，系数随之重算；没有新的开合时页面不动。
 * 等比和收敛到 32a，单轴只取这个级数的一个子集，同样到不了 32a。
 */
function restingTranslate(): string {
  let x = 0
  let y = 0
  for (let depth = 0; depth < stack.length; depth += 1) {
    const entry = stack[depth]
    const shift = PAGE_SHIFT_BASE * PAGE_SHIFT_DECAY ** depth * entry.getSign()
    if (entry.getAxis() === 'x') x += shift
    else y += shift
  }
  return `${x}vw ${y}vh`
}

function indexOfHost(host: HTMLElement): number {
  return stack.findIndex(entry => entry.host === host)
}

function applyPage(host: HTMLElement, motion: PageShiftMotion) {
  const root = document.documentElement
  const target = stack.length > 0 ? restingTranslate() : (takeover?.neutral ?? 'none')
  /*
   * 同一层重复 push 的落点与内联值相同：此时不重启动画，否则会从当前值再跑一遍完整时长。
   * 内联值是视口单位，视口变化时浏览器自己重算，所以这里比较的仍是「公式是否变了」。
   */
  if (stack.length > 0 && root.style.translate === target) return
  // 起点读当前计算值：上一段动画还在跑、或重挂载时页面已在位移位，都不能跳。
  const previous = getComputedStyle(root).translate

  if (stack.length > 0) root.style.translate = target
  else if (takeover) {
    root.style.translate = takeover.inline
    takeover = null
  }

  for (const animation of root.getAnimations()) {
    if (animation.id === PAGE_SHIFT_ANIMATION_ID) animation.cancel()
  }
  if (motion === 'instant' || previous === target) return

  const duration = readDuration(
    host,
    motion === 'enter' ? ENTER_DURATION_VARIABLE : EXIT_DURATION_VARIABLE,
    motion === 'enter' ? ENTER_DURATION_FALLBACK : EXIT_DURATION_FALLBACK
  )
  if (duration <= 0) return

  const animation = root.animate([{ translate: previous }, { translate: target }], { duration, easing: readEase(host) })
  animation.id = PAGE_SHIFT_ANIMATION_ID
}

export interface PageShiftOptions {
  /** 读时长、缓动与 reduce 档位的那个元素（drawer 宿主）。 */
  getHost(): HTMLElement | null
  /** 消费方是否开启了整页让开。关闭时 push 直接跳过，pop 仍会把已登记的一层摘掉。 */
  isEnabled(): boolean
  getAxis(): PageShiftAxis
  getSign(): number
}

export interface PageShiftApi {
  /** 进入开启态：把本层计入总让开量并播这一段动画。同一宿主重复调用是幂等的。 */
  push(): void
  /** 退出开启态：摘掉本层，页面回到剩余层之和或原位。未登记时不动页面。 */
  pop(): void
  /** 断连：摘掉本层并立即归位，不补一段退场动画。 */
  dispose(): void
}

export const definePageShift = () =>
  definePlugin<PageShiftApi, PageShiftOptions>(ctx => {
    const detach = (): boolean => {
      const host = ctx.getHost()
      if (!host) return false
      const index = indexOfHost(host)
      if (index < 0) return false
      stack.splice(index, 1)
      return true
    }

    return {
      push() {
        const host = ctx.getHost()
        if (!host || !ctx.isEnabled() || prefersReducedMotion(host)) return
        // 幂等：重挂载对账与 updated() 的 open 分支可能对同一宿主各调一次。
        // 已在栈里时原位更新，保留它原有的排名——重新追加会把它顶到最后一层、拿走别人的系数。
        const index = indexOfHost(host)
        if (index >= 0) {
          stack[index] = { host, getAxis: () => ctx.getAxis(), getSign: () => ctx.getSign() }
          applyPage(host, 'enter')
          return
        }
        if (stack.length === 0 && !takeover) {
          const root = document.documentElement
          takeover = { inline: root.style.translate, neutral: getComputedStyle(root).translate }
        }
        stack.push({ host, getAxis: () => ctx.getAxis(), getSign: () => ctx.getSign() })
        applyPage(host, 'enter')
      },

      pop() {
        const host = ctx.getHost()
        if (!host || !detach()) return
        applyPage(host, 'exit')
      },

      dispose() {
        const host = ctx.getHost()
        if (!host || !detach()) return
        applyPage(host, 'instant')
      }
    }
  })
