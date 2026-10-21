import '@/components/icon'

import { html, LitElement, unsafeCSS, type PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'
import { lucideLoaderCircle } from '@/icons'
import { installPointerFocusSuppression } from '@/shared/focus/pointer-focus'
import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { attachDragGesture, type DragGestureHandle } from '@/shared/gesture/drag-gesture'
import { clamp, normalizeProgress } from '@/shared/gesture/physics'

import style from './style.css?inline'

installPointerFocusSuppression()

@customElement('web-ui-switch')
export class WebUiSwitch extends FormAssociated(LitElement) {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]
  @state() private _checked = false

  get checked(): boolean {
    return this._checked
  }

  set checked(v: boolean) {
    const old = this._checked
    this._checked = v
    this._formAssociation.sync()
    this.requestUpdate('checked', old)
  }

  @property({ type: String, reflect: true }) name = ''
  @property({ type: String }) value = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) loading = false
  @state() private _pressed = false
  @state() private _isDragging = false
  @state() private _dragOffset = 0
  @state() private _dragProgress = 0

  private _dragged = false
  private _maxTravel = 20
  private _startOffset = 0
  private _dragGestureHandle: DragGestureHandle | null = null
  private _tabIndexBeforeDisabled: string | null = null
  private _isTabIndexSuppressed = false
  private readonly _handleHostClick = () => this.handleClick()
  private readonly _handleHostKeydown = (event: KeyboardEvent) => this.handleKeydown(event)

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('click', this._handleHostClick)
    this.addEventListener('keydown', this._handleHostKeydown)
    this._syncAccessibility()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('click', this._handleHostClick)
    this.removeEventListener('keydown', this._handleHostKeydown)
    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = null
  }

  override updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties)
    this._syncAccessibility()
  }

  private _syncAccessibility() {
    this.setAttribute('role', 'switch')
    this.setAttribute('aria-checked', String(this._checked))
    const isDisabled = this._isDisabled || this.loading
    this.setAttribute('aria-disabled', String(isDisabled))

    if (isDisabled) {
      if (!this._isTabIndexSuppressed) {
        this._tabIndexBeforeDisabled = this.getAttribute('tabindex')
        this._isTabIndexSuppressed = true
      } else if (this.getAttribute('tabindex') !== '-1') {
        this._tabIndexBeforeDisabled = this.getAttribute('tabindex')
      }
      this.tabIndex = -1
    } else if (this._isTabIndexSuppressed) {
      if (this._tabIndexBeforeDisabled === null) this.tabIndex = 0
      else this.setAttribute('tabindex', this._tabIndexBeforeDisabled)
      this._isTabIndexSuppressed = false
    } else if (!this.hasAttribute('tabindex')) {
      this.tabIndex = 0
    }
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  private readonly _formAssociation = defineFormAssociation<boolean>({
    host: this,
    initialize: () => {
      if (this.hasAttribute('checked')) this._checked = true
    },
    getState: () => this._checked,
    setState: checked => {
      this.checked = checked
    },
    getFormValue: () => (this._checked ? this.value || 'on' : null),
    getFormState: () => String(this._checked),
    restoreState: state => {
      if (typeof state === 'string') this.checked = state === 'true'
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  private _syncValidity() {
    const internals = this._formAssociation.getInternals()
    if (!internals || typeof internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this._checked) internals.setValidity({})
    else internals.setValidity({ valueMissing: true }, 'Enable this option')
  }

  // 交互由 switch host 处理，light DOM 标签文本与轨道点击都会冒泡到这里。
  private handleClick() {
    if (this._dragged) {
      this._dragged = false
      return
    }
    if (this._isDisabled || this.loading) return
    this._applyChecked(!this._checked)
  }

  // 自定义 switch host 承接焦点，Space 与 Enter 都切换状态。
  private handleKeydown(e: KeyboardEvent) {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (e.repeat || this._isDisabled || this.loading) return
    this._applyChecked(!this._checked)
  }

  private _applyChecked(next: boolean, emitInput = true) {
    const old = this._checked
    if (next === old) return
    this._checked = next
    this._formAssociation.sync()
    this.requestUpdate('checked', old)
    if (emitInput) this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handlePointerDown(e: PointerEvent) {
    if (this._isDisabled || this.loading) return
    this._pressed = true

    const track = this.renderRoot.querySelector<HTMLElement>('.wui-switch-track')
    if (track) {
      const trackWidth = track.getBoundingClientRect().width || 40
      // 拖拽时 thumb 的 pressed 布局盒为 20px（scale(1.5) 视觉放大），因此行程按 20px 布局盒钳制；
      // 释放后的 checked 静止位移为 20px（16px thumb），两者由 transition 衔接。
      this._maxTravel = Math.max(1, trackWidth - 4 - 20)
    } else {
      this._maxTravel = 16
    }

    this._startOffset = this._checked ? this._maxTravel : 0
    this._dragOffset = this._startOffset
    this._dragProgress = this._checked ? 1 : 0

    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = attachDragGesture(e, {
      axis: 'x',
      threshold: 6,
      onMove: info => {
        this._isDragging = true
        const current = clamp(this._startOffset + info.deltaX, 0, this._maxTravel)
        this._dragOffset = current
        this._dragProgress = normalizeProgress(current, 0, this._maxTravel)
        this.requestUpdate()
      },
      onEnd: info => {
        const wasDragging = this._isDragging
        this._isDragging = false
        this._pressed = false

        if (wasDragging) {
          this._dragged = true
          let targetChecked = this._checked
          if (info.velocityX > 300) {
            targetChecked = true
          } else if (info.velocityX < -300) {
            targetChecked = false
          } else {
            targetChecked = this._dragProgress >= 0.5
          }

          if (targetChecked !== this._checked) {
            const old = this._checked
            this._checked = targetChecked
            this._formAssociation.sync()
            this.requestUpdate('checked', old)
            this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
            this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
          } else {
            this.requestUpdate()
          }
        }
      },
      onCancel: () => {
        this._isDragging = false
        this._pressed = false
        this.requestUpdate()
      }
    })
  }

  private handlePointerUp() {
    this._pressed = false
  }

  private handlePointerLeave() {
    if (!this._isDragging) {
      this._pressed = false
    }
  }

  override render() {
    const isOpen = this._isDragging ? this._dragProgress >= 0.5 : this._checked
    const trackCls = {
      'wui-switch-track': true,
      'is-open': isOpen,
      'is-dragging': this._isDragging,
      'is-disabled': this._isDisabled || this.loading
    }
    // wui-glass 条件化：静止态实体白 thumb，按压/拖拽时切换为玻璃（backdrop blur +
    // 无填充 + 描边）并放大，回到最初修复不跟手问题时期的视觉结构。
    const thumbCls = {
      'wui-switch-thumb': true,
      'wui-glass': this._pressed || this._isDragging,
      'is-pressed': this._pressed || this._isDragging
    }
    const trackStyle = this._isDragging ? { '--wui-switch-drag-offset': `${this._dragOffset}px` } : {}

    return html`
      <span class="wui-switch-content">
        <span
          class=${classMap(trackCls)}
          style=${styleMap(trackStyle)}
          @pointerdown=${this.handlePointerDown}
          @pointerup=${this.handlePointerUp}
          @pointercancel=${this.handlePointerUp}
          @pointerleave=${this.handlePointerLeave}
        >
          <span class=${classMap(thumbCls)}>
            ${
              this.loading
                ? html`<span class="wui-switch-loading">
                    <web-ui-icon .icon=${lucideLoaderCircle} size="14" color="#08f" spin></web-ui-icon>
                  </span>`
                : ''
            }
          </span>
        </span>
        <span class="wui-switch-label"><slot></slot></span>
      </span>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-switch': WebUiSwitch
  }
}
