/**
 * 开启态浮层（open overlay）——「哪一层正开着」的唯一拥有者。
 *
 * 合并原先三个各自问一遍「你现在开着吗」的模块：composition（逻辑父子树）、
 * escape-dismiss（最内层仲裁）、lifecycle（帧事务失效）。合并的判据不是三者文件相邻，
 * 而是它们共享同一条不变量：**已登记 ⟺ 在场 ⟺ 有仲裁身份**。
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
 *   `requestClose()` 与一个仅供惰性回收读取的 `isConnected()`；模块持有的真相即真相。
 * - `claim` 即「我开着」：一次 claim 对应一次开启，登记与仲裁是同一个动作。
 * - 在场分两态：开启中（Escape 走关闭入口）与退场中（面板仍可见，暂缓仲裁、只作兜底
 *   候选）。后者由 `deferArbitration()` 进入、随 `release()`、重新 claim 或显式
 *   `deferArbitration(false)` 离开：于是「退场被打断」与「宿主仍认为开着」不再把看得见
 *   的面板留在未登记状态，而退场已播完、宿主却仍认为开着的那一格，也不会让一个看不
 *   见的面板无限吞掉 Escape。
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
   * 进入退场暂缓态：面板仍在场（可见），本层继续留在登记表里并吞掉 Escape，但不走
   * 关闭入口。`anchored-panel.close()` 在退场等待前调用它。
   *
   * 与 `setInert` 的分工：`inert` 是**调用方**对「暂时不可关闭」的声明，会随渲染被
   * 重推；本态由**生命周期**进入，调用方没有任何途径清掉它，只有 `release()` 与
   * 渲染重推它，只有 `release()`、「同一 panel 重新 claim」与下面那个 `false` 能让它
   * 消失。因此重新 claim 出来的新会话恒不暂缓，退场被打断后由新会话接管仲裁。
   *
   * 传 `false` 退出暂态。唯一的使用者是 `anchored-panel.close()`：退场已播完（面板
   * 已隐藏）而宿主仍认为开着时，把层交还仲裁——此刻面板并不在「可见但暂缓」的前提
   * 里，继续暂缓会让一个看不见的面板无限吞掉 Escape，用户再也没有按键路径把这个
   * 不一致的状态收敛掉。
   *
   * 暂缓层只是兜底候选：`resolve()` 里仍在开启的层永远优先。否则「内层关掉后立刻
   * 再按一次 Escape」会被退场动画吞掉，外层永远等不到自己那一次（issue #120）。
   */
  deferArbitration(deferred?: boolean): void
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
  /**
   * 宿主元素是否仍在文档中。只被惰性回收读取（见 `layers` 注册表处的注释），
   * 仲裁路径不回调它——读 DOM 连接状态不是回调宿主问「我开着吗」。
   */
  isConnected(): boolean
}

interface Layer {
  panel: HTMLElement
  host: OpenOverlayHost
  arbitration: OverlayArbitration
  /** 动态惰性开关，与会话同 lifetime。 */
  inert: boolean
  /** 退场暂缓开关：面板仍在场，但只作兜底候选（见 `deferArbitration`）。 */
  deferred: boolean
  /** 登记序号：互不包含的并列浮层里，后开的更靠上。 */
  seq: number
  released: boolean
}

/*
 * 模块级注册表：单例 document 监听器需要一个全局视野，这正是「谁是最内层」不能被
 * 拆到各组件里的原因。
 *
 * `Layer` 强引用 panel 与 host，所以一条没被删掉的记录会让整个组件（含子树）无法回收。
 * 删除路径有两条：显式 `release()`，以及 `reclaimDisconnectedLayers()` 的惰性兜底
 * ——「宿主还在但组件被丢弃」这类漏 release 的路径，光靠 `isCandidate()` 筛掉不可达
 * 候选只会留下永久泄漏，还会让 `shouldListen` 恒为 true 把 document 监听留住。
 * 兜底判据取 panel 与 host **同时**失联：面板可能被 portal 在容器间搬运，也可能只是
 * 短暂移除再放回（层对象比 DOM 连接活得久），只有两者都不在文档里才判定为死层。
 * 回收**不扫刚 claim 的新层**：调用方完全可能先 claim 再把 panel 与宿主挂进文档，
 * 那一刻两者都还没连上。所以 claim 路径的回收跑在建层之前（`createLayer` 开头），
 * 新层入表之后只做监听对账。
 * 读 DOM 连接状态不是回调宿主问「我开着吗」，不违反声明式的取舍。
 */
const layers = new Set<Layer>()
const layerByPanel = new WeakMap<HTMLElement, Layer>()
const layerByHandle = new WeakMap<OpenOverlayHandle, Layer>()
const parents = new WeakMap<HTMLElement, HTMLElement>()
const childPanels = new WeakMap<HTMLElement, Set<HTMLElement>>()
let listening = false
let sequence = 0

/*
 * dev 期测试钩子：登记表尺寸。
 *
 * 「漏 release」是结构性风险，而 `layers` 的尺寸无法从公开 interface 观察——调用方
 * 只持有句柄，看不到全局注册表，测试于是只能靠 GC 语义推断。有了它，泄漏在测试里
 * 是一个可直接断言的数字。`import.meta.env.DEV` 是编译期常量，生产构建里整段消失。
 */
declare global {
  // eslint-disable-next-line no-var
  var __openOverlayLayerCount: () => number
}

if (import.meta.env.DEV) {
  globalThis.__openOverlayLayerCount = () => layers.size
}

/*
 * 已失效句柄的空操作替身，用于 `adopt` 在 released 句柄上的返回值。其余句柄方法在
 * released 时都静默降级，返回值也必须一起降级，否则调用方会以为自己拿到了一棵可用子树。
 */
const inactiveHandle: OpenOverlayHandle = {
  deferArbitration() {},
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
  // 不在这里 syncListener：本函数被子层递归与兜底回收复用，监听器对账由调用方在
  // 整棵子树摘完后做一次即可。
}

function createLayer(input: {
  panel: HTMLElement
  host: OpenOverlayHost
  arbitration: OverlayArbitration
  parent?: HTMLElement
}): OpenOverlayHandle {
  /*
   * 先摘死层，再建新层。claim/adopt 是完全合法的「先开启后挂载」时序——调用方那一刻
   * 可能还没把 panel 与宿主挂进文档，两者都失联。回收跑在新层入表**之前**，新层就不
   * 会被自己的 claim 判成死层；而漏 release 留下的死层依旧在这里被扫掉，与旧实现一致。
   */
  reclaimDisconnectedLayers()

  const previous = layerByPanel.get(input.panel)
  // 同一 panel 重新 claim = 新的一次开启：旧会话（含其子层）整体作废，seq 重新分配。
  if (previous) releaseLayer(previous)

  const layer: Layer = {
    panel: input.panel,
    host: input.host,
    arbitration: input.arbitration,
    inert: false,
    deferred: false,
    seq: ++sequence,
    released: false
  }
  layers.add(layer)
  layerByPanel.set(input.panel, layer)
  attachToParent(input.panel, input.parent)

  const handle: OpenOverlayHandle = {
    deferArbitration(deferred = true) {
      if (layer.released) return
      layer.deferred = deferred
    },

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
      syncListener()
    }
  }

  layerByHandle.set(handle, layer)
  // 不带回收：新层面板与宿主可能还没挂载，回收已在函数开头跑过（见 `reclaim` 参数）。
  syncListener(false)
  return handle
}

function isCandidate(layer: Layer): boolean {
  return !layer.released && layer.arbitration !== 'none' && layer.panel.isConnected
}

/** 在候选里取最内层：子树包含关系下的极大元；互不包含时取后开的。 */
function pickInnermost(candidates: Layer[]): Layer | null {
  let best: Layer | null = null
  for (const layer of candidates) {
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

function resolve(): Layer | null {
  // 兜底回收：每次仲裁先摘掉死层，漏 release 的组件不会把注册表和监听一起拖住。
  syncListener()

  const live: Layer[] = []
  const deferred: Layer[] = []
  for (const layer of layers) {
    if (!isCandidate(layer)) continue
    if (layer.deferred) deferred.push(layer)
    else live.push(layer)
  }

  /*
   * 暂缓层只是兜底候选：仍在开启的层永远优先。
   *
   * 反过来（暂缓层也按最内层取胜）会让「内层关掉后立刻再按一次 Escape」被退场动画吞掉
   * ——它已不再开启却仍占着名额，外层永远等不到自己那一次，正是 issue #120 的契约
   * （escape-ownership.browser.spec.ts 压住它）。第三态要补的缺口是另一件事：退场被
   * 打断、新会话 claim 之前，面板还在场上却不再登记，此刻按 Escape 会关到外层。
   *
   * 与 `pickInnermost` 同样刻意**不按事件路径筛选**：抽屉打开、内部列表也打开、而焦点
   * 停在抽屉上时，事件路径只命中抽屉，按路径判定会关掉外层、留下内层。正确语义是
   * 「最内层优先」，与焦点无关。
   */
  return pickInnermost(live) ?? pickInnermost(deferred)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  // 已有更早的捕获监听处理过本次 Escape：不重复介入。
  if (event.defaultPrevented) return

  const layer = resolve()
  if (!layer) return

  /*
   * preventDefault 压掉原生 dialog 的关闭请求；stopPropagation 让组件自身的 handler
   * 不再执行。惰性层与暂缓层同样被吞掉按键，只是不走关闭入口 —— 否则事件会落到下层
   * 浮层，关闭顺序与用户预期相反。
   *
   * 已知边界：stopPropagation 不阻止**同一节点**（document）上后注册的其他捕获监听。
   * 刻意不用 stopImmediatePropagation —— 那会连带掐掉应用自己在 document 上的捕获
   * 监听，超出本模块职责。
   */
  event.preventDefault()
  event.stopPropagation()
  // 惰性与暂缓都吞掉按键，只是不走关闭入口。
  if (layer.inert || layer.deferred) return
  layer.host.requestClose()
}

/**
 * panel 与 host 同时失联的层是死层：显式 release 之外的兜底删除路径。
 *
 * 惰性体现在只在遍历登记表的入口跑（建层之前、仲裁、release），不挂 DOM 变动回调 ——
 * 面板短暂移除再放回必须不丢登记。建层**之后**不跑：新层可能还没挂载，扫它就会误杀
 * （见 `createLayer` 开头与 `layers` 注册表处的注释）。
 */
function reclaimDisconnectedLayers(): void {
  for (const layer of Array.from(layers)) {
    if (layer.released || layer.panel.isConnected || layer.host.isConnected()) continue
    releaseLayer(layer)
  }
}

/**
 * 监听器对账：惰性回收死层，再按登记表重算 document 监听。
 *
 * `reclaim` 关掉回收，只给 `createLayer` 建层之后那一次调用用：新层刚入注册表，调用方
 * 可能还没把 panel 与宿主挂进文档，那一刻扫它等于把新层判成死层。死层不会因此漏掉——
 * 回收在建层之前已经单独跑过一轮（见 `createLayer` 开头）。
 */
function syncListener(reclaim = true): void {
  if (reclaim) reclaimDisconnectedLayers()

  let shouldListen = false
  for (const layer of layers) {
    /*
     * 未 release 的非 `none` 层就是监听理由，**不附加连接判据**：刚 claim 而尚未挂载的
     * 层要靠这条把监听开着——面板挂上之后没有任何入口（不挂 DOM 变动回调）把它加回来，
     * 监听一撤这一层就再也听不见 Escape。死层的截杀交给上面的回收：它在每个带回收的
     * 入口先跑一步，轮到这里时同时失联的层已经不在表里，这条判据因此不会把死层留下来。
     */
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
