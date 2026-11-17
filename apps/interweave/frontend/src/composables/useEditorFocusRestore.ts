import type { WebUiEditableText } from '@greypan/web-ui'
import { nextTick, watch, type Ref } from 'vue'

type LitHost = HTMLElement & { updateComplete?: Promise<unknown> }

/**
 * 焦点在 WebKit 里的交接时机：编辑态切换会让目标控件在同一帧里重建，WKWebView 需要
 * 先结束当前帧的布局才肯接受下一帧的 focus()，否则会把焦点移回 drawer 或消失。
 */
function nextLayoutFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

/**
 * 聚焦 Lit 组件 shadowRoot 内的真实控件。宿主自己的 updateComplete 先结算，再等一帧；
 * selector 为空时聚焦宿主本身（行容器这类自带 tabindex 的宿主）。
 */
export async function focusLitControl(host: HTMLElement | null | undefined, selector = 'button'): Promise<void> {
  if (!host) return
  await (host as LitHost).updateComplete
  await nextLayoutFrame()
  if (!selector) {
    host.focus()
    return
  }
  const control = host.shadowRoot?.querySelector<HTMLElement>(selector)
  control?.focus()
}

/**
 * 编辑态打开后把焦点交给编辑器。isStillCurrent 在焦点落地前再查一次：期间用户可能
 * 已经退出编辑或切换到别的行，此时不能再把焦点抢回来。
 */
export async function selectLitEditor(
  editor: WebUiEditableText | null | undefined,
  isStillCurrent: () => boolean = () => true
): Promise<void> {
  if (!editor) return
  await nextTick()
  await (editor as LitHost).updateComplete
  await nextLayoutFrame()
  if (!isStillCurrent()) return
  editor.select()
}

export interface EditorFocusRestoreOptions {
  /** 编辑态结束时焦点是否仍在该 key 的编辑器上；不满足就不归还。 */
  heldFocus?: (key: string) => boolean
  /** key 对应的归还目标；返回 null 表示目标已卸载。 */
  target: (key: string) => HTMLElement | null | undefined
  /** 目标里要聚焦的控件选择器，默认 Lit 组件 shadowRoot 里的 button。 */
  selector?: string
}

/**
 * 编辑态从 key 翻回 null 后，把焦点交还给触发控件。三处改名入口（添加队列、列表行、
 * 详情标题）共用同一条判定：编辑器仍持有焦点才归还，否则用户已经去了别处。
 */
export function useEditorFocusRestore(
  editing: Ref<string | null> | (() => string | null),
  options: EditorFocusRestoreOptions
): void {
  const read = typeof editing === 'function' ? editing : () => editing.value
  watch(
    read,
    (next, prev) => {
      if (!prev || next !== null) return
      if (options.heldFocus && !options.heldFocus(prev)) return
      void nextTick(() => focusLitControl(options.target(prev), options.selector))
    },
    { flush: 'pre' }
  )
}
