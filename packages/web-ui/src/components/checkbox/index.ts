import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import '@/components/svg-draw-lines'
import selectionControl from '@/assets/selection-control.css?inline'
import { WebUiSvgDrawLines } from '@/components/svg-draw-lines'
import { heroiconsCheck16Solid } from '@/icons'
import { installPointerFocusSuppression } from '@/shared/focus/pointer-focus'
import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { defineGroupManaged, selectionGroupContextKey, type SelectionGroupContext } from '@/shared/group-management'
import { parseDuration } from '@/shared/theme/duration'
import { prefersReducedMotion } from '@/shared/theme/reduced-motion'

import style from './style.css?inline'

installPointerFocusSuppression()

/*
 * 描边时长取 `--wui-duration-trigger`，让勾和指示器底色那条 transition 落在同一拍。
 * 读不到 token 或格式不符时兜底 160，负值钳到 0。
 */
function triggerDuration(el: HTMLElement): number {
  const parsed = parseDuration(getComputedStyle(el).getPropertyValue('--wui-duration-trigger'))
  return parsed === null ? 160 : Math.max(0, parsed)
}

@customElement('web-ui-checkbox')
export class WebUiCheckbox extends FormAssociated(LitElement) {
  static override styles = [unsafeCSS(selectionControl), unsafeCSS(style)]
  private readonly _groupManagement = defineGroupManaged<SelectionGroupContext>(this, {
    context: selectionGroupContextKey,
    requestUpdate: () => this.requestUpdate()
  }).make()

  @state() private _checked = false

  /** 描边收回期间把勾按在可见档，见 willUpdate。 */
  @state() private _retracting = false

  get checked(): boolean {
    return this._checked
  }

  set checked(v: boolean) {
    const old = this._checked
    this._checked = v
    this._formAssociation.sync()
    this.requestUpdate('checked', old)
  }

  @property({ type: String }) value = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  private get _isDisabled(): boolean {
    return (
      this.disabled || this._formAssociation.isFormDisabled() || this._groupManagement.getContext()?.disabled === true
    )
  }

  private get _isManagedByGroup(): boolean {
    return this._groupManagement.getContext() !== undefined
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
    getFormValue: () => (!this._isManagedByGroup && this._checked ? this.value || 'on' : null),
    getFormState: () => String(this._checked),
    restoreState: state => {
      if (typeof state === 'string') this.checked = state === 'true'
    },
    isStateManaged: () => this._isManagedByGroup,
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  @query('web-ui-svg-draw-lines') private readonly _drawLines?: WebUiSvgDrawLines

  /** 每次更新重读一次，交给内层描边的 duration 属性；见 willUpdate。 */
  private _drawDurationMs = 160

  private _syncValidity() {
    const internals = this._formAssociation.getInternals()
    if (!internals || typeof internals.setValidity !== 'function') return
    if (this._isDisabled || this._isManagedByGroup || !this.required || this._checked) {
      internals.setValidity({})
      return
    }
    internals.setValidity({ valueMissing: true }, '请选择此项')
  }

  private handleClick() {
    if (this._isDisabled) return
    const old = this._checked
    this._checked = !old
    this._formAssociation.sync()
    this.requestUpdate('checked', old)
    // group-managed 时事件不冒泡/不组合，由 group 统一派发一次 host 事件，避免同名事件外泄
    const opts: EventInit = this._isManagedByGroup
      ? { bubbles: false, composed: false }
      : { bubbles: true, composed: true }
    this.dispatchEvent(new Event('input', opts))
    this.dispatchEvent(new Event('change', opts))
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.handleClick()
    }
  }

  /*
   * 收回期间勾要留在可见档，否则 160ms 淡出抢在描边收回之前把它藏掉。翻转放在 willUpdate：
   * 与 checked 同一次 update 落地，渲染后不再改状态。收回的终点是留在内联样式上的空白，所以这一位
   * 不需要在动画结束后复位，下一次勾选会清掉；reduced motion 下收回根本不跑，按住可见位就是把勾
   * 永久留在未勾选的框里，所以那里必须让位给淡出。
   */
  override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    this._drawDurationMs = triggerDuration(this)
    const wasChecked = changed.get('_checked')
    if (typeof wasChecked === 'boolean') {
      this._retracting = wasChecked && !prefersReducedMotion(this)
    }
  }

  /*
   * 挂载时就勾选是初始状态而非用户勾选，不画线：_checked 的字段初始化器在构造阶段写过一次，
   * Lit 对同一轮里已记录过旧值的键不再覆盖，所以首帧拿到的是 undefined，之后的每次真实切换才带
   * boolean 旧值——包括 group 在子项首帧前把选中态写回去那一种。
   */
  override updated(changed: PropertyValues) {
    super.updated(changed)
    const wasChecked = changed.get('_checked')
    if (typeof wasChecked !== 'boolean') return

    if (wasChecked) void this._drawLines?.replay({ reverse: true })
    else void this._drawLines?.replay()
  }

  override render() {
    const cls = {
      'wui-checkbox': true,
      'is-checked': this._checked,
      'is-retracting': this._retracting,
      'is-disabled': this._isDisabled
    }

    return html`
      <label
        class=${classMap(cls)}
        tabindex=${this._isDisabled ? '-1' : '0'}
        role="checkbox"
        aria-checked=${String(this._checked)}
        aria-disabled=${String(this._isDisabled)}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <span class="wui-checkbox-box">
          <span class="wui-checkbox-icon"
            ><web-ui-svg-draw-lines duration=${this._drawDurationMs} no-autoplay
              ><web-ui-icon .icon=${heroiconsCheck16Solid}></web-ui-icon></web-ui-svg-draw-lines
          ></span>
        </span>
        <span class="wui-checkbox-label"><slot></slot></span>
      </label>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-checkbox': WebUiCheckbox
  }
}
