import '@/components/icon'

import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import glass from '@/assets/glass.css?inline'
import { lucideMinus, lucidePlus } from '@/icons'
import {
  FormAssociated,
  defineFormAssociation,
  forwardInputValidity,
  FormAssociationController
} from '@/shared/form-association'
import { createFieldId } from '@/shared/form-association/field-id'
import { normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'

const decimalPlaces = (value: number): number => {
  const [numberText, exponent = '0'] = value.toString().toLowerCase().split('e')
  return Math.max(0, (numberText.split('.')[1]?.length ?? 0) - Number(exponent))
}

type LabelledbyRoot = Document | ShadowRoot

interface LabelledbyReferenceRegistration {
  ids: Set<string>
  onReferenceChange: () => void
  onStylesheetChange: () => void
}

interface LabelledbyRootObserver {
  observer: MutationObserver
  registrations: Set<LabelledbyReferenceRegistration>
  registrationsById: Map<string, Set<LabelledbyReferenceRegistration>>
  onStylesheetLoad: (event: Event) => void
  notifyStylesheetChange: () => void
}

const labelledbyRootObservers = new WeakMap<LabelledbyRoot, LabelledbyRootObserver>()

function nodeReferenceIds(node: Node): string[] {
  if (!(node instanceof Element)) return []
  const elements = [node, ...node.querySelectorAll('[id], label[for]')]
  return elements
    .flatMap(element => (element instanceof HTMLLabelElement ? [element.id, element.htmlFor] : [element.id]))
    .filter(Boolean)
}

function isStylesheetElement(element: Element): boolean {
  return (
    element instanceof HTMLStyleElement ||
    (element instanceof HTMLLinkElement && element.relList.contains('stylesheet'))
  )
}

function nodeContainsStylesheet(node: Node): boolean {
  return (
    (node instanceof Element && isStylesheetElement(node)) ||
    (node instanceof Element && node.querySelector('style, link[rel~="stylesheet"]') !== null)
  )
}

function observeLabelledbyReferences(
  root: LabelledbyRoot,
  ids: Set<string>,
  onReferenceChange: () => void,
  onStylesheetChange: () => void
): () => void {
  let shared = labelledbyRootObservers.get(root)

  if (!shared) {
    const registrations = new Set<LabelledbyReferenceRegistration>()
    const registrationsById = new Map<string, Set<LabelledbyReferenceRegistration>>()
    const notifyStylesheetChange = () => registrations.forEach(registration => registration.onStylesheetChange())
    const onStylesheetLoad = (event: Event) => {
      if (event.target instanceof HTMLLinkElement && event.target.relList.contains('stylesheet')) {
        notifyStylesheetChange()
      }
    }

    const observer = new MutationObserver(records => {
      const changedRegistrations = new Set<LabelledbyReferenceRegistration>()
      let stylesheetChanged = false
      const addRegistrationsForId = (id: string | null) => {
        if (!id) return
        registrationsById.get(id)?.forEach(registration => changedRegistrations.add(registration))
      }

      for (const record of records) {
        if (record.type === 'attributes') {
          const element = record.target as Element
          if (record.attributeName === 'id') {
            addRegistrationsForId(record.oldValue)
            addRegistrationsForId(element.id)
          } else if (record.attributeName === 'for' && element instanceof HTMLLabelElement) {
            addRegistrationsForId(record.oldValue)
            addRegistrationsForId(element.htmlFor)
          } else if (record.attributeName === 'aria-labelledby') {
            // 嵌套引用不一定自身有 id，变化后重算当前 root 的所有已注册命名链。
            registrations.forEach(registration => changedRegistrations.add(registration))
          } else if (['disabled', 'media'].includes(record.attributeName ?? '') && isStylesheetElement(element)) {
            stylesheetChanged = true
          }
        } else if (record.type === 'childList') {
          if (record.target instanceof HTMLStyleElement || record.target instanceof HTMLLinkElement) {
            stylesheetChanged = true
          }
          for (const node of [...record.addedNodes, ...record.removedNodes]) {
            if (nodeContainsStylesheet(node)) stylesheetChanged = true
            for (const id of nodeReferenceIds(node)) addRegistrationsForId(id)
          }
        }
      }

      if (stylesheetChanged) notifyStylesheetChange()
      changedRegistrations.forEach(registration => registration.onReferenceChange())
    })

    shared = {
      observer,
      registrations,
      registrationsById,
      onStylesheetLoad,
      notifyStylesheetChange
    }
    labelledbyRootObservers.set(root, shared)
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['id', 'for', 'aria-labelledby', 'disabled', 'media'],
      attributeOldValue: true
    })
    root.addEventListener('load', onStylesheetLoad, true)
  }

  const registration: LabelledbyReferenceRegistration = {
    ids: new Set(ids),
    onReferenceChange,
    onStylesheetChange
  }
  shared.registrations.add(registration)
  for (const id of registration.ids) {
    const registrations = shared.registrationsById.get(id) ?? new Set()
    registrations.add(registration)
    shared.registrationsById.set(id, registrations)
  }

  return () => {
    if (!shared?.registrations.delete(registration)) return
    for (const id of registration.ids) {
      const registrations = shared.registrationsById.get(id)
      registrations?.delete(registration)
      if (registrations?.size === 0) shared.registrationsById.delete(id)
    }
    if (shared.registrations.size === 0) {
      shared.observer.disconnect()
      root.removeEventListener('load', shared.onStylesheetLoad, true)
      labelledbyRootObservers.delete(root)
    }
  }
}

@customElement('web-ui-input-number')
export class WebUiInputNumber extends FormAssociated(LitElement) {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) readonly = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null
  @property({ type: String, attribute: 'aria-labelledby' }) ariaLabelledby: string | undefined
  @property({ type: Number })
  get precision(): number {
    return this._precision
  }
  // 精度只影响读取（get value）/提交时的规整，不在赋值时抹掉原始小数：
  // `<web-ui-input-number value="1.5" precision="2">` 先跑 value setter、
  // 后跑 precision setter，若赋值时就按当时的默认精度 0 取整，1.5 会先变 2，
  // 之后再声明 precision=2 也恢复不了。
  set precision(v: number | null) {
    const old = this._precision
    const wasExplicitlySet = this._precisionWasSet
    this._precision = v ?? 0
    this._precisionWasSet = v !== null

    if (v === null) {
      if (this.hasAttribute('precision')) this.removeAttribute('precision')
    } else if (this.getAttribute('precision') !== String(v)) {
      this.setAttribute('precision', String(v))
    }

    if (old !== this._precision || wasExplicitlySet !== this._precisionWasSet) this.requestUpdate()
  }

  /** 原始值：只做 min/max 收敛，不按精度取整（取整发生在 get value）。 */
  @state() private _value = 0

  /**
   * 编辑中的原始文本。null 表示非编辑态，显示由 `value` 派生；
   * 非 null 时显示原文，避免把用户正在输入的 "1." / "0.10" 立刻改写。
   */
  @state() private _draft: string | null = null
  @state() private _min = 0
  @state() private _max = Infinity
  @state() private _step = 1
  @state() private _focused = false
  private _precision = 0
  private _precisionWasSet = false
  private readonly _fieldId = createFieldId('web-ui-input-number')
  private _labelledbyObserver: MutationObserver | null = null
  private _releaseLabelledbyReferences: (() => void) | null = null
  private _labelledbyAncestorObserver: MutationObserver | null = null
  private _observedLabelledbyRoot: Node | null = null
  private _observedLabelledbyReferenceIds = ''
  private _observedLabelledbyTargets: Element[] = []
  private _observedLabelledbyMutationTargets: Element[] = []
  private _observedLabelledbyValueControls: Element[] = []
  private _observedLabelledbyAncestors: Element[] = []
  private _observedLabelledbyText = ''
  private _observedLabelledbyWindow: Window | null = null
  private readonly _onLabelledbyViewportChange = () => this.requestUpdate()
  private readonly _onLabelledbyValueChange = () => {
    if (this._getLabelledbyText() !== this._observedLabelledbyText) this.requestUpdate()
  }

  private get _supportsLabelledbyElements(): boolean {
    return typeof Element !== 'undefined' && 'ariaLabelledByElements' in Element.prototype
  }

  private _getLabelledbyIds(idRefs: string | null | undefined = this.ariaLabelledby): string[] {
    const normalizedIdRefs = idRefs?.trim()
    return normalizedIdRefs ? normalizedIdRefs.split(/\s+/).filter(Boolean) : []
  }

  private _getLabelledbyTargets(
    root: Document | ShadowRoot | null = null,
    idRefs: string | null | undefined = this.ariaLabelledby
  ): Element[] {
    const scope = root ?? this.getRootNode()
    if (!(scope instanceof Document || scope instanceof ShadowRoot)) return []

    return this._getLabelledbyIds(idRefs)
      .map(id => {
        const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id
        return scope.querySelector(`#${escapedId}`)
      })
      .filter((element): element is Element => element !== null)
  }

  private _getLabelledbyValueControls(targets: Element[]): Element[] {
    const controls = new Set<Element>()
    for (const target of targets) {
      if (target.matches('input, textarea, select')) controls.add(target)
      target.querySelectorAll('input, textarea, select').forEach(control => controls.add(control))
    }
    return [...controls]
  }

  private _getObservedLabelledbyReferences(root: Document | ShadowRoot | null): {
    ids: Set<string>
    targets: Element[]
  } {
    const ids = new Set(this._getLabelledbyIds())
    const targets = root ? [...new Set(this._getLabelledbyTargets(root))] : []
    const targetSet = new Set(targets)
    const visited = new Set<Element>()
    const visitNestedReferences = (element: Element) => {
      if (visited.has(element)) return
      visited.add(element)

      const elementRoot = element.getRootNode()
      if (!(elementRoot instanceof Document || elementRoot instanceof ShadowRoot)) return

      for (const id of this._getLabelledbyIds(element.getAttribute('aria-labelledby'))) {
        ids.add(id)
        const target = elementRoot.getElementById(id)
        if (target && !targetSet.has(target)) {
          targetSet.add(target)
          targets.push(target)
        }
        if (target) visitNestedReferences(target)
      }

      element.querySelectorAll('[aria-labelledby]').forEach(visitNestedReferences)
    }

    targets.forEach(visitNestedReferences)

    return {
      ids,
      targets
    }
  }

  private _isLabelledbyElementHidden(element: Element): boolean {
    const visibility = getComputedStyle(element).visibility
    if (visibility === 'hidden' || visibility === 'collapse') return true

    let current: Element | null = element
    while (current) {
      const style = getComputedStyle(current)
      if (
        current.getAttribute('aria-hidden') === 'true' ||
        current.hasAttribute('hidden') ||
        style.display === 'none'
      ) {
        return true
      }

      if (current.parentElement) {
        current = current.parentElement
      } else {
        const root = current.getRootNode()
        current = root instanceof ShadowRoot ? root.host : null
      }
    }
    return false
  }

  private _getLabelledbyElementText(
    element: Element,
    includeHidden = false,
    embeddedControlValue = false,
    visited = new Set<Element>()
  ): string {
    if (visited.has(element)) return ''
    if (!includeHidden && this._isLabelledbyElementHidden(element)) return ''
    const nextVisited = new Set(visited)
    nextVisited.add(element)

    const labelledBy = element.getAttribute('aria-labelledby')?.trim()
    if (labelledBy) {
      const root = element.getRootNode()
      const scope = root instanceof Document || root instanceof ShadowRoot ? root : element.ownerDocument
      const referencedText = labelledBy
        .split(/\s+/)
        .map(id => scope.getElementById(id))
        .filter((reference): reference is HTMLElement => reference !== null)
        .map(reference => this._getLabelledbyElementText(reference, true, false, nextVisited))
        .filter(Boolean)
        .join(' ')
      if (referencedText) return referencedText
    }

    const ariaLabel = element.getAttribute('aria-label')?.trim()
    if (ariaLabel) return ariaLabel

    if (
      element instanceof HTMLImageElement ||
      element instanceof HTMLAreaElement ||
      (element instanceof HTMLInputElement && element.type === 'image')
    ) {
      const alt = element.getAttribute('alt')
      if (alt !== null) return alt.trim()
    }

    if (element instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(element.type)) {
      const value = element.value.trim()
      if (value) return value
    }

    if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) {
      if (embeddedControlValue) return element.checked ? 'on' : 'off'
      const labels = Array.from(element.labels ?? [])
      if (labels.length > 0) {
        return labels
          .map(label => this._getLabelledbyElementText(label, includeHidden, false, nextVisited))
          .filter(Boolean)
          .join(' ')
      }
      return element.getAttribute('title')?.trim() ?? ''
    }

    if (element instanceof HTMLInputElement && element.type !== 'hidden') {
      if (embeddedControlValue) {
        const value = element.value.trim()
        if (value) return value
      }
      const labels = Array.from(element.labels ?? [])
      if (labels.length > 0) {
        return labels
          .map(label => this._getLabelledbyElementText(label, includeHidden, false, nextVisited))
          .filter(Boolean)
          .join(' ')
      }
    }

    if (element instanceof HTMLTextAreaElement) {
      if (embeddedControlValue) {
        const value = element.value.trim()
        if (value) return value
      }
      const labels = Array.from(element.labels ?? [])
      if (labels.length > 0) {
        return labels
          .map(label => this._getLabelledbyElementText(label, includeHidden, false, nextVisited))
          .filter(Boolean)
          .join(' ')
      }
    }

    if (element instanceof HTMLSelectElement) {
      if (!embeddedControlValue) {
        const labels = Array.from(element.labels ?? [])
        if (labels.length > 0) {
          return labels
            .map(label => this._getLabelledbyElementText(label, includeHidden, false, nextVisited))
            .filter(Boolean)
            .join(' ')
        }
        return element.getAttribute('title')?.trim() ?? ''
      }

      const selectedOptions = Array.from(element.selectedOptions)
        .map(option => option.label.trim() || option.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ')
      if (selectedOptions) return selectedOptions
    }

    const text = Array.from(element.childNodes)
      .map(node => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
        if (!(node instanceof Element)) return ''
        const isControl =
          node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement
        return this._getLabelledbyElementText(node, includeHidden, isControl, nextVisited)
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    return text || element.getAttribute('title')?.trim() || ''
  }

  private _getLabelledbyText(): string {
    return this._getLabelledbyTargets()
      .map(element => this._getLabelledbyElementText(element, this._isLabelledbyElementHidden(element)))
      .filter(Boolean)
      .join(' ')
  }

  private _getLabelledbyAncestors(targets: Element[]): Element[] {
    const ancestors = new Set<Element>()
    for (const target of targets) {
      let current: Element | null = target
      while (current) {
        ancestors.add(current)
        if (current.parentElement) {
          current = current.parentElement
        } else {
          const root = current.getRootNode()
          current = root instanceof ShadowRoot ? root.host : null
        }
      }
    }
    return [...ancestors]
  }

  private _syncLabelledbyObserver() {
    const root = this.getRootNode()
    const scope = root instanceof Document || root instanceof ShadowRoot ? root : null
    const references = this._getObservedLabelledbyReferences(scope)
    const referenceIds = [...references.ids].join('\u0000')
    const targets = references.targets
    const valueControls = this._getLabelledbyValueControls(targets)
    const mutationTargets = new Set(targets)
    for (const control of valueControls) {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement
      ) {
        Array.from(control.labels ?? []).forEach(label => mutationTargets.add(label))
      }
    }
    const observedTargets = [...mutationTargets]
    const ancestors = this._getLabelledbyAncestors(observedTargets)
    const sameMutationTargets =
      observedTargets.length === this._observedLabelledbyMutationTargets.length &&
      observedTargets.every((target, index) => target === this._observedLabelledbyMutationTargets[index])
    const sameValueControls =
      valueControls.length === this._observedLabelledbyValueControls.length &&
      valueControls.every((control, index) => control === this._observedLabelledbyValueControls[index])
    const sameAncestors =
      ancestors.length === this._observedLabelledbyAncestors.length &&
      ancestors.every((ancestor, index) => ancestor === this._observedLabelledbyAncestors[index])
    const rootChanged = root !== this._observedLabelledbyRoot
    const nextWindow = this.ariaLabelledby && this.isConnected ? this.ownerDocument.defaultView : null

    if (nextWindow !== this._observedLabelledbyWindow) {
      this._observedLabelledbyWindow?.removeEventListener('resize', this._onLabelledbyViewportChange)
      this._observedLabelledbyWindow = nextWindow
      this._observedLabelledbyWindow?.addEventListener('resize', this._onLabelledbyViewportChange)
    }

    if (rootChanged || referenceIds !== this._observedLabelledbyReferenceIds) {
      this._releaseLabelledbyReferences?.()
      this._releaseLabelledbyReferences = null
      this._observedLabelledbyRoot = root
      this._observedLabelledbyReferenceIds = referenceIds

      if (this.isConnected && scope && references.ids.size > 0) {
        this._releaseLabelledbyReferences = observeLabelledbyReferences(
          scope,
          references.ids,
          () => this.requestUpdate(),
          () => {
            if (this._getLabelledbyText() !== this._observedLabelledbyText) this.requestUpdate()
          }
        )
      }
    }

    if (rootChanged || !sameMutationTargets) {
      this._labelledbyObserver?.disconnect()
      this._observedLabelledbyTargets = targets
      this._observedLabelledbyMutationTargets = observedTargets

      if (this.isConnected && observedTargets.length > 0) {
        this._labelledbyObserver = new MutationObserver(() => {
          const currentValueControls = this._getLabelledbyValueControls(this._observedLabelledbyTargets)
          const controlsChanged =
            currentValueControls.length !== this._observedLabelledbyValueControls.length ||
            currentValueControls.some((control, index) => control !== this._observedLabelledbyValueControls[index])
          if (controlsChanged || this._getLabelledbyText() !== this._observedLabelledbyText) this.requestUpdate()
        })

        for (const target of observedTargets) {
          // button/submit/reset 的 value IDL 在 default mode，property 赋值会反射到 value attribute。
          this._labelledbyObserver.observe(target, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['aria-label', 'alt', 'value', 'title', 'type', 'aria-hidden', 'hidden', 'class', 'style']
          })
        }
      }
    }

    if (rootChanged || !sameValueControls) {
      this._observedLabelledbyValueControls.forEach(control => {
        control.removeEventListener('input', this._onLabelledbyValueChange)
        control.removeEventListener('change', this._onLabelledbyValueChange)
      })
      this._observedLabelledbyValueControls = valueControls
      if (this.isConnected) {
        valueControls.forEach(control => {
          control.addEventListener('input', this._onLabelledbyValueChange)
          control.addEventListener('change', this._onLabelledbyValueChange)
        })
      }
    }

    if (rootChanged || !sameAncestors) {
      this._labelledbyAncestorObserver?.disconnect()
      this._observedLabelledbyAncestors = ancestors

      if (this.isConnected && ancestors.length > 0) {
        this._labelledbyAncestorObserver = new MutationObserver(() => {
          if (this._getLabelledbyText() !== this._observedLabelledbyText) this.requestUpdate()
        })
        for (const ancestor of ancestors) {
          this._labelledbyAncestorObserver.observe(ancestor, {
            attributes: true,
            attributeFilter: ['aria-hidden', 'hidden', 'class', 'style']
          })
        }
      }
    }

    this._observedLabelledbyText = this._getLabelledbyText()
  }

  @property({ type: Number, reflect: true })
  get value(): number {
    return this.clamp(this.round(this._value))
  }

  set value(v: number) {
    const next = this.clamp(v)
    const old = this._value
    this._value = next
    this._formAssociation.sync()
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  @property({ type: Number, reflect: true })
  get min(): number {
    return this._min
  }

  set min(v: unknown) {
    this._min = normalizeNumber(v, -Infinity, Infinity, 0)
  }

  @property({ type: Number, reflect: true })
  get max(): number {
    return this._max
  }

  set max(v: unknown) {
    this._max = normalizeNumber(v, -Infinity, Infinity, Infinity)
  }

  @property({ type: Number, reflect: true })
  get step(): number {
    return this._step
  }

  // 默认 precision 未显式设置时，读取精度会跟随 step 的小数位数。
  set step(v: unknown) {
    this._step = normalizeNumber(v, 0, Infinity, 1)
  }

  private get _effectiveStep(): number {
    return this._step
  }

  private get _effectivePrecision(): number {
    return this._precisionWasSet ? this._precision : Math.max(this._precision, decimalPlaces(this._step))
  }

  private get atMin(): boolean {
    return this.value <= this._min
  }

  private get atMax(): boolean {
    return this.value >= this._max
  }

  private readonly _formAssociation = defineFormAssociation<number>({
    host: this,
    getState: () => this.value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => String(this.value),
    getFormState: () => String(this.value),
    restoreState: state => {
      if (typeof state !== 'string') return
      const value = Number(state)
      if (Number.isFinite(value)) this.value = value
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  override connectedCallback() {
    super.connectedCallback()
    this.requestUpdate()
  }

  override formDisabledCallback(disabled: boolean) {
    super.formDisabledCallback(disabled)
    this.toggleAttribute('data-form-disabled', disabled)
  }

  override updated() {
    this._syncLabelledbyObserver()
    if (this._supportsLabelledbyElements) {
      const input = this.shadowRoot?.querySelector('input')
      // 用元素引用跨过 ShadowRoot，让浏览器按当前文本与样式计算名称；字符串回退兼容旧浏览器。
      if (input) input.ariaLabelledByElements = this._getLabelledbyTargets()
    }
    this._syncValidity()
    this.toggleAttribute('focused', this._focused)
  }

  override disconnectedCallback() {
    this._labelledbyObserver?.disconnect()
    this._releaseLabelledbyReferences?.()
    this._labelledbyAncestorObserver?.disconnect()
    this._labelledbyObserver = null
    this._releaseLabelledbyReferences = null
    this._labelledbyAncestorObserver = null
    this._observedLabelledbyWindow?.removeEventListener('resize', this._onLabelledbyViewportChange)
    this._observedLabelledbyWindow = null
    this._observedLabelledbyRoot = null
    this._observedLabelledbyReferenceIds = ''
    this._observedLabelledbyTargets = []
    this._observedLabelledbyMutationTargets = []
    this._observedLabelledbyValueControls.forEach(control => {
      control.removeEventListener('input', this._onLabelledbyValueChange)
      control.removeEventListener('change', this._onLabelledbyValueChange)
    })
    this._observedLabelledbyValueControls = []
    this._observedLabelledbyAncestors = []
    this._observedLabelledbyText = ''
    super.disconnectedCallback()
  }

  private _syncValidity() {
    const input = this.shadowRoot?.querySelector('input')
    const internals = this._formAssociation.getInternals()
    if (!internals || !input || typeof internals.setValidity !== 'function') return
    forwardInputValidity(internals, input, ['valueMissing', 'rangeUnderflow', 'rangeOverflow'], this._isDisabled)
  }

  private clamp(v: number): number {
    return Math.min(this._max, Math.max(this._min, v))
  }

  private round(v: number): number {
    const f = 10 ** this._effectivePrecision
    if (!Number.isFinite(f) || f === 0) return v
    if (Math.abs(v) > Number.MAX_SAFE_INTEGER / f) return v
    const scaled = v * f
    if (!Number.isFinite(scaled)) return v
    return Math.round(scaled) / f
  }

  private setValueAndNotify(v: number) {
    this._draft = null
    this.value = this.clamp(this.round(v))
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private handleStep(direction: 1 | -1) {
    if (this._isDisabled || this.readonly) return
    this.setValueAndNotify(this.value + direction * this._effectiveStep)
  }

  // 输入过程只更新草稿与可解析的原始值，显示保持在草稿上：
  // 逐字把 "1." 规整成 "1" 会打断输入（与原生 number input 的编辑体验一致）。
  private handleInput(e: Event) {
    if (this.readonly) return
    if (!(e.target instanceof HTMLInputElement)) return
    const raw = e.target.value
    this._draft = raw
    const parsed = raw === '' || raw === '-' ? Number.NaN : Number(raw)
    if (Number.isFinite(parsed)) {
      this._value = this.clamp(parsed)
      this._formAssociation.sync()
    }
    this._syncValidity()
  }

  // 原生 change 不 composed，被 shadow root 挡住；文本失焦提交时补发 composed 事件，
  // 与 ArrowUp/ArrowDown 的 change 行为对齐。
  // 提交点上做规整：非法/空草稿回填已提交值（value 不变、不派发 change），
  // 合法草稿写入 value 后由 get value 按精度规整。
  private handleNativeChange(e: Event) {
    if (this.readonly) return
    if (!(e.target instanceof HTMLInputElement)) return
    const raw = e.target.value
    this._draft = null
    const parsed = raw === '' || raw === '-' ? Number.NaN : Number(raw)
    if (!Number.isFinite(parsed)) {
      // 回填：草稿清空后显示重新由 value 派生
      this.requestUpdate()
      this._syncValidity()
      return
    }
    this._value = this.clamp(parsed)
    this._formAssociation.sync()
    this._syncValidity()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handleKeydown(e: KeyboardEvent) {
    if (this._isDisabled || this.readonly) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.setValueAndNotify(this.value + this._effectiveStep)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.setValueAndNotify(this.value - this._effectiveStep)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
  }

  private handleFocus() {
    if (!this._isDisabled) this._focused = true
  }

  private handleBlur() {
    this._focused = false
    // change 的时序在部分平台晚于 blur；草稿仍存在说明还没提交，直接回填，
    // 避免「显示空、value 仍是旧值」的持久脱同步。
    if (this._draft !== null) {
      this._draft = null
      this.requestUpdate()
    }
  }

  override render() {
    // step 是相对当前值的增减幅度，不要求值落在原生 input 以 min 为基准的 step 网格上。
    return html`
      <div class="wui-glass wui-input-inner">
        <button
          class="num-btn"
          aria-label="Decrease"
          ?disabled=${this._isDisabled || this.readonly || this.atMin}
          @click=${() => this.handleStep(-1)}
        >
          <web-ui-icon .icon=${lucideMinus}></web-ui-icon>
        </button>
        <input
          id=${this._fieldId}
          type="number"
          step="any"
          placeholder=${this.placeholder}
          name=${this.name}
          aria-label=${ifDefined(this._getLabelledbyText() || this.ariaLabel)}
          aria-labelledby=${ifDefined(this.ariaLabelledby)}
          .value=${this._draft ?? String(this.value)}
          ?disabled=${this._isDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.handleInput}
          @change=${this.handleNativeChange}
          @keydown=${this.handleKeydown}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
        />
        <button
          class="num-btn"
          aria-label="Increase"
          ?disabled=${this._isDisabled || this.readonly || this.atMax}
          @click=${() => this.handleStep(1)}
        >
          <web-ui-icon .icon=${lucidePlus}></web-ui-icon>
        </button>
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
    'web-ui-input-number': WebUiInputNumber
  }
}
