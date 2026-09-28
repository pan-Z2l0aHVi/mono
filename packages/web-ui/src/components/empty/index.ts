import { html, LitElement, unsafeCSS, type PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import { lucideInbox } from '@/icons'

import style from './style.css?inline'

/**
 * 默认字形边长相对图标容器边长的比例：容器 56 → 字形 24，与改前 medium 档位一致；
 * 旧 small / large 的 40 → 16、72 → 32 则分别落到 17 与 31。
 */
const GLYPH_NUMERATOR = 3
const GLYPH_DENOMINATOR = 7

/** 图标容器边长默认值（px），也是非法输入的回退目标。 */
const DEFAULT_SIZE = 56

/**
 * 只做数值合法性判断，不做枚举映射、也不做阈值分档：有限正数原样采用，
 * 其余输入（NaN、±Infinity、0、负数）回退默认边长。
 *
 * 这一层是必要的：`size` 会同时写进 `--wui-internal-empty-size`，未守卫时
 * `size="abc"` 会产出失效的 `NaNpx`（盒退回 unset 而涨成 300×300），
 * `size=""` 会产出 `0px`（图标不可见）。回退的是边长本身，不是「medium 档的那套度量」。
 */
const normalizeSize = (value: number): number => (Number.isFinite(value) && value > 0 ? value : DEFAULT_SIZE)

@customElement('web-ui-empty')
export class WebUiEmpty extends LitElement {
  static override styles = [unsafeCSS(style)]

  @property({ type: String, reflect: true }) override title = ''

  @property({ type: String, reflect: true }) description = ''

  /**
   * 图标容器边长，单位 px，默认 56。
   *
   * 只驱动图标区：容器边长写入 `--wui-internal-empty-size`，默认字形边长按
   * `round(size * 3 / 7)` 派生。min-height、padding、标题与描述字号、段间距不再随它变化；
   * 需要差异化时覆盖对应的 `--wui-empty-*` 变量，其中 `--wui-empty-icon-size` 优先于本属性。
   * 非法输入（非有限数、0、负数）回退默认边长 56。
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
    return Math.round((this.size * GLYPH_NUMERATOR) / GLYPH_DENOMINATOR)
  }

  @state() private _hasTitleSlot = false
  @state() private _hasDescriptionSlot = false
  @state() private _hasActionSlot = false

  override connectedCallback() {
    super.connectedCallback()
    this._syncSlotContent()
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (props.has('size')) {
      this.style.setProperty('--wui-internal-empty-size', `${this.size}px`)
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
