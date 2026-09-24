import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { createFieldId } from '@/shared/form-association/field-id'

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
  @property({ type: Boolean, reflect: true }) readonly = false
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
  private _resizeObserver: ResizeObserver | null = null
  private readonly _fieldId = createFieldId('web-ui-editable-text')

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

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._releaseEditingKeys()
    this._teardownAutosize()
  }

  override connectedCallback() {
    super.connectedCallback()
    /*
     * autosize 的 ResizeObserver 在 disconnectedCallback 被拆掉，搭建若只放在
     * firstUpdated（一生一次），元素断开再重连后 RO 永久丢失、autosize 静默失效。
     * connectedCallback 每次连接都跑：_setupAutosize 自带 teardown，重复进入无副作用。
     * 首连接时渲染尚未发生（_editor 为 null），_autosizeEditor 与 RO 回调都有判空守卫。
     */
    this._setupAutosize()
    // 同类缺口：编辑态被断开时 _releaseEditingKeys 撤了 window 监听，重连后 _editing
    // 仍为 true（blur 取消未必先于断开到达），此时补领，避免重连后按键失灵。
    if (this._editing) this._claimEditingKeys()
  }

  override updated() {
    // disabled 时移出 tab 序列；编辑态由 editing attribute 表达，二者互斥
    if (this._isDisabled) this.removeAttribute('tabindex')
    else this.setAttribute('tabindex', '0')
    // 禁用态生效时（属性或 fieldset）退出编辑：值保持当前草稿，不派发提交事件
    if (this._editing && this._isDisabled) this._exitEditing()
    this._autosizeEditor()
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

  /**
   * 公共 API：进入编辑态并全选内容；已在编辑态时只重新全选。
   *
   * `disabled` 时不进入编辑，与 `focus()` 一致。
   */
  select() {
    if (this._isDisabled) return
    if (!this._editing) this._enterEditing()
    const editor = this._editor
    // 全选：末端显式取当前文本长度，覆盖 _enterEditing 落下的光标位置
    editor?.setSelectionRange(0, editor.value.length)
  }

  private _enterEditing() {
    if (this._isDisabled || this._editing) return
    this._editing = true
    this._editBase = this._value
    this.toggleAttribute('editing', true)
    this._claimEditingKeys()
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
    this._releaseEditingKeys()
    this.toggleAttribute('editing', false)
  }

  private _onInput() {
    // 原生 input 已 composed 冒泡出 shadow root 且 target 重定向到宿主，无需补发
    const editor = this._editor
    if (this._isDisabled || this.readonly) {
      if (editor && editor.value !== this._value) editor.value = this._value
      return
    }
    this._value = editor?.value ?? ''
    this._formAssociation.sync()
    this._autosizeEditor()
  }

  /**
   * blur 提交：与 Enter 同一条提交路径，草稿成为新值并派发 change。
   *
   * 不交还焦点：焦点已被用户移走，抢回宿主会吞掉消费者的目标焦点。
   */
  private _onBlur() {
    if (!this._editing || this._isDisabled) return
    if (this.readonly) {
      this._exitEditing()
      return
    }
    this._commitEditing(false)
  }

  /**
   * 提交：草稿成为新值、退出编辑，并恰好派发一次 change。Enter 与 blur 同走这一条路。
   *
   * `returnFocus` 区分两种来路：Enter 主动结束时把焦点交还宿主（标记防重入编辑）；
   * blur 是被动失焦，焦点已被用户移走，再抢回宿主会吞掉消费者的目标焦点。
   * 先退出编辑再动焦点：退出时 textarea 隐藏触发的 blur 看到 _editing 已为 false，
   * 不会把这次提交误判成又一次 blur 提交。
   */
  private _commitEditing(returnFocus: boolean) {
    if (!this._editing) return
    this._exitEditing()
    if (returnFocus) this._returnFocusToHost()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  /**
   * 取消：恢复进入编辑时的值并派发 cancel。仅 Escape 走这一条路径。
   *
   * 调用方（Escape 分支）随后才交还焦点：本方法先摘除编辑态，焦点迁移触发的 blur
   * 到达时 `_editing` 已为 false 而早退，不会把取消误判成 blur 提交。
   */
  private _cancelEditing() {
    if (!this._editing) return
    this._value = this._editBase
    this._formAssociation.sync()
    this._exitEditing()
    /*
     * 重入守卫先于 dispatch 置位：cancel 同步派发，消费者可能在监听器里调
     * el.focus()——那是一次真实的宿主 focus，没有守卫就会重新进入编辑，随后一次
     * blur 便把恢复后的原值当成新草稿提交，用户什么都没改却收到 change。守卫在此
     * 置位后即被该次 focus 消费，与取消后由组件自己交还焦点走同一条早退路径。
     */
    this._refocusing = true
    /*
     * cancel 与原生 <dialog> 的 cancel 同名，而 dialog 的关闭管线就监听这个事件名。
     * 组件被消费方投映进浮层 shadow（drawer/dialog 标题）时，任何冒泡的 cancel——
     * composed 与否都一样，slot 都会把事件带进 shadow 树——都会被那个 dialog 当成
     * 一次关闭请求：issue #159 的实测症状是 drawer 标题聚焦编辑时按 Escape，或点到
     * 抽屉别处触发 blur，抽屉跟着编辑一起关。因此只在宿主上派发，不冒泡不组合；
     * 监听挂在组件本身即可（vue @cancel、React addEventListener 均不受影响）。
     * 手法同 checkbox/radio 受管时的事件策略（见各自 handleClick 注释）。
     */
    this.dispatchEvent(new Event('cancel', { bubbles: false, composed: false }))
  }

  /**
   * 焦点交还宿主：先标记再聚焦，宿主 focus 到达时标记已消费，不会再次进入编辑；
   * 标记在微任务里清掉，此后的聚焦照常进入编辑。
   */
  private _returnFocusToHost() {
    this._refocusing = true
    this.focus()
    queueMicrotask(() => {
      this._refocusing = false
    })
  }

  /**
   * 编辑态按键归属：Enter 提交、Escape 取消。
   *
   * 监听挂在 window 捕获阶段而不是 shadow 内的 textarea 上：消费方（浮层仲裁者）在
   * document 捕获阶段收 Escape，组件若只在 textarea 上处理，按键先被仲裁者收走，
   * 于是一次 Escape 会同时取消编辑和关闭外层浮层。window 在 document 上游，
   * stopPropagation 只有挂在这里才拦得住仲裁者。
   */
  private _claimEditingKeys() {
    window.addEventListener('keydown', this._onEditingKeydown, true)
  }

  private _releaseEditingKeys() {
    window.removeEventListener('keydown', this._onEditingKeydown, true)
  }

  private readonly _onEditingKeydown = (e: KeyboardEvent) => {
    // 输入法组合期间的 Enter/Escape 属于组合会话，交给 IME
    if (e.isComposing) return
    if (!e.composedPath().includes(this)) return
    if (e.key === 'Escape') {
      // 按键本身也被编辑层消费：外层浮层不应收到同一次 Escape
      e.preventDefault()
      e.stopPropagation()
      // 先取消（内部摘除编辑态）再交还焦点：focus 触发的 blur 看到 _editing 已为
      // false 而早退，不会把这次取消误判成 blur 提交
      this._cancelEditing()
      this._returnFocusToHost()
      return
    }
    if (e.key === 'Enter') {
      /*
       * Enter 无论是否只读都属于编辑层，消费策略与 Escape 对称：preventDefault
       * 压掉默认行为，stopPropagation 阻止外层表单隐式提交或浮层监听收到按键。
       * 只读态只是没有草稿可提交，因此消费后直接返回，不退出编辑、不派发 change。
       */
      e.preventDefault()
      e.stopPropagation()
      if (this.readonly) return
      /*
       * 可编辑态的 Enter 随后提交草稿；外层表单的隐式提交与浮层监听不应收到
       * 同一次按键——正如 Escape 属于取消。
       */
      this._commitEditing(true)
    }
  }

  private _setupAutosize() {
    this._teardownAutosize()
    // jsdom 等无 ResizeObserver 的环境退化为按渲染 autosize，够用且不抛错
    if (typeof ResizeObserver === 'undefined') {
      this._autosizeEditor()
      return
    }
    this._resizeObserver = new ResizeObserver(() => this._autosizeEditor())
    this._resizeObserver.observe(this)
    this._autosizeEditor()
  }

  private _teardownAutosize() {
    this._resizeObserver?.disconnect()
    this._resizeObserver = null
    this._editor?.style.removeProperty('height')
  }

  /**
   * 编辑层高度始终跟随自身内容，不依赖文本层折出的行盒。
   *
   * 编辑层绝对定位并用 top/bottom 撑高，`height: auto` 量到的是包含块高度而不是内容高；
   * 先归零再读 scrollHeight，拿到的才是自身内容的高度（含 1px 内边距）。
   * 观察宿主而非编辑层：编辑层在文档流外，改它的高度不会反过来改动宿主尺寸。
   */
  private _autosizeEditor() {
    const editor = this._editor
    if (!editor) return
    const previous = editor.style.height
    editor.style.height = '0px'
    const height = editor.scrollHeight
    editor.style.height = height > 0 ? `${height}px` : previous
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
          id=${this._fieldId}
          class="editor"
          .value=${this._value}
          .placeholder=${this.placeholder}
          ?disabled=${this._isDisabled}
          ?readonly=${this.readonly}
          aria-label=${ifDefined(this.ariaLabel)}
          @input=${this._onInput}
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
