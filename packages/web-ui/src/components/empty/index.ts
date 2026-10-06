import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import { lucideInbox } from '@/icons'

import style from './style.css?inline'

/**
 * 图标容器边长默认值（px），也是非法输入的回退目标。
 */
const DEFAULT_SIZE = 56

/**
 * 派生度量统一除以 7。取 7 是为了让默认档 56 整除出改前 medium 的四个值：字形 3/7 → 24、
 * min-height 30/7 → 240、padding 块 4/7 → 32、padding 行 3/7 → 24。40 与 72 因此落到
 * 171 / 23 / 17 与 309 / 41 / 31，字形 17 与 31。
 */
const DERIVED_DENOMINATOR = 7
const GLYPH_NUMERATOR = 3
const MIN_HEIGHT_NUMERATOR = 30
const PADDING_BLOCK_NUMERATOR = 4
const PADDING_INLINE_NUMERATOR = 3

/**
 * 字号只有两档，阈值与默认边长同为 56：低于阈值取改前 small 的字号，其余取改前 medium 的
 * 字号。大尺寸靠留白撑开而不是靠字变大，所以 72 与 56 同档。
 */
const COMPACT_SIZE_THRESHOLD = 56
const COMPACT_TITLE_FONT_SIZE = 14
const COMPACT_DESCRIPTION_FONT_SIZE = 13
const DEFAULT_TITLE_FONT_SIZE = 16
const DEFAULT_DESCRIPTION_FONT_SIZE = 14

/**
 * 只做数值合法性判断，不做枚举映射：有限正数原样采用，其余输入（NaN、±Infinity、0、负数）
 * 回退默认边长。
 *
 * 这一层是必要的：`size` 会同时写进 `--wui-internal-empty-size`，未守卫时
 * `size="abc"` 会产出失效的 `NaNpx`（盒退回 unset 而涨成 300×300），
 * `size=""` 会产出 `0px`（图标不可见）。回退的是边长本身，整套派生度量因此一起回到默认档
 * 56，而不是按 `NaN` 算出垃圾值。
 */
const normalizeSize = (value: number): number => (Number.isFinite(value) && value > 0 ? value : DEFAULT_SIZE)

@customElement('web-ui-empty')
export class WebUiEmpty extends LitElement {
  static override styles = [unsafeCSS(style)]

  @property({ type: String, reflect: true }) override title = ''

  @property({ type: String, reflect: true }) description = ''

  /**
   * 版面缩放基准，单位 px，默认 56。驱动图标盒、min-height、padding 与标题/描述字号，
   * 使大图标不再配 medium 留白。
   *
   * 派生规则：图标容器边长即 `size`，默认字形边长 `round(size * 3 / 7)`，min-height
   * `round(size * 30 / 7)`，padding 块 `round(size * 4 / 7)`、行 `round(size * 3 / 7)`；
   * 字号在 56 处分两档，低于 56 为 14px / 13px，56 及以上为 16px / 14px。段间距与内容宽度
   * 不随它变化。
   *
   * 派生值全部落在 `--wui-internal-empty-*` 上，`--wui-empty-*` 仍压在其上，所以逐项覆盖
   * 优先于本属性。非法输入（非有限数、0、负数）回退默认边长 56。
   */
  @property({ type: Number, reflect: true })
  get size(): number {
    return this._size
  }

  set size(value: number) {
    const old = this._size
    const normalized = normalizeSize(value)
    if (normalized === old) return
    this._size = normalized
    this.requestUpdate('size', old)
  }

  private _size = DEFAULT_SIZE

  private get _iconSize(): number {
    return Math.round((this.size * GLYPH_NUMERATOR) / DERIVED_DENOMINATOR)
  }

  /**
   * `size` 派生的整套度量。CSS 侧按 `var(--wui-empty-*, var(--wui-internal-empty-*, 默认值))`
   * 消费，公开 token 因此始终压在派生值之上。
   */
  private get _sizeStyle(): Record<string, string> {
    const size = this.size
    const compact = size < COMPACT_SIZE_THRESHOLD
    const scaled = (numerator: number) => `${Math.round((size * numerator) / DERIVED_DENOMINATOR)}px`
    return {
      '--wui-internal-empty-size': `${size}px`,
      '--wui-internal-empty-min-height': scaled(MIN_HEIGHT_NUMERATOR),
      '--wui-internal-empty-padding-block': scaled(PADDING_BLOCK_NUMERATOR),
      '--wui-internal-empty-padding-inline': scaled(PADDING_INLINE_NUMERATOR),
      '--wui-internal-empty-title-font-size': `${compact ? COMPACT_TITLE_FONT_SIZE : DEFAULT_TITLE_FONT_SIZE}px`,
      '--wui-internal-empty-description-font-size': `${
        compact ? COMPACT_DESCRIPTION_FONT_SIZE : DEFAULT_DESCRIPTION_FONT_SIZE
      }px`
    }
  }

  @state() private _hasTitleSlot = false
  @state() private _hasDescriptionSlot = false
  @state() private _hasActionSlot = false

  override connectedCallback() {
    super.connectedCallback()
    this._syncSlotContent()
  }

  protected override updated() {
    // 无条件写：条件写同样覆盖得到默认实例（实测首次 changedProperties 里带 size）。
    // 这里换来的不变量是「派生 token 永远与当前 size 一致」——将来新增派生 token 不必
    // 再补一处 changed 判断，而同值 setProperty 不触发样式失效，代价可忽略。
    for (const [token, value] of Object.entries(this._sizeStyle)) {
      this.style.setProperty(token, value)
    }
  }

  private _syncSlotContent = () => {
    this._hasTitleSlot = this._hasAssignedContent()
    this._hasDescriptionSlot = this._hasAssignedContent('description')
    this._hasActionSlot = this._hasAssignedContent('action')
  }

  private _hasAssignedContent(slotName?: string): boolean {
    return [...this.childNodes].some(node => {
      if (node instanceof HTMLElement && (node.getAttribute('slot') ?? '') === (slotName ?? '')) return true
      return !slotName && node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
    })
  }

  override render() {
    const showTitle = this._hasTitleSlot || Boolean(this.title)
    const showDescription = this._hasDescriptionSlot || Boolean(this.description)

    return html`
      <section class="empty">
        <div class="empty-icon" aria-hidden="true">
          <slot name="icon"><web-ui-icon .icon=${lucideInbox} .size=${this._iconSize}></web-ui-icon></slot>
        </div>
        <div class=${classMap({ 'empty-title': true, 'is-hidden': !showTitle })}>
          <slot @slotchange=${this._syncSlotContent}>${this.title}</slot>
        </div>
        <div class=${classMap({ 'empty-description': true, 'is-hidden': !showDescription })}>
          <slot name="description" @slotchange=${this._syncSlotContent}>${this.description}</slot>
        </div>
        <div class=${classMap({ 'empty-action': true, 'is-hidden': !this._hasActionSlot })}>
          <slot name="action" @slotchange=${this._syncSlotContent}></slot>
        </div>
      </section>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-empty': WebUiEmpty
  }
}
