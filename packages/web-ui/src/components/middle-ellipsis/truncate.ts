/**
 * 单行「中间省略」的切分运算。
 *
 * 目标：把 `text` 拆成 `head + marker + tail`，两端各自在原串里连续、中间那段被丢掉，
 * 且合串不超过可用行内空间。切点只落在**字素簇**边界上，代理对、组合符序列和 ZWJ emoji
 * 都不会被从中间劈开——按 UTF-16 下标切一定会。
 *
 * 为什么这一层不能由 CSS 承担：`text-overflow` 渲染的是行盒里**一段连续**的内容，结构上
 * 不可能同时显示首尾而丢掉中间。能靠 `direction` / 双值写法挪动的只是省略号落在行的哪一
 * 端，而且 `direction: rtl` 那条路还会按双向算法重排内容（`2026-report.pdf` → `report.pdf-2026`）。
 * 完整调研见 docs/research/web-ui-middle-ellipsis-261007.md。
 *
 * 宽度口径：两端额度按 `position` 从可用空间里分出来，各自用「前 i 簇 / 后 i 簇」的**实测**
 * 宽度二分逼近。实测走调用方给的探针（Range 读取，不写 DOM），所以重算一次只有若干次读取，
 * 没有回流——面板里同时存在成百上千个这样的单元格时，这个差别就是「一帧一次布局」与
 * 「一个单元格一次布局」的差别。
 *
 * 分段宽度不蕴含合串宽度：`head|marker` 与 `marker|tail` 两个接缝的字距和连字是分段量看不见
 * 的。这里不做合串实测，因为那要写一次 DOM 再读、把上面省下的回流又付回去；复核交给调用方
 * 对着**渲染出来的真实盒子**做一次（见组件的 `updated()`），那才是「放得下」的直接证据。
 */

/** 默认省略标记：U+2026 HORIZONTAL ELLIPSIS。 */
export const DEFAULT_MARKER = '…'

let segmenter: Intl.Segmenter | undefined

/**
 * 每个字素簇的 UTF-16 结束偏移（升序，不含 0），末项恒等于 `text.length`。
 *
 * `Intl.Segmenter` 的构造不便宜，单例复用。目标浏览器（见 package.json 的 browserslist）
 * 与本地 node 测试环境都自带它，因此不写按码点切的退化分支——那会在部分环境里悄悄改变
 * 切分口径，而这正是本模块唯一的正确性来源。
 */
export function clusterEnds(text: string): number[] {
  if (text === '') return []

  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })

  const ends: number[] = []
  for (const { index, segment } of segmenter.segment(text)) ends.push(index + segment.length)
  return ends
}

/**
 * 宽度探针。
 *
 * 三段都必须是**真实排版**下量到的宽度：字体回退、字距、连字、`letter-spacing`、
 * `text-transform` 都会改变字形的推进量，任何独立的估算（例如用 canvas 的 `measureText`）
 * 都要自己复刻这一整套解析，复刻不全就是静默的量错。
 */
export interface WidthProbe {
  /** 原文前 `units` 个 UTF-16 单元的渲染宽度。 */
  prefix(units: number): number
  /** 原文后 `units` 个 UTF-16 单元的渲染宽度。 */
  suffix(units: number): number
  /** 标记自身的渲染宽度。 */
  marker(): number
}

export interface MiddleTruncation {
  /** 保留的原文前缀。 */
  readonly head: string
  /** 保留的原文后缀。 */
  readonly tail: string
  /** 是否真的丢掉了内容；`false` 时合串就是原文，标记不出现。 */
  readonly truncated: boolean
}

/** 宽度对簇数单调不减，因此可以二分求预算内放得下的最大簇数。 */
function fitCount(total: number, fits: (count: number) => boolean): number {
  let lo = 0
  let hi = total
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (fits(mid)) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * 在 `available` 内把 `text` 切成 `head + marker + tail`。
 *
 * `position` 与 CSSWG css-overflow-5 的 `text-overflow: ellipsis <length-percentage>` 同向：
 * 量的是标记结束边距行末边的距离占可用行内空间的比例。`0` 把标记贴在行末（只剩头部，等价于
 * 末尾省略），`100` 贴在行首（只剩尾部），`50` 居中；两端额度因此是 `(1 - p)` 与 `p`。
 */
export function truncateMiddle(
  text: string,
  marker: string,
  position: number,
  available: number,
  probe: WidthProbe
): MiddleTruncation {
  if (text === '') return { head: '', tail: '', truncated: false }

  // 放得下就不截断，一个字符都不动——这既是正确性也是「短文本不该出现省略号」的体检点。
  if (probe.prefix(text.length) <= available) return { head: text, tail: '', truncated: false }

  const ends = clusterEnds(text)
  const total = ends.length

  /*
   * 标记自己都放不下的快速路径：让标记溢出、由 overflow 把它裁掉（与 text-overflow 的既有语义
   * 一致），而不是退回全文——退回全文会把标记挤出盒外，用户连「这里被截断了」的信号都看不到。
   *
   * 这一条不是正确性分支：预算为负时下面的通用路径同样得到 head / tail 都为空（`prefix(0) = 0`
   * 不满足 `<= 负数`，两次二分都返回 0）。变异验证过——把它改成 `available <= 0`，整套测试仍全绿。
   * 留着只是省掉两次二分，并把「标记放不下」这个意图写在明面上。
   */
  const space = available - probe.marker()
  if (space <= 0) return { head: '', tail: '', truncated: true }

  const ratio = Math.min(1, Math.max(0, position / 100))
  const headBudget = space * (1 - ratio)
  const tailBudget = space * ratio

  /** 前 `count` 个簇在原串里的结束偏移。 */
  const headEnd = (count: number): number => (count === 0 ? 0 : (ends[count - 1] ?? 0))
  /** 后 `count` 个簇在原串里的起始偏移。 */
  const tailStart = (count: number): number => (count === 0 ? text.length : (ends[total - count - 1] ?? 0))

  let headCount = fitCount(total, count => probe.prefix(headEnd(count)) <= headBudget)
  let tailCount = fitCount(total, count => probe.suffix(text.length - tailStart(count)) <= tailBudget)

  /*
   * 两端选中的簇加起来超过原文长度时，说明合串其实放得下，与上面的早退矛盾——那一步已经
   * 用同一个探针量过全文。浮点误差仍可能把两个预算都推过界一点点，这里按头部优先夹紧，
   * 保证 head 与 tail 不重叠。
   */
  if (headCount + tailCount > total) {
    headCount = Math.min(headCount, total)
    tailCount = total - headCount
  }

  return {
    head: text.slice(0, headEnd(headCount)),
    tail: text.slice(tailStart(tailCount)),
    truncated: true
  }
}
