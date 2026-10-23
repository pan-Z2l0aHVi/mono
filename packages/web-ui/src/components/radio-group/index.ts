import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { defineGroupCoordinator, GroupController } from '@/shared/group-management'
import { normalizeLiteral } from '@/shared/normalize'

import type { WebUiRadio } from '../radio'
import { activateRadio, focusRadio, isRadioDisabled } from '../radio/interaction'

import style from './style.css?inline'

const ALLOWED_DIRECTIONS = ['horizontal', 'vertical'] as const
const AVAILABILITY_ATTRIBUTES = ['hidden', 'inert', 'aria-hidden', 'style', 'class', 'open'] as const

interface DocumentAvailabilityObserver {
  readonly subscribers: Set<() => void>
  readonly mediaQueries: Map<string, MediaQueryList>
  readonly observer: MutationObserver
  readonly view: Window
  readonly notify: () => void
  readonly refreshMediaQueries: () => void
}

const documentAvailabilityObservers = new WeakMap<Document, DocumentAvailabilityObserver>()

function subscribeToDocumentAvailability(document: Document, callback: () => void): () => void {
  const view = document.defaultView
  if (!view) return () => {}

  let state = documentAvailabilityObservers.get(document)
  if (!state) {
    const subscribers = new Set<() => void>()
    const mediaQueries = new Map<string, MediaQueryList>()
    const notify = () => subscribers.forEach(subscriber => subscriber())
    const subscribeMediaQuery = (query: string) => {
      const normalized = query.trim()
      if (!normalized || normalized === 'all' || mediaQueries.has(normalized)) return
      try {
        const mediaQuery = view.matchMedia(normalized)
        mediaQuery.addEventListener('change', notify)
        mediaQueries.set(normalized, mediaQuery)
      } catch {
        // Invalid or unsupported media syntax cannot change computed visibility.
      }
    }
    const scanRules = (rules: CSSRuleList, visited = new Set<CSSStyleSheet>()) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule) subscribeMediaQuery(rule.conditionText)
        if (rule instanceof CSSImportRule && rule.styleSheet && !visited.has(rule.styleSheet)) {
          visited.add(rule.styleSheet)
          subscribeMediaQuery(rule.media.mediaText)
          try {
            scanRules(rule.styleSheet.cssRules, visited)
          } catch {
            // Cross-origin stylesheets may hide their rules from the current document.
          }
        }
        if ('cssRules' in rule) {
          try {
            scanRules((rule as CSSGroupingRule).cssRules, visited)
          } catch {
            // Some grouping rules expose inaccessible imported rules.
          }
        }
      }
    }
    const refreshMediaQueries = () => {
      for (const mediaQuery of mediaQueries.values()) mediaQuery.removeEventListener('change', notify)
      mediaQueries.clear()
      for (const styleSheet of Array.from(document.styleSheets)) {
        subscribeMediaQuery(styleSheet.media.mediaText)
        try {
          scanRules(styleSheet.cssRules, new Set([styleSheet]))
        } catch {
          // Cross-origin stylesheets may hide their rules from the current document.
        }
      }
    }
    const observer = new MutationObserver(() => {
      refreshMediaQueries()
      notify()
    })
    const styleRoot = document.head ?? document.documentElement
    observer.observe(styleRoot, { attributes: true, childList: true, characterData: true, subtree: true })
    view.addEventListener('resize', notify)
    state = { subscribers, mediaQueries, observer, view, notify, refreshMediaQueries }
    documentAvailabilityObservers.set(document, state)
    refreshMediaQueries()
  }

  state.subscribers.add(callback)
  return () => {
    const current = documentAvailabilityObservers.get(document)
    if (!current) return
    current.subscribers.delete(callback)
    if (current.subscribers.size > 0) return
    current.observer.disconnect()
    current.view.removeEventListener('resize', current.notify)
    for (const mediaQuery of current.mediaQueries.values()) mediaQuery.removeEventListener('change', current.notify)
    current.mediaQueries.clear()
    documentAvailabilityObservers.delete(document)
  }
}

@customElement('web-ui-radio-group')
export class WebUiRadioGroup extends FormAssociated(LitElement) {
  static override styles = unsafeCSS(style)
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: String, attribute: 'aria-label', reflect: true }) override ariaLabel: string | null = null
  @property({ type: String, attribute: 'aria-labelledby', reflect: true }) ariaLabelledby: string | undefined

  @property({ type: String, reflect: true })
  get direction(): 'horizontal' | 'vertical' {
    return this._direction
  }
  set direction(v: string) {
    const old = this._direction
    this._direction = normalizeLiteral(v, ALLOWED_DIRECTIONS, 'vertical')
    this.requestUpdate('direction', old)
  }
  private _direction: 'horizontal' | 'vertical' = 'vertical'

  @state() private _value = ''

  private _getRadios(): WebUiRadio[] {
    return [...this.querySelectorAll<WebUiRadio>('web-ui-radio')].filter(
      radio => radio.closest('web-ui-radio-group') === this
    )
  }

  private _findSelectedRadio(radios: readonly WebUiRadio[], value: string): WebUiRadio | undefined {
    if (!value) return undefined
    const matching = radios.filter(radio => radio.value === value)
    return matching.find(radio => radio.checked) ?? matching[0]
  }

  private _getRovingTabStop(radio: WebUiRadio, radios: readonly WebUiRadio[], value: string): boolean {
    if (this._isDisabled || this._isRadioUnavailable(radio)) return false
    const enabled = radios.filter(item => !this._isRadioUnavailable(item))
    const selected = enabled.find(item => item.checked) ?? this._findSelectedRadio(enabled, value)
    return radio === (selected ?? enabled[0])
  }

  private _handleKeyDown(event: KeyboardEvent) {
    if (this._isDisabled || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    const target = event
      .composedPath()
      .find((node): node is WebUiRadio => node instanceof HTMLElement && node.matches('web-ui-radio'))
    if (!target || target.closest('web-ui-radio-group') !== this) return

    const radios = this._getRadios()
    const targetIndex = radios.indexOf(target)
    if (targetIndex < 0) return

    const enabledRadios = radios.filter(radio => !this._isRadioUnavailable(radio))
    if (enabledRadios.length === 0) return
    const currentIndex = enabledRadios.indexOf(target)

    const horizontalArrow = event.key === 'ArrowRight' || event.key === 'ArrowLeft'
    let delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') delta = -1
    if (delta && horizontalArrow && this.direction === 'horizontal' && getComputedStyle(this).direction === 'rtl') {
      delta *= -1
    }
    let nextRadio: WebUiRadio | undefined
    if (delta) {
      if (currentIndex >= 0) {
        nextRadio = enabledRadios[(currentIndex + delta + enabledRadios.length) % enabledRadios.length]
      } else {
        for (let step = 1; step <= radios.length; step++) {
          const candidateIndex = (((targetIndex + delta * step) % radios.length) + radios.length) % radios.length
          const candidate = radios[candidateIndex]
          if (candidate && !this._isRadioUnavailable(candidate)) {
            nextRadio = candidate
            break
          }
        }
      }
    } else if (event.key === 'Home') {
      nextRadio = enabledRadios[0]
    } else if (event.key === 'End') {
      nextRadio = enabledRadios[enabledRadios.length - 1]
    } else {
      return
    }

    if (!nextRadio) return
    event.preventDefault()
    focusRadio(nextRadio)
    if (!nextRadio.checked) activateRadio(nextRadio)
  }

  private readonly _groupController = new GroupController(
    this,
    defineGroupCoordinator<WebUiRadio, string>({
      host: this,
      getItems: () => this._getRadios(),
      getValue: () => this._value,
      setValue: value => {
        this.value = value
      },
      getDisabled: () => this._isDisabled,
      isItem: (target): target is WebUiRadio =>
        target instanceof HTMLElement &&
        target.matches('web-ui-radio') &&
        target.closest('web-ui-radio-group') === this,
      // 选中判定按元素身份而非 value 相等：value 重复时按值比较会把多个成员
      // 同时标为选中，破坏单选不变式。重复值取第一个匹配（或已选中的那个，
      // 避免每次 sync 把选中项跳回第一个）。
      isItemSelected: (radio, value) => radio === this._findSelectedRadio(this._getRadios(), value),
      getItemSelected: radio => radio.checked,
      getNextValue: (radio, value) => (radio.checked ? radio.value : value),
      valuesEqual: (a, b) => a === b,
      copyValue: value => value,
      setItemSelected: (radio, selected) => {
        radio.checked = selected
      },
      getRovingTabStop: (radio, _index, radios, value) => this._getRovingTabStop(radio, radios, value),
      handleKeyDown: event => this._handleKeyDown(event),
      // 点击同值成员时 value 不变，仍需把选中态收到被点击的那一项
      resyncOnUnchangedValue: clicked => {
        for (const radio of this._getRadios()) {
          radio.checked = radio === clicked
        }
        this._groupController.sync()
      },
      dispatchValueChange: () => {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
    }).make(),
    // 每次成员集合同步后把组值剪到现存成员范围内
    {
      observeAttributes: ['disabled', ...AVAILABILITY_ATTRIBUTES],
      afterSync: () => this._pruneRemovedMembers()
    }
  )

  /**
   * 成员被移除后，组值若仍指向它就成了幽灵值（表单照旧提交一个不存在的 option）。
   * 剪枝条件是「曾经出现在成员里、现在消失了」——不能用「不在现存成员里就剪」，
   * 否则 v-if / 异步渲染时先于成员到达的合法组值会被误清。
   */
  private _knownMemberValues = new Set<string>()
  private _availabilityObserver: MutationObserver | null = null
  private _unsubscribeDocumentAvailability: (() => void) | null = null

  private _getComposedAncestors(element: Element): Element[] {
    const ancestors: Element[] = []
    const visited = new Set<Element>()
    let current: Element | null = element

    while (current && !visited.has(current)) {
      visited.add(current)
      ancestors.push(current)
      const root = current.getRootNode()
      current = current.assignedSlot ?? current.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
    }

    return ancestors
  }

  private _pruneRemovedMembers() {
    if (!this._value) return
    const items = this._getRadios()
    if (items.length === 0) return
    const alive = new Set(items.map(item => item.value))
    if (!alive.has(this._value) && this._knownMemberValues.has(this._value)) this.value = ''
    this._knownMemberValues = alive
  }

  get value(): string {
    return this._value
  }

  set value(v: string) {
    const old = this._value
    this._value = v
    this._formAssociation.sync()
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  private readonly _formAssociation = defineFormAssociation<string>({
    host: this,
    initialize: () => {
      const attributeValue = this.getAttribute('value')
      if (attributeValue !== null) this.value = attributeValue
    },
    getState: () => this._value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => (this.name && this._value ? this._value : null),
    getFormState: () => this._value,
    restoreState: state => {
      if (typeof state === 'string') this.value = state
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  override connectedCallback() {
    this._syncHostSemantics()
    this._observeAvailabilityAncestors()
    this._unsubscribeDocumentAvailability?.()
    this._unsubscribeDocumentAvailability = subscribeToDocumentAvailability(this.ownerDocument, () =>
      this._groupController.sync()
    )
    super.connectedCallback()
  }

  override disconnectedCallback() {
    this._availabilityObserver?.disconnect()
    this._availabilityObserver = null
    this._unsubscribeDocumentAvailability?.()
    this._unsubscribeDocumentAvailability = null
    super.disconnectedCallback()
  }

  override updated() {
    this._syncHostSemantics()
  }

  private _syncHostSemantics() {
    this.setAttribute('role', 'radiogroup')
    this.setAttribute('aria-orientation', this.direction)
    this.setAttribute('aria-disabled', String(this._isDisabled))
    this.setAttribute('aria-required', String(this.required))
  }

  private _isRadioUnavailable(radio: WebUiRadio) {
    if (isRadioDisabled(radio) || radio.matches(':disabled')) return true

    const ancestors = this._getComposedAncestors(radio)
    if (
      ancestors.some(
        element =>
          element.hasAttribute('hidden') ||
          element.hasAttribute('inert') ||
          element.getAttribute('aria-hidden')?.toLowerCase() === 'true' ||
          (element.localName === 'details' &&
            !element.hasAttribute('open') &&
            ![...element.children].find(child => child.localName === 'summary')?.contains(radio))
      )
    )
      return true

    const view = radio.ownerDocument.defaultView
    if (!view) return false
    const radioVisibility = view.getComputedStyle(radio).visibility
    if (radioVisibility === 'hidden' || radioVisibility === 'collapse') return true

    for (const element of ancestors) {
      const style = view.getComputedStyle(element)
      if (style.display === 'none' || style.getPropertyValue('content-visibility') === 'hidden') {
        return true
      }
    }
    return false
  }

  private _observeAvailabilityAncestors() {
    this._availabilityObserver?.disconnect()
    this._availabilityObserver = null

    const ancestors = this._getComposedAncestors(this).slice(1)
    if (ancestors.length === 0) return

    this._availabilityObserver = new MutationObserver(() => this._groupController.sync())
    for (const ancestor of ancestors) {
      this._availabilityObserver.observe(ancestor, {
        attributes: true,
        attributeFilter: [...AVAILABILITY_ATTRIBUTES]
      })
    }
  }

  override formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
    this._groupController.sync()
  }

  private _syncValidity() {
    const internals = this._formAssociation.getInternals()
    if (!internals || typeof internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this._value) {
      internals.setValidity({})
      return
    }
    internals.setValidity({ valueMissing: true }, 'Select an option')
  }

  override render() {
    return html`<div class="wui-radio-group"><slot></slot></div>`
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-radio-group': WebUiRadioGroup
  }
}
