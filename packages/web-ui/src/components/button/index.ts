import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { styleMap } from 'lit/directives/style-map.js'

import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideLoaderCircle } from '@/icons'
import { installPointerFocusSuppression } from '@/shared/focus/pointer-focus'
import { buttonGroupContextKey, defineGroupManaged, type ButtonGroupContext } from '@/shared/group-management'
import { normalizeLiteral } from '@/shared/normalize'

import style from './style.css?inline'

const ALLOWED_VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'glass'] as const
const ALLOWED_TYPES = ['button', 'submit', 'reset'] as const

installPointerFocusSuppression()

@customElement('web-ui-button')
export class WebUiButton extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]
  static formAssociated = true

  @property({ type: String, reflect: true })
  get variant(): 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' {
    return this._variant
  }
  set variant(v: string) {
    const old = this._variant
    this._variant = normalizeLiteral(v, ALLOWED_VARIANTS, 'glass')
    this.requestUpdate('variant', old)
  }
  private _variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' = 'glass'

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) loading = false
  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) icon = false
  @property({ type: String, reflect: true }) size = ''

  @property({ type: String, reflect: true })
  get type(): (typeof ALLOWED_TYPES)[number] {
    return this._type
  }
  set type(value: unknown) {
    const old = this._type
    this._type = normalizeLiteral(value, ALLOWED_TYPES, 'button')
    this.requestUpdate('type', old)
  }
  private _type: (typeof ALLOWED_TYPES)[number] = 'button'

  // Explicitly delegated accessible naming attributes.
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null

  private readonly _groupManagement = defineGroupManaged<ButtonGroupContext>(this, {
    context: buttonGroupContextKey,
    requestUpdate: () => this.requestUpdate(),
    equals: (a, b) => a?.direction === b?.direction && a?.isLast === b?.isLast
  }).make()

  private get _groupContext(): ButtonGroupContext | undefined {
    return this._groupManagement.getContext()
  }

  private _internals?: ElementInternals
  private _formDisabled = false

  override connectedCallback() {
    super.connectedCallback()
    this._internals ??= this.attachInternals()
  }

  formDisabledCallback(disabled: boolean) {
    if (this._formDisabled === disabled) return
    this._formDisabled = disabled
    this.requestUpdate()
  }

  private get _isDisabled(): boolean {
    return this.disabled || this.loading || this._formDisabled
  }

  private get _sizeStyle(): Record<string, string> {
    // size 仅控制按钮高度；icon 模式下 min-width 同步为相同值，天然保持正方形。
    const size = this._groupContext ? '30' : this.size
    return size ? { '--wui-control-size': `${size}px` } : {}
  }

  private handleClick(e: Event) {
    if (this._isDisabled) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    const action = this.type
    if (action === 'button') return

    /*
     * Shadow 内按钮没有 form owner；等 composed click 的同步监听器全部完成后，
     * 再读取宿主的 live form owner 并转发，调用方仍可用 preventDefault 取消这次原生 activation。
     */
    setTimeout(() => {
      if (e.defaultPrevented) return
      const form = this._internals?.form
      if (!form) return
      if (action === 'submit') form.requestSubmit()
      else form.reset()
    })
  }

  override render() {
    const groupContext = this._groupContext
    const btnClass = {
      'wui-glass': this.variant === 'glass' && !groupContext,
      'is-grouped': Boolean(groupContext)
    }
    const dividerClass = {
      'group-divider': true,
      vertical: groupContext?.direction === 'vertical'
    }

    return html`
      <button
        type=${this.type}
        aria-label=${ifDefined(this.ariaLabel)}
        class=${classMap(btnClass)}
        part="button"
        style=${Object.keys(this._sizeStyle).length > 0 ? styleMap(this._sizeStyle) : nothing}
        ?disabled=${this._isDisabled}
        @click=${this.handleClick}
      >
        ${
          this.icon
            ? // loading 优先于 icon 内容：icon 模式下只展示 spinner，不投影默认 slot，避免双图标叠加
              this.loading
              ? html`<web-ui-icon .icon=${lucideLoaderCircle} spin></web-ui-icon>`
              : html`<slot></slot>`
            : html`
                ${this.loading ? html`<web-ui-icon .icon=${lucideLoaderCircle} spin></web-ui-icon>` : ''}
                <slot name="prefix"></slot>
                <span class="label"><slot></slot></span>
                <slot name="suffix"></slot>
              `
        }
      </button>
      ${
        groupContext && !groupContext.isLast
          ? html`<span class=${classMap(dividerClass)} aria-hidden="true"></span>`
          : ''
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-button': WebUiButton
  }
}
