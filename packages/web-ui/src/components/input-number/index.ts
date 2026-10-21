import '@/components/icon'

import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { lucideMinus, lucidePlus } from '@/icons'
import {
  FormAssociated,
  defineFormAssociation,
  forwardInputValidity,
  FormAssociationController
} from '@/shared/form-association'
import { createFieldId } from '@/shared/form-association/field-id'
import { normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'

@customElement('web-ui-input-number')
export class WebUiInputNumber extends FormAssociated(LitElement) {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) readonly = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Number, reflect: true })
  get precision(): number {
    return this._precision
  }
  // 精度只影响读取（get value）/提交时的规整，不在赋值时抹掉原始小数：
  // `<web-ui-input-number value="1.5" precision="2">` 先跑 value setter、
  // 后跑 precision setter，若赋值时就按当时的默认精度 0 取整，1.5 会先变 2，
  // 之后再声明 precision=2 也恢复不了。
  set precision(v: number) {
    const old = this._precision
    this._precision = v
    this.requestUpdate('precision', old)
  }

  /** 原始值：只做 min/max 收敛，不按精度取整（取整发生在 get value）。 */
  @state() private _value = 0

  /**
   * 编辑中的原始文本。null 表示非编辑态，显示由 `value` 派生；
   * 非 null 时显示原文，避免把用户正在输入的 "1." / "0.10" 立刻改写。
   */
  @state() private _draft: string | null = null
  @state() private _min = 0
  @state() private _max = Infinity
  @state() private _step = 1
  @state() private _focused = false
  private _precision = 0
  private readonly _fieldId = createFieldId('web-ui-input-number')

  @property({ type: Number, reflect: true })
  get value(): number {
    return this.clamp(this.round(this._value))
  }

  set value(v: number) {
    const next = this.clamp(v)
    const old = this._value
    this._value = next
    this._formAssociation.sync()
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  @property({ type: Number, reflect: true })
  get min(): number {
    return this._min
  }

  set min(v: unknown) {
    this._min = normalizeNumber(v, -Infinity, Infinity, 0)
  }

  @property({ type: Number, reflect: true })
  get max(): number {
    return this._max
  }

  set max(v: unknown) {
    this._max = normalizeNumber(v, -Infinity, Infinity, Infinity)
  }

  @property({ type: Number, reflect: true })
  get step(): number {
    return this._step
  }

  // 步进值，默认 1；若声明了 precision 则以 precision 退化步进
  set step(v: unknown) {
    this._step = normalizeNumber(v, 0, Infinity, 1)
  }

  private get _effectiveStep(): number {
    return this._step
  }

  private get atMin(): boolean {
    return this.value <= this._min
  }

  private get atMax(): boolean {
    return this.value >= this._max
  }

  private readonly _formAssociation = defineFormAssociation<number>({
    host: this,
    getState: () => this.value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => String(this.value),
    getFormState: () => String(this.value),
    restoreState: state => {
      if (typeof state !== 'string') return
      const value = Number(state)
      if (Number.isFinite(value)) this.value = value
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  override formDisabledCallback(disabled: boolean) {
    super.formDisabledCallback(disabled)
    this.toggleAttribute('data-form-disabled', disabled)
  }

  override updated() {
    this._syncValidity()
    this.toggleAttribute('focused', this._focused)
  }

  private _syncValidity() {
    const input = this.shadowRoot?.querySelector('input')
    const internals = this._formAssociation.getInternals()
    if (!internals || !input || typeof internals.setValidity !== 'function') return
    forwardInputValidity(
      internals,
      input,
      ['valueMissing', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch'],
      this._isDisabled
    )
  }

  private clamp(v: number): number {
    return Math.min(this._max, Math.max(this._min, v))
  }

  private round(v: number): number {
    const f = 10 ** this.precision
    return Math.round(v * f) / f
  }

  private setValueAndNotify(v: number) {
    this._draft = null
    this.value = this.clamp(this.round(v))
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private handleStep(direction: 1 | -1) {
    if (this._isDisabled || this.readonly) return
    this.setValueAndNotify(this.value + direction * this._effectiveStep)
  }

  // 输入过程只更新草稿与可解析的原始值，显示保持在草稿上：
  // 逐字把 "1." 规整成 "1" 会打断输入（与原生 number input 的编辑体验一致）。
  private handleInput(e: Event) {
    if (this.readonly) return
    if (!(e.target instanceof HTMLInputElement)) return
    const raw = e.target.value
    this._draft = raw
    const parsed = raw === '' || raw === '-' ? Number.NaN : Number(raw)
    if (Number.isFinite(parsed)) {
      this._value = this.clamp(parsed)
      this._formAssociation.sync()
    }
    this._syncValidity()
  }

  // 原生 change 不 composed，被 shadow root 挡住；文本失焦提交时补发 composed 事件，
  // 与 ArrowUp/ArrowDown 的 change 行为对齐。
  // 提交点上做规整：非法/空草稿回填已提交值（value 不变、不派发 change），
  // 合法草稿写入 value 后由 get value 按精度规整。
  private handleNativeChange(e: Event) {
    if (this.readonly) return
    if (!(e.target instanceof HTMLInputElement)) return
    const raw = e.target.value
    this._draft = null
    const parsed = raw === '' || raw === '-' ? Number.NaN : Number(raw)
    if (!Number.isFinite(parsed)) {
      // 回填：草稿清空后显示重新由 value 派生
      this.requestUpdate()
      this._syncValidity()
      return
    }
    this._value = this.clamp(parsed)
    this._formAssociation.sync()
    this._syncValidity()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handleKeydown(e: KeyboardEvent) {
    if (this._isDisabled || this.readonly) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.setValueAndNotify(this.value + this._effectiveStep)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.setValueAndNotify(this.value - this._effectiveStep)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
  }

  private handleFocus() {
    if (!this._isDisabled) this._focused = true
  }

  private handleBlur() {
    this._focused = false
    // change 的时序在部分平台晚于 blur；草稿仍存在说明还没提交，直接回填，
    // 避免「显示空、value 仍是旧值」的持久脱同步。
    if (this._draft !== null) {
      this._draft = null
      this.requestUpdate()
    }
  }

  override render() {
    return html`
      <div class="wui-glass wui-input-inner">
        <button
          class="num-btn"
          aria-label="Decrease"
          ?disabled=${this._isDisabled || this.readonly || this.atMin}
          @click=${() => this.handleStep(-1)}
        >
          <web-ui-icon .icon=${lucideMinus}></web-ui-icon>
        </button>
        <input
          id=${this._fieldId}
          type="number"
          placeholder=${this.placeholder}
          name=${this.name}
          .value=${this._draft ?? String(this.value)}
          ?disabled=${this._isDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.handleInput}
          @change=${this.handleNativeChange}
          @keydown=${this.handleKeydown}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
        />
        <button
          class="num-btn"
          aria-label="Increase"
          ?disabled=${this._isDisabled || this.readonly || this.atMax}
          @click=${() => this.handleStep(1)}
        >
          <web-ui-icon .icon=${lucidePlus}></web-ui-icon>
        </button>
      </div>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-input-number': WebUiInputNumber
  }
}
