import { clusterEnds } from '@/components/middle-ellipsis/truncate'

/**
 * 「组块」的切分：决定组间间隙落在原文的哪些位置，不改变文本本身。
 *
 * 切分结果首尾相接、拼回去恰好等于原串——组与组之间不含任何补位字符。这不是洁癖：复制路径读的是
 * 文本节点的 data，分隔符一旦进了文本节点，复制、页内查找、双击选词三件事同时坏掉。间隙因此只能
 * 是布局（挂在每组末位簇自己的字距上），不能是字符。实测边界见
 * docs/research/web-ui-grouped-text-261102.md。
 *
 * 切点一律落在字素簇边界上，与 `web-ui-middle-ellipsis` 同一个口径：按 UTF-16 下标切会把代理对与
 * ZWJ 序列从中间劈开，屏幕上出现半个 emoji 比「这一组少一位」严重得多。
 */

/** 预设组形。 */
export type GroupedTextPreset = 'card' | 'phone' | 'amount'

/** 组形：预设名，或逐组的字素簇数（如 `[4, 4, 4, 4]`）。 */
export type GroupedTextGroups = GroupedTextPreset | readonly number[]

/**
 * 组形的**写入**形态：预设名与位数表都落到 `string`，逐组位数保持 `readonly number[]`。
 *
 * 它比 `GroupedTextGroups` 宽一档，是因为 attribute 与 property 两条通道必须给出同一个组形：Vue 这类
 * 框架发现 `'groups' in el` 成立就直接赋 property，Lit 的 `fromAttribute` 转换器一次都不会跑。字符串
 * 只走 attribute 那条路的话，模板里写 `groups="4,4,4,4"` 传进来的就是原样字符串，位数表读不出来。
 * 收到的值统一由 `resolveGroups` 收成 `GroupedTextGroups`。
 */
export type GroupedTextGroupsInput = string | readonly number[]

/**
 * 一组的渲染输入。
 *
 * `gap` 是这一组末位字素簇——只有它单独成盒并带上字距，间隙才会属于该字符自己的文本片段，
 * 选区高亮才会在组间连续。最后一组的 `gap` 是空串：它后面没有下一组，不留多余字距。
 */
export interface GroupedRun {
  readonly body: string
  readonly gap: string
}

/** 一组覆盖的字素簇区间，`[from, to)`。 */
interface ClusterSpan {
  readonly from: number
  readonly to: number
}

const CARD_SIZES = [4]
const PHONE_SIZES = [3, 4, 4]
const AMOUNT_INTEGER_SIZE = 3

/**
 * 从左按 `sizes` 逐组推进。位数用完还剩字符时沿用**最后一档**继续切，末组放剩下的部分，
 * 因此一个字符都不会丢，也不会有空组。
 */
function leftSpans(total: number, sizes: readonly number[]): ClusterSpan[] {
  const spans: ClusterSpan[] = []

  let from = 0
  let index = 0
  while (from < total) {
    const size = sizes[Math.min(index, sizes.length - 1)]
    const to = Math.min(from + size, total)
    spans.push({ from, to })
    from = to
    index += 1
  }

  return spans
}

/** 把 `[from, to)` 这段簇从右往左按 `size` 位一组切开；最左一组可以不满。 */
function rightSpans(from: number, to: number, size: number): ClusterSpan[] {
  const spans: ClusterSpan[] = []

  let end = to
  while (end > from) {
    const start = Math.max(from, end - size)
    spans.unshift({ from: start, to: end })
    end = start
  }

  return spans
}

/**
 * 金额的小数点位置：最后一个**后面还有内容**的 `.` 所在簇。
 *
 * 只认 `.`。区域分隔符（`,`、`U+00A0`、`U+202F`）属于内容，复制会原样带出，那是格式化字符串的
 * 事，不由这个只负责排版分组的组件代替。
 */
function separatorIndex(value: string, ends: number[]): number {
  for (let index = ends.length - 2; index >= 0; index -= 1) {
    const start = index === 0 ? 0 : ends[index - 1]
    if (value.slice(start, ends[index]) === '.') return index
  }
  return -1
}

function amountSpans(value: string, ends: number[]): ClusterSpan[] {
  const total = ends.length
  const dot = separatorIndex(value, ends)

  // 没有小数点（或整串就是小数点）时没有可归组的小数段，按整数串从右往左三位一组。
  if (dot <= 0) return rightSpans(0, total, AMOUNT_INTEGER_SIZE)

  // 小数点连着小数部分自成一组：`1234567.89` → `1|234|567|.89`。
  // 小数点单独成组会让它两侧都被撑开，屏幕上读成 `567 . 89`，把分隔符从自己的数字上拆开了。
  return [...rightSpans(0, dot, AMOUNT_INTEGER_SIZE), { from: dot, to: total }]
}

/**
 * 把 `[from, to)` 这段簇拆成 `body`（除末位簇）与 `gap`（末位簇）。
 *
 * 只有一组时 `gap` 为空串——组间间隙是「这一组与下一组之间」的事，最后一组后面没有下一组。
 */
function runOf(value: string, ends: number[], span: ClusterSpan, hasGap: boolean): GroupedRun {
  const start = span.from === 0 ? 0 : ends[span.from - 1]
  const end = ends[span.to - 1]

  if (!hasGap) return { body: value.slice(start, end), gap: '' }

  const split = span.to - span.from === 1 ? start : ends[span.to - 2]
  return { body: value.slice(start, split), gap: value.slice(split, end) }
}

function toRuns(value: string, ends: number[], spans: ClusterSpan[]): GroupedRun[] {
  const last = spans.length - 1
  return spans.map((span, index) => runOf(value, ends, span, index < last))
}

/**
 * 把 `value` 按 `groups` 切成首尾相接的组。
 *
 * `groups` 省略、为空或读不出时整串自成一组：不分组、没有间隙。这一档刻意不猜组形——身份证按
 * 4 位切开、大额金额按 4 位切开都是看得见的错切，而错切比不分组的可见成本高得多。
 */
export function groupedRuns(value: string, groups: GroupedTextGroups | undefined): GroupedRun[] {
  if (value === '') return []

  const ends = clusterEnds(value)

  if (groups === 'amount') return toRuns(value, ends, amountSpans(value, ends))

  const sizes = sanitizeSizes(presetSizes(groups))
  if (sizes.length === 0) return [{ body: value, gap: '' }]

  return toRuns(value, ends, leftSpans(ends.length, sizes))
}

/**
 * 预设名到逐组位数的映射；显式数组原样返回。
 *
 * 参数里不含 `amount`：它在 `groupedRuns` 里按金额规则单独分派，不走这张预设表。
 */
function presetSizes(groups: Exclude<GroupedTextGroups, 'amount'> | undefined): readonly number[] {
  if (groups === undefined) return []
  if (groups === 'card') return CARD_SIZES
  if (groups === 'phone') return PHONE_SIZES
  return groups
}

/** 只保留正整数位数；`0`、负数、`NaN`、小数与非有限值都丢掉。 */
function sanitizeSizes(sizes: readonly number[]): number[] {
  return sizes.filter(size => Number.isInteger(size) && size > 0)
}

/**
 * `groups` 的字符串写法解析：预设名，或以逗号（空格也可）分隔的正整数位数表。
 *
 * 逐组位数写成 `4,4,4,4`；读不出的写法返回 `undefined`，即不分组。预设名与数字表混排
 * （`card,4`）同样判为读不出，不做「取能用的那半截」这种静默降级。attribute 与 property
 * 两条通道共用这一份解析，口径必须一致。
 */
export function parseGroupsAttribute(raw: string | null): GroupedTextGroups | undefined {
  const text = raw?.trim()
  if (!text) return undefined
  if (text === 'card' || text === 'phone' || text === 'amount') return text

  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return undefined

  const sizes = parts.map(Number)
  return sizes.every(size => Number.isInteger(size) && size > 0) ? sizes : undefined
}

/**
 * 把写入形态（见 `GroupedTextGroupsInput`）收成 `groupedRuns` 要的组形。
 *
 * 字符串一律走 `parseGroupsAttribute`：预设名原样留下，位数表解析成数组，读不出的得到 `undefined`
 * （不分组）。数组本身就是组形，直接透传。
 */
export function resolveGroups(input: GroupedTextGroupsInput | undefined): GroupedTextGroups | undefined {
  return typeof input === 'string' ? parseGroupsAttribute(input) : input
}
