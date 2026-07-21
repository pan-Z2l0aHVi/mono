import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/option'
import glass from '@/assets/glass.css?inline'
import { lucideChevronDown } from '@/icons'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'

import style from './style.css?inline'

@customElement('web-ui-select')
export class WebUiSelect extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) value = ''
  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) full = false

  @state() private _isOpen = false
  @state() private _activeIndex = -1

  private _options: HTMLElement[] = []
  private _overlay?: OverlayApi

  get isOpen(): boolean {
    return this._isOpen
  }

  private get _selectedLabel(): string {
    if (!this.value) return this.placeholder
    const option = this._options.find(o => o.getAttribute('value') === this.value)
    return option?.textContent?.trim() || this.placeholder
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (this._isOpen && e.target instanceof Node && !this.contains(e.target)) {
      this._close()
    }
  }

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('option-register', this._onOptionRegister)
    this.addEventListener('option-unregister', this._onOptionUnregister)
    this.addEventListener('keydown', this._onKeydown)
    document.addEventListener('click', this._onClickOutside)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('option-register', this._onOptionRegister)
    this.removeEventListener('option-unregister', this._onOptionUnregister)
    this.removeEventListener('keydown', this._onKeydown)
    document.removeEventListener('click', this._onClickOutside)
    this._options.forEach(o => o.removeEventListener('click', this._handleOptionClick))
    this._overlay?.dispose()
  }

  override firstUpdated() {
    const trigger = this.shadowRoot?.querySelector<HTMLElement>('.select-trigger')
    const overlay = this.shadowRoot?.querySelector<HTMLElement>('.select-overlay')
    if (trigger && overlay) {
      this._overlay = withOverlay.make({
        anchor: trigger,
        overlay,
        placement: 'bottom-start',
        offset: 4,
        matchWidth: true
      })
    }
  }

  override updated(changed: Map<string, unknown>) {
    this._options = [...this.querySelectorAll('web-ui-option')]
    if (changed.has('value')) {
      this._syncSelected()
    }
  }

  private _syncSelected() {
    this._options.forEach(o => {
      o.toggleAttribute('selected', o.getAttribute('value') === this.value)
    })
  }

  private _onOptionRegister(e: Event) {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target
    target.addEventListener('click', this._handleOptionClick)
    this._options.push(target)
    this._syncSelected()
  }

  private _onOptionUnregister(e: Event) {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target
    target.removeEventListener('click', this._handleOptionClick)
    this._options = this._options.filter(o => o !== target)
  }

  private _handleOptionClick = (e: Event) => {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target
    if (target.hasAttribute('disabled')) return
    this.value = target.getAttribute('value') || ''
    this._close()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
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
          this._open()
        } else {
          this._navigateActive(1)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (this._isOpen) {
          this._navigateActive(-1)
        }
        break
      case 'Enter':
        if (this._isOpen && this._activeIndex >= 0) {
          const option = this._options[this._activeIndex]
          if (option && !option.hasAttribute('disabled')) {
            this.value = option.getAttribute('value') || ''
            this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
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

    const currentIdx = enabled.indexOf(this._options[this._activeIndex])
    let nextIdx = currentIdx + delta
    if (nextIdx < 0) nextIdx = enabled.length - 1
    if (nextIdx >= enabled.length) nextIdx = 0

    const nextOption = enabled[nextIdx]
    this._activeIndex = this._options.indexOf(nextOption)

    this._options.forEach(o => o.removeAttribute('active'))
    nextOption?.setAttribute('active', '')
  }

  private _open() {
    if (this.disabled || this._isOpen) return
    this._isOpen = true
    this._syncSelected()
    this._overlay?.open()
  }

  private _close() {
    this._isOpen = false
    this._activeIndex = -1
    this._options.forEach(o => o.removeAttribute('active'))
    this._overlay?.close()
  }

  private _togglePopup() {
    if (this.disabled) return
    if (this._isOpen) this._close()
    else this._open()
  }

  override render() {
    return html`
      <div class="wui-select-inner">
        <div
          class="wui-glass wui-glass-no-after select-trigger"
          @click=${this._togglePopup}
          tabindex="0"
          role="combobox"
          aria-expanded=${this._isOpen}
          aria-haspopup="listbox"
        >
          <span class="label">${this._selectedLabel}</span>
          <web-ui-icon class="arrow" .icon=${lucideChevronDown}></web-ui-icon>
        </div>
        <div class="wui-glass wui-glass-no-after select-overlay${this._isOpen ? '' : ' hidden'}" role="listbox">
          <slot></slot>
        </div>
      </div>
    `
  }
}

export interface WebUiSelect {
  readonly $events: {
    change: Event
  }
  isOpen: boolean
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-select': WebUiSelect
  }
}
