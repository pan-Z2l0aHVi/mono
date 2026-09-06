/*
 * Nested drawer 层序管理（对齐 Base UI/shadcn nested drawer 行为）：
 * 每打开一层 modal drawer，其下所有已打开的 drawer 按 0.95^n 缩放并向
 * 屏幕内侧平移，在顶层抽屉后方露出阶梯式卡片边缘（peeking edge）；顶层全尺寸。
 *
 * 层序来源是原生 top layer 本身：depth = 在自身 showModal 之前已打开的
 * modal dialog 数。上层关闭通过 document 捕获阶段的 `close` 事件感知
 * （原生 close 事件不冒泡，但捕获阶段在 document 上可观察所有 target），
 * 底层重算 depth 后由 CSS transition 平滑回弹。
 *
 * 视觉规格：
 * - scale = 0.95^depth
 * - shift = shrink + depth * 12px（向屏幕内侧偏移，露出阶梯卡片边缘）
 * - 过渡 transform 450ms cubic-bezier(0.22, 1, 0.36, 1)
 *
 * 拖拽与弹簧期间 JS 直接写 dialog.style.transform（优先级高于本机制的
 * CSS 变量组合），顶层才有拖拽，故无冲突。
 */

import { definePlugin } from '@greypan/js-kit'

const DEPTH_VARIABLE = '--wui-internal-drawer-nested-depth'
const NESTED_SCALE = 0.95
const NESTED_PEEK_OFFSET = 12

interface NestedDrawerEntry {
  dialog: HTMLDialogElement
  placement: () => 'right' | 'left' | 'top' | 'bottom'
}

const entries = new Set<NestedDrawerEntry>()

let documentListenerAttached = false

function applyLayers() {
  const openEntries: Array<{
    entry: NestedDrawerEntry
    dialog: HTMLDialogElement
    size: number
  }> = []

  for (const entry of entries) {
    const dialog = entry.dialog
    if (!dialog.isConnected || !dialog.open) {
      entries.delete(entry)
      continue
    }
    const size =
      entry.placement() === 'left' || entry.placement() === 'right' ? dialog.offsetWidth : dialog.offsetHeight
    openEntries.push({ entry, dialog, size })
  }

  const total = openEntries.length
  for (let i = 0; i < total; i++) {
    const { dialog, size } = openEntries[i]
    // 注册顺序：先打开的在前 (index 小)，后打开的在后 (index 大)。
    // depth = 在我之后打开的 drawer 数量 = (total - 1) - i
    const depth = total - 1 - i
    const scale = Math.pow(NESTED_SCALE, depth)
    const shrink = (size * (1 - scale)) / 2

    // 检查所有排在我之后的上层 drawer 的最大尺寸（若上层更宽，补偿宽度差确保露边）
    let aboveMaxSize = 0
    for (let j = i + 1; j < total; j++) {
      if (openEntries[j].size > aboveMaxSize) {
        aboveMaxSize = openEntries[j].size
      }
    }
    const sizeDiff = Math.max(0, aboveMaxSize - size)
    const shift = depth > 0 ? shrink + sizeDiff + depth * NESTED_PEEK_OFFSET : 0

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
  documentListenerAttached = true
}

export interface NestedDrawerLayerOptions {
  getDialog(): HTMLDialogElement | null
  getPlacement(): 'right' | 'left' | 'top' | 'bottom'
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
      ensureDocumentListener()
      entries.add({ dialog, placement: () => ctx.getPlacement() })
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
        documentListenerAttached = false
      }
    }
  }))
