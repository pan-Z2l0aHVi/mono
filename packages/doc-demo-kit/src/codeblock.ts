import type { MetaNode } from '@greypan/md-to-meta'
// 运行时只引纯契约子路径：根入口会把生成期依赖（shiki、tinyglobby）拖进浏览器图。
import { LINE_NUMBER_CLASS, lineCountOf } from '@greypan/md-to-meta/contract'
import { OverlayScrollbars } from 'overlayscrollbars'

import { FLAVORS, flavorOf, type Flavor } from './flavor'
import type { CodeblockVariant } from './install'

/** 生成器写进 meta 的字面加载 thunk；同一份 meta 模块里引用同一个函数，可作缓存键。 */
export type DemoThunk = NonNullable<MetaNode['load']>

// 复制反馈回到 idle 前的停留时长；成功态的 aria 播报与 tooltip 文案都在这扇窗内。
export const COPY_IDLE_DELAY = 1600

/*
 * 关闭态露出 128px，内容不超过这个高度时整段代码本来就看全了：再挂折叠只会让末端的
 * 渐隐带盖住正文，所以这种卡直接铺开，也收起工具条里的展开按钮。
 * 每行 24px 来自代码区的 `leading-6`，底部内边距 12px 来自 `pb-3`。
 */
export const PEEK_HEIGHT = 128
export const CODE_LINE_HEIGHT = 24
export const CODE_PADDING_HEIGHT = 12
export const PEEK_LINES = Math.floor((PEEK_HEIGHT - CODE_PADDING_HEIGHT) / CODE_LINE_HEIGHT)

/** 超过 peek 能露出的行数才挂折叠：更短的代码没有可裁掉的部分，渐隐只会盖住正文。 */
export function isCodeCollapsible(content: string): boolean {
  return lineCountOf(content) > PEEK_LINES
}

/*
 * 代码区由 OverlayScrollbars 接管后，`[data-code]` 这一层成了 `overflow: hidden` 的 host，
 * 真正滚动的是实例的 viewport 元素，所以滚动复位必须打在它上面。
 * 实例还没建好（首帧、jsdom）时退回 host 本身，此时 host 上的 `overflow-auto` 就是它自身的原生滚动。
 */
export function resetCodeScroll(panel: HTMLElement): void {
  const scroller = OverlayScrollbars(panel)?.elements().viewport ?? panel
  scroller.scrollTop = 0
  scroller.scrollLeft = 0
}

/*
 * 同一个理由也管焦点：库把 target 变成 `overflow: hidden` 的 host 之后，target 上的 tabindex 不再
 * 带来键盘滚动。textarea 场景库自己会把 tabindex 从 target 搬到 viewport，div 场景不会，所以在这里
 * 补上同一步——焦点和方向键都落在真正的滚动元素上。
 */
export const codeScrollbarsEvents = {
  initialized: (instance: OverlayScrollbars) => {
    instance.elements().viewport.tabIndex = 0
  }
}

/*
 * 剪贴板是双通道的：安全上下文且有焦点时走 Async Clipboard API；非安全上下文、
 * 文档失焦或权限被拒时它会直接抛，落到 textarea + execCommand 的同步通道。
 */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续走兜底通道。
  }

  const focused = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()

  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }

  textarea.remove()
  if (focused instanceof HTMLElement) focused.focus()
  return ok
}

/**
 * 取代码卡里 `<pre>` 的围栏原文。行号槽是生成期塞在每行前面的文本，剪贴板要的是围栏原文，
 * 所以克隆一份、按 `@greypan/md-to-meta` 的行号类名摘掉它再取文本。
 */
export function codeFrameText(panel: HTMLElement): string {
  const pre = panel.querySelector<HTMLElement>('pre')
  const frame = pre?.cloneNode(true) as HTMLElement | undefined
  frame?.querySelectorAll(`.${LINE_NUMBER_CLASS}`).forEach(node => node.remove())
  return frame?.textContent ?? ''
}

export type CopyStatus = 'idle' | 'copied' | 'failed'

export interface CopyFeedbackSnapshot {
  status: CopyStatus
  /** 每次复制递增：状态没变也能让订阅方收到新快照，重复复制因此可重播一次反馈。 */
  run: number
}

export interface CopyFeedbackOptions {
  /** 从当前卡取要复制的围栏原文；每次复制时调用。 */
  readText: () => string
  /** 复制成功态停留时长，默认 `COPY_IDLE_DELAY`。 */
  idleDelay?: number
}

export interface CopyFeedback {
  copy: () => Promise<void>
  dispose: () => void
  getSnapshot: () => CopyFeedbackSnapshot
  subscribe: (listener: () => void) => () => void
}

/**
 * 复制反馈状态机：发起复制、置成功/失败、定时回 idle。框架侧只把 snapshot 接进自己的
 * 响应式系统（React `useSyncExternalStore` / Vue ref），并发由「新复制先清掉旧定时器」保证。
 */
export function createCopyFeedback({ readText, idleDelay = COPY_IDLE_DELAY }: CopyFeedbackOptions): CopyFeedback {
  let snapshot: CopyFeedbackSnapshot = { status: 'idle', run: 0 }
  let timer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  function publish(next: CopyFeedbackSnapshot) {
    snapshot = next
    listeners.forEach(listener => listener())
  }
  async function copy(): Promise<void> {
    const text = readText()
    const ok = text !== '' && (await writeClipboard(text))
    clearTimeout(timer)
    const run = snapshot.run + 1
    publish({ status: ok ? 'copied' : 'failed', run })
    timer = setTimeout(() => publish({ status: 'idle', run }), idleDelay)
  }
  return {
    copy,
    dispose: () => {
      clearTimeout(timer)
      timer = undefined
      listeners.clear()
    },
    getSnapshot: () => snapshot,
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

/**
 * `load` thunk 按函数身份缓存造出来的组件：同一份 meta 模块里同一个 thunk 引用同一个函数，
 * 所以按身份缓存就能让异步组件只建一次——重渲染与再进入页面都不会换掉组件身份、
 * 重置示例自己的状态。`create` 由框架侧给（React.lazy / defineAsyncComponent）。
 */
export function createThunkCache<T>(create: (load: DemoThunk) => T): (load: DemoThunk) => T {
  const cache = new WeakMap<DemoThunk, T>()
  return load => {
    let instance = cache.get(load)
    if (!instance) {
      instance = create(load)
      cache.set(load, instance)
    }
    return instance
  }
}

export interface CodeblockInputs {
  /** 同一份示例的围栏：相邻的 `tsx` 与 `vue` 围栏合成一张卡，工具条切换显示哪一份。 */
  nodes: readonly MetaNode[]
  /** 包管理器等多选项围栏合成的切换选项；无多选项时缺省。 */
  variants?: readonly CodeblockVariant[]
}

export interface CodeblockControllerOptions extends CodeblockInputs {
  /** 本站框架：既是 flavor 的初始兜底，也决定预览跑哪份围栏。 */
  nativeFlavor: Flavor
  /** 取代码面板元素；滚动复位与复制取文都经由它（jsdom / 静态渲染可返回 null）。 */
  getPanel: () => HTMLElement | null
}

export interface CodeblockSnapshot {
  flavor: string
  expanded: boolean
  /** 激活节点回退链：variants 命中 → flavor 对应的围栏 → 首节点；空输入为 null。 */
  active: MetaNode | null
  /** 超过 peek 能露出的行数才挂折叠；判据与几何常量见上方 `isCodeCollapsible`。 */
  collapsible: boolean
  /** 预览围栏：带 `load` 且属于本站框架的那份（生成器只给 exec 语言加 load），与选中源码无关。 */
  preview: MetaNode | null
  copy: CopyFeedbackSnapshot
}

export interface CodeblockController {
  /**
   * 状态快照：整体引用只在提交时更换，框架侧按引用相等跳过无关渲染
   * （React `useSyncExternalStore` 要求 getSnapshot 稳定，Vue 侧按同一约定同步 ref）。
   */
  getSnapshot: () => CodeblockSnapshot
  subscribe: (listener: () => void) => () => void
  /**
   * 输入（文档快照换引用）变化时同步。不触发订阅通知：渲染由框架的输入变化驱动，
   * 本次渲染自己会读到新快照；用户动作才发布。
   */
  setInputs: (inputs: CodeblockInputs) => void
  /** 换一份源码就回到顶部：两稿行数不同，停在上次读到的位置会落到另一份的中段。 */
  selectFlavor: (value: string) => void
  /** 收起后代码区回到顶部，与从未展开时一致；否则再次展开会停在上次读到的位置。 */
  toggleExpanded: () => void
  copy: () => Promise<void>
  dispose: () => void
}

/**
 * 代码卡状态机：激活节点回退链、flavor / 展开状态、两者的滚动复位不变量与复制反馈接线
 * 都在这一份实现里，两个 demo 的 codeblock 组件只剩渲染与事件接线。
 */
export function createCodeblockController(options: CodeblockControllerOptions): CodeblockController {
  const { nativeFlavor, getPanel } = options
  let nodes = options.nodes
  let variants = options.variants

  let flavor = variants?.[0]?.value ?? nativeFlavor
  let expanded = false

  const listeners = new Set<() => void>()
  let snapshot: CodeblockSnapshot

  const copyFeedback = createCopyFeedback({
    readText: () => {
      const panel = getPanel()
      return panel ? codeFrameText(panel) : ''
    }
  })
  // 复制反馈在自己的状态机里发布；链到这里刷新快照再统一通知订阅者。
  copyFeedback.subscribe(() => publish())

  function resetPanelScroll() {
    const panel = getPanel()
    if (panel) resetCodeScroll(panel)
  }

  function isKnownFlavor(value: string): boolean {
    return variants ? variants.some(item => item.value === value) : FLAVORS.includes(value as Flavor)
  }

  function refresh() {
    const active =
      variants?.find(item => item.value === flavor)?.node ??
      nodes.find(node => flavorOf(node.lang) === flavor) ??
      nodes[0] ??
      null
    const next: CodeblockSnapshot = {
      flavor,
      expanded,
      active,
      collapsible: isCodeCollapsible(active?.content ?? ''),
      preview: nodes.find(node => node.load && flavorOf(node.lang) === nativeFlavor) ?? null,
      copy: copyFeedback.getSnapshot()
    }
    // 渲染期 setInputs 会随宿主重渲染反复重算，而父组件每次都传入新数组（不能比引用）。
    // 派生值未变时必须复用上一份快照引用：React 的 useSyncExternalStore 把「getSnapshot
    // 返回了新引用」当 store 变化，会立即再渲染并再进 setInputs，陷入重渲染循环。
    const prev = snapshot
    if (
      prev &&
      prev.flavor === next.flavor &&
      prev.expanded === next.expanded &&
      prev.active?.lang === next.active?.lang &&
      prev.active?.content === next.active?.content &&
      prev.collapsible === next.collapsible &&
      prev.preview?.load === next.preview?.load &&
      prev.copy.status === next.copy.status &&
      prev.copy.run === next.copy.run
    ) {
      return
    }
    snapshot = next
  }

  function publish() {
    refresh()
    listeners.forEach(listener => listener())
  }

  refresh()

  return {
    getSnapshot: () => snapshot,
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setInputs(next) {
      nodes = next.nodes
      variants = next.variants
      // 新输入里没有当前 flavor（文档切换、variants 变化）时退回初始值。
      if (!isKnownFlavor(flavor)) flavor = variants?.[0]?.value ?? nativeFlavor
      refresh()
    },
    selectFlavor(value) {
      const next = variants ? variants.find(item => item.value === value)?.value : FLAVORS.find(item => item === value)
      if (!next || next === flavor) return
      flavor = next
      publish()
      resetPanelScroll()
    },
    toggleExpanded() {
      const next = !expanded
      expanded = next
      publish()
      if (!next) resetPanelScroll()
    },
    copy: () => copyFeedback.copy(),
    dispose: () => copyFeedback.dispose()
  }
}
