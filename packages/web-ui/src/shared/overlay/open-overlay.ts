/**
 * 开启态浮层（open overlay）——「哪一层正开着」的唯一拥有者。
 *
 * 合并原先三个各自问一遍「你现在开着吗」的模块：composition（逻辑父子树）、
 * escape-dismiss（最内层仲裁）、lifecycle（帧事务失效）。合并的判据不是三者文件相邻，
 * 而是它们共享同一条不变量：**已登记 ⟺ 已开启 ⟺ 参与 Escape 仲裁**。
 *
 * 拆成三个模块时这条不变量没有主人，8 个浮层组件各自把它拼成三步协议
 * （`registerPanelFromAncestry` + `setPanel` / `unregisterPanel` + `setPanel(null)`）。
 * 结果是「漏撤销」与「重挂载后与仲裁失联」只能靠每个组件自己记得，而
 * `lifecycle` 还得让调用方手工传一个 `expectedOpen` 来复述「我开着吗」。
 *
 * 本模块的取舍：
 *
 * - 身份是**句柄**而非 panel 元素：`release()` 不需要调用方回忆当初传了哪个 panel。
 * - 开启状态是**声明**而非询问：仲裁时不再回调宿主问 `isOpen()`，宿主只提供
 *   `requestClose()`；模块持有的真相即真相。
 * - `claim` 即「我开着」：一次 claim 对应一次开启，登记与仲裁是同一个动作。
 * - 查询走句柄（`contains` / `containsEvent` / `hasFocusWithin`），调用方不再需要
 *   持有 panel 引用，也不知道存在全局注册表。
 * - 实例作用域与会话作用域分开：帧事务的 lifetime 比一次开合长（tooltip 跨断连
 *   `resume()`），把它压进会话句柄会在 `release()` 时误杀事务。
 *
 * 刻意**不**吸收 presence、滚动锁与 drawer 的层序（nested layers）：它们回答的是
 * 视觉问题（`is-visible`、层序缩放），与「谁是最内层」正交，硬合并会互相污染。
 */

import { definePlugin } from '@greypan/js-kit'

/**
 * 本层是否参与 Escape 仲裁。
 *
 * - `escape`：正常候选。命中即走宿主既有的用户关闭入口。
 * - `none`：只在逻辑组合树内，完全不参与仲裁，Escape 穿过它落到下层。用于 tooltip
 *   —— 它今天就在树里（经 anchored panel 登记）但从不作为候选。
 *
 * 「暂时不可关闭」不在这里，而由 `setInert` 表达。静态与动态是同一件事的两面：
 * `no-escape-close` 这类策略看似静态，但它是**被观察的属性**，开启期间可被改写，
 * 所以同样要走动态通道（claim 后立即 `setInert(noEscapeClose)`）。把静态策略做成
 * 第三个枚举值只会产生一个没有真实调用方的成员。
 */
export type OverlayArbitration = 'escape' | 'none'

export interface OverlayClaimOptions {
  /** 默认 `escape`。 */
  arbitration?: OverlayArbitration
  /**
   * 沿该节点的祖先链寻找最近的已开启浮层，作为本层的逻辑父级；缺省用 panel 自身。
   *
   * portal 面板与宿主物理分离，从 panel 自身向上走找不到组合父级，必须由调用方给出
   * 锚点（trigger）或宿主，才能把「谁在谁里面」判对。
   *
   * **顺序约束**：祖先链查找要求 panel 与 ancestryFrom 此刻都已就位（在 DOM 中）。
   * 本模块不做「等一帧再补登记」——那会让「已登记」与「已开启」短暂不等。
   */
  ancestryFrom?: Node
}

export interface OverlayFrameHandle {
  cancel(): void
}

/** 会话作用域：一次开启对应一个句柄。 */
export interface OpenOverlayHandle {
  /**
   * 惰性：仍是候选（照旧 `preventDefault()` 压掉原生 `<dialog>` 的关闭请求），但不走
   * 关闭入口。这是「暂时不可关闭」的唯一通道，静态策略与瞬时状态都走这里。
   *
   * 不改变本层在树里的位置，也不改变 `seq` —— 因此不会影响并列浮层的裁决顺序。
   * `none` 层不受影响（它本就不是候选）。
   *
   * **与会话同 lifetime，新会话恒从 `false` 开始**：`claim` 建立的每一层都重置为
   * 非惰性。所以凡是「重新 claim」的路径（`anchored-panel.reconfigure`、同一 panel 重复
   * `open()`）之后，都必须按当前状态重推一次，否则惰性会被静默清掉。重推放在哪里取决于
   * 该组件在 reconfigure 后是否渲染：会渲染的（select / autocomplete 在 `updated()` 里
   * 同步）可以把紧随 claim 的那一行降级为备份，不会渲染的（popover）必须自己补。
   */
  setInert(inert: boolean): void
  /**
   * 把子层 panel 纳入本句柄的子树（多级子菜单），默认不成为独立候选。
   *
   * 与 `claim` 的区别只在父级如何确定：`claim` 走祖先链，`adopt` 由调用方指名。
   *
   * 在已 `release()` 的句柄上调用**不建层**、返回空操作句柄 —— 否则会建出一个父层已死
   * 的孤层：它仍参与仲裁，却不在父层的子树里，除调用方手里那个句柄外没有回收路径。
   */
  adopt(panel: HTMLElement, options?: OverlayClaimOptions): OpenOverlayHandle
  /** 本层子树（含已 adopt 的子层）是否包含 node。 */
  contains(node: Node): boolean
  /** event 的完整 composed path 是否落入本层子树。 */
  containsEvent(event: Event): boolean
  /** 焦点是否在本层子树内。 */
  hasFocusWithin(): boolean
  /** 幂等。撤销本层及其全部子层，退出仲裁。 */
  release(): void
}

/** 实例作用域：每个宿主组件一次，跨开合与断连存活。 */
export interface OpenOverlay {
  claim(panel: HTMLElement, options?: OverlayClaimOptions): OpenOverlayHandle
  /**
   * 帧事务调度。`whileLive` 句柄一旦 release，回调自动作废 —— 取代原先由调用方
   * 手工传入 `expectedOpen` 的轮询（那个参数正是「模块还得回头问宿主」的证据）。
   */
  scheduleFrame(callback: () => void, whileLive?: OpenOverlayHandle): OverlayFrameHandle
  /** 结束当前事务：取消未执行的 frame，并让旧 generation 的回调失效。 */
  invalidate(): void
  /** 断连后停止调度（可 `resume()`）；generation 继续单调递增，旧事务保持失效。 */
  suspend(): void
  resume(): void
}

export interface OpenOverlayHost {
  /** 走宿主既有的用户关闭入口（内部负责 controlled 语义与 `open-change` 派发）。 */
  requestClose(): void
}

interface Layer {
  panel: HTMLElement
  host: OpenOverlayHost
  arbitration: OverlayArbitration
  /** 动态惰性开关，与会话同 lifetime。 */
  inert: boolean
  /** 登记序号：互不包含的并列浮层里，后开的更靠上。 */
  seq: number
  released: boolean
}

/*
 * 模块级注册表：单例 document 监听器需要一个全局视野，这正是「谁是最内层」不能被
 * 拆到各组件里的原因。显式 release 是唯一的删除路径；`panel.isConnected` 作为兜底
 * 过滤，避免「宿主被移除但忘了 release」留下仍可仲裁的幽灵层（读 panel 的 DOM 属性
 * 不是回调宿主，不违反声明式的取舍）。
 */
const layers = new Set<Layer>()
const layerByPanel = new WeakMap<HTMLElement, Layer>()
const layerByHandle = new WeakMap<OpenOverlayHandle, Layer>()
const parents = new WeakMap<HTMLElement, HTMLElement>()
const childPanels = new WeakMap<HTMLElement, Set<HTMLElement>>()
let listening = false
let sequence = 0

/*
 * 已失效句柄的空操作替身，用于 `adopt` 在 released 句柄上的返回值。其余句柄方法在
 * released 时都静默降级，返回值也必须一起降级，否则调用方会以为自己拿到了一棵可用子树。
 */
const inactiveHandle: OpenOverlayHandle = {
  setInert() {},
  adopt: () => inactiveHandle,
  contains: () => false,
  containsEvent: () => false,
  hasFocusWithin: () => false,
  release() {}
}

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

function detachFromParent(panel: HTMLElement): void {
  const parent = parents.get(panel)
  if (!parent) return
  const siblings = childPanels.get(parent)
  siblings?.delete(panel)
  if (siblings?.size === 0) childPanels.delete(parent)
  parents.delete(panel)
}

function attachToParent(panel: HTMLElement, parent: HTMLElement | undefined): void {
  detachFromParent(panel)
  if (!parent || parent === panel) return
  const siblings = childPanels.get(parent) ?? new Set<HTMLElement>()
  siblings.add(panel)
  childPanels.set(parent, siblings)
  parents.set(panel, parent)
}

/** panel 自身或其任何已登记子层是否包含 target。 */
function containsPanel(panel: HTMLElement, target: Node): boolean {
  if (nodeIsInside(panel, target)) return true
  for (const child of childPanels.get(panel) ?? []) {
    if (containsPanel(child, target)) return true
  }
  return false
}

function hasFocusWithinPanel(panel: HTMLElement): boolean {
  if (panel.matches(':focus-within')) return true
  for (const child of childPanels.get(panel) ?? []) {
    if (hasFocusWithinPanel(child)) return true
  }
  return false
}

/** 从 from 沿祖先链找最近的已开启浮层 panel；panel 自身永远不算自己的父级。 */
function findOpenAncestor(panel: HTMLElement, from: Node): HTMLElement | null {
  let current: Node | null = from === panel ? nextCompositionNode(from) : from
  while (current) {
    if (current instanceof HTMLElement && current !== panel) {
      const candidate = layerByPanel.get(current)
      if (candidate && !candidate.released) return current
    }
    current = nextCompositionNode(current)
  }
  return null
}

function releaseLayer(layer: Layer): void {
  if (layer.released) return
  layer.released = true
  for (const child of Array.from(childPanels.get(layer.panel) ?? [])) {
    const childLayer = layerByPanel.get(child)
    if (childLayer) releaseLayer(childLayer)
    else detachFromParent(child)
  }
  layers.delete(layer)
  layerByPanel.delete(layer.panel)
  childPanels.delete(layer.panel)
  detachFromParent(layer.panel)
  syncListener()
}

function createLayer(input: {
  panel: HTMLElement
  host: OpenOverlayHost
  arbitration: OverlayArbitration
  parent?: HTMLElement
}): OpenOverlayHandle {
  const previous = layerByPanel.get(input.panel)
  // 同一 panel 重新 claim = 新的一次开启：旧会话（含其子层）整体作废，seq 重新分配。
  if (previous) releaseLayer(previous)

  const layer: Layer = {
    panel: input.panel,
    host: input.host,
    arbitration: input.arbitration,
    inert: false,
    seq: ++sequence,
    released: false
  }
  layers.add(layer)
  layerByPanel.set(input.panel, layer)
  attachToParent(input.panel, input.parent)

  const handle: OpenOverlayHandle = {
    setInert(inert) {
      if (layer.released) return
      layer.inert = inert
    },

    adopt(panel, options = {}) {
      if (layer.released) return inactiveHandle
      return createLayer({
        panel,
        host: layer.host,
        arbitration: options.arbitration ?? 'none',
        parent: layer.panel
      })
    },

    contains(node) {
      return !layer.released && containsPanel(layer.panel, node)
    },

    containsEvent(event) {
      return (
        !layer.released && event.composedPath().some(node => node instanceof Node && containsPanel(layer.panel, node))
      )
    },

    hasFocusWithin() {
      return !layer.released && hasFocusWithinPanel(layer.panel)
    },

    release() {
      releaseLayer(layer)
    }
  }

  layerByHandle.set(handle, layer)
  syncListener()
  return handle
}

function isCandidate(layer: Layer): boolean {
  return !layer.released && layer.arbitration !== 'none' && layer.panel.isConnected
}

/**
 * 在候选里取最内层：子树包含关系下的极大元；互不包含时取后开的。
 *
 * 刻意**不按事件路径筛选**：抽屉打开、内部列表也打开、而焦点停在抽屉上时，事件路径
 * 只命中抽屉，按路径判定会关掉外层、留下内层 —— 正是本模块要修的缺陷。正确语义是
 * 「最内层优先」，与焦点无关。
 */
function resolve(): Layer | null {
  let best: Layer | null = null
  for (const layer of layers) {
    if (!isCandidate(layer)) continue
    if (!best) {
      best = layer
      continue
    }
    if (containsPanel(best.panel, layer.panel)) {
      best = layer
      continue
    }
    if (containsPanel(layer.panel, best.panel)) continue
    if (layer.seq > best.seq) best = layer
  }
  return best
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  // 已有更早的捕获监听处理过本次 Escape：不重复介入。
  if (event.defaultPrevented) return

  const layer = resolve()
  if (!layer) return

  /*
   * preventDefault 压掉原生 dialog 的关闭请求；stopPropagation 让组件自身的 handler
   * 不再执行。惰性层同样被吞掉按键，只是不走关闭入口 —— 否则事件会落到下层浮层，
   * 关闭顺序与用户预期相反。
   *
   * 已知边界：stopPropagation 不阻止**同一节点**（document）上后注册的其他捕获监听。
   * 刻意不用 stopImmediatePropagation —— 那会连带掐掉应用自己在 document 上的捕获
   * 监听，超出本模块职责。
   */
  event.preventDefault()
  event.stopPropagation()
  if (layer.inert) return
  layer.host.requestClose()
}

function syncListener(): void {
  let shouldListen = false
  for (const layer of layers) {
    if (!layer.released && layer.arbitration !== 'none') {
      shouldListen = true
      break
    }
  }
  if (shouldListen === listening) return
  listening = shouldListen
  if (shouldListen) document.addEventListener('keydown', handleKeydown, true)
  else document.removeEventListener('keydown', handleKeydown, true)
}

export const defineOpenOverlay = () =>
  definePlugin<OpenOverlay, OpenOverlayHost>(host => {
    let generation = 0
    let suspended = false
    const frames = new Set<OverlayFrameHandle & { id: number; generation: number }>()

    const cancelFrame = (frame: OverlayFrameHandle & { id: number; generation: number }) => {
      cancelAnimationFrame(frame.id)
      frames.delete(frame)
    }

    const cancelFrames = () => {
      for (const frame of Array.from(frames)) cancelFrame(frame)
    }

    const invalidateCurrent = () => {
      generation += 1
      cancelFrames()
    }

    const api: OpenOverlay = {
      claim(panel, options = {}) {
        const arbitration = options.arbitration ?? 'escape'
        const ancestryFrom = options.ancestryFrom ?? panel
        return createLayer({
          panel,
          host,
          arbitration,
          parent: findOpenAncestor(panel, ancestryFrom) ?? undefined
        })
      },

      scheduleFrame(callback, whileLive) {
        if (suspended) return { cancel() {} }

        const scheduledGeneration = generation
        const frame: OverlayFrameHandle & { id: number; generation: number } = {
          generation: scheduledGeneration,
          id: requestAnimationFrame(() => {
            frames.delete(frame)
            if (suspended || scheduledGeneration !== generation) return
            // 会话已结束：该帧属于上一轮开合，丢弃而不是执行在错误的层上。
            // 句柄已 release，或同一 panel 重新 claim 换了新句柄（旧层仍在 WeakMap 里，
            // 标记为 released），两种情形都要丢。
            if (whileLive) {
              const liveLayer = layerByHandle.get(whileLive)
              if (!liveLayer || liveLayer.released) return
            }
            callback()
          }),
          cancel() {
            cancelFrame(frame)
          }
        }
        frames.add(frame)
        return frame
      },

      invalidate: invalidateCurrent,

      suspend() {
        if (suspended) return
        suspended = true
        // 停调度之后再撤销在途帧（两者互不依赖，顺序不影响语义）。不能只靠回调内部的
        // suspended 复查：那会让这些帧白占一个 rAF 周期（旧实现在此处因早退而没有取消）。
        cancelFrames()
      },

      resume() {
        if (!suspended) return
        suspended = false
        generation += 1
      }
    }

    return api
  })
