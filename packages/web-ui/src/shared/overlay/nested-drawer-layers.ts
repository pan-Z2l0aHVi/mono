/*
 * Nested drawer 层序管理：
 * 每打开一层 modal drawer，其下所有已打开的 drawer 按 0.95^n 缩放并向
 * 屏幕内侧平移，在顶层 drawer 后方露出阶梯式卡片边缘（peeking edge）；顶层全尺寸。
 *
 * 层序来源是原生 top layer 本身：depth = 在自身 showModal 之前已打开的
 * modal dialog 数。上层关闭通过 document 捕获阶段的 `close` 事件感知
 * （原生 close 事件不冒泡，但捕获阶段在 document 上可观察所有 target），
 * 底层重算 depth 后由 CSS transition 平滑回弹。
 *
 * 视觉规格：
 * - scale = 0.95^depth
 * - 堆叠总宽度随层数按对数曲线增长：T(n) = base · ln(n)。
 *   shift = shrink + sizeDiff + base · ln(depth + 1)（向屏幕内侧偏移，露出阶梯卡片边缘）。
 *   ln(1) = 0，单层不受影响；层数越多每层新增的露边越少，堆叠总宽不随层数线性膨胀。
 *   base 读自公开 token `--wui-drawer-nested-peek-base`（注册项的 initialValue 是桌面
 *   基准的唯一真相源，窄视口基准由 drawer 的媒体查询覆盖），消费方可整体改写层叠观感。
 * - 过渡 transform 450ms cubic-bezier(0.22, 1, 0.36, 1)
 *
 * 拖拽与释放后的收尾期间 JS 直接写内容层的 transform（优先级高于本机制的
 * CSS 变量组合），顶层才有拖拽，故无冲突。
 *
 * depth 变化经 `options.onDepthChange` 先于 size 收集回调（applyLayers 四步的
 * 硬约束，见函数内注释）：消费方借此在读取几何之前同步收起 full 态。
 */

import { definePlugin } from '@greypan/js-kit'

const DEPTH_VARIABLE = '--wui-internal-drawer-nested-depth'
const NESTED_SCALE = 0.95
export const PEEK_BASE_VARIABLE = '--wui-drawer-nested-peek-base'
/*
 * 注册项 initialValue 的镜像，**不是**第二真相源：真实基准由 drawer/index.ts 的
 * `CSS.registerProperty` 决定，浏览器里 computed style 永远有值，走不到这个兜底。
 * 保留它只为 jsdom——那里没有 registerProperty，getComputedStyle 返回空串，
 * 层序数学仍需要有定义的基准。浏览器 spec 有一条断言把两者钉在一起，防止漂移。
 */
export const NESTED_PEEK_BASE_FALLBACK = 43.2
/*
 * 与 drawer/style.css 里 `@media (width <= 640px)` 同一条断点：跨越断点时媒体查询会
 * 换掉基准，已打开的堆叠要重算，否则会停留在旧断点的露边宽度上。
 */
const NESTED_PEEK_BASE_QUERY = '(width <= 640px)'

interface NestedDrawerEntry {
  dialog: HTMLDialogElement
  placement: () => 'right' | 'left' | 'top' | 'bottom'
  /** 本 entry 的 depth 变化回调（透传消费方 options.onDepthChange）。 */
  onDepthChange?: (depth: number) => void
  /** 上一次 applyLayers 算得的 depth；用于检测变化并先于 size 收集回调。 */
  depth: number
}

const entries = new Set<NestedDrawerEntry>()

let documentListenerAttached = false
let peekBaseQuery: MediaQueryList | null = null

function readPeekBase(dialog: HTMLDialogElement): number {
  const raw = getComputedStyle(dialog).getPropertyValue(PEEK_BASE_VARIABLE)
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : NESTED_PEEK_BASE_FALLBACK
}

function handlePeekBaseChange() {
  if (entries.size > 0) applyLayers()
}

/*
 * 四步执行，1→2→3→4 的顺序是硬约束（方案 §7）：
 * depth 回调（第 3 步）必须先于 size 收集（第 4 步）——消费方在回调里同步瞬时
 * 收起 full 态（is-size-instant + 摘 is-full + 强制 reflow），size 才能读到归位后的
 * 几何；若先收 size 再回调，露边数学按 full 宽度污染（shrink = size·(1−scale)/2、
 * 上层 aboveMaxSize/sizeDiff 全错），且 depth 不再变化、没有任何重算机制，
 * 错误值会持续存在。同一任务内摘 is-full 后同步读 offsetWidth 读到的仍是过渡
 * 起始值，所以消费方必须用瞬时归位，这里用执行顺序保证它不被绕过。
 */
function applyLayers() {
  // 1. 清理失连 / 已关闭的 entry。
  for (const entry of entries) {
    if (!entry.dialog.isConnected || !entry.dialog.open) {
      entries.delete(entry)
    }
  }

  const ordered = Array.from(entries)
  const total = ordered.length
  if (total === 0) return

  // 2. 纯序数计算 depth：注册顺序先打开的在前 (index 小)，后打开的在后 (index 大)；
  //    depth = 在我之后打开的 drawer 数量。不读任何布局。
  // 3. depth 变化先回调（含回 0：消费方以 depth > 0 自行决定是否动作，
  //    收起不恢复）。回调不重入本函数——消费方只改类与内联样式，不动 entries。
  for (let i = 0; i < total; i++) {
    const entry = ordered[i]
    const depth = total - 1 - i
    if (entry.depth !== depth) {
      entry.depth = depth
      entry.onDepthChange?.(depth)
    }
  }

  // 4. 收集 size → 计算 shift/scale → 写变量与类。
  const sized = ordered.map(entry => ({
    entry,
    dialog: entry.dialog,
    size:
      entry.placement() === 'left' || entry.placement() === 'right'
        ? entry.dialog.offsetWidth
        : entry.dialog.offsetHeight
  }))

  for (let i = 0; i < total; i++) {
    const { entry, dialog, size } = sized[i]
    const depth = entry.depth
    const scale = Math.pow(NESTED_SCALE, depth)
    const shrink = (size * (1 - scale)) / 2

    // 检查所有排在我之后的上层 drawer 的最大尺寸（若上层更宽，补偿宽度差确保露边）
    let aboveMaxSize = 0
    for (let j = i + 1; j < total; j++) {
      if (sized[j].size > aboveMaxSize) {
        aboveMaxSize = sized[j].size
      }
    }
    const sizeDiff = Math.max(0, aboveMaxSize - size)
    // 逐层读基准：消费方可以给某一层单独换基准，不必所有层共用一个值。
    const peek = readPeekBase(dialog) * Math.log(depth + 1)
    // depth 0 显式归零：单层 drawer 的偏移不依赖 ln(1) 的浮点结果，也不依赖基准是否被改写。
    const shift = depth > 0 ? shrink + sizeDiff + peek : 0

    dialog.style.setProperty(DEPTH_VARIABLE, String(depth))
    dialog.style.setProperty('--wui-internal-drawer-nested-scale', scale.toFixed(4))
    dialog.style.setProperty('--wui-internal-drawer-nested-shift', `${shift.toFixed(2)}px`)
    if (depth > 0) {
      dialog.classList.add('is-nested-lower')
    } else {
      dialog.classList.remove('is-nested-lower')
    }
  }
}

function handleAnyDialogClose(event: Event) {
  if (!(event.target instanceof HTMLDialogElement)) return
  // 上层（或任意层）关闭后，重算所有存活 drawer 的 depth。
  if (entries.size > 0) applyLayers()
}

function ensureDocumentListener() {
  if (documentListenerAttached) return
  document.addEventListener('close', handleAnyDialogClose, true)
  // jsdom 等无 matchMedia 的环境：媒体查询换不掉基准，但打开/关闭路径仍会重算。
  if (typeof window.matchMedia === 'function') {
    peekBaseQuery = window.matchMedia(NESTED_PEEK_BASE_QUERY)
    peekBaseQuery.addEventListener('change', handlePeekBaseChange)
  }
  documentListenerAttached = true
}

export interface NestedDrawerLayerOptions {
  getDialog(): HTMLDialogElement | null
  getPlacement(): 'right' | 'left' | 'top' | 'bottom'
  /**
   * 本层 depth 变化回调。applyLayers 的执行顺序保证它在 size 收集**之前**触发：
   * depth 0→>0（上层新开）时消费方应同步瞬时收起 full 态（不能走过渡——
   * 同一轮的 offsetWidth/Height 读取要拿到归位后的几何）；depth 回 0 时
   * 消费方自行决定是否动作（drawer 收起不恢复）。
   */
  onDepthChange?(depth: number): void
}

export interface NestedDrawerLayerApi {
  /** dialog 进入 top layer（打开动画就绪）后调用，纳入层序管理。 */
  register(): void
  /** 关闭流程开始时调用：移出层序并触发底层回弹。 */
  unregister(): void
  dispose(): void
}

export const defineNestedDrawerLayers = () =>
  definePlugin<NestedDrawerLayerApi, NestedDrawerLayerOptions>(ctx => ({
    register() {
      const dialog = ctx.getDialog()
      if (!dialog) return
      // 幂等保护：重挂载对账与 updated() 的 open 分支可能对同一 dialog 先后各调
      // 一次 register，重复条目会让 applyLayers 把同一层计两次。
      for (const entry of entries) {
        if (entry.dialog === dialog) entries.delete(entry)
      }
      ensureDocumentListener()
      entries.add({
        dialog,
        placement: () => ctx.getPlacement(),
        onDepthChange: depth => ctx.onDepthChange?.(depth),
        // 新 entry 的 depth 起点 0：新开的 modal 恒在栈顶（最后注册 → depth 0），
        // 与真实值一致，register 后的 applyLayers 不会误触发回调；重挂载对账的
        // re-register 同理（断连时本 entry 已摘除、其余层已重算归 0）。
        depth: 0
      })
      applyLayers()
    },

    unregister() {
      const dialog = ctx.getDialog()
      for (const entry of entries) {
        if (entry.dialog === dialog) entries.delete(entry)
      }
      // 移除后重算剩余层（顶层关闭 → 次层回到 depth 0）。
      if (entries.size > 0) applyLayers()
    },

    dispose() {
      const dialog = ctx.getDialog()
      for (const entry of entries) {
        if (entry.dialog === dialog) entries.delete(entry)
      }
      if (entries.size === 0 && documentListenerAttached) {
        document.removeEventListener('close', handleAnyDialogClose, true)
        peekBaseQuery?.removeEventListener('change', handlePeekBaseChange)
        peekBaseQuery = null
        documentListenerAttached = false
      }
    }
  }))
