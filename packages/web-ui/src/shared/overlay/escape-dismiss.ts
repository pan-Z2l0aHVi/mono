/**
 * Overlay Escape 归属仲裁。
 *
 * 各组件各自监听 Escape 时无法回答「谁是最内层」：popover 挂在 document 上无条件关闭，
 * select / autocomplete 挂在宿主上（面板 portal 出去后根本收不到），drawer 挂在原生
 * <dialog> 上（守卫只查 HTMLDialogElement，portal 面板不是 dialog）。结果是一次 Escape
 * 关闭外层、留下内层——顺序与用户预期相反（issue #120 Block 1）。
 *
 * 本模块把 Escape 收敛成唯一仲裁者：
 *
 * - 单一 document **捕获阶段**监听。捕获阶段早于目标与冒泡阶段，命中后用
 *   `stopPropagation()` 截断，组件自己的 handler 不会再执行。
 * - `preventDefault()` 同时压掉原生 <dialog> 的关闭请求（引擎实测：keydown 被 preventDefault
 *   后 cancel 不再派发），因此 dialog / drawer 这类走原生机制者也由仲裁器统一接管。
 * - 归属判定复用 `overlayComposition` 的逻辑父子树：在所有 open 浮层里取子树包含
 *   关系下的极大元（最内层）；互不包含的并列浮层按打开顺序取最上层。
 * - drawer / dialog 把自己的原生 `<dialog>` 登记为 panel，挂在其上的 portal 面板
 *   （select / dropdown / tooltip）随即在逻辑树上成为它的后代，最内层才判得对。
 */

import { definePlugin } from '@greypan/js-kit'

import { overlayComposition } from './composition'

export interface OverlayEscapeHost {
  isConnected(): boolean
  isOpen(): boolean
  /** 组件自身的 Escape 开关（如 `no-escape-close`、拖拽进行中）。false 时不参与仲裁。 */
  isEscapeCloseEnabled(): boolean
  /**
   * 走组件既有的用户关闭入口：内部必须完成 UserChangeController 标记与
   * `open-change` 派发，controlled 语义也由组件自己决定如何表达。
   */
  requestClose(): void
}

export interface OverlayEscapeDismiss {
  /** 打开时登记面板；传 null 表示关闭并从仲裁中移除。 */
  setPanel(panel: HTMLElement | null): void
  dispose(): void
}

interface EscapeEntry {
  panel: HTMLElement | null
  host: OverlayEscapeHost
  /** 登记序号：同层并列时后开的更靠上。 */
  seq: number
}

const entries = new Set<EscapeEntry>()
let listening = false
let sequence = 0

function isLive(entry: EscapeEntry): entry is EscapeEntry & { panel: HTMLElement } {
  return entry.panel !== null && entry.host.isConnected() && entry.host.isOpen() && entry.host.isEscapeCloseEnabled()
}

/**
 * 在候选里取最内层：子树包含关系下的极大元。
 * 互不包含时取后开的（打开顺序更靠上）。
 */
function innermost(candidates: (EscapeEntry & { panel: HTMLElement })[]): EscapeEntry {
  return candidates.reduce((best, current) => {
    if (overlayComposition.contains(best.panel, current.panel)) return current
    if (overlayComposition.contains(current.panel, best.panel)) return best
    return current.seq > best.seq ? current : best
  })
}

/**
 * 取最内层 open 浮层。
 *
 * 刻意**不按事件路径筛选**：抽屉打开、内部列表也打开、而焦点停在抽屉上时，
 * 路径只命中抽屉，按路径判定会关掉外层、留下内层——正是本模块要修的缺陷。
 * 正确语义是「最内层优先」，与焦点无关；互不包含的并列浮层按打开顺序取最上层。
 */
function resolve(): EscapeEntry | null {
  const live = Array.from(entries).filter(isLive)
  return live.length > 0 ? innermost(live) : null
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  // 已有更早的捕获监听处理过本次 Escape：不重复介入。
  if (event.defaultPrevented) return

  const entry = resolve()
  if (!entry) return

  /*
   * preventDefault 压掉原生 dialog 的关闭请求；stopPropagation 让组件自身 handler
   * （挂在宿主、面板或 <dialog> 上）不再执行。
   *
   * 已知边界：stopPropagation 不阻止**同一节点**（document）上后注册的其他捕获监听。
   * 刻意不用 stopImmediatePropagation——那会连带掐掉应用自己在 document 上的捕获
   * 监听，超出本模块的职责。仓内当前没有这种形态的监听，若将来出现，应让它先跑并
   * 依赖上面的 defaultPrevented 守卫，而不是升级成 stopImmediatePropagation。
   */
  event.preventDefault()
  event.stopPropagation()
  entry.host.requestClose()
}

function syncListener(): void {
  const shouldListen = entries.size > 0
  if (shouldListen === listening) return
  listening = shouldListen
  if (shouldListen) document.addEventListener('keydown', handleKeydown, true)
  else document.removeEventListener('keydown', handleKeydown, true)
}

export const defineOverlayEscapeDismiss = () =>
  definePlugin<OverlayEscapeDismiss, OverlayEscapeHost>(host => {
    let entry: EscapeEntry | null = null

    const release = () => {
      if (!entry) return
      entries.delete(entry)
      entry = null
      syncListener()
    }

    return {
      setPanel(panel) {
        release()
        if (!panel) return
        entry = { panel, host, seq: ++sequence }
        entries.add(entry)
        syncListener()
      },

      dispose() {
        release()
      }
    }
  })
