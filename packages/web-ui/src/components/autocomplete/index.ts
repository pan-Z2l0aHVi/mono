import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import '@/components/input'
import '@/components/option'
import glass from '@/assets/glass.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import type { WebUiOption } from '@/components/option'
import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { normalizeLiteral } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import {
  createComboboxOpenController,
  createOptionListenerBinding,
  defineComboboxTrigger,
  handleComboboxFocusOut,
  nextWrappingIndex
} from '@/shared/option-portal'
import { defineOptionPortal } from '@/shared/option-portal'
import { defineAnchoredPanel } from '@/shared/overlay/anchored-panel'
import { defineOpenOverlay } from '@/shared/overlay/open-overlay'
import { applyOverlayVariables, defineOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

const FILTER_MODES = ['none', 'prefix', 'contains'] as const
type FilterMode = (typeof FILTER_MODES)[number]

function isEmptySlotNode(node: Node): node is Element {
  return node instanceof Element && node.getAttribute('slot') === 'empty'
}

// 自定义 trigger 与 select 同判据：必须留在宿主，不随 options 迁入 portal 面板
function isTriggerSlotNode(node: Node): node is Element {
  return node instanceof Element && node.slot === 'trigger'
}

/**
 * `web-ui-autocomplete`：可输入并过滤候选的单值选择器。
 *
 * 与 `web-ui-select` 共用 `<web-ui-option>` 子项注册协议与浮层能力，但触发区是
 * 可编辑输入框：`value` 即当前输入文本（表单值），键入时按 `filter` 模式过滤候选，
 * 选择 option 时文本回填为该项 label，`selected-value` 暴露该项的 value。
 * `allow-custom-value` 开启后，Enter 可把不匹配候选的原文作为 custom value 显式提交。
 *
 * 触发器跟随 select 的 wrapper div 模式：`slot[name="trigger"]` 可替换默认触发器
 * （shadow 内的 `web-ui-input`）；多行触发器（如 `web-ui-textarea`）保留 Enter 换行语义，
 * 关闭面板用 Escape 或 blur。
 * tab 位只属于触发器自身：默认触发器是 shadow 内 input，自定义触发器由消费者提供
 * 可聚焦元素（README 契约）；包装 div 恒为 tabindex="-1"，不占顺序焦点，避免双 tab 位。
 */
@customElement('web-ui-autocomplete')
export class WebUiAutocomplete extends FormAssociated(LitElement) {
  static override styles = [unsafeCSS(glass), unsafeCSS(overlayMotion), unsafeCSS(style)]

  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: Boolean, reflect: true }) borderless = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) readonly = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' })
  noScrollLock = false
  @property({ type: Boolean, reflect: true, attribute: 'allow-custom-value' })
  allowCustomValue = false
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

  // value 不反射 attribute，attribute 只参与首次声明式初始化。
  @state() private _value = ''

  get value(): string {
    return this._value
  }
  set value(v: string) {
    const old = this._value
    this._value = v
    this._formAssociation.sync()
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

  private readonly _formAssociation = defineFormAssociation<string>({
    host: this,
    initialize: () => {
      // 同步 HTML 属性中预设的 value，补全访问器模式不处理 attribute 反射。
      const attrValue = this.getAttribute('value')
      if (attrValue !== null) this._value = attrValue
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
  @state() private _focused = false
  @state() private _hasTriggerSlot = false

  private static _nextInstanceId = 0
  private readonly _idPrefix = `web-ui-autocomplete-${++WebUiAutocomplete._nextInstanceId}`
  private readonly _a11yOptionIds = new WeakMap<WebUiOption, string>()
  private _nextA11yOptionId = 0
  private _options: WebUiOption[] = []
  private _portal?: OverlayPortal
  private _portalContent?: HTMLElement
  private readonly _scrollLock = defineScrollLockLease().make()

  // option 注册表 / portal 同步 / 微任务调度收敛到 shared 模块（select 同款）
  private readonly _optionPortal = defineOptionPortal().make({
    element: this,
    idPrefix: `${this._idPrefix}-option`,
    getPortal: () => this._portal,
    getPortalContent: () => this._portalContent,
    isOpen: () => this.portal && this._isOpen,
    // 默认 slot 内容随面板迁移；slot="empty" 由 autocomplete 单独迁移并恢复。
    // slot="trigger" 与 select 同判据留在宿主，不进面板。
    getMigratableNodes: () =>
      Array.from(this.childNodes).filter(node => !isEmptySlotNode(node) && !isTriggerSlotNode(node)),
    hasUpdated: () => this.hasUpdated,
    requestUpdate: () => this.requestUpdate(),
    bindOption: option => this._bindOption(option),
    unbindOption: option => this._unbindOption(option)
  })
  /*
   * 触发器委托层：默认触发器（shadow 内 web-ui-input）与 slot[name="trigger"] 自定义
   * 触发器对组件暴露同一形状，监听统一挂在 trigger 包装 div 上，两条路径不特判。
   */
  private readonly _trigger = defineComboboxTrigger().make({
    getWrapper: () => this.shadowRoot?.querySelector<HTMLElement>('.autocomplete-trigger') ?? null,
    getCustomTrigger: () => {
      const assigned = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')?.assignedElements()[0]
      return assigned instanceof HTMLElement ? assigned : null
    },
    getFallbackTrigger: () => this.shadowRoot?.querySelector<HTMLElement>('.autocomplete-input') ?? null,
    onInput: value => this._onTriggerInput(value),
    onClick: () => this._onTriggerClick(),
    onFocusIn: event => this._onTriggerFocusIn(event),
    onFocusOut: event => this._onTriggerFocusOut(event)
  })
  /*
   * 开启态浮层承载「我开着吗」（issue #120 Block 1）：宿主级 keydown 在 portal 模式下
   * 收不到面板内的 Escape，改由唯一仲裁者在 document 捕获阶段判定最内层。
   * 宿主接口只剩 requestClose：开启状态是声明而非询问。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this._close()
  })
  private readonly _panel = defineAnchoredPanel().make({
    // 锚点取当前生效的触发器 host：默认触发器或自定义 trigger slot 内容
    getAnchor: () =>
      this._trigger.getTrigger() ?? this.shadowRoot?.querySelector<HTMLElement>('.autocomplete-trigger') ?? null,
    getLocalPanel: () => this.shadowRoot?.querySelector<HTMLElement>('.autocomplete-overlay') ?? null,
    getPositioning: () => ({
      placement: 'bottom-start',
      offset: 4,
      minAnchorWidth: true,
      strategy: this.portal ? 'fixed' : 'absolute'
    }),
    isPortal: () => this.portal,
    createPortal: () => this._createPortal(),
    openOverlay: this._overlay
  })

  get isOpen(): boolean {
    return this._isOpen
  }

  get open(): boolean {
    return this._isOpen
  }

  /*
   * 公共焦点委托：聚焦/失焦当前生效的触发器（默认 web-ui-input 或自定义触发器）。
   * 组件自带 focus 重定向时落到内部原生控件；自定义触发器没有该能力时，
   * 原生 focus() 聚焦 host 自身。无触发器（尚未首渲或已断开）时静默返回。
   */
  override focus(options?: FocusOptions): void {
    this._trigger.focusTrigger(options)
  }

  override blur(): void {
    this._trigger.blurTrigger()
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (!this._isOpen) return

    // 在监听器内部判定：composedPath() 在派发结束后会被清空。
    const isInside = e.composedPath().includes(this) || !!this._panel.getHandle()?.containsEvent(e)
    if (!isInside) this._close()
  }

  private _onFocusOut = () => {
    handleComboboxFocusOut(
      this,
      () => this._panel.getHandle(),
      () => this._isOpen,
      () => this._close()
    )
  }

  private _handlePanelPointerDown = (e: PointerEvent) => {
    // 非 option 区域不可聚焦；阻止 pointerdown 的默认聚焦行为，保持 combobox 焦点，
    // 使点击 empty state、滚动区和面板 padding 不会被 focusout 误判为外部交互。
    e.preventDefault()
  }

  override connectedCallback() {
    super.connectedCallback()
    this._optionPortal.bindHost()
    // 宿主可能被上层浮层 portal 迁移（断开重连）：shadow 内的包装 div 仍在，重新绑定委托监听
    this._trigger.bind()
    this.addEventListener('keydown', this._onKeydown)
    this.addEventListener('focusout', this._onFocusOut)
    document.addEventListener('click', this._onClickOutside)
  }

  private _onTriggerSlotChange = () => {
    this._syncTriggerSlot()
  }

  /*
   * 自定义触发器判定必须同步：slotchange 在首次渲染之后才派发，只依赖它会让默认
   * web-ui-input 先渲染一帧再被替换，自定义触发器出现时会闪一下默认输入框。
   * 判据与 portal 迁移排除（isTriggerSlotNode）同源：宿主直接子节点带 slot="trigger"。
   */
  private _syncTriggerSlot() {
    const hasTriggerSlot = Array.from(this.children).some(isTriggerSlotNode)
    if (this._hasTriggerSlot === hasTriggerSlot) return
    this._hasTriggerSlot = hasTriggerSlot
    // 触发器在默认与自定义之间切换：anchor 与 portal 会话按新触发器重建。
    // 首次渲染前尚无 portal 会话，无需重建。
    if (this.hasUpdated) this._reconfigureOverlay()
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
    this._optionPortal.dispose()
    this._trigger.dispose()
    this.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('focusout', this._onFocusOut)
    document.removeEventListener('click', this._onClickOutside)
    this._options.forEach(this._unbindOption)
    this._close()
    this._portal = undefined
    this._portalContent = undefined
    // 撤销登记由 _panel.dispose() 完成（句柄归它持有），不再需要单独 dispose 仲裁者。
    this._panel.dispose()
    this._scrollLock.release()
  }

  override firstUpdated() {
    this._trigger.bind()
    requestAnimationFrame(() => {
      if (this.isConnected) this._optionPortal.scheduleRefresh()
    })
  }

  override willUpdate() {
    this._syncTriggerSlot()
    this._refreshOptions()
    this._optionPortal.ensureOptionIds(this._options)
    this._syncSelectedValue()
    this._applyFilter()
    this._syncOptionA11y()
    this._syncActiveOption()
  }

  override updated(changed: PropertyValues) {
    // 文本回写经委托层落到当前触发器（默认 web-ui-input 或自定义触发器）
    this._trigger.setValue(this._value)
    if (changed.has('portal') || changed.has('overlayContainer'))
      requestAnimationFrame(() => this._reconfigureOverlay())
    if (changed.has('noScrollLock')) this._syncScrollLock()
    this.toggleAttribute('focused', this._focused)
    this._syncOpenAttribute()
    this._syncOverlayInert()
    this._syncValidity()
    this._syncEmptyState()
  }

  override formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
    if (disabled && this._isOpen) this._close()
  }

  private _syncValidity() {
    const internals = this._formAssociation.getInternals()
    if (!internals || typeof internals.setValidity !== 'function') return
    // readonly 与 disabled 一致：值不可由用户修改，视为通过校验（原生 barred-from-validation 语义）
    if (this._isDisabled || this.readonly || !this.required || this._value) internals.setValidity({})
    else internals.setValidity({ valueMissing: true }, '请输入内容')
  }

  private _syncOpenAttribute() {
    this.toggleAttribute('open', this._isOpen)
  }

  /*
   * 禁用/只读态不响应 Escape。仲裁者仍在（吞掉按键并压掉原生 cancel），只是不走关闭
   * 入口 —— 与旧的「跳过候选」语义不同：旧语义放任事件落到下层浮层，把外层一起关掉。
   * 每次渲染后同步即可覆盖 disabled / readonly 属性与表单禁用三条来源。
   */
  private _syncOverlayInert() {
    this._panel.getHandle()?.setInert(this._isDisabled || this.readonly)
  }

  private _syncSelectedValue() {
    const query = this._value.trim().toLowerCase()
    const next = query
      ? (this._options.find(o => !o.disabled && o.label.trim().toLowerCase() === query)?.value ?? '')
      : ''
    this._setSelectedValue(next)
  }

  private _syncOptionA11y() {
    this._options.forEach(o => {
      o.setAttribute('role', 'option')
      o.setAttribute('aria-selected', o.value === this._selectedValue ? 'true' : 'false')
      o.setAttribute('aria-hidden', 'true')
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
    const empty = panel?.querySelector<HTMLElement>('.autocomplete-empty')
    const matching = this._options.filter(o => !o.hasAttribute('data-filtered'))
    const hasEmpty = this._isOpen && this._options.length > 0 && matching.length === 0
    if (empty) empty.hidden = !hasEmpty

    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="empty"]')
    const customText = slot
      ?.assignedElements()
      .map(element => element.textContent?.trim())
      .filter(Boolean)
      .join(' ')
      .trim()
    const message = customText || empty?.dataset.wuiA11yEmpty || '无匹配选项'
    const a11yEmpty = this.shadowRoot?.querySelector<HTMLElement>('.autocomplete-empty-a11y')
    if (a11yEmpty) {
      a11yEmpty.textContent = message
      a11yEmpty.hidden = !hasEmpty
    }
  }

  private readonly _optionListeners = createOptionListenerBinding({
    // 惰性解引用：handler 字段声明在后者仍可在调用期取到
    onClick: event => this._handleOptionClick(event),
    onPointerOver: event => this._handleOptionPointerOver(event),
    onPointerDown: event => this._handleOptionPointerDown(event),
    onUpdate: () => this._onOptionUpdate()
  })
  private _bindOption = (option: WebUiOption) => this._optionListeners.bind(option)
  private _unbindOption = (option: WebUiOption) => this._optionListeners.unbind(option)

  private _refreshOptions() {
    const activeOption = this._options[this._activeIndex]
    // diff 绑定/解绑与激活索引按 option 身份保持在 shared 内完成
    const next = this._optionPortal.refresh(this._options, activeOption)
    this._options = next.options
    this._activeIndex = next.activeIndex
  }

  private _handleOptionClick = (e: Event) => {
    if (!(e.currentTarget instanceof HTMLElement)) return
    const option = e.currentTarget as WebUiOption
    if (option.disabled) return
    this._selectOption(option)
  }

  private _onOptionUpdate = () => {
    this._optionPortal.scheduleRefresh()
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

  // slotchange 不冒泡，只能由模板内 slot 自行监听；稳定引用避免 Lit 重挂载
  private _onSlotChange = () => {
    this._optionPortal.scheduleRefresh()
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this._isDisabled || this.readonly) return

    // Escape 不在本组件处理：由共享仲裁者在 document 捕获阶段归属（issue #120 Block 1）。
    switch (e.key) {
      /*
       * 多行触发器（textarea）的方向键归光标移动：面板打开时不接管、不
       * preventDefault，与 Enter 的 multiline 例外同判据。面板关闭时方向键
       * 仍是打开入口（键盘可达性不依赖指针）。
       */
      case 'ArrowDown':
      case 'ArrowUp': {
        if (this._isOpen && this._trigger.isMultilineEdit(e)) break
        e.preventDefault()
        if (!this._isOpen) this._open(true)
        else this._navigateActive(e.key === 'ArrowDown' ? 1 : -1)
        break
      }
      case 'Enter':
        /*
         * 面板打开时接管 Enter：选择候选或提交 custom value；关闭时不拦截表单提交。
         * 多行触发器（textarea）保留换行语义，不接管为选中高亮项。
         */
        if (this._isOpen && !this._trigger.isMultilineEdit(e)) {
          e.preventDefault()
          const option = this._options[this._activeIndex]
          if (option && !option.disabled && !option.hasAttribute('data-filtered')) {
            this._selectOption(option)
            return
          }

          const exactOption = this._findExactOption(this._value)
          if (exactOption) {
            this._selectOption(exactOption)
            return
          }

          if (this.allowCustomValue && this._value && !this._hasExactOption(this._value)) {
            this._selectCustomValue()
          }
        }
        break
    }
  }

  private _navigateActive(delta: number) {
    const enabled = this._options.filter(o => !o.disabled && !o.hasAttribute('data-filtered'))
    if (!enabled.length) return

    const currentIdx = this._activeIndex >= 0 ? enabled.indexOf(this._options[this._activeIndex]) : delta > 0 ? -1 : 0
    this._activeIndex = this._options.indexOf(enabled[nextWrappingIndex(enabled.length, currentIdx, delta)])
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

  private _findExactOption(value: string): WebUiOption | undefined {
    const query = value.trim().toLowerCase()
    if (!query) return undefined

    return this._options.find(option => !option.disabled && option.label.trim().toLowerCase() === query)
  }

  private _hasExactOption(value: string): boolean {
    const query = value.trim().toLowerCase()
    return this._options.some(option => option.label.trim().toLowerCase() === query)
  }

  private _selectCustomValue() {
    // Custom value 的 identity 由消费端管理；组件不隐式创建 option，selected-value 保持派生空值。
    this._close()
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private _onTriggerInput = (value: string) => {
    if (this._isDisabled || this.readonly) return
    if (value === this._value) return
    this.value = value
    this._activeIndex = -1
    this._syncActiveOption()
    if (!this._isOpen) this._open()
  }

  private _onTriggerClick = () => {
    if (this._isDisabled || this.readonly) return
    if (this._options.length > 0) this._open()
  }

  /*
   * focus/blur 不冒泡，委托层监听等价且冒泡的 focusin/focusout。
   * 自定义触发器位于 light DOM，其焦点变化不会跨 shadow 边界到达宿主，这里补发
   * 公共 focus/blur 兑现 README 事件契约；默认触发器在 shadow 内，原生事件已能
   * 到达宿主，重复派发会让消费端收到两次。
   */
  private _onTriggerFocusIn = (event: FocusEvent) => {
    if (this._isDisabled) return
    this._focused = true
    // composed 与原生 focus 一致（宿主内 retarget）：跨 shadow 边界的消费者能收到，
    // 但不 bubbles —— focus/blur 的公共契约本来就不冒泡。
    // relatedTarget 透传：消费端靠它判断焦点来回，补发事件不该丢这个信息
    if (this._isSlottedFocus(event))
      this.dispatchEvent(new FocusEvent('focus', { composed: true, relatedTarget: event.relatedTarget }))
  }

  private _onTriggerFocusOut = (event: FocusEvent) => {
    this._focused = false
    if (this._isSlottedFocus(event))
      this.dispatchEvent(new FocusEvent('blur', { composed: true, relatedTarget: event.relatedTarget }))
  }

  private _isSlottedFocus(event: FocusEvent): boolean {
    const target = event.target
    return target instanceof Node && !!this.shadowRoot && !this.shadowRoot.contains(target)
  }

  // 开合生命周期不变量收敛在 shared combobox-shell；autocomplete 注入
  // readonly guard 与 close 前的 portal 内容收敛钩子
  private readonly _openController = createComboboxOpenController({
    canOpen: () => !this._isDisabled && !this.readonly,
    getIsOpen: () => this._isOpen,
    setIsOpen: open => {
      this._isOpen = open
    },
    dispatchOpenChange: () => this._dispatchOpenChange(),
    syncScrollLock: open => this._syncScrollLock(open),
    isPortal: () => this.portal,
    openOverlay: isKeyboardNavigation => this._openOverlay(isKeyboardNavigation),
    closeOverlay: () => void this._closeOverlay(),
    onOpen: isKeyboardNavigation => {
      if (isKeyboardNavigation) this._setInitialActiveOption()
      else this._syncActiveOption()
    },
    onBeforeClose: () => {
      // Portal 内容可能在当前微任务尚未完成同步；先把 light DOM 中新增或重排的节点
      // 收回当前 content，再关闭并 restore，避免 restoreContent() 按旧 tracking 顺序把
      // 新 option 插到旧 option 前面。
      this._optionPortal.syncPortalContent()
    },
    onAfterClose: () => {
      this._activeIndex = -1
      this._options.forEach(o => o.removeAttribute('active'))
    }
  })

  private _open(isKeyboardNavigation = false) {
    this._openController.open(isKeyboardNavigation)
  }

  private _close() {
    this._openController.close()
  }

  private _dispatchOpenChange() {
    dispatchOpenChangeEvent(this, this._isOpen)
  }

  private _openOverlay(isKeyboardNavigation = false) {
    this._panel.open(isKeyboardNavigation)
    // 新会话的句柄刚建立，惰性状态需按当前 disabled/readonly 重新同步。
    this._syncOverlayInert()
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
    /*
     * reconfigure 重新 claim = 新会话，inert 回到 false。实测这条重推是**冗余**的（摘掉本行
     * 全部用例仍绿）：这条路径后面跟着一轮渲染，而 `updated()` 每次渲染都会调
     * `_syncOverlayInert()`。留在这里是不想依赖「这条路径必然跟着一次渲染」这个隐含前提。
     */
    this._syncOverlayInert()
  }

  private _syncScrollLock(isOpen = this._isOpen) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  private _createPortal(): OverlayPortal {
    const portal = defineOverlayPortal().make({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${overlayMotion}\n${style}`,
      className: 'wui-glass autocomplete-overlay portal wui-floating-panel',
      onContentChange: mutations => {
        this._optionPortal.scheduleRefresh()
        const removedEmptyNodes = mutations.flatMap(mutation => [...mutation.removedNodes]).filter(isEmptySlotNode)
        if (removedEmptyNodes.length) {
          this._portal?.removeContent(removedEmptyNodes)
          const empty = this._portal?.panel.querySelector<HTMLElement>('.autocomplete-empty')
          if (empty) {
            empty.textContent = '无匹配选项'
            empty.dataset.wuiA11yEmpty = '无匹配选项'
          }
          // 只改 panel 内 dataset 不会触发 Lit update；同步刷新 shadow 内 role=status 空态。
          this._syncEmptyState()
        }
      }
    })
    this._portal = portal
    applyOverlayVariables(portal.panel, this, [
      '--wui-overlay-min-width',
      '--wui-autocomplete-max-width',
      '--wui-autocomplete-max-height'
    ])
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
    empty.dataset.wuiA11yEmpty = this._getEmptySlotText()
    scroll.append(content)
    content.append(empty)
    portal.panel.append(scroll)
    for (const node of Array.from(this.childNodes)) {
      // 框架注释锚点（v-if/v-for 占位）必须留在宿主：锚点进面板后 Vue 下次翻转
      // 会以面板内节点为插入基准；portal 的 marker 注释同理不参与迁移。
      if (node instanceof Comment) continue
      // 自定义 trigger 与 select（:461）同判据：留在宿主，不随 options 迁入浮层
      if (isTriggerSlotNode(node)) continue
      if (isEmptySlotNode(node)) portal.appendContent([node], empty)
      else portal.appendContent([node], content)
    }
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

  private _getEmptySlotText(): string {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="empty"]')
    const text = slot
      ?.assignedElements()
      .map(element => element.textContent?.trim())
      .filter(Boolean)
      .join(' ')
      .trim()
    return text || '无匹配选项'
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
        <div
          class="autocomplete-trigger"
          ?data-custom-trigger=${this._hasTriggerSlot}
          role="combobox"
          aria-expanded=${this._isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls=${listboxId}
          aria-disabled=${String(this._isDisabled)}
          aria-readonly=${this.readonly ? 'true' : nothing}
          aria-label=${ifDefined(this.ariaLabel)}
          aria-labelledby=${labelledbyText ? labelId : nothing}
          aria-activedescendant=${activeDescendant}
          tabindex="-1"
        >
          <slot name="trigger" @slotchange=${this._onTriggerSlotChange}></slot>
          ${
            !this._hasTriggerSlot
              ? html`<web-ui-input
                  class="autocomplete-input"
                  .value=${this._value}
                  placeholder=${this.placeholder}
                  name=${this.name}
                  ?borderless=${this.borderless}
                  ?disabled=${this._isDisabled}
                  ?readonly=${this.readonly}
                  ?required=${this.required}
                  aria-label=${ifDefined(this.ariaLabel || labelledbyText || undefined)}
                ></web-ui-input>`
              : nothing
          }
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
        <div class="autocomplete-a11y-only autocomplete-empty-a11y" role="status" hidden></div>
        <div
          class="autocomplete-overlay wui-floating-panel wui-glass"
          hidden
          aria-hidden="true"
          @pointerdown=${this._handlePanelPointerDown}
        >
          <div class="autocomplete-scroll">
            <div class="autocomplete-content">
              <slot @slotchange=${this._onSlotChange}></slot>
              <div class="autocomplete-empty" hidden>
                <slot name="empty">无匹配选项</slot>
              </div>
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
