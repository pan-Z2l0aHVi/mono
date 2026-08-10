import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import '@/components/option'
import glass from '@/assets/glass.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import type { WebUiOption } from '@/components/option'
import { normalizeLiteral } from '@/shared/normalize'
import { defineAnchoredPanel } from '@/shared/overlay/anchored-panel'
import { defineOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

const FILTER_MODES = ['none', 'prefix', 'contains'] as const
type FilterMode = (typeof FILTER_MODES)[number]

/**
 * `web-ui-autocomplete`：可输入并过滤候选的单值选择器。
 *
 * 与 `web-ui-select` 共用 `<web-ui-option>` 子项注册协议与浮层能力，但触发区是
 * 可编辑输入框：`value` 即当前输入文本（表单值），键入时按 `filter` 模式过滤候选，
 * 选择 option 时文本回填为该项 label，`selected-value` 暴露该项的 value。
 */
@customElement('web-ui-autocomplete')
export class WebUiAutocomplete extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(overlayMotion), unsafeCSS(style)]

  static formAssociated = true

  // ElementInternals 实例，在 connectedCallback 中初始化
  private _internals?: ElementInternals
  @state() private _formDisabled = false

  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) readonly = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' })
  noScrollLock = false
  @property({ attribute: false }) overlayContainer?: OverlayContainer
  @property({ type: String, reflect: true }) name = ''
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null
  @property({ type: String, attribute: 'aria-labelledby' }) ariaLabelledby: string | undefined

  private _filter: FilterMode = 'contains'

  @property({ type: String, reflect: true })
  get filter(): FilterMode {
    return this._filter
  }
  set filter(v: string) {
    const old = this._filter
    this._filter = normalizeLiteral(v, FILTER_MODES, 'contains')
    this.requestUpdate('filter', old)
  }

  // value 使用内部状态 + 访问器模式，在变更时同步 ElementInternals。
  // 与 Select 一致不反射 attribute：value attribute 保留为表单重置的初始默认值，
  // 避免设置属性时回写 attribute 导致 formResetCallback 读取到当前值。
  @state() private _value = ''

  get value(): string {
    return this._value
  }
  set value(v: string) {
    const old = this._value
    this._value = v
    this._internals?.setFormValue?.(v)
    this.requestUpdate('value', old)
  }

  // selected-value：文本精确匹配 option label 时派生出的 option value（只读反射）。
  @state() private _selectedValue = ''

  get selectedValue(): string {
    return this._selectedValue
  }

  private _setSelectedValue(value: string) {
    const old = this._selectedValue
    if (old === value && this.getAttribute('selected-value') === value) return

    this._selectedValue = value
    this.setAttribute('selected-value', value)
    if (old !== value) this.requestUpdate('selectedValue', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  @state() private _isOpen = false
  @state() private _activeIndex = -1
  @state() private _focused = false

  private static _nextInstanceId = 0
  private readonly _idPrefix = `web-ui-autocomplete-${++WebUiAutocomplete._nextInstanceId}`
  private readonly _optionIds = new WeakMap<WebUiOption, string>()
  private readonly _a11yOptionIds = new WeakMap<WebUiOption, string>()
  private _nextOptionId = 0
  private _nextA11yOptionId = 0
  private _options: WebUiOption[] = []
  private _portal?: OverlayPortal
  private _portalContent?: HTMLElement
  private readonly _pendingUnregisteredOptions = new Set<WebUiOption>()
  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _panel = defineAnchoredPanel().make({
    getAnchor: () => this.shadowRoot?.querySelector<HTMLElement>('.input-wrapper') ?? null,
    getLocalPanel: () => this.shadowRoot?.querySelector<HTMLElement>('.autocomplete-overlay') ?? null,
    getPositioning: () => ({
      placement: 'bottom-start',
      offset: 4,
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
    if (!this._isOpen) return

    const path = e.composedPath()
    const panel = this._panel.getPanel()
    if (!path.includes(this) && (!panel || !path.includes(panel))) this._close()
  }

  private _onFocusOut = () => {
    requestAnimationFrame(() => {
      if (this._isOpen && !this.matches(':focus-within') && !this._panel.getPanel()?.matches(':focus-within')) {
        this._close()
      }
    })
  }

  private _handlePanelPointerDown = (e: PointerEvent) => {
    // 非 option 区域不可聚焦；阻止 pointerdown 的默认聚焦行为，保持 combobox 焦点，
    // 使点击 empty state、滚动区和面板 padding 不会被 focusout 误判为外部交互。
    e.preventDefault()
  }

  override connectedCallback() {
    super.connectedCallback()
    // 元素被移动时会重连，ElementInternals 只能 attach 一次
    if (!this._internals) {
      this._internals = this.attachInternals()
    }
    // 同步 HTML 属性中预设的 value，补全访问器模式不处理 attribute 反射
    const attrValue = this.getAttribute('value')
    if (attrValue !== null) {
      this._value = attrValue
      this._internals?.setFormValue?.(attrValue)
    }
    this.addEventListener('option-register', this._onOptionRegister)
    this.addEventListener('option-unregister', this._onOptionUnregister)
    this.addEventListener('keydown', this._onKeydown)
    this.addEventListener('focusout', this._onFocusOut)
    document.addEventListener('click', this._onClickOutside)
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    super.attributeChangedCallback(name, oldValue, newValue)
    if (name === 'selected-value' && this.isConnected && newValue !== this._selectedValue) {
      queueMicrotask(() => {
        if (this.isConnected) this._syncSelectedValue()
      })
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('option-register', this._onOptionRegister)
    this.removeEventListener('option-unregister', this._onOptionUnregister)
    this.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('focusout', this._onFocusOut)
    document.removeEventListener('click', this._onClickOutside)
    this._options.forEach(this._unbindOption)
    this._pendingUnregisteredOptions.clear()
    this._close()
    this._portal = undefined
    this._portalContent = undefined
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
    // 否则 portal 模式首次加载时 _options 为空。
    return panelOptions.length > 0 ? panelOptions : [...this.querySelectorAll<WebUiOption>('web-ui-option')]
  }

  override willUpdate() {
    this._refreshOptions()
    this._ensureOptionIds()
    this._syncSelectedValue()
    this._applyFilter()
    this._syncOptionA11y()
    this._syncActiveOption()
  }

  override updated(changed: PropertyValues) {
    const input = this.shadowRoot?.querySelector<HTMLInputElement>('.autocomplete-input')
    if (input && input.value !== this._value) input.value = this._value
    if (changed.has('portal') || changed.has('overlayContainer'))
      requestAnimationFrame(() => this._reconfigureOverlay())
    if (changed.has('noScrollLock')) this._syncScrollLock()
    this.toggleAttribute('focused', this._focused)
    this._syncOpenAttribute()
    this._syncValidity()
    this._syncEmptyState()
  }

  formResetCallback() {
    this.value = this.getAttribute('value') || ''
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
    if (disabled && this._isOpen) this._close()
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') this.value = state
  }

  private _syncValidity() {
    if (!this._internals || typeof this._internals.setValidity !== 'function') return
    // readonly 与 disabled 一致：值不可由用户修改，视为通过校验（原生 barred-from-validation 语义）
    if (this._isDisabled || this.readonly || !this.required || this._value) this._internals.setValidity({})
    else this._internals.setValidity({ valueMissing: true }, '请输入内容')
  }

  private _syncOpenAttribute() {
    this.toggleAttribute('open', this._isOpen)
  }

  private _syncSelectedValue() {
    const query = this._value.trim().toLowerCase()
    const next = query ? (this._options.find(o => o.label.trim().toLowerCase() === query)?.value ?? '') : ''
    this._setSelectedValue(next)
  }

  private _syncOptionA11y() {
    this._options.forEach(o => {
      o.setAttribute('role', 'option')
      o.setAttribute('aria-selected', o.value === this._selectedValue ? 'true' : 'false')
      o.setAttribute('aria-hidden', 'true')
    })
  }

  private _ensureOptionIds() {
    const usedIds = new Set(this._options.map(option => option.id).filter(Boolean))
    this._options.forEach(option => {
      if (option.id) return

      let id = this._optionIds.get(option)
      if (!id || usedIds.has(id)) {
        do {
          id = `${this._idPrefix}-option-${++this._nextOptionId}`
        } while (usedIds.has(id))
        this._optionIds.set(option, id)
      }
      option.id = id
      usedIds.add(id)
    })
  }

  private _getA11yOptionId(option: WebUiOption): string {
    let id = this._a11yOptionIds.get(option)
    if (!id) {
      id = `${this._idPrefix}-a11y-option-${++this._nextA11yOptionId}`
      this._a11yOptionIds.set(option, id)
    }
    return id
  }

  // 按当前文本与 filter 模式过滤候选，非匹配项以 data-filtered 隐藏并跳过导航
  private _applyFilter() {
    const query = this._value.trim().toLowerCase()
    const mode = this._filter
    this._options.forEach(o => {
      const label = o.label.trim().toLowerCase()
      const match = mode === 'none' || !query || (mode === 'prefix' ? label.startsWith(query) : label.includes(query))
      o.toggleAttribute('data-filtered', !match)
    })
    // 活动项被过滤或禁用时清除键盘激活，避免激活不可见项
    const active = this._options[this._activeIndex]
    if (this._activeIndex >= 0 && (!active || active.hasAttribute('data-filtered') || active.disabled)) {
      this._activeIndex = -1
      this._syncActiveOption()
    }
  }

  private _syncEmptyState() {
    const panel = this._panel.getPanel()
    if (!panel) return
    const empty = panel.querySelector<HTMLElement>('.autocomplete-empty')
    if (!empty) return
    const matching = this._options.filter(o => !o.hasAttribute('data-filtered'))
    empty.hidden = !(this._options.length > 0 && matching.length === 0)
  }

  private _bindOption = (option: WebUiOption) => {
    option.addEventListener('click', this._handleOptionClick)
    option.addEventListener('pointerover', this._handleOptionPointerOver)
    option.addEventListener('pointerdown', this._handleOptionPointerDown)
    option.addEventListener('option-update', this._onOptionUpdate)
    // Portal 迁移后 option 不再向宿主冒泡事件，直接监听以覆盖真实删除。
    option.addEventListener('option-unregister', this._onOptionUnregister)
  }

  private _unbindOption = (option: WebUiOption) => {
    option.removeEventListener('click', this._handleOptionClick)
    option.removeEventListener('pointerover', this._handleOptionPointerOver)
    option.removeEventListener('pointerdown', this._handleOptionPointerDown)
    option.removeEventListener('option-update', this._onOptionUpdate)
    option.removeEventListener('option-unregister', this._onOptionUnregister)
  }

  private _refreshOptions() {
    const activeOption = this._options[this._activeIndex]
    const nextOptions = this._queryOptions()

    this._options.filter(option => !nextOptions.includes(option)).forEach(this._unbindOption)
    nextOptions.forEach(this._bindOption)
    this._options = nextOptions
    this._activeIndex = activeOption && nextOptions.includes(activeOption) ? nextOptions.indexOf(activeOption) : -1
  }

  private _syncPortalContent() {
    if (!this._portal || !this._portalContent) return

    for (const option of this._pendingUnregisteredOptions) {
      if (!this._portalContent.contains(option) && !this.contains(option)) this._portal.removeContent([option])
    }
    this._pendingUnregisteredOptions.clear()

    if (!this._isOpen) return

    const lightDomNodes = Array.from(this.childNodes)
    if (lightDomNodes.length) this._portal.appendContent(lightDomNodes, this._portalContent)
  }

  private _scheduleOptionsRefresh() {
    // disconnectedCallback 在 Portal 迁移与实际删除时都会触发。延迟到当前微任务结束，
    // 才能根据 option 的最终位置区分二者并同时同步 active/selected/ARIA 状态。
    queueMicrotask(() => {
      if (!this.isConnected) return
      this._syncPortalContent()
      this.requestUpdate()
    })
  }

  private _onOptionRegister = () => {
    this._scheduleOptionsRefresh()
  }

  private _onOptionUnregister = (e: Event) => {
    if (e.target instanceof HTMLElement && e.target.localName === 'web-ui-option')
      this._pendingUnregisteredOptions.add(e.target as WebUiOption)
    this._scheduleOptionsRefresh()
  }

  private _onSlotChange = () => {
    this._scheduleOptionsRefresh()
  }

  private _handleOptionClick = (e: Event) => {
    if (!(e.currentTarget instanceof HTMLElement)) return
    const option = e.currentTarget as WebUiOption
    if (option.disabled) return
    this._selectOption(option)
  }

  private _onOptionUpdate = () => {
    this._scheduleOptionsRefresh()
  }

  private _handleOptionPointerOver = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (!this._isOpen || !(e.currentTarget instanceof HTMLElement)) return

    // 指针接管后只保留 :hover，避免键盘激活项与悬停项同时高亮。
    this._activeIndex = -1
    this._syncActiveOption()
  }

  private _handleOptionPointerDown = (e: PointerEvent) => {
    // 保持输入框焦点，避免 focusout 在 click 前关闭浮层。
    e.preventDefault()
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this._isDisabled || this.readonly) return

    switch (e.key) {
      case 'Escape':
        if (this._isOpen) {
          this._close()
          e.preventDefault()
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!this._isOpen) this._open(true)
        else this._navigateActive(1)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!this._isOpen) this._open(true)
        else this._navigateActive(-1)
        break
      case 'Enter':
        // 面板打开时接管 Enter：选中活动项或拦截表单提交；关闭时不拦截
        if (this._isOpen) {
          e.preventDefault()
          const option = this._options[this._activeIndex]
          if (option && !option.disabled && !option.hasAttribute('data-filtered')) {
            this._selectOption(option)
          }
        }
        break
    }
  }

  private _navigateActive(delta: number) {
    const enabled = this._options.filter(o => !o.disabled && !o.hasAttribute('data-filtered'))
    if (!enabled.length) return

    const currentIdx = this._activeIndex >= 0 ? enabled.indexOf(this._options[this._activeIndex]) : delta > 0 ? -1 : 0
    let nextIdx = currentIdx + delta
    if (nextIdx < 0) nextIdx = enabled.length - 1
    if (nextIdx >= enabled.length) nextIdx = 0

    this._activeIndex = this._options.indexOf(enabled[nextIdx])
    this._syncActiveOption()
  }

  private _setInitialActiveOption() {
    const firstEnabled = this._options.findIndex(o => !o.disabled && !o.hasAttribute('data-filtered'))
    this._activeIndex = firstEnabled
    this._syncActiveOption()
  }

  private _syncActiveOption() {
    this._options.forEach((option, index) => option.toggleAttribute('active', index === this._activeIndex))
  }

  private _selectOption(option: WebUiOption) {
    if (this.readonly) return
    // value 即输入文本：选择后回填为 option label，selected-value 取 option value
    this.value = option.label
    this._setSelectedValue(option.value)
    this._close()
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private _onInput = (e: Event) => {
    if (this._isDisabled || this.readonly) return
    const input = e.target as HTMLInputElement
    if (input.value === this._value) return
    this.value = input.value
    this._activeIndex = -1
    this._syncActiveOption()
    if (!this._isOpen) this._open()
  }

  // 内部原生 input 在失焦时也会派发 change；组件契约中 change 仅表示「选中提交」，
  // 阻止原生 change 冒泡到宿主，避免消费端收到未选择时的 change。
  private _onInnerChange = (e: Event) => {
    e.stopPropagation()
  }

  private _onFocus = () => {
    if (this._isDisabled) return
    this._focused = true
    // readonly 仅可聚焦选中，不展开候选
    if (this.readonly) return
    if (this._options.length > 0) this._open()
  }

  private _onBlur = () => {
    this._focused = false
  }

  private _open(isKeyboardNavigation = false) {
    if (this._isDisabled || this.readonly || this._isOpen) return
    this._isOpen = true
    this._dispatchOpenChange()
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
    // Portal 内容可能在当前微任务尚未完成同步；先把 light DOM 中新增或重排的节点
    // 收回当前 content，再关闭并 restore，避免 restoreContent() 按旧 tracking 顺序把
    // 新 option 插到旧 option 前面。
    this._syncPortalContent()
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

  private _openOverlay(isKeyboardNavigation = false) {
    this._panel.open(isKeyboardNavigation)
    this._syncEmptyState()
  }

  private async _closeOverlay() {
    const closed = await this._panel.close(() => this._isOpen)
    if (closed) {
      this._portal = undefined
      this._portalContent = undefined
    }
  }

  private _reconfigureOverlay() {
    this._portal = undefined
    this._portalContent = undefined
    this._panel.reconfigure(this._isOpen)
  }

  private _syncScrollLock(isOpen = this._isOpen) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  private _createPortal(): OverlayPortal {
    const portal = defineOverlayPortal().make({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${overlayMotion}\n${style}`,
      className: 'wui-glass autocomplete-overlay portal wui-floating-panel'
    })
    this._portal = portal
    portal.panel.setAttribute('aria-hidden', 'true')
    portal.panel.addEventListener('pointerdown', this._handlePanelPointerDown)
    const scroll = document.createElement('div')
    scroll.className = 'autocomplete-scroll'
    const content = document.createElement('div')
    content.className = 'autocomplete-content'
    this._portalContent = content
    const empty = document.createElement('div')
    empty.className = 'autocomplete-empty'
    empty.hidden = true
    empty.textContent = '无匹配选项'
    scroll.append(content)
    content.append(empty)
    portal.panel.append(scroll)
    portal.moveContent(Array.from(this.children), content)
    return portal
  }

  private _getLabelledbyText(): string {
    if (!this.ariaLabelledby) return ''

    const root = this.getRootNode()
    if (!(root instanceof Document || root instanceof ShadowRoot)) return ''

    return this.ariaLabelledby
      .trim()
      .split(/\s+/)
      .map(id => {
        const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id
        return root.querySelector(`#${escapedId}`)?.textContent?.trim() ?? ''
      })
      .filter(Boolean)
      .join(' ')
  }

  override render() {
    const listboxId = `${this._idPrefix}-listbox`
    const labelId = `${this._idPrefix}-label`
    const labelledbyText = this._getLabelledbyText()
    const visibleOptions = this._options.filter(option => !option.hasAttribute('data-filtered'))
    const activeOption = this._isOpen && this._activeIndex >= 0 ? this._options[this._activeIndex] : undefined
    const activeDescendant = activeOption ? this._getA11yOptionId(activeOption) : nothing

    return html`
      <div class="wui-autocomplete-inner">
        ${labelledbyText ? html`<span class="autocomplete-a11y-only" id=${labelId}>${labelledbyText}</span>` : nothing}
        <div class="wui-glass input-wrapper">
          <input
            class="autocomplete-input"
            type="text"
            placeholder=${this.placeholder}
            name=${this.name}
            .value=${this._value}
            aria-label=${ifDefined(this.ariaLabel)}
            aria-labelledby=${labelledbyText ? labelId : nothing}
            ?disabled=${this._isDisabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            role="combobox"
            aria-expanded=${this._isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls=${listboxId}
            aria-disabled=${String(this._isDisabled)}
            aria-readonly=${this.readonly ? 'true' : nothing}
            aria-activedescendant=${activeDescendant}
            @input=${this._onInput}
            @change=${this._onInnerChange}
            @focus=${this._onFocus}
            @blur=${this._onBlur}
          />
        </div>
        <div
          class="autocomplete-a11y-listbox"
          id=${listboxId}
          role="listbox"
          ?hidden=${!this._isOpen}
          aria-hidden=${String(!this._isOpen)}
        >
          ${visibleOptions.map(
            option =>
              html`<div
                id=${this._getA11yOptionId(option)}
                role="option"
                aria-selected=${option.value === this._selectedValue ? 'true' : 'false'}
                aria-hidden=${String(!this._isOpen)}
                aria-disabled=${String(option.disabled)}
              >
                ${option.label}
              </div>`
          )}
        </div>
        <div
          class="wui-glass autocomplete-overlay wui-floating-panel"
          hidden
          aria-hidden="true"
          @pointerdown=${this._handlePanelPointerDown}
        >
          <div class="autocomplete-scroll">
            <div class="autocomplete-content">
              <slot @slotchange=${this._onSlotChange}></slot>
              <div class="autocomplete-empty" hidden>无匹配选项</div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
    focus: FocusEvent
    blur: FocusEvent
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-autocomplete': WebUiAutocomplete
  }
}
