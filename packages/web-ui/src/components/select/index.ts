import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/option'
import glass from '@/assets/glass.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import type { WebUiOption } from '@/components/option'
import { lucideChevronDown } from '@/icons'
import { defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { defineAnchoredPanel } from '@/shared/overlay/anchored-panel'
import { defineOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

@customElement('web-ui-select')
export class WebUiSelect extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(overlayMotion), unsafeCSS(style)]

  static formAssociated = true

  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false
  @property({ attribute: false }) overlayContainer?: OverlayContainer
  @property({ type: String, reflect: true }) name = ''

  // value 使用内部状态 + 访问器模式，在变更时同步 ElementInternals；
  // @property + reflect 让它与 input/textarea/slider/input-number 的 value 反射语义保持一致。
  @state() private _value = ''
  @property({ type: String, reflect: true })
  get value(): string {
    return this._value
  }
  set value(v: string) {
    const old = this._value
    this._value = v
    this._formAssociation.sync()
    this.toggleAttribute('data-has-value', !!v)
    this.requestUpdate('value', old)
  }

  private readonly _formAssociation = defineFormAssociation<string>({
    host: this,
    initialize: () => {
      // 同步 HTML 属性中预设的 value，补全访问器模式不处理 attribute 反射。
      const attrValue = this.getAttribute('value')
      if (attrValue !== null) {
        this._value = attrValue
        this.toggleAttribute('data-has-value', !!attrValue)
      }
    },
    getState: () => this._value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => this._value,
    getFormState: () => this._value,
    restoreState: state => {
      if (typeof state === 'string') this.value = state
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  @state() private _isOpen = false
  @state() private _activeIndex = -1
  @state() private _selectedLabel = ''
  @state() private _hasTriggerSlot = false

  private _options: WebUiOption[] = []
  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _panel = defineAnchoredPanel().make({
    getAnchor: () => this.shadowRoot?.querySelector<HTMLElement>('.select-trigger') ?? null,
    getLocalPanel: () => this.shadowRoot?.querySelector<HTMLElement>('.select-overlay') ?? null,
    getPositioning: () => ({
      placement: 'bottom-start',
      offset: 4,
      // 面板宽度统一为 max(内容, trigger, --wui-overlay-min-width)，内容自适应展开
      minAnchorWidth: true,
      strategy: this.portal ? 'fixed' : 'absolute'
    }),
    isPortal: () => this.portal,
    createPortal: () => this._createPortal()
  })

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
      !this._panel.getPanel()?.contains(e.target)
    ) {
      this._close()
    }
  }

  private _onFocusOut = () => {
    requestAnimationFrame(() => {
      if (this._isOpen && !this.matches(':focus-within') && !this._panel.getPanel()?.matches(':focus-within')) {
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
    this._options.forEach(this._unbindOption)
    this._options = []
    this._close()
    this._panel.dispose()
    this._scrollLock.release()
  }

  override firstUpdated() {
    requestAnimationFrame(() => {
      if (this.isConnected) this._onSlotChange()
    })
  }

  private _queryOptions(): WebUiOption[] {
    const panel = this.portal ? this._panel.getPanel() : null
    const panelOptions = panel ? [...panel.querySelectorAll<WebUiOption>('web-ui-option')] : []
    // 面板内容仅在浮层打开、moveContent 之后存在；关闭时回退 light DOM，
    // 否则 portal select 首次加载时 _options 为空，trigger 显示不出已选值。
    return panelOptions.length > 0 ? panelOptions : [...this.querySelectorAll<WebUiOption>('web-ui-option')]
  }

  override willUpdate() {
    this._refreshOptions()
    this._ensureOptionIds()
    this._syncSelected()
  }

  override updated(changed: PropertyValues) {
    if (changed.has('portal') || changed.has('overlayContainer'))
      requestAnimationFrame(() => this._reconfigureOverlay())
    if (changed.has('noScrollLock')) this._syncScrollLock()
    this._syncOpenAttribute()
    this._syncValidity()
  }

  formResetCallback() {
    this._formAssociation.reset()
  }

  formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this._formAssociation.restore(state)
  }

  private _syncValidity() {
    const internals = this._formAssociation.getInternals()
    if (!internals || typeof internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this.value) internals.setValidity({})
    else internals.setValidity({ valueMissing: true }, '请选择一项')
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

  private _bindOption = (option: WebUiOption) => {
    option.addEventListener('click', this._handleOptionClick)
    option.addEventListener('pointerover', this._handleOptionPointerOver)
    option.addEventListener('pointerdown', this._handleOptionPointerDown)
    option.addEventListener('option-update', this._onOptionUpdate)
  }

  private _unbindOption = (option: WebUiOption) => {
    option.removeEventListener('click', this._handleOptionClick)
    option.removeEventListener('pointerover', this._handleOptionPointerOver)
    option.removeEventListener('pointerdown', this._handleOptionPointerDown)
    option.removeEventListener('option-update', this._onOptionUpdate)
  }

  private _refreshOptions() {
    const activeOption = this._options[this._activeIndex]
    const nextOptions = this._queryOptions()

    // register/unregister 是 composed 事件：Portal 迁移时 target 会 retarget 成宿主，
    // 不能作为监听器绑定依据；绑定只发生在按 DOM 查询确认身份的 option 上。
    this._options.filter(option => !nextOptions.includes(option)).forEach(this._unbindOption)
    nextOptions.forEach(this._bindOption)
    this._options = nextOptions
    // 激活索引按 option 身份保持，避免移除中间项后静默偏移到相邻项
    this._activeIndex = activeOption && nextOptions.includes(activeOption) ? nextOptions.indexOf(activeOption) : -1
  }

  private _onOptionRegister = () => {
    this.requestUpdate()
  }

  private _onOptionUnregister = () => {
    // Portal 迁移与真实删除都会触发 unregister；延迟到微任务末尾再刷新，
    // 才能根据 option 的最终位置区分二者。
    queueMicrotask(() => {
      if (!this.isConnected) return
      this.requestUpdate()
      // 关闭状态下 willUpdate 查不到 portal 面板内容；移除已选/激活项后需立即同步标签
      if (!this.hasUpdated || !this.portal) return
      this._refreshOptions()
      this._ensureOptionIds()
      this._syncSelected()
      this._syncActiveOption()
    })
  }

  private _onSlotChange = () => {
    this.requestUpdate()
  }

  private _handleOptionClick = (e: Event) => {
    if (!(e.currentTarget instanceof HTMLElement)) return
    const option = e.currentTarget as WebUiOption
    if (option.disabled || !this._isLive(option)) return
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

  // slotchange/unregister 的刷新依赖 Lit 渲染调度；键盘或 click 事件可能先于其触发，
  // 已从 DOM 移除或被移出 Select/portal 面板的选项不得再被激活或选中。
  private _isLive(option: WebUiOption): boolean {
    const panel = this.portal ? this._panel.getPanel() : null
    return option.isConnected && (this.contains(option) || (!!panel && panel.contains(option)))
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
      case 'Enter': {
        if (this._isOpen && this._activeIndex >= 0) {
          const option = this._options[this._activeIndex]
          if (option && this._isLive(option) && !option.disabled) {
            this.value = option.value
            this._notifyValueChange()
          }
          this._close()
          e.preventDefault()
        }
        break
      }
    }
  }

  private _navigateActive(delta: number) {
    const enabled = this._options.filter(o => !o.disabled && this._isLive(o))
    if (!enabled.length) return

    const selectedOption = this._options.find(
      option => option.value === this.value && !option.disabled && this._isLive(option)
    )
    const currentIdx =
      this._activeIndex >= 0 && this._isLive(this._options[this._activeIndex])
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
    if (this.portal) {
      requestAnimationFrame(() => {
        if (this._isOpen) this._openOverlay(isKeyboardNavigation)
      })
    } else {
      this._openOverlay(isKeyboardNavigation)
    }
  }

  private _close() {
    if (!this._isOpen) return
    this._isOpen = false
    this._dispatchOpenChange()
    this._activeIndex = -1
    this._options.forEach(o => o.removeAttribute('active'))
    this._syncScrollLock(false)
    void this._closeOverlay()
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
    const selectedIndex = this._options.findIndex(
      option => option.value === this.value && !option.disabled && this._isLive(option)
    )
    const firstEnabledIndex = this._options.findIndex(option => !option.disabled && this._isLive(option))
    this._activeIndex = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex
    this._syncActiveOption()
  }

  private _syncActiveOption() {
    this._options.forEach((option, index) =>
      option.toggleAttribute('active', index === this._activeIndex && this._isLive(option))
    )
  }

  private _notifyValueChange() {
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private _syncScrollLock(isOpen = this._isOpen) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  private _togglePopup() {
    if (this._isDisabled) return
    if (this._isOpen) this._close()
    else this._open()
  }

  private _openOverlay(isKeyboardNavigation = false) {
    this._panel.open(isKeyboardNavigation)
  }

  private _createPortal(): OverlayPortal {
    const portal = defineOverlayPortal().make({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${overlayMotion}\n${style}`,
      className: 'wui-glass select-overlay portal wui-floating-panel',
      onContentChange: () => this.requestUpdate()
    })
    portal.panel.setAttribute('role', 'listbox')
    const scroll = document.createElement('div')
    scroll.className = 'select-scroll'
    const content = document.createElement('div')
    content.className = 'select-content'
    scroll.append(content)
    portal.panel.append(scroll)
    portal.moveContent(Array.from(this.children), content)
    return portal
  }

  private async _closeOverlay() {
    await this._panel.close(() => this._isOpen)
  }

  private _reconfigureOverlay() {
    this._panel.reconfigure(this._isOpen)
  }

  override render() {
    // portal 模式下 options 被 moveContent 移入浮层 shadow root，id 引用无法跨树作用域
    // 解析，因此 activedescendant 仅在非 portal 模式输出；aria-controls 同理指向同根内 listbox
    const listboxId = `${this.localName}-listbox`
    const activeDescendant =
      !this.portal && this._isOpen && this._activeIndex >= 0
        ? (this._options[this._activeIndex]?.id ?? nothing)
        : nothing

    return html`
      <div class="wui-select-inner">
        <div
          class="wui-glass select-trigger"
          ?data-custom-trigger=${this._hasTriggerSlot}
          @click=${this._togglePopup}
          tabindex=${this._isDisabled ? '-1' : '0'}
          role="combobox"
          aria-expanded=${this._isOpen}
          aria-haspopup="listbox"
          aria-controls=${this.portal ? nothing : listboxId}
          aria-disabled=${String(this._isDisabled)}
          aria-activedescendant=${activeDescendant}
        >
          <slot name="trigger" @slotchange=${this._onTriggerSlotChange}></slot>
          ${!this._hasTriggerSlot ? html`<span class="label">${this._selectedLabel}</span>` : nothing}
          <web-ui-icon class="arrow" .icon=${lucideChevronDown}></web-ui-icon>
        </div>
        <div class="wui-glass select-overlay wui-floating-panel" hidden role="listbox" id=${listboxId}>
          <div class="select-scroll">
            <div class="select-content">
              <slot @slotchange=${this._onSlotChange}></slot>
            </div>
          </div>
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
