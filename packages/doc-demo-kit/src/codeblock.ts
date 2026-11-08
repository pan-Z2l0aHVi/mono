import type { MetaNode } from '@greypan/md-to-meta'
// 运行时只引纯契约子路径：根入口会把生成期依赖（shiki、tinyglobby）拖进浏览器图。
import { LINE_NUMBER_CLASS, lineCountOf } from '@greypan/md-to-meta/contract'
import { OverlayScrollbars } from 'overlayscrollbars'

/** 生成器写进 meta 的字面加载 thunk；同一份 meta 模块里引用同一个函数，可作缓存键。 */
export type DemoThunk = NonNullable<MetaNode['load']>

// 复制成功的描边与 scale 反馈共用同一时长；CSS 里的 `demo-copy-pop` 要同步。
export const COPY_FEEDBACK_DURATION = 500

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
  /** 每次复制递增：宿主拿它当成功态描边的 key，重复复制也能重新挂载、各播一次动画。 */
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
    publish({ status: ok ? 'copied' : 'failed', run: snapshot.run + 1 })
    clearTimeout(timer)
    timer = setTimeout(() => publish({ status: 'idle', run: snapshot.run }), idleDelay)
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
