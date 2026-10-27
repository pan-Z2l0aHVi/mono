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
  return tabbables
}

/** 深入 open shadow root，返回实际持有焦点的元素（document.activeElement 会重定向到宿主）。 */
export function getDeepActiveElement(root: HTMLElement): Element | null {
  let active: Element | null = root.ownerDocument?.activeElement ?? null
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

/**
 * 原生 modal dialog 在 Chromium 里从末项 Tab 时会先落到 body。这里在首尾边界显式回卷，
 * 保证焦点始终停在浮层内。
 */
export function trapTabKey(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== 'Tab' || event.defaultPrevented) return

  const tabbables = getTabbables(root)
  if (tabbables.length === 0) {
    event.preventDefault()
    return
  }

  const active = getDeepActiveElement(root)
  if (!active || !tabbables.includes(active as HTMLElement)) return

  const first = tabbables[0]
  const last = tabbables[tabbables.length - 1]
  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

/** 找到 trigger 内真正接收焦点的元素；trigger 本身可聚焦时就是它。 */
export function findFocusTarget(trigger: Element): HTMLElement | null {
  if (trigger instanceof HTMLElement && isTabbable(trigger)) return trigger
  if (trigger.shadowRoot) return getTabbables(trigger.shadowRoot)[0] ?? null
  return null
}
