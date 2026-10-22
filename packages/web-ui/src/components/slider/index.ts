import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'
import { installPointerFocusSuppression } from '@/shared/focus/pointer-focus'
import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { createFieldId } from '@/shared/form-association/field-id'
import { attachDragGesture, type DragGestureHandle } from '@/shared/gesture/drag-gesture'
import { clamp } from '@/shared/gesture/physics'
import { normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'

const POINTER_DRAG_THRESHOLD = 6

installPointerFocusSuppression()

@customElement('web-ui-slider')
export class WebUiSlider extends FormAssociated(LitElement) {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) marks = false
  @property({ type: Boolean, reflect: true }) vertical = false
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null
  @property({ type: String, attribute: 'aria-labelledby' }) ariaLabelledby: string | undefined

  private readonly _fieldId = createFieldId('web-ui-slider')
  private _renderedLabelledbyText = ''
  private _labelledbyControlTargets = new Set<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>()
  private readonly _labelledbyObserver = new MutationObserver(() => {
    const labelledbyText = this._getLabelledbyText()
    if (labelledbyText !== this._renderedLabelledbyText) this.requestUpdate()
    this._observeLabelledbyTargets()
  })
  private readonly _handleLabelledbyControlValueChange = () => {
    const labelledbyText = this._getLabelledbyText()
    if (labelledbyText !== this._renderedLabelledbyText) this.requestUpdate()
  }

  // value 使用访问器模式同步表单关联状态。
  private _value = 0
  @property({ type: Number, reflect: true })
  get value(): number {
    return this._value
  }
  set value(v: number) {
    const normalized = normalizeNumber(v, -Infinity, Infinity, 0)
    const old = this._value
    this._value = normalized
    this._formAssociation.sync()
    this.requestUpdate('value', old)
  }

  private _min = 0
  @property({ type: Number, reflect: true })
  get min(): number {
    return this._min
  }
  set min(v: number) {
    this._min = normalizeNumber(v, -Infinity, Infinity, 0)
  }

  private _max = 100
  @property({ type: Number, reflect: true })
  get max(): number {
    return this._max
  }
  set max(v: number) {
    this._max = normalizeNumber(v, -Infinity, Infinity, 100)
  }

  private _step = 1
  @property({ type: Number, reflect: true })
  get step(): number {
    return this._step
  }
  set step(v: number) {
    this._step = normalizeNumber(v, -Infinity, Infinity, 1)
  }

  @state() private _dragging = false
  @state() private _pressed = false
  // 避免未改变数值的点击被误认为一次表单提交
  private _interactionStartValue: number | undefined
  private _dragGestureHandle: DragGestureHandle | null = null

  override disconnectedCallback() {
    this._labelledbyObserver.disconnect()
    this._syncLabelledbyControlTargets(new Set())
    super.disconnectedCallback()
    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = null
  }

  override connectedCallback() {
    super.connectedCallback()
    this._observeLabelledbyTargets()
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('ariaLabelledby')) this._observeLabelledbyTargets()
  }

  private readonly _formAssociation = defineFormAssociation<number>({
    host: this,
    initialize: () => {
      this._value = this._normalizeValue(this._value)
    },
    getState: () => this._value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => String(this._value),
    getFormState: () => String(this._value),
    restoreState: state => {
      if (typeof state !== 'string') return
      const value = Number(state)
      if (Number.isFinite(value)) this.value = value
    },
    syncValidity: internals => {
      if (typeof internals.setValidity === 'function') internals.setValidity({})
    }
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has('value') || changed.has('min') || changed.has('max') || changed.has('step')) {
      const normalizedValue = this._normalizeValue(this.value)
      if (normalizedValue !== this.value) this.value = normalizedValue
    }
  }

  override focus(options?: FocusOptions) {
    this._slider?.focus(options)
  }

  override blur() {
    this._slider?.blur()
  }

  private get _slider(): HTMLDivElement | null {
    return this.renderRoot.querySelector<HTMLDivElement>('[role="slider"]')
  }

  private get _range(): number {
    return Math.max(0, this.max - this.min)
  }

  private get _percent(): number {
    return this._range === 0 ? 0 : ((this.value - this.min) / this._range) * 100
  }

  private get _markValues(): number[] {
    if (!this.marks || this._range === 0) return []
    const count = Math.min(100, Math.floor(this._range / this._safeStep))
    return Array.from({ length: count + 1 }, (_, index) => this.min + index * this._safeStep)
  }

  private get _safeStep(): number {
    return Number.isFinite(this.step) && this.step > 0 ? this.step : 1
  }

  private _getLabelledbyText(): string {
    if (!this.ariaLabelledby) return ''

    const root = this.getRootNode()
    if (!(root instanceof Document || root instanceof ShadowRoot)) return ''

    return this.ariaLabelledby
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(id => this._getReferencedTextAlternative(root, id))
      .filter(Boolean)
      .join(' ')
  }

  private _getReferencedTextAlternative(root: Document | ShadowRoot, id: string, visited = new Set<Element>()): string {
    const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id
    const element = root.querySelector(`#${escapedId}`)
    if (!element || visited.has(element)) return ''
    visited.add(element)

    const hiddenReferenceRoot = this._isHiddenFromAccessibleName(element) ? element : undefined
    return this._getElementTextAlternative(root, element, visited, true, hiddenReferenceRoot)
  }

  private _getElementTextAlternative(
    root: Document | ShadowRoot,
    element: Element,
    visited: Set<Element>,
    directlyReferenced = false,
    hiddenReferenceRoot?: Element
  ): string {
    if (!directlyReferenced && this._isHiddenFromAccessibleName(element, hiddenReferenceRoot)) return ''

    const labelledby = element.getAttribute('aria-labelledby')
    if (labelledby) {
      const text = labelledby
        .trim()
        .split(/\s+/)
        .map(referencedId => this._getReferencedTextAlternative(root, referencedId, visited))
        .filter(Boolean)
        .join(' ')
      if (text) return text
    }

    const ariaLabel = element.getAttribute('aria-label')?.trim()
    if (ariaLabel) return ariaLabel

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      return element.value.trim()
    }

    if (element.localName === 'img') {
      const alt = element.getAttribute('alt')?.trim()
      if (alt) return alt
    }

    const content = Array.from(element.childNodes)
      .map(node => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() ?? ''
        if (node instanceof Element) {
          if (visited.has(node)) return ''
          visited.add(node)
          return this._getElementTextAlternative(root, node, visited, false, hiddenReferenceRoot)
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')

    return content || element.getAttribute('title')?.trim() || ''
  }

  private _isHiddenFromAccessibleName(element: Element, ignoredAncestor?: Element): boolean {
    let current: Element | null = element
    while (current && current !== ignoredAncestor) {
      if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true') return true

      const style = current.ownerDocument.defaultView?.getComputedStyle(current)
      if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return true

      current = current.parentElement
    }
    return false
  }

  private _observeLabelledbyTargets() {
    this._labelledbyObserver.disconnect()
    if (!this.ariaLabelledby || !this.isConnected) {
      this._syncLabelledbyControlTargets(new Set())
      return
    }

    const root = this.getRootNode()
    if (!(root instanceof Document || root instanceof ShadowRoot)) {
      this._syncLabelledbyControlTargets(new Set())
      return
    }

    const pendingIds = this.ariaLabelledby.trim().split(/\s+/).filter(Boolean)
    const visitedIds = new Set<string>()
    const targets = new Set<Element>()

    while (pendingIds.length) {
      const id = pendingIds.pop()!
      if (visitedIds.has(id)) continue
      visitedIds.add(id)

      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id
      const target = root.querySelector(`#${escapedId}`)
      if (!target) continue

      targets.add(target)
      const nestedLabelledby = target.getAttribute('aria-labelledby')
      if (nestedLabelledby) pendingIds.push(...nestedLabelledby.trim().split(/\s+/).filter(Boolean))
    }

    this._syncLabelledbyControlTargets(
      new Set(
        [...targets].filter(
          (target): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement
        )
      )
    )

    const structuralTargets = new Set<Node>()
    for (const target of targets) {
      this._labelledbyObserver.observe(target, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          'alt',
          'aria-hidden',
          'aria-label',
          'aria-labelledby',
          'class',
          'hidden',
          'id',
          'style',
          'title',
          'value'
        ]
      })

      let ancestor = target.parentNode
      while (ancestor && ancestor !== root) {
        if (!(ancestor instanceof Element && targets.has(ancestor))) structuralTargets.add(ancestor)
        ancestor = ancestor.parentNode
      }
    }

    for (const target of structuralTargets) {
      this._labelledbyObserver.observe(target, {
        childList: true,
        attributes: true,
        attributeFilter: ['aria-hidden', 'class', 'hidden', 'style']
      })
    }

    const missingTargets = visitedIds.size !== targets.size
    this._labelledbyObserver.observe(root, {
      childList: true,
      subtree: missingTargets,
      attributes: missingTargets,
      attributeFilter: missingTargets ? ['aria-hidden', 'class', 'hidden', 'id', 'style'] : undefined
    })
  }

  private _syncLabelledbyControlTargets(targets: Set<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    for (const target of this._labelledbyControlTargets) {
      if (targets.has(target)) continue
      target.removeEventListener('input', this._handleLabelledbyControlValueChange)
      target.removeEventListener('change', this._handleLabelledbyControlValueChange)
    }

    for (const target of targets) {
      if (this._labelledbyControlTargets.has(target)) continue
      target.addEventListener('input', this._handleLabelledbyControlValueChange)
      target.addEventListener('change', this._handleLabelledbyControlValueChange)
    }

    this._labelledbyControlTargets = targets
  }

  private _normalizeValue(value: number): number {
    if (!Number.isFinite(value)) return this.min
    const lower = Math.min(this.min, this.max)
    const upper = Math.max(this.min, this.max)
    const clamped = clamp(value, lower, upper)
    const steps = Math.round((clamped - lower) / this._safeStep)
    // 对齐到 step 网格后必须再收敛一次：`round` 会把值推到网格外侧
    // （max=100 / step=15 → 7 * 15 = 105），不收敛就会突破 max，
    // 连带 aria-valuenow 与 --percent 溢出 track。
    const snapped = Number((lower + steps * this._safeStep).toFixed(this._precision))
    return clamp(snapped, lower, upper)
  }

  private get _precision(): number {
    return Math.max(this._decimalPlaces(this.min), this._decimalPlaces(this.max), this._decimalPlaces(this._safeStep))
  }

  private _decimalPlaces(value: number): number {
    const [, decimal = ''] = String(value).split('.')
    return decimal.length
  }

  private _setValue(value: number): boolean {
    if (this._isDisabled) return false
    const nextValue = this._normalizeValue(value)
    if (nextValue === this.value) return false
    this.value = nextValue
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    return true
  }

  private _setValueFromPointer(event: PointerEvent): boolean {
    const track = this._slider
    if (!track) return false
    const rect = track.getBoundingClientRect()
    if (this.vertical) {
      if (rect.height <= 0) return false
      // 视觉上的数值从下往上增长，与坐标系相反。
      const ratio = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1)
      return this._setValue(this.min + ratio * this._range)
    }
    if (rect.width <= 0) return false
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    return this._setValue(this.min + ratio * this._range)
  }

  private _handlePointerDown(event: PointerEvent) {
    if (this._isDisabled) return
    this._pressed = true
    this._interactionStartValue = this.value

    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = attachDragGesture(event, {
      axis: this.vertical ? 'y' : 'x',
      threshold: POINTER_DRAG_THRESHOLD,
      onMove: (_info, e) => {
        this._dragging = true
        this._setValueFromPointer(e)
      },
      onEnd: (_info, e) => {
        this._setValueFromPointer(e)
        this._pressed = false
        this._dragging = false
        if (this._interactionStartValue !== this.value) {
          this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
        }
        this._interactionStartValue = undefined
      },
      onTap: (info, e) => {
        const crossAxisDelta = this.vertical ? info.deltaX : info.deltaY
        if (Math.abs(crossAxisDelta) >= POINTER_DRAG_THRESHOLD) return

        this._setValueFromPointer(e)
        if (this._interactionStartValue !== this.value) {
          this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
        }
      },
      onCancel: () => {
        this._pressed = false
        this._dragging = false
        this._interactionStartValue = undefined
      }
    })
  }

  private _handleKeyDown(event: KeyboardEvent) {
    if (this._isDisabled) return
    const pageStep = this._safeStep * 10
    const keyValues: Record<string, number> = {
      ArrowDown: this.value - this._safeStep,
      ArrowLeft: this.value - this._safeStep,
      ArrowUp: this.value + this._safeStep,
      ArrowRight: this.value + this._safeStep,
      PageDown: this.value - pageStep,
      PageUp: this.value + pageStep,
      Home: this.min,
      End: this.max
    }
    const nextValue = keyValues[event.key]
    if (nextValue === undefined) return
    event.preventDefault()
    if (this._setValue(nextValue)) this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  override render() {
    const trackClass = classMap({
      'wui-slider-track': true,
      'is-dragging': this._dragging,
      'is-disabled': this._isDisabled
    })
    const thumbClass = classMap({
      'wui-slider-thumb': true,
      'wui-glass': true,
      'is-pressed': this._pressed,
      'is-dragging': this._dragging
    })
    const trackStyle = styleMap({ '--percent': `${this._percent}%` })
    const labelledbyText = this._getLabelledbyText()
    this._renderedLabelledbyText = labelledbyText
    const labelledbyId = `${this._fieldId}-label`

    return html`
      ${labelledbyText ? html`<span class="wui-slider-a11y-only" id=${labelledbyId}>${labelledbyText}</span>` : nothing}
      <div
        class=${trackClass}
        style=${trackStyle}
        role="slider"
        tabindex=${this._isDisabled ? '-1' : '0'}
        aria-label=${ifDefined(this.ariaLabel)}
        aria-labelledby=${labelledbyText ? labelledbyId : nothing}
        aria-orientation=${this.vertical ? 'vertical' : 'horizontal'}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${this.value}
        aria-disabled=${String(this._isDisabled)}
        @keydown=${this._handleKeyDown}
        @pointerdown=${this._handlePointerDown}
      >
        <div class="wui-slider-progress"></div>
        <div class="wui-slider-marks">
          ${this._markValues.map(
            mark =>
              html`<span
                class="wui-slider-mark"
                style=${styleMap({ '--percent': `${((mark - this.min) / this._range) * 100}%` })}
              ></span>`
          )}
        </div>
        <div class=${thumbClass}></div>
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
    'web-ui-slider': WebUiSlider
  }
}
