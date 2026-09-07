export const MENU_CONTENT_SELECTOR = 'web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header'
export const MENU_ITEM_SELECTOR = 'web-ui-dropdown-item'

export function getMenuChildren(container: ParentNode): HTMLElement[] {
  const children: HTMLElement[] = []
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (child.matches(MENU_CONTENT_SELECTOR)) {
      children.push(child)
      continue
    }

    // 框架条件渲染会用元素包裹自有节点，或留下注释锚点。搜索 wrapper，
    // 但不进入 menu item 内部；其子节点属于嵌套 submenu。
    children.push(...getMenuChildren(child))
  }
  return children
}

export function getEnabledMenuItems(container: ParentNode): HTMLElement[] {
  return getMenuChildren(container).filter(item => item.matches(`${MENU_ITEM_SELECTOR}:not([disabled])`))
}

export function getMovableMenuSubtrees(container: ParentNode): HTMLElement[] {
  const subtrees: HTMLElement[] = []
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (child.matches(MENU_CONTENT_SELECTOR) || getMenuChildren(child).length > 0) subtrees.push(child)
  }
  return subtrees
}

export function moveMenuChildren(source: ParentNode, target: HTMLElement) {
  getMovableMenuSubtrees(source).forEach(subtree => {
    // 正常调用 source !== target，移走后项不再属于 source，天然收敛；
    // 这里兜底防御 source === target 的误用，避免 appendChild 自移动触发观察者刷新循环。
    if (subtree.parentNode === target) return
    target.appendChild(subtree)
  })
}

export function hideNestedMenuChildren(root: ParentNode, slot: string) {
  root.querySelectorAll<HTMLElement>('web-ui-dropdown-item[submenu]').forEach(item => {
    getMenuChildren(item).forEach(child => child.setAttribute('slot', slot))
  })
}

export function getMenuItemFromEvent(event: Event): HTMLElement | null {
  return (
    event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches(MENU_ITEM_SELECTOR)) ?? null
  )
}

export function focusMenuItem(item: HTMLElement | undefined) {
  if (!item || item.hasAttribute('disabled')) return
  ;(item as HTMLElement & { focusItem?: () => void }).focusItem?.()
}

export function findFocusedMenuItem(panels: Iterable<HTMLElement | undefined>): HTMLElement | undefined {
  return [...panels]
    .filter((panel): panel is HTMLElement => panel !== undefined)
    .flatMap(panel => Array.from(panel.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)))
    .find(item => Boolean(item.shadowRoot?.activeElement))
}

/**
 * 托管菜单项的模板位锚：每个被迁入面板的项在宿主 light DOM 留一个 marker 注释，
 * 表示其模板位。宿主因此始终持有完整有序骨架（marker + 框架注释锚点 + 非菜单节点），
 * 框架（Vue/React 条件渲染）打开期的插入以宿主为容器、以真实锚点为基准；
 * 面板项的顺序按 marker 序重排；关闭时按 marker 位双向归还。
 * context-menu 与 dropdown 的打开期实时渲染共用本机制。
 */
export type MenuItemAnchors = Map<HTMLElement, Comment>

/**
 * 全集 reconcile：以「content 现有元素 ∪ 宿主元素」为托管全集。
 * 框架（如 Vue 的 v-if 翻转）可能不经宿主直接改写 portal 内节点——卸载旧项留下
 * 注释锚点、把新项直接插进 content——它们都会被这里收编（补 marker + 补隐藏由调用方负责），
 * 已被框架删除/移出两处的条目则清理 marker。最后把宿主中尚存的托管项移入 content。
 */
export function reconcileManagedMenuItems(
  host: HTMLElement,
  content: HTMLElement,
  anchors: MenuItemAnchors,
  markerText: string
): void {
  // 宿主与 portal 面板分别位于不同容器，结构上不相交且收集只看直接子层，
  // 两个集合不会重复。
  const inContent = getMovableMenuSubtrees(content)
  const inHost = getMovableMenuSubtrees(host)
  const managed = new Set([...inContent, ...inHost])

  // 清理已失效条目：托管元素既不在 content 也不在宿主，说明已被框架删除。
  // 仍在 content 的元素必被上面收集进 managed，故这里只需处理宿主侧。
  anchors.forEach((marker, subtree) => {
    if (managed.has(subtree)) return
    marker.remove()
    anchors.delete(subtree)
  })

  // 确保每个托管元素都有 marker：框架直接插入 content 的项在此收编。
  // content 项按其当前 DOM 序（框架语义序）**反向**处理，新 marker 插到后继项 marker 之前——
  // 这样补建的 marker 序无需重排即可与 content 对齐；宿主项的 marker 原地补插。
  const ensureMarker = (subtree: HTMLElement, inHost: boolean, before?: Comment) => {
    const existing = anchors.get(subtree)
    if (existing && existing.parentNode === host) return existing
    existing?.remove()
    const marker = document.createComment(markerText)
    if (inHost) {
      host.insertBefore(marker, subtree)
    } else if (before && before.parentNode === host) {
      host.insertBefore(marker, before)
    } else {
      host.appendChild(marker)
    }
    anchors.set(subtree, marker)
    return marker
  }
  for (let index = inContent.length - 1; index >= 0; index--) {
    const subtree = inContent[index]
    const next = inContent[index + 1]
    const nextMarker = next ? anchors.get(next) : undefined
    ensureMarker(subtree, false, nextMarker)
  }
  for (const subtree of inHost) {
    ensureMarker(subtree, true)
  }

  // 宿主中尚存的托管项移入 content。
  for (const subtree of inHost) {
    content.appendChild(subtree)
  }
}

/** 按宿主 marker 序重排 content 项；顺序已一致时早退。 */
export function orderManagedMenuItems(
  host: HTMLElement,
  content: HTMLElement,
  anchors: MenuItemAnchors,
  markerText: string
): void {
  const targetItems: HTMLElement[] = []
  for (const node of Array.from(host.childNodes)) {
    if (node.nodeType !== Node.COMMENT_NODE || node.textContent !== markerText) continue
    anchors.forEach((marker, subtree) => {
      if (marker !== node || subtree.parentNode !== content) return
      targetItems.push(subtree)
    })
  }

  if (targetItems.length === 0) return

  const currentItems = Array.from(content.children)
  if (currentItems.length === targetItems.length && currentItems.every((item, index) => item === targetItems[index]))
    return

  // 把每个元素移动到目标序中下一个元素之前，而不是 appendChild 全部移到末尾。
  // appendChild 会把元素越过 content 中的框架注释锚点（v-if 锚点），导致锚点脱离
  // 模板位置，下次框架翻转时据此锚点插入新分支项就会落错位；insertBefore 只重排
  // 元素相对顺序，锚点保持在原模板位置。锚点复位由 restoreFrameworkAnchors 独立完成。
  for (let index = targetItems.length - 1; index >= 0; index--) {
    const item = targetItems[index]
    const next = targetItems[index + 1]
    if (next) {
      if (item.nextElementSibling !== next) content.insertBefore(item, next)
    } else {
      content.appendChild(item)
    }
  }
}

/**
 * 捕获框架 v-if 注释锚点相对其后继元素的绑定，供重排后复位。
 * 后继以 nextElementSibling 解析（跳过注释/文本，多个相邻锚点绑定同一后继）。
 * 锚点在 content 末尾、无后继元素时记为 null（尾部锚点，复位时保持末尾）。
 */
export function captureFrameworkAnchors(content: HTMLElement, markerText: string): Map<Comment, HTMLElement | null> {
  const anchors = new Map<Comment, HTMLElement | null>()
  for (const node of Array.from(content.childNodes)) {
    if (node instanceof Comment && node.textContent !== markerText) {
      const nextEl = node.nextElementSibling
      anchors.set(node, nextEl instanceof HTMLElement ? nextEl : null)
    }
  }
  return anchors
}

/**
 * 把锚点复位到捕获时其后继元素之前（尾部锚点保持末尾）。
 * 元素重排用 insertBefore/appendChild 不会移动注释，锚点必须显式复位，
 * 否则脱离模板位置后 Vue 下次 v-if 翻转会把新分支项插到错误插入点。
 */
export function restoreFrameworkAnchors(content: HTMLElement, anchors: Map<Comment, HTMLElement | null>): void {
  for (const [anchor, successor] of anchors) {
    if (anchor.parentNode !== content) continue
    if (successor && successor.parentNode === content) {
      if (anchor.nextElementSibling !== successor) content.insertBefore(anchor, successor)
    } else {
      // 尾部锚点：重排可能把元素 append 到末尾越过锚点，恢复其末尾位置。
      content.appendChild(anchor)
    }
  }
}

/**
 * 关闭恢复：按 content 子节点序双向归还——元素回到宿主中自己的 marker 位，
 * 框架 v-if 注释锚点插到对应元素之前。Vue 仍持有这些锚点的 vnode.el 引用，
 * 随元素一起迁回宿主可确保框架下次 patch 以宿主为容器，不会因 parentNode === null 崩溃。
 * 归还后清除全部 marker 与登记。
 */
export function returnManagedMenuItemsToSlot(host: HTMLElement, content: HTMLElement, anchors: MenuItemAnchors): void {
  const pending: Comment[] = []
  for (const node of Array.from(content.childNodes)) {
    // instanceof 收窄：Comment 接口为空，nodeType 继承自 Node 的 number，无法用 === 收窄
    if (node instanceof Comment) {
      pending.push(node)
      continue
    }
    if (!(node instanceof HTMLElement)) continue
    const marker = anchors.get(node)
    if (!marker) continue
    for (const c of pending) {
      if (marker.parentNode === host) host.insertBefore(c, marker)
      else host.appendChild(c)
    }
    pending.length = 0
    if (marker.parentNode === host) {
      host.insertBefore(node, marker)
    } else {
      host.appendChild(node)
    }
    marker.remove()
    anchors.delete(node)
  }
  // 尾部框架锚点追加到宿主末尾
  for (const c of pending) host.appendChild(c)
  // 映射中剩余 = 已不在 content 的条目(如翻转中被框架卸载的),仅清理 marker
  anchors.forEach(marker => marker.remove())
  anchors.clear()
}
