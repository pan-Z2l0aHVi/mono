/**
 * Overlay 逻辑祖先关系注册表。
 *
 * Portal 会让 DOM 祖先链与用户感知的组合关系分离：submenu、嵌套 popover 或
 * panel 内的子 overlay 通常被迁到独立 overlay root。交互所有权必须以这里登记
 * 的逻辑树判定，而不是继续在各组件内复制 contains()。
 */

interface OverlayPanelEntry {
  children: Set<HTMLElement>
}

const entries = new WeakMap<HTMLElement, OverlayPanelEntry>()
const parents = new WeakMap<HTMLElement, HTMLElement>()
const children = new WeakMap<HTMLElement, Set<HTMLElement>>()

function entryFor(panel: HTMLElement): OverlayPanelEntry {
  let entry = entries.get(panel)
  if (!entry) {
    entry = { children: new Set() }
    entries.set(panel, entry)
  }
  return entry
}

/** 判断 node 是否在 root 的物理或 shadow DOM 子树内。 */
function nextCompositionNode(node: Node): Node | null {
  if (node instanceof Element && node.assignedSlot) return node.assignedSlot
  if (node.parentNode) return node.parentNode
  if (node instanceof ShadowRoot) return node.host
  return null
}

function nodeIsInside(root: HTMLElement, node: Node): boolean {
  let current: Node | null = node
  while (current) {
    if (current === root || root.contains(current)) return true
    current = nextCompositionNode(current)
  }
  return false
}

function removeFromParent(panel: HTMLElement): void {
  const parent = parents.get(panel)
  if (!parent) return
  children.get(parent)?.delete(panel)
  if (children.get(parent)?.size === 0) children.delete(parent)
  parents.delete(panel)
}

export const overlayComposition = {
  /**
   * 登记 panel；parentPanel 存在时建立逻辑父子关系。重复登记会迁移到新父级，
   * 但不影响 panel 已有后代，供同 panel 重定位/恢复场景复用。
   */
  registerPanel(panel: HTMLElement, parentPanel?: HTMLElement): void {
    if (panel === parentPanel) return
    removeFromParent(panel)
    entryFor(panel)
    if (!parentPanel) return

    entryFor(parentPanel)
    const siblings = children.get(parentPanel) ?? new Set<HTMLElement>()
    siblings.add(panel)
    children.set(parentPanel, siblings)
    parents.set(panel, parentPanel)
  },

  /**
   * 通过 owner 的物理祖先链寻找已登记 overlay panel。panel 可以是本地 shadow
   * panel，也可以是 portal panel；portal 场景传入 portal target 即可找到原组合父级。
   */
  registerPanelFromAncestry(panel: HTMLElement, owner: Node): HTMLElement | undefined {
    let current: Node | null = owner === panel ? nextCompositionNode(owner) : owner
    while (current) {
      if (current instanceof HTMLElement && current !== panel && entries.has(current)) {
        this.registerPanel(panel, current)
        return current
      }
      current = nextCompositionNode(current)
    }
    this.registerPanel(panel)
    removeFromParent(panel)
    return undefined
  },

  /** 注销 panel 及其全部逻辑后代，避免关闭后留下 stale ancestry。 */
  unregisterPanel(panel: HTMLElement): void {
    const descendants = Array.from(children.get(panel) ?? [])
    descendants.forEach(descendant => this.unregisterPanel(descendant))
    removeFromParent(panel)
    children.delete(panel)
    entries.delete(panel)
  },

  /** target 是否属于 panel 自身或任何已登记逻辑后代 panel。 */
  contains(panel: HTMLElement, target: Node): boolean {
    if (nodeIsInside(panel, target)) return true
    for (const child of children.get(panel) ?? []) {
      if (this.contains(child, target)) return true
    }
    return false
  },

  /** event 的完整 composed path 是否落入 panel 的逻辑组合子树。 */
  containsEvent(panel: HTMLElement, event: Event): boolean {
    return event.composedPath().some(node => node instanceof Node && this.contains(panel, node))
  },

  /** 焦点是否在 panel 或其逻辑后代 panel 内。 */
  hasFocusWithin(panel: HTMLElement): boolean {
    if (panel.matches(':focus-within')) return true
    for (const child of children.get(panel) ?? []) {
      if (this.hasFocusWithin(child)) return true
    }
    return false
  }
}
