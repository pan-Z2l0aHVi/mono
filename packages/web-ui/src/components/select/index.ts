import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/option'
import glass from '@/assets/glass.css?inline'
import type { WebUiOption } from '@/components/option'
import { lucideChevronDown } from '@/icons'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { createOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'
import { booleanWithFalseString } from '@/shared/property-converters/boolean-with-false-string'
import { lockScroll, unlockScroll } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

@customElement('web-ui-select')
export class WebUiSelect extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  static formAssociated = true

  // ElementInternals 实例，在 connectedCallback 中初始化
  private _internals?: ElementInternals
  @state() private _formDisabled = false

  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ reflect: true, attribute: 'lock-scroll', converter: booleanWithFalseString }) lockScroll = true
  @property({ attribute: false }) overlayContainer?: OverlayContainer
  @property({ type: String, reflect: true }) name = ''

  // value 使用内部状态 + 访问器模式，在变更时同步 ElementInternals
  @state() private _value = ''
  get value(): string {
    return this._value
  }
  set value(v: string) {
    const old = this._value
    this._value = v
    this._internals?.setFormValue?.(v)
    this.toggleAttribute('data-has-value', !!v)
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  @state() private _isOpen = false
  @state() private _activeIndex = -1
  @state() private _selectedLabel = ''
  @state() private _hasTriggerSlot = false

  private _options: WebUiOption[] = []
  private _overlay?: OverlayApi
  private _portal?: OverlayPortal
  private _hasScrollLock = false

  get isOpen(): boolean {
    return this._isOpen
  }

  get open(): boolean {
    return this._isOpen
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (
      this._isOpen &&
      e.target instanceof Node &&
      !this.contains(e.target) &&
      !this._portal?.panel.contains(e.target)
    ) {
      this._close()
    }
  }

  private _onFocusOut = () => {
    requestAnimationFrame(() => {
      if (this._isOpen && !this.matches(':focus-within') && !this._portal?.panel.matches(':focus-within')) {
        this._close()
      }
    })
  }

  override connectedCallback() {
    super.connectedCallback()
    this._internals = this.attachInternals()
    // 同步 HTML 属性中预设的 value，补全访问器模式不处理 attribute 反射
    const attrValue = this.getAttribute('value')
    if (attrValue !== null) {
      this._value = attrValue
      this.toggleAttribute('data-has-value', !!attrValue)
    }
    this._internals?.setFormValue?.(this._value)
    this.addEventListener('option-register', this._onOptionRegister)
    this.addEventListener('option-unregister', this._onOptionUnregister)
    this.addEventListener('keydown', this._onKeydown)
    this.addEventListener('focusout', this._onFocusOut)
    document.addEventListener('click', this._onClickOutside)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('option-register', this._onOptionRegister)
    this.removeEventListener('option-unregister', this._onOptionUnregister)
    this.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('focusout', this._onFocusOut)
    document.removeEventListener('click', this._onClickOutside)
    this._options.forEach(o => {
      o.removeEventListener('click', this._handleOptionClick)
      o.removeEventListener('pointerover', this._handleOptionPointerOver)
      o.removeEventListener('pointerdown', this._handleOptionPointerDown)
      o.removeEventListener('option-update', this._onOptionUpdate)
    })
    this._close()
    this._disposeOverlay()
  }

  override firstUpdated() {
    this._initLocalOverlay()
    requestAnimationFrame(() => {
      if (this.isConnected) this._onSlotChange()
    })
  }

  override willUpdate() {
    this._options = this._portal
      ? [...this._portal.panel.querySelectorAll<WebUiOption>('web-ui-option')]
      : [...this.querySelectorAll<WebUiOption>('web-ui-option')]
    this._ensureOptionIds()
    this._syncSelected()
  }

  override updated(changed: PropertyValues) {
    if (changed.has('portal') || changed.has('overlayContainer'))
      requestAnimationFrame(() => this._reconfigureOverlay())
    if (changed.has('lockScroll')) this._syncScrollLock()
    this._syncOpenAttribute()
    this._syncValidity()
  }

  formResetCallback() {
    this.value = this.getAttribute('value') || ''
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  private _syncValidity() {
    if (!this._internals || typeof this._internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this.value) this._internals.setValidity({})
    else this._internals.setValidity({ valueMissing: true }, '请选择一项')
  }

  private _syncOpenAttribute() {
    this.toggleAttribute('open', this._isOpen)
  }

  private _onTriggerSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement
    const hasContent = slot.assignedElements().length > 0
    if (this._hasTriggerSlot === hasContent) return
    this._hasTriggerSlot = hasContent
    this._reconfigureOverlay()
  }

  private _syncSelected() {
    this._options.forEach(o => {
      o.selected = o.value === this.value
    })
    if (!this.value) {
      this._selectedLabel = this.placeholder
      return
    }
    const option = this._options.find(o => o.value === this.value)
    this._selectedLabel = option?.label || this.placeholder
  }

  private _ensureOptionIds() {
    this._options.forEach((option, index) => {
      if (!option.id) option.id = `${this.localName}-option-${index}`
    })
  }

  private _onOptionRegister = (e: Event) => {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target as WebUiOption
    target.addEventListener('click', this._handleOptionClick)
    target.addEventListener('pointerover', this._handleOptionPointerOver)
    target.addEventListener('pointerdown', this._handleOptionPointerDown)
    target.addEventListener('option-update', this._onOptionUpdate)
    this._options.push(target)
    this._ensureOptionIds()
    this._syncSelected()
  }

  private _onOptionUnregister = (e: Event) => {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target as WebUiOption
    target.removeEventListener('click', this._handleOptionClick)
    target.removeEventListener('pointerover', this._handleOptionPointerOver)
    target.removeEventListener('pointerdown', this._handleOptionPointerDown)
    target.removeEventListener('option-update', this._onOptionUpdate)
    this._options = this._options.filter(o => o !== target)
  }

  private _onSlotChange = () => {
    const options = this._portal
      ? [...this._portal.panel.querySelectorAll<WebUiOption>('web-ui-option')]
      : [...this.querySelectorAll<WebUiOption>('web-ui-option')]
    this._options = options
    this._ensureOptionIds()
    this._syncSelected()
  }

  private _handleOptionClick = (e: Event) => {
    if (!(e.currentTarget instanceof HTMLElement)) return
    const option = e.currentTarget as WebUiOption
    if (option.disabled) return
    this.value = option.value
    this._close()
    this._notifyValueChange()
  }

  private _onOptionUpdate = () => {
    this._syncSelected()
    this._syncActiveOption()
  }

  private _handleOptionPointerOver = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (!this._isOpen || this._activeIndex < 0 || !(e.currentTarget instanceof HTMLElement)) return

    // 指针接管后只保留 :hover，避免键盘激活项与悬停项同时高亮。
    this._activeIndex = -1
    this._syncActiveOption()
  }

  private _handleOptionPointerDown = (e: PointerEvent) => {
    // 保持 trigger 焦点，避免 focusout 在 click 前关闭浮层。
    e.preventDefault()
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this._isDisabled) return

    switch (e.key) {
      case 'Escape':
        if (this._isOpen) {
          this._close()
          e.preventDefault()
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!this._isOpen) {
          this._open(true)
        } else {
          this._navigateActive(1)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!this._isOpen) this._open(true)
        else this._navigateActive(-1)
        break
      case 'Enter':
        if (this._isOpen && this._activeIndex >= 0) {
          const option = this._options[this._activeIndex]
          if (option && !option.disabled) {
            this.value = option.value
            this._notifyValueChange()
          }
          this._close()
          e.preventDefault()
        }
        break
    }
  }

  private _navigateActive(delta: number) {
    const enabled = this._options.filter(o => !o.disabled)
    if (!enabled.length) return

    const selectedOption = this._options.find(option => option.value === this.value && !option.disabled)
    const currentIdx =
      this._activeIndex >= 0
        ? enabled.indexOf(this._options[this._activeIndex])
        : selectedOption
          ? enabled.indexOf(selectedOption)
          : delta > 0
            ? -1
            : 0
    let nextIdx = currentIdx + delta
    if (nextIdx < 0) nextIdx = enabled.length - 1
    if (nextIdx >= enabled.length) nextIdx = 0

    const nextOption = enabled[nextIdx]
    this._activeIndex = this._options.indexOf(nextOption)

    this._syncActiveOption()
  }

  private _open(isKeyboardNavigation = false) {
    if (this._isDisabled || this._isOpen) return
    this._isOpen = true
    this._dispatchOpenChange()
    this._syncSelected()
    if (isKeyboardNavigation) this._setInitialActiveOption()
    else this._syncActiveOption()
    this._syncScrollLock()
    requestAnimationFrame(() => {
      if (this._isOpen) this._openOverlay()
    })
  }

  private _close() {
    if (!this._isOpen) return
    this._isOpen = false
    this._dispatchOpenChange()
    this._activeIndex = -1
    this._options.forEach(o => o.removeAttribute('active'))
    this._syncScrollLock(false)
    this._closeOverlay()
  }

  private _dispatchOpenChange() {
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open: this._isOpen },
        bubbles: true,
        composed: true
      })
    )
  }

  private _setInitialActiveOption() {
    const selectedIndex = this._options.findIndex(option => option.value === this.value && !option.disabled)
    const firstEnabledIndex = this._options.findIndex(option => !option.disabled)
    this._activeIndex = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex
    this._syncActiveOption()
  }

  private _syncActiveOption() {
    this._options.forEach((option, index) => option.toggleAttribute('active', index === this._activeIndex))
  }

  private _notifyValueChange() {
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private _syncScrollLock(isOpen = this._isOpen) {
    const shouldLock = isOpen && this.lockScroll
    if (shouldLock === this._hasScrollLock) return

    if (shouldLock) lockScroll()
    else unlockScroll()
    this._hasScrollLock = shouldLock
  }

  private _togglePopup() {
    if (this._isDisabled) return
    if (this._isOpen) this._close()
    else this._open()
  }

  private _initLocalOverlay() {
    const anchor = this.shadowRoot?.querySelector<HTMLElement>('.select-trigger')
    const panel = this.shadowRoot?.querySelector<HTMLElement>('.select-overlay')
    if (!anchor || !panel) return
    this._overlay = withOverlay.make({
      anchor,
      overlay: panel,
      placement: 'bottom-start',
      offset: 4
    })
  }

  private _openOverlay() {
    if (this.portal) {
      this._openPortal()
    } else {
      const panel = this.shadowRoot?.querySelector<HTMLElement>('.select-overlay')
      if (panel) panel.style.width = `${this._getDesiredWidth()}px`
      this._overlay?.open()
    }
  }

  private _getDesiredWidth(): number {
    const trigger = this.shadowRoot?.querySelector<HTMLElement>('.select-trigger')
    const triggerWidth = trigger?.offsetWidth || 0

    const options = [...this.querySelectorAll<WebUiOption>('web-ui-option')]
    let maxOptionWidth = 0
    options.forEach(opt => {
      const label = opt.shadowRoot?.querySelector<HTMLElement>('.option-label')
      const w = label?.scrollWidth || opt.scrollWidth || 0
      if (w > maxOptionWidth) maxOptionWidth = w
    })

    return Math.max(120, triggerWidth, maxOptionWidth)
  }

  private _openPortal() {
    if (this._portal) return
    const anchor = this.shadowRoot?.querySelector<HTMLElement>('.select-trigger')
    if (!anchor) return

    const desiredWidth = this._getDesiredWidth()

    const portal = createOverlayPortal({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${style}`,
      className: 'wui-glass select-overlay portal'
    })
    portal.panel.style.width = `${desiredWidth}px`
    portal.panel.setAttribute('role', 'listbox')
    portal.moveContent(Array.from(this.children))
    this._portal = portal
    this._overlay = withOverlay.make({
      anchor,
      overlay: portal.panel,
      placement: 'bottom-start',
      offset: 4,
      strategy: 'fixed'
    })
    this._overlay.open()
  }

  private _closeOverlay() {
    this._overlay?.close()
    if (!this._portal) return
    this._portal?.restoreContent()
    this._portal?.remove()
    this._portal = undefined
    this._overlay = undefined
  }

  private _disposeOverlay() {
    this._overlay?.dispose()
    this._overlay = undefined
    this._portal?.restoreContent()
    this._portal?.remove()
    this._portal = undefined
  }

  private _reconfigureOverlay() {
    this._disposeOverlay()
    if (!this.portal) this._initLocalOverlay()
    if (this._isOpen) this._openOverlay()
  }

  override render() {
    return html`
      <div class="wui-select-inner">
        <div
          class="wui-glass select-trigger"
          ?data-custom-trigger=${this._hasTriggerSlot}
          @click=${this._togglePopup}
          tabindex=${this._isDisabled ? -1 : 0}
          role="combobox"
          aria-expanded=${this._isOpen}
          aria-haspopup="listbox"
          aria-disabled=${String(this._isDisabled)}
          aria-activedescendant=${this._isOpen && this._activeIndex >= 0
            ? this._options[this._activeIndex]?.id
            : nothing}
        >
          <slot name="trigger" @slotchange=${this._onTriggerSlotChange}></slot>
          ${!this._hasTriggerSlot ? html`<span class="label">${this._selectedLabel}</span>` : nothing}
          <web-ui-icon class="arrow" .icon=${lucideChevronDown}></web-ui-icon>
        </div>
        <div class="wui-glass select-overlay" ?hidden=${!this._isOpen} role="listbox">
          <slot @slotchange=${this._onSlotChange}></slot>
        </div>
      </div>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-select': WebUiSelect
  }
}
