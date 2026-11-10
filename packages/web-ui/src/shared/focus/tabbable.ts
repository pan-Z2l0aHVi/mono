const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]'
].join(',')

function isInert(element: Element): boolean {
  let current: Element | null = element
  while (current) {
    if (current.hasAttribute('inert')) return true
    const root = current.getRootNode()
    current = current.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
  }
  return false
}

function isTabbable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false
  if (element.matches(':disabled')) return false
  if (element.hidden) return false
  if (isInert(element)) return false
  if (element.getClientRects().length === 0) return false
  if (element.closest('details:not([open])') && element.tagName !== 'SUMMARY') return false
  const style = getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

/**
 * 按 flat tree（含 slot 分配与 open shadow root）收集可 Tab 聚焦元素。
 * 自定义元素宿主本身通常不可聚焦，真正进入 Tab 序的是其 shadow 内的原生控件。
 */
export function getTabbables(root: ParentNode): HTMLElement[] {
  const tabbables: HTMLElement[] = []

  const visitChildren = (parent: ParentNode) => {
    for (const child of parent.children) {
      if (typeof HTMLSlotElement !== 'undefined' && child instanceof HTMLSlotElement) {
        const assigned = child.assignedElements({ flatten: true })
        if (assigned.length > 0) {
          for (const element of assigned) visitElement(element)
        } else {
          visitChildren(child)
        }
        continue
      }
      visitElement(child)
    }
  }

  const visitElement = (element: Element) => {
    if (!(element instanceof HTMLElement)) return
    if (isTabbable(element)) tabbables.push(element)
    visitChildren(element.shadowRoot ?? element)
  }

  visitChildren(root)
  // 原生 Tab 对同名 radio 只停在选中项（无选中项时停在首项）。
  const ordered = tabbables.filter(element => {
    if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) return true
    const group = tabbables.filter(
      candidate =>
        candidate instanceof HTMLInputElement &&
        candidate.type === 'radio' &&
        candidate.name === element.name &&
        candidate.form === element.form &&
        candidate.getRootNode() === element.getRootNode()
    ) as HTMLInputElement[]
    return element === (group.find(candidate => candidate.checked) ?? group[0])
  })
  // HTML 的正 tabindex 先于零值，且按值递增；同值保留 flat tree 顺序。
  return ordered.sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity))
}

/** 深入 open shadow root，返回实际持有焦点的元素（document.activeElement 会重定向到宿主）。 */
export function getDeepActiveElement(root: HTMLElement): Element | null {
  let active: Element | null = root.ownerDocument?.activeElement ?? null
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

/** 在模态层内依 flat tree 移动焦点，不依赖 WebKit 的系统键盘导航偏好。 */
export function trapTabKey(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== 'Tab' || event.defaultPrevented) return

  const tabbables = getTabbables(root)
  if (tabbables.length === 0) {
    event.preventDefault()
    return
  }

  const active = getDeepActiveElement(root)
  const index = active ? tabbables.indexOf(active as HTMLElement) : -1
  const next =
    index < 0
      ? event.shiftKey
        ? tabbables.length - 1
        : 0
      : (index + (event.shiftKey ? -1 : 1) + tabbables.length) % tabbables.length
  event.preventDefault()
  tabbables[next]?.focus()
}

/** 找到 trigger 内真正接收焦点的元素；trigger 本身可聚焦时就是它。 */
export function findFocusTarget(trigger: Element): HTMLElement | null {
  if (trigger instanceof HTMLElement && isTabbable(trigger)) return trigger
  if (trigger.shadowRoot) return getTabbables(trigger.shadowRoot)[0] ?? null
  return null
}
