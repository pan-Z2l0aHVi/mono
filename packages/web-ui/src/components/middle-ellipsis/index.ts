import { html, LitElement, unsafeCSS, type PropertyValues } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import { ElementWidthController } from '@/shared/element-width'
import { normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'
import { DEFAULT_MARKER, truncateMiddle, type WidthProbe } from './truncate'

const MIN_POSITION = 0
const MAX_POSITION = 100
const DEFAULT_POSITION = 50

/**
 * 合串复核的容差与轮数上限。
 *
 * 分段预算看不见两个接缝处的字距，实测偏差在亚像素量级：容差取 0.5px 吸收它。
 * 轮数上限是纯防御，不是常规路径：实测四种形态（等宽 ASCII 文件名、CJK 长串、无空格长串、
 * emoji/ZWJ 混排）各挂载一次，`_apply` 每次都只被调用一次——复核自己会再调一次 `_apply`，
 * 所以调用次数就是拟合次数，一次意味着复核一轮都没触发。这条上限防的是「标记被调用方撑得比
 * 容器还宽」这类退化输入。
 */
const OVERFLOW_TOLERANCE = 0.5
const MAX_REFINE_ROUNDS = 3

/**
 * 可用宽度变化的感知阈（px）。
 *
 * `_currentWidth()` 走 `clientWidth`（整数），ResizeObserver 报的是 `contentRect.width`（分数），
 * 同一个盒子在两条路径上最多差 0.5px 的取整误差。不设阈值时，观察者的首次回调会被当成一次「变宽」
 * 而整份重算——实测挂载时两次 `_apply` 的入参都是同一个 240，也就是每次挂载白做一次二分。
 * 0.5 同时压住了「跳过略小于半个像素的真实收缩」的代价：那个量级下输出最多溢出 0.5px，
 * 与 `OVERFLOW_TOLERANCE` 视为可忽略的量级一致。
 */
const WIDTH_EPSILON = 0.5

/**
 * 单行中间省略：把超长文本截成 `首段…尾段`，省略号出现在中间而不是末尾。
 *
 * 适用面与 `text-overflow: ellipsis` 相同——**单行、且有确定宽度**。文本不换行，宽度由容器
 * 给出（块级盒子的包含块、flex 主轴的 `flex: 1`、grid 轨道都行）。宿主自撑宽度时不存在
 * 「可用空间」可言，组件按当时量到的宽度切一次就不再收缩（见 `_onWidth` 的收敛守卫）。
 *
 * 被丢掉的是中间那段，因此**选中复制拿到的是屏幕上这串**，不是原文；原文经 `title` 暴露，
 * 悬停可见。这条与 CSS 的 `text-overflow` 不同（那里文本节点没被动过、复制得到全文），是
 * JS 方案绕不开的代价，见 docs/research/web-ui-middle-ellipsis-261007.md。
 */
@customElement('web-ui-middle-ellipsis')
export class WebUiMiddleEllipsis extends LitElement {
  static override styles = [unsafeCSS(style)]

  /** 要显示的完整文本。组件只读它，不回写。 */
  @property({ type: String }) text = ''

  /** 中间插入的标记，默认 `…`（U+2026）。空串即「只截断不给信号」，是否这样用由调用方判断。 */
  @property({ type: String, reflect: true })
  set marker(value: string) {
    const next = value ?? DEFAULT_MARKER
    if (this._marker !== next) {
      const old = this._marker
      this._marker = next
      this.requestUpdate('marker', old)
    }
    if (this.getAttribute('marker') !== next) this.setAttribute('marker', next)
  }

  get marker(): string {
    return this._marker
  }

  private _marker = DEFAULT_MARKER

  /**
   * 标记所在的横向比例，0–100，默认 `50`（居中）。
   *
   * 与 CSSWG css-overflow-5 的 `text-overflow: ellipsis <length-percentage>` 同向：量的是标记
   * 结束边距行末边的距离占可用行内空间的比例。`0` 只剩头部（等价于末尾省略），`100` 只剩尾部。
   * 文件名这类「头部是路径噪声、尾部才是扩展名」的场景用**大于** 50 的值让尾部多留一些。
   */
  @property({ type: Number, reflect: true, attribute: 'marker-position' })
  set markerPosition(value: number) {
    const normalized = normalizeNumber(value, MIN_POSITION, MAX_POSITION, DEFAULT_POSITION)
    if (this._markerPosition !== normalized) {
      const old = this._markerPosition
      this._markerPosition = normalized
      this.requestUpdate('markerPosition', old)
    }
    if (this.getAttribute('marker-position') !== String(normalized)) {
      this.setAttribute('marker-position', String(normalized))
    }
  }

  get markerPosition(): number {
    return this._markerPosition
  }

  private _markerPosition = DEFAULT_POSITION

  /*
   * 渲染结果用普通字段承载，不用 `@state`：切分只能在渲染之后量到真实宽度才算得出来，也就是说
   * 「改渲染结果」必然发生在更新周期里，而周期内的 `requestUpdate` 会被 Lit 记一条
   * `change-in-update` 警告——一个实例一条，一张千行的表就是一千条。改成普通字段 + 只在周期外
   * （ResizeObserver 回调、微任务）显式 `requestUpdate()`，渲染时机不变，警告消失。
   */
  private _display = ''
  private _truncated = false

  @query('.root') private _root?: HTMLElement
  @query('.text') private _textEl?: HTMLElement
  @query('.measure') private _measure?: HTMLElement
  @query('.marker-probe') private _markerProbe?: HTMLElement

  /** 最近一次切分依据的可用宽度（px）；-1 表示还没量到过布局。 */
  private _available = -1
  /** 当前渲染出来的文本实际占宽（px）。收敛守卫靠它判断现有输出是否已经放得下。 */
  private _rendered = 0
  /** 输入变过、还没按新输入切过。 */
  private _dirty = true
  private _refineRound = 0

  private readonly _range = document.createRange()

  private readonly _width = new ElementWidthController(this, width => this._onWidth(width))

  private readonly _probe: WidthProbe = {
    prefix: units => this._rangeWidth(0, units),
    suffix: units => this._rangeWidth(this.text.length - units, this.text.length),
    marker: () => this._markerProbe?.getBoundingClientRect().width ?? 0
  }

  override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('text') && !changed.has('marker') && !changed.has('markerPosition')) return

    /*
     * 输入变了就先把渲染退回全文：上一版的切分是按旧文本算的，拿它渲染新文本会显示一段两个
     * 版本都不属于的串。真正的重切由 `updated()` 排进微任务，在同一帧渲染之前完成，所以用户
     * 看不到这个中间态。这里写普通字段，正是为了不在更新周期里再排一次更新。
     */
    this._dirty = true
    this._display = this.text
    this._truncated = false
  }

  override updated(): void {
    const textEl = this._textEl
    if (!textEl) return

    this._rendered = textEl.getBoundingClientRect().width

    if (this._dirty) {
      this._refineRound = 0
      this._defer(() => this._apply(this._currentWidth()))
      return
    }

    /*
     * 合串复核：分段预算只保证「首段和尾段各自没超额度」，接缝处的字距与连字能把合串推过
     * 边界，而这件事只有渲染出来的盒子量得到。超出时按超出量回收额度重切；轮数上限兜住
     * 「怎么切都放不下」的退化情形（例如调用方把标记撑得比容器还宽）。
     */
    if (this._truncated && this._rendered > this._available + OVERFLOW_TOLERANCE) {
      if (this._refineRound < MAX_REFINE_ROUNDS) {
        this._refineRound += 1
        const tighter = this._available - (this._rendered - this._available) - OVERFLOW_TOLERANCE
        this._defer(() => this._apply(tighter))
      }
      return
    }

    this._refineRound = 0
  }

  /**
   * 容器宽度变化。
   *
   * 收缩方向带一条收敛守卫：宿主宽度由内容决定时（flex 主轴 `auto`、或 `width: fit-content` 在内容
   * 缩到容器以内之后），把自己截短会反过来把宿主量窄，于是排下一次尺寸回调。这个自驱动收缩**可能**
   * 一路棘轮到只剩标记，是否发生取决于度量：
   *
   * - flex + 等宽 16px + 默认 50%：缩掉的量小于一个簇宽时，重新二分落回同一组切点，走一步就停。
   * - `width: fit-content` + `marker-position: 80` + CJK：每个簇都是整宽块，切短一簇与宿主窄一簇
   *   互相咬合，摘掉本守卫后 300px 容器里逐帧 282→266→…→10，九步塌到只剩标记（同仓 browser spec
   *   的「fit-content 宿主 + 非居中标记」用例钉住了这一条）。
   *
   * 判据因此取「当前输出已经放得下」：放得下就没有必须重切的理由，自驱动收缩在第一步就停，与度量
   * 无关；真正的容器收缩会让输出宽于新宽度，那时才重切。放长方向没有这个问题，一律重切（可能能
   * 少截一些）。
   */
  private _onWidth(width: number): void {
    if (!(width > 0)) return

    /*
     * 两条短路都只在「没有未落的拟合」时才成立，它们的依据都是「当前输出就是按这个宽度切出来的」——
     * 而 `_dirty` 为真恰恰说明它不是（输入换过了，切分还没跟上）。宿主无布局期间改 text 就是这样：
     * `_apply` 按宽度 ≤ 0 直接返回，`_dirty` 留着，恢复显示时宽度与上次**相同**，若这里按
     * 「宽度没变」短路，就再也没有任何回调会把它切回来——屏幕上留着一段被 `overflow: hidden`
     * 硬裁的全文，没有标记也没有 title。
     */
    if (!this._dirty) {
      // 与上次拟合用的宽度相同（含亚像素取整差）就没有可算的：当前结果正是按这个宽度切出来的。
      // 这一档实测存在——观察者的首次回调报的就是 `_currentWidth()` 量到的同一个宽度。
      if (this._available >= 0 && Math.abs(width - this._available) <= WIDTH_EPSILON) return
      if (this._available >= 0 && width < this._available && this._rendered <= width + OVERFLOW_TOLERANCE) {
        return
      }
    }

    this._refineRound = 0
    this._apply(width)
  }

  /**
   * 把一次重切排到当前更新周期之外。
   *
   * 重切只能在渲染之后量到宽度才做得了，所以第二次更新是必然的；区别只在它从哪里排出去。
   * 微任务仍排在下一帧渲染之前，画面不会先闪一版全文，而 `updated()` 返回时更新已不再是
   * pending，Lit 的 `change-in-update` 警告不会触发。
   */
  private _defer(fit: () => void): void {
    queueMicrotask(fit)
  }

  /**
   * 同步可读的可用行内空间。
   *
   * ResizeObserver 的回调在布局之后才到，属性刚改完的那一帧还没有宽度可用；用 `.root` 的
   * 内容盒补上，免得先按全文画一帧再切。jsdom 没有布局，读到的 0 由 `_apply` 跳过。
   */
  private _currentWidth(): number {
    return this._root?.clientWidth ?? 0
  }

  /**
   * 按可用宽度切分并写回渲染结果。
   *
   * 宽度为 0（没有布局）时什么都不做，**并且保留 `_dirty`**：宿主不可见期间改 text 时这一趟
   * 必然被跳过，若在这里就把「有未落的拟合」清掉，等它重新有布局时就没有任何东西记得要切了。
   * 清标记因此只发生在真的切完之后。
   */
  private _apply(available: number): void {
    if (!(available > 0)) return

    // 量具必须在切分之前装上当前文本：首次更新时量具还不存在，只靠输入变化那次同步会让第一次
    // 切分读到空量具，`prefix(text.length)` 量出 0 而被误判成「放得下」。
    this._syncMeasure()

    const result = truncateMiddle(this.text, this._marker, this._markerPosition, available, this._probe)
    this._available = available
    this._dirty = false
    this._settle(result.truncated ? result.head + this._marker + result.tail : this.text, result.truncated)
  }

  private _settle(display: string, truncated: boolean): void {
    if (this._display === display && this._truncated === truncated) return

    this._display = display
    this._truncated = truncated
    // 周期内的调用会被 Lit 记 change-in-update：这里的两条来路（尺寸回调、微任务）都在周期之外。
    this.requestUpdate()
  }

  /** 把全文装进隐藏量具。它没有 Lit 绑定，改它不会触发重渲染。 */
  private _syncMeasure(): void {
    const measure = this._measure
    if (measure && measure.textContent !== this.text) measure.textContent = this.text
  }

  /** `[from, to)` 这段原文在量具里的渲染宽度。空区间恒为 0——Range 塌缩矩形的宽度不可靠。 */
  private _rangeWidth(from: number, to: number): number {
    if (to <= from) return 0

    const node = this._measure?.firstChild
    if (!(node instanceof Text)) return 0

    this._range.setStart(node, from)
    this._range.setEnd(node, to)
    return this._range.getBoundingClientRect().width
  }

  override render() {
    return html`
      <div class="root">
        <span class="text" title=${ifDefined(this._truncated ? this.text : undefined)}>${this._display}</span>
        <span class="measure"></span>
        <span class="marker-probe" aria-hidden="true">${this._marker}</span>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-middle-ellipsis': WebUiMiddleEllipsis
  }
}
