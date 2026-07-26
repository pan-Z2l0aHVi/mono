import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/option'
import glass from '@/assets/glass.css?inline'
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

  @property({ type: String, reflect: true }) value = ''
  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ reflect: true, attribute: 'lock-scroll', converter: booleanWithFalseString }) lockScroll = true
  @property({ attribute: false }) overlayContainer?: OverlayContainer

  @state() private _isOpen = false
  @state() private _activeIndex = -1
  @state() private _selectedLabel = ''

  private _options: HTMLElement[] = []
  private _overlay?: OverlayApi
  private _portal?: OverlayPortal
  private _hasScrollLock = false

  get isOpen(): boolean {
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
      o.removeEventListener('mouseover', this._handleOptionMouseOver)
      o.removeEventListener('pointerdown', this._handleOptionPointerDown)
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
    this._options = [...this.querySelectorAll('web-ui-option')]
    this._ensureOptionIds()
    this._syncSelected()
  }

  override updated(changed: PropertyValues) {
    if (changed.has('portal') || changed.has('overlayContainer'))
      requestAnimationFrame(() => this._reconfigureOverlay())
    if (changed.has('lockScroll')) this._syncScrollLock()
  }

  private _syncSelected() {
    this._options.forEach(o => {
      o.toggleAttribute('selected', o.getAttribute('value') === this.value)
    })
    if (!this.value) {
      this._selectedLabel = this.placeholder
      return
    }
    const option = this._options.find(o => o.getAttribute('value') === this.value)
    this._selectedLabel = option?.textContent?.trim() || this.placeholder
  }

  private _ensureOptionIds() {
    this._options.forEach((option, index) => {
      if (!option.id) option.id = `${this.localName}-option-${index}`
    })
  }

  private _onOptionRegister(e: Event) {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target
    target.addEventListener('click', this._handleOptionClick)
    target.addEventListener('mouseover', this._handleOptionMouseOver)
    target.addEventListener('pointerdown', this._handleOptionPointerDown)
    this._options.push(target)
    this._ensureOptionIds()
    this._syncSelected()
  }

  private _onOptionUnregister(e: Event) {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target
    target.removeEventListener('click', this._handleOptionClick)
    target.removeEventListener('mouseover', this._handleOptionMouseOver)
    target.removeEventListener('pointerdown', this._handleOptionPointerDown)
    this._options = this._options.filter(o => o !== target)
  }

  private _onSlotChange() {
    const options = [...this.querySelectorAll('web-ui-option')]
    this._options = options
    this._ensureOptionIds()
    this._syncSelected()
  }

  private _handleOptionClick = (e: Event) => {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target
    if (target.hasAttribute('disabled')) return
    this.value = target.getAttribute('value') || ''
    this._close()
    this._notifyValueChange()
  }

  private _handleOptionMouseOver = (e: Event) => {
    if (!this._isOpen || this._activeIndex < 0 || !(e.currentTarget instanceof HTMLElement)) return

    // 指针接管后只保留 :hover，避免键盘激活项与悬停项同时高亮。
    this._activeIndex = -1
    this._syncActiveOption()
  }

  private _handleOptionPointerDown = (e: PointerEvent) => {
    // 保持 trigger 焦点，避免 focusout 在 click 前关闭浮层。
    e.preventDefault()
  }

  private _onKeydown(e: KeyboardEvent) {
    if (this.disabled) return

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
          if (option && !option.hasAttribute('disabled')) {
            this.value = option.getAttribute('value') || ''
            this._notifyValueChange()
          }
          this._close()
          e.preventDefault()
        }
        break
    }
  }

  private _navigateActive(delta: number) {
    const enabled = this._options.filter(o => !o.hasAttribute('disabled'))
    if (!enabled.length) return

    const selectedOption = this._options.find(
      option => option.getAttribute('value') === this.value && !option.hasAttribute('disabled')
    )
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
    if (this.disabled || this._isOpen) return
    this._isOpen = true
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
    this._activeIndex = -1
    this._options.forEach(o => o.removeAttribute('active'))
    this._syncScrollLock(false)
    this._closeOverlay()
  }

  private _setInitialActiveOption() {
    const selectedIndex = this._options.findIndex(
      option => option.getAttribute('value') === this.value && !option.hasAttribute('disabled')
    )
    const firstEnabledIndex = this._options.findIndex(option => !option.hasAttribute('disabled'))
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
    if (this.disabled) return
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
      offset: 4,
      matchWidth: true
    })
  }

  private _openOverlay() {
    if (this.portal) this._openPortal()
    else this._overlay?.open()
  }

  private _openPortal() {
    if (this._portal) return
    const anchor = this.shadowRoot?.querySelector<HTMLElement>('.select-trigger')
    if (!anchor) return
    const portal = createOverlayPortal({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${style}`,
      className: 'wui-glass select-overlay portal'
    })
    portal.panel.setAttribute('role', 'listbox')
    portal.moveContent(Array.from(this.children))
    this._portal = portal
    this._overlay = withOverlay.make({
      anchor,
      overlay: portal.panel,
      placement: 'bottom-start',
      offset: 4,
      matchWidth: true,
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
          @click=${this._togglePopup}
          tabindex="0"
          role="combobox"
          aria-expanded=${this._isOpen}
          aria-haspopup="listbox"
          aria-activedescendant=${!this.portal && this._isOpen && this._activeIndex >= 0
            ? this._options[this._activeIndex]?.id
            : nothing}
        >
          <span class="label">${this._selectedLabel}</span>
          <web-ui-icon class="arrow" .icon=${lucideChevronDown}></web-ui-icon>
        </div>
        <div class="wui-glass select-overlay" ?hidden=${!this._isOpen} role="listbox">
          <slot @slotchange=${this._onSlotChange}></slot>
        </div>
      </div>
    `
  }
}

export interface WebUiSelect {
  readonly $events: {
    input: Event
    change: Event
  }
  isOpen: boolean
  lockScroll: boolean
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-select': WebUiSelect
  }
}
