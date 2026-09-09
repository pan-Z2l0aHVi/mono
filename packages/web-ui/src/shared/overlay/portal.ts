import { definePlugin } from '@greypan/js-kit'

import { getFallbackOverlayRoot } from '@/shared/theme/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/theme/theme-scope'

export type OverlayContainer = HTMLElement | (() => HTMLElement | undefined)

export interface OverlayContainerResolutionOptions {
  /** 无 target 时优先使用文档中的 root theme。 */
  preferRootTheme?: boolean
}

export interface OverlayPortalOptions {
  container?: OverlayContainer
  target: Element
  style: string
  className: string
  /**
   * 额外的面板内容变化反应。注意：已迁移节点被框架物理删除后的解除追踪
   * （removeContent）是 portal 的内建默认行为，不经过该回调；这里只承载
   * 组件自己的附加逻辑（如 option 域的刷新、空态占位改写）。
   */
  onContentChange?: (mutations: MutationRecord[]) => void
  /**
   * 打开期实时渲染契约：框架（Vue/React 条件渲染）可能在浮层打开期间向宿主
   * light DOM 持续插入节点。提供该回调时，portal 监听宿主直接子节点的 childList，
   * 把回调认定的可迁移节点增量迁入面板；关闭恢复时与初始迁移节点一样按原位回插。
   * 回调应只返回渲染性内容（元素/文本），框架注释锚点必须留在宿主，
   * 否则框架后续 patch 会以面板内节点为插入基准。
   * 返回空数组表示本次新增无需迁移。
   */
  migrateAddedNodes?: (addedNodes: Node[]) => Node[]
}

export interface OverlayPortal {
  readonly panel: HTMLElement
  restoreContent(): void
  moveContent(nodes: Node[], target?: HTMLElement): void
  appendContent(nodes: Node[], target?: HTMLElement): void
  removeContent(nodes: Node[]): void
  remove(): void
}

/**
 * Portal 面板位于独立 shadow root，宿主上的 CSS 自定义属性不会沿渲染树继承到 panel。
 * 这里在创建时镜像锚点解析后的变量，让组件 host 上的尺寸配置对 portal 仍然生效。
 */
export function applyOverlayVariables(panel: HTMLElement, source: Element, variables: readonly string[]): void {
  const computedStyle = getComputedStyle(source)
  for (const variable of variables) {
    const value = computedStyle.getPropertyValue(variable).trim()
    if (value) panel.style.setProperty(variable, value)
  }
}

/**
 * 迁移节点的追踪条目。每个节点迁入面板时在宿主 light DOM 原位留一个 marker 注释：
 * 宿主因此始终持有完整有序的骨架（marker + 框架注释锚点 + 未迁移节点），
 * 框架（Vue/React 条件渲染）打开期的插入以宿主为容器、以真实锚点为基准；
 * 面板内节点按宿主骨架序重排（中段插入不落到面板末尾）；关闭时按 marker 位
 * 双向归还、marker 摘除。机制与 menu-tree 的托管菜单项锚一致（context-menu/dropdown 共用）。
 */
interface TrackedNodeEntry {
  node: Node
  marker: Comment
}

const PORTAL_CONTENT_MARKER = 'wui-portal-content-anchor'

/**
 * 构建带 Shadow DOM 样式边界的 Portal 面板，并追踪被迁移的内容节点以便恢复。
 */
export const defineOverlayPortal = () =>
  definePlugin<OverlayPortal, OverlayPortalOptions>(ctx => {
    const host = document.createElement('div')
    // :host 规则可能让宿主在 overlay 容器中生成行盒；display: contents 保留面板定位而不参与布局。
    host.style.display = 'contents'

    const root = host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = ctx.style
    const panel = document.createElement('div')
    panel.className = ctx.className
    panel.dataset.wuiPresence = 'entering'
    root.append(style, panel)

    const trackedNodes: TrackedNodeEntry[] = []
    const contentObserver = new MutationObserver(mutations => {
      // 内部不变量先于消费方回调执行：配对依赖 trackedNodes 尚未被消费方 untrack 的状态。
      returnStrayFrameworkComments(mutations)
      // 框架在打开期物理删除已迁移节点：即时解除追踪，否则关闭恢复时会把已删除
      // 节点复活回宿主 light DOM。面板内部移动（重排 insertBefore）在同一 mutation
      // record 中同时出现在 removed/added，不属于删除，须排除。
      const addedInBatch = new Set(mutations.flatMap(mutation => [...mutation.addedNodes]))
      const removedNodes = mutations
        .flatMap(mutation => [...mutation.removedNodes])
        .filter(node => !addedInBatch.has(node))
      if (removedNodes.length) untrackNodes(removedNodes)
      ctx.onContentChange?.(mutations)
    })
    // 同一 observer 批次内被插入又移除的游离节点没有宿主位可锚，不追踪不迁移
    // （insertBefore 要求 node 是 parent 的子节点）；其归宿由框架的删除语义决定。
    const recordEntry = (node: Node): TrackedNodeEntry | null => {
      const parent = node.parentNode
      if (!parent) return null
      const marker = document.createComment(PORTAL_CONTENT_MARKER)
      parent.insertBefore(marker, node)
      const entry: TrackedNodeEntry = { node, marker }
      trackedNodes.push(entry)
      return entry
    }
    const untrackNodes = (nodes: Node[]) => {
      for (const node of nodes) {
        const index = trackedNodes.findIndex(entry => entry.node === node)
        if (index >= 0) {
          trackedNodes[index].marker.remove()
          trackedNodes.splice(index, 1)
        }
      }
    }
    // 面板内节点按宿主骨架序重排：骨架 = 宿主 childNodes 中本 portal 的 marker 序。
    // 只在已跟踪节点之间移动（insertBefore 相对定位），不触碰面板内的组件自有节点
    // （如 autocomplete 的空态占位）；末位节点 append，越过面板内注释锚点的情形由
    // restoreContent 的相邻注释随迁兜底。
    const orderTargetBySkeleton = (target: HTMLElement) => {
      const skeleton: Node[] = []
      for (const node of Array.from(ctx.target.childNodes)) {
        if (node instanceof Comment && node.textContent === PORTAL_CONTENT_MARKER) {
          const entry = trackedNodes.find(e => e.marker === node)
          if (entry && entry.node.parentNode === target) skeleton.push(entry.node)
        }
      }
      if (skeleton.length === 0) return
      const current = Array.from(target.childNodes).filter(
        node => skeleton.includes(node) || !(node instanceof Comment)
      )
      if (current.length === skeleton.length && current.every((node, index) => node === skeleton[index])) return
      for (let index = skeleton.length - 1; index >= 0; index--) {
        const node = skeleton[index]
        const next = skeleton[index + 1]
        if (next) {
          if ((node as Element).nextElementSibling !== next) target.insertBefore(node, next)
        } else {
          target.appendChild(node)
        }
      }
    }

    /**
     * 打开期不变量：框架删除已迁移节点时，其条件渲染占位注释（v-if 等）会被插进
     * 面板内容区而不是宿主——block 子树 patch 以 hostParentNode(oldVNode.el) 重定
     * container，而旧 el 已在面板（可能是 panel 自身或组件的内容子容器）。
     * 注释是框架后续翻转依赖的 vnode.el：留在面板会随面板销毁，下次翻转把内容插进
     * 已脱离文档的旧面板（内容"既不在宿主也不在面板"且无法恢复）。
     * 每个面板 mutation 批次内即时归还：与同批次被框架删除的 tracked 节点按宿主
     * marker 序配对，插到其 marker 位（多注释对多删除为近似配对；无配对时落宿主
     * 骨架末尾兜底）。tracked 子树内的注释是迁移内容自身的嵌套条件渲染，不属游离
     * 锚点，必须留在原位；随整个子树被删的注释已不在面板内，无需救援。
     */
    const returnStrayFrameworkComments = (mutations: MutationRecord[]) => {
      const isInsideTrackedSubtree = (start: Node): boolean => {
        let current: Node | null = start
        while (current && current !== panel) {
          if (trackedNodes.some(entry => entry.node === current)) return true
          current = current.parentNode
        }
        return false
      }
      const addedNodes = new Set(mutations.flatMap(mutation => [...mutation.addedNodes]))
      const strays: Comment[] = []
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Comment) || node.textContent === PORTAL_CONTENT_MARKER) continue
          // 同批次移入又移除的游离注释、随删除子树一起消失的注释都不在面板内，跳过
          if (!panel.contains(node)) continue
          if (isInsideTrackedSubtree(mutation.target)) continue
          strays.push(node)
        }
      }
      if (!strays.length) return
      const hostChildren = Array.from(ctx.target.childNodes)
      const removedEntries = trackedNodes
        .filter(
          entry =>
            !addedNodes.has(entry.node) && mutations.some(mutation => [...mutation.removedNodes].includes(entry.node))
        )
        .sort((a, b) => hostChildren.indexOf(a.marker) - hostChildren.indexOf(b.marker))
      for (const [index, comment] of strays.entries()) {
        const marker = removedEntries[Math.min(index, removedEntries.length - 1)]?.marker
        if (marker && marker.parentNode === ctx.target) ctx.target.insertBefore(comment, marker)
        else ctx.target.appendChild(comment)
      }
    }

    resolveOverlayContainer(ctx.container, ctx.target).appendChild(host)
    // 面板内容观察是 portal 自身的不变量（游离注释救援 + 删除节点解除追踪），
    // 不依赖消费方是否注册 onContentChange。
    contentObserver.observe(panel, { childList: true, subtree: true })

    // 打开期宿主 childList 观察（不含子树，框架 patch 嵌套组件的 light DOM 不属于
    // 本面板内容）。portal 实例的生命周期即打开期，随恢复/移除断开。
    const migrateAddedNodes = ctx.migrateAddedNodes
    const hostObserver = new MutationObserver(mutations => {
      // 框架清除逻辑（如 lit 的 _$clear）按宿主 marker 邻位遍历已迁移内容：元素
      // 物理上在面板，遍历找不到本体，会把 portal marker 当作内容本体移除。
      // marker 被框架摘除即框架删除语义——解除追踪并清掉滞留面板的游离元素；
      // 同批次移入又移回的 marker（框架重排）不属于删除。实时迁移仍以
      // migrateAddedNodes 的回调为准，无该回调的 portal（如 option 域）只做删除清理。
      const addedNodes = new Set(mutations.flatMap(mutation => [...mutation.addedNodes]))
      const strandedNodes = mutations
        .flatMap(mutation => [...mutation.removedNodes])
        .filter(node => node instanceof Comment && node.textContent === PORTAL_CONTENT_MARKER && !addedNodes.has(node))
        .map(marker => trackedNodes.find(entry => entry.marker === marker)?.node)
        .filter((node): node is Node => node !== undefined)
      if (strandedNodes.length) {
        api.removeContent(strandedNodes)
        // remove() 的规范语义即 parentNode.removeChild：宿主/类型层面都以 Node 表达
        for (const node of strandedNodes) node.parentNode?.removeChild(node)
      }
      if (!migrateAddedNodes) return
      const migratable = migrateAddedNodes(mutations.flatMap(mutation => [...mutation.addedNodes]))
      if (migratable.length) api.appendContent(migratable)
    })
    hostObserver.observe(ctx.target, { childList: true })

    const api: OverlayPortal = {
      panel,

      moveContent(nodes, target = panel) {
        trackedNodes.forEach(entry => entry.marker.remove())
        const entries = nodes.map(recordEntry).filter((entry): entry is TrackedNodeEntry => entry !== null)
        trackedNodes.length = 0
        trackedNodes.push(...entries)
        target.append(...nodes)
        orderTargetBySkeleton(target)
      },

      appendContent(nodes, target = panel) {
        for (const node of nodes) {
          untrackNodes([node])
          const entry = recordEntry(node)
          if (!entry) continue
          target.appendChild(entry.node)
        }
        orderTargetBySkeleton(target)
      },

      removeContent(nodes) {
        // 框架删除节点时插进面板的占位注释由 contentObserver 的内部不变量
        // （returnStrayFrameworkComments）即时归还宿主，这里只负责解除追踪。
        untrackNodes(nodes)
      },

      restoreContent() {
        // 先停掉实时迁移：恢复动作本身会改动宿主 childList，
        // 否则回插的节点会被当成新增内容再次迁入面板形成回环。
        hostObserver.disconnect()

        // 节点回到宿主中自己的 marker 位；面板内紧邻其前的框架注释锚点（v-if 占位）
        // 随元素一起迁回——Vue 仍持有这些锚点的 vnode.el 引用，留在面板会随面板销毁，
        // 下次翻转将因 parentNode === null 崩溃。
        for (const entry of trackedNodes) {
          const pending: Comment[] = []
          let previous = entry.node.previousSibling
          while (previous instanceof Comment && previous.textContent !== PORTAL_CONTENT_MARKER) {
            pending.unshift(previous)
            previous = previous.previousSibling
          }
          for (const comment of pending) {
            if (entry.marker.parentNode === ctx.target) ctx.target.insertBefore(comment, entry.marker)
            else ctx.target.appendChild(comment)
          }
          if (entry.marker.parentNode === ctx.target) ctx.target.insertBefore(entry.node, entry.marker)
          else ctx.target.appendChild(entry.node)
          entry.marker.remove()
        }
        trackedNodes.length = 0
      },

      remove() {
        hostObserver.disconnect()
        contentObserver.disconnect()
        // 防御：正常 dispose 先 restore（marker 已清），异常路径下避免 marker 泄漏在宿主。
        trackedNodes.forEach(entry => entry.marker.remove())
        trackedNodes.length = 0
        host.remove()
      }
    }
    return api
  })

/**
 * 判断 node 是否是 slot 已分配节点（或其 light DOM 后代），即 node 实际渲染在 shadowRoot 内。
 * slotted 内容的 parentNode 仍停留在 light DOM，因此不能用普通祖先遍历跨过 shadow 边界，
 * 只能通过 slot.assignedNodes() 判断内容被渲染到哪个 slot。
 */
function isAssignedIntoTarget(node: Node, assignedNode: Node, boundary: Node): boolean {
  let current: Node | null = node
  while (current && current !== boundary) {
    if (current === assignedNode) return true
    current = current.parentNode
  }
  return false
}

/** parentNode 为 null 时跨过 shadow 边界上行到 host（portal 面板等 shadow 子树的 parentNode 链会断裂）。 */
function getParentAcrossShadow(node: Node): Node | null {
  if (node.parentNode) return node.parentNode
  const root = node.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

/**
 * 查找包含 target 且处于打开态的最近原生 <dialog>。
 * 原生 showModal() 会把 dialog 提升到浏览器 top layer，而常规 overlay 容器在普通文档流，
 * 二者无法靠 z-index 叠序——overlay 会被 top layer 的 dialog 遮住。
 * 因此 target 被渲染到某个已打开的原生 dialog 内时，应把 overlay 挂到该 dialog 上，
 * 使其一并进入 top layer（抽屉 / 对话框内的 dropdown、tooltip、context-menu 均适用）。
 * 上行路径必须跨 shadow 边界：target 可能位于 portal 面板（shadow 子树）内，
 * 纯 parentNode 链在该处断裂会误判为 dialog 外，浮层落进 fallback root 被遮挡。
 */
function findEnclosingOpenDialog(target: Element): HTMLDialogElement | null {
  let current: Node | null = target
  while (current && current !== document.documentElement) {
    if (current instanceof HTMLDialogElement && current.open) return current

    // 跨过 shadow host：检查其 shadowRoot 内已打开的 dialog 是否渲染了 target。
    if (current instanceof Element && current.shadowRoot) {
      const dialogs = current.shadowRoot.querySelectorAll('dialog')
      for (const dialog of dialogs) {
        if (!(dialog instanceof HTMLDialogElement) || !dialog.open) continue
        const slots = dialog.querySelectorAll('slot')
        for (const slot of slots) {
          for (const assigned of slot.assignedNodes()) {
            if (!(assigned instanceof Node)) continue
            if (isAssignedIntoTarget(target, assigned, current)) return dialog
          }
        }
      }
    }

    current = getParentAcrossShadow(current)
  }
  return null
}

export function resolveOverlayContainer(
  container: OverlayContainer | undefined,
  target: Element,
  options: OverlayContainerResolutionOptions = {}
): HTMLElement {
  const explicit = typeof container === 'function' ? container() : container
  if (explicit) return explicit

  // target 在已打开的原生 dialog / drawer 内：挂到该 dialog，加入 top layer。
  const enclosingDialog = findEnclosingOpenDialog(target)
  if (enclosingDialog) return enclosingDialog

  // 无 target 的调用（如菜单）优先使用 root theme；有 target 时使用最近的 theme。
  const theme = options.preferRootTheme ? findRootTheme() : findNearestTheme(target)
  return theme?.getOverlayRoot() ?? getFallbackOverlayRoot()
}
