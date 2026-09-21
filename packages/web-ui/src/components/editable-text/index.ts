import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'

import style from './style.css?inline'

/** 空值且无 placeholder 时占位，保留一个行盒，避免宿主退化成 0 高度、无法点击进入编辑。 */
const BLANK_GLYPH = '\u200B'

/** 行/字符落点二分的容差（px），吸收次像素与舍入差异。 */
const CARET_TOLERANCE = 1

/**
 * 取文本层承载文案的 Text 节点。
 *
 * 绑定表达式位于元素首个位置时，Lit 会在它前面留一个注释标记节点，因此不能用
 * `firstChild`：那会拿到没有布局的注释，Range 量不到任何矩形。
 */
function textNodeOf(layer: HTMLElement): Text | null {
  for (const child of layer.childNodes) {
    if (child instanceof Text) return child
  }
  return null
}

/**
 * 把视口坐标映射为文本层的字符偏移。
 *
 * `document.caretPositionFromPoint` 不进入 shadow DOM（对 shadow 内容返回 shadow host
 * 之外的节点），因此在文本层上用 Range 空矩形二分：先按 y 选行，再在行内按 x 选字符。
 * 文本层与编辑层同盒同排版，偏移与 textarea 的 selectionStart 一一对应。
 */
function caretOffsetFromPoint(textLayer: HTMLElement, x: number, y: number): number {
  const node = textNodeOf(textLayer)
  if (!node) return 0
  const length = node.data.length
  const range = document.createRange()
  const rectAt = (offset: number): DOMRect => {
    range.setStart(node, offset)
    range.setEnd(node, offset)
    return range.getBoundingClientRect()
  }

  // 同一行的盒可能被拆成多个 client rect；按 top 去重得到行列表，取与 y 最近的一行，
  // 距离相等时取更靠下的一行（与浏览器在行间的落点行为一致）。
  const lines: DOMRect[] = []
  for (const rect of textLayer.getClientRects()) {
    if (!lines.some(line => Math.abs(line.top - rect.top) <= CARET_TOLERANCE)) lines.push(rect)
  }
  if (lines.length === 0) return length
  let line = lines[0]
  let nearest = Infinity
  for (const candidate of lines) {
    const distance = Math.abs((candidate.top + candidate.bottom) / 2 - y)
    if (distance <= nearest) {
      nearest = distance
      line = candidate
    }
  }

  // 行首：caret top 首次落入本行的最小偏移
  let lo = 0
  let hi = length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (rectAt(mid).top >= line.top - CARET_TOLERANCE) hi = mid
    else lo = mid + 1
  }
  const lineStart = lo
  // 行尾：caret top 仍落在本行的最大偏移
  lo = lineStart
  hi = length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (rectAt(mid).top <= line.top + CARET_TOLERANCE) lo = mid
    else hi = mid - 1
  }
  const lineEnd = Math.max(lo, lineStart)
  // 行内：caret left 不超过 x 的最大偏移
  lo = lineStart
  hi = lineEnd
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (rectAt(mid).left <= x + CARET_TOLERANCE) lo = mid
    else hi = mid - 1
  }
  return lo
}

@customElement('web-ui-editable-text')
export class WebUiEditableText extends FormAssociated(LitElement) {
  static override styles = [unsafeCSS(style)]

  @property({ type: String, reflect: true }) name = ''
  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null

  @state() private _value = ''

  /**
   * `value` attribute 承载 form reset 的初值，不随当前值反射；property 暴露当前值，
   * 与原生 input 的 value / defaultValue 关系一致。
   */
  @property({ type: String })
  get value(): string {
    return this._value
  }

  set value(v: string) {
    const old = this._value
    this._value = v
    this._formAssociation.sync()
    this.requestUpdate('value', old)
  }

  @query('.editor') private _editor?: HTMLTextAreaElement
  @query('.text') private _textLayer?: HTMLElement

  private _editing = false
  private _editBase = ''
  private _pendingCaret: number | null = null
  private _refocusing = false

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  private readonly _formAssociation = defineFormAssociation<string>({
    host: this,
    getState: () => this._value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => this._value,
    getFormState: () => this._value,
    restoreState: state => {
      if (typeof state === 'string') this.value = state
    }
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  constructor() {
    super()
    // focus 不冒泡：宿主监听只在焦点从组件外进入时触发，shadow 内聚焦不会误触
    this.addEventListener('focus', this._onHostFocus)
  }

  override updated() {
    // disabled 时移出 tab 序列；编辑态由 editing attribute 表达，二者互斥
    if (this._isDisabled) this.removeAttribute('tabindex')
    else this.setAttribute('tabindex', '0')
    // 禁用态生效时（属性或 fieldset）退出编辑：值保持当前草稿，不派发提交事件
    if (this._editing && this._isDisabled) this._exitEditing()
  }

  private _onHostFocus() {
    if (this._refocusing) {
      this._refocusing = false
      return
    }
    this._enterEditing()
  }

  /**
   * pointerdown 时文本层仍是命中目标，此时记录落点；浏览器随后的默认聚焦会触发
   * host focus 进入编辑，偏移在那里应用到 textarea。
   */
  private _onPointerDown(e: PointerEvent) {
    if (this._isDisabled || this._editing || !this._textLayer) return
    this._pendingCaret = caretOffsetFromPoint(this._textLayer, e.clientX, e.clientY)
  }

  /** mousedown 默认聚焦被拦截等场景由 click 兜底进入编辑。 */
  private _onClick() {
    if (this._isDisabled || this._editing) return
    this._enterEditing()
  }

  private _enterEditing() {
    if (this._isDisabled || this._editing) return
    this._editing = true
    this._editBase = this._value
    this.toggleAttribute('editing', true)
    const editor = this._editor
    if (!editor) return
    editor.focus()
    // Tab / 编程式聚焦光标到末尾；指针落点用 pointerdown 记下的偏移
    const offset = this._pendingCaret ?? this._value.length
    this._pendingCaret = null
    const clamped = Math.max(0, Math.min(offset, editor.value.length))
    editor.setSelectionRange(clamped, clamped)
  }

  private _exitEditing() {
    if (!this._editing) return
    this._editing = false
    this.toggleAttribute('editing', false)
  }

  private _onInput() {
    // 原生 input 已 composed 冒泡出 shadow root 且 target 重定向到宿主，无需补发
    this._value = this._editor?.value ?? ''
    this._formAssociation.sync()
  }

  private _onBlur() {
    if (!this._editing || this._isDisabled) return
    this._exitEditing()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private _onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    this._value = this._editBase
    this._formAssociation.sync()
    // 焦点回到宿主即取消的落点：先标记再退出编辑，退出时隐藏 textarea 触发的 blur
    // 不提交；宿主 focus 到来时标记已消费，不会再次进入编辑。
    this._refocusing = true
    this._exitEditing()
    this.focus()
    queueMicrotask(() => {
      this._refocusing = false
    })
    this.dispatchEvent(new Event('cancel', { bubbles: true, composed: true }))
  }

  private get _displayText(): string {
    if (this._value !== '') return this._value
    if (this.placeholder !== '') return this.placeholder
    return BLANK_GLYPH
  }

  override render() {
    return html`
      <div class="layers" @pointerdown=${this._onPointerDown} @click=${this._onClick}>
        <span class=${classMap({ text: true, placeholder: this._value === '' })}>${this._displayText}</span>
        <textarea
          class="editor"
          .value=${this._value}
          .placeholder=${this.placeholder}
          ?disabled=${this._isDisabled}
          aria-label=${ifDefined(this.ariaLabel)}
          @input=${this._onInput}
          @keydown=${this._onKeydown}
          @blur=${this._onBlur}
        ></textarea>
      </div>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
    cancel: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-editable-text': WebUiEditableText
  }
}
