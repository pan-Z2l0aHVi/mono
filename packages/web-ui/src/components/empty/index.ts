import '@/components/icon'

import type { IconifyIcon } from '@iconify/types'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

import { andrsrxnInbox } from '@/icons'

import style from './style.css?inline'

/**
 * Iconify 规范里画布缺省按 16 计（见 @iconify/types README）。生成资产自带尺寸，
 * 这条兜底服务的是把默认图形换成手写 IconifyIcon 对象的场景。
 */
const ICONIFY_DEFAULT_CANVAS = 16

/**
 * SVG 的 width/height 属性值，与 CSS 里 `--wui-empty-icon-size` 的默认值一致。
 * 只负责首帧与 CSS 未生效时的高度，实际边长由 CSS 变量决定。
 */
const FALLBACK_ICON_SIZE = 40

/**
 * 空态图形区。
 *
 * 默认图形直接渲染成 `svg`，不包 `web-ui-icon`：`web-ui-icon` 的边长是 JS 属性
 * （`.size`），CSS 变量驱动不了它，而空态的默认图形是固定资产，没有必要为了几个像素
 * 去读 computed style 再回写属性。样式因此全部落在 CSS 上，调用方换尺寸只写变量。
 *
 * 副作用导入 `@/components/icon` 保留：`icon` 插槽的既有写法只 import 图标数据
 * （`@greypan/web-ui/icons`），组件注册由这里提供。
 */
@customElement('web-ui-empty')
export class WebUiEmpty extends LitElement {
  static override styles = [unsafeCSS(style)]

  @property({ type: String, reflect: true }) override title = ''

  @property({ type: String, reflect: true }) description = ''

  @state() private _hasTitleSlot = false
  @state() private _hasDescriptionSlot = false
  @state() private _hasActionSlot = false

  override connectedCallback() {
    super.connectedCallback()
    this._syncSlotContent()
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

    // 生成物只写下有值的字段，`left` / `top` 缺省即 0（Iconify 规范），所以按 IconifyIcon 读。
    const glyph: IconifyIcon = andrsrxnInbox
    const viewBox = `${glyph.left ?? 0} ${glyph.top ?? 0} ${glyph.width ?? ICONIFY_DEFAULT_CANVAS} ${
      glyph.height ?? ICONIFY_DEFAULT_CANVAS
    }`

    return html`
      <section class="empty">
        <div class="empty-icon" aria-hidden="true">
          <slot name="icon">
            <svg
              class="empty-glyph"
              viewBox="${viewBox}"
              width="${FALLBACK_ICON_SIZE}"
              height="${FALLBACK_ICON_SIZE}"
              aria-hidden="true"
            >
              ${unsafeSVG(andrsrxnInbox.body)}
            </svg>
          </slot>
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
