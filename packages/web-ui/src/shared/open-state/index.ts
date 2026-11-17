import type { LitElement } from 'lit'

/**
 * overlay 族 `open-change` 事件的单一发出点与契约说明。
 *
 * 同名事件存在两种 flavor（事件模型见 ADR-0005 §2.4，勿混淆）：
 * - **request 语义**（dialog / drawer / layout）：controlled 属性开启时，
 *   `open-change` 是用户的关闭/打开"请求"，组件不自行修改 `open`，等待回写；
 * - **notification 语义**（popover / tooltip / dropdown / context-menu /
 *   select / autocomplete / collapse）：组件总是自行变更 `open`，事件只作通知。
 *
 * 两种 flavor 的机械发出在此收敛；flavor 决策（是否 controlled 门控）留在各组件。
 */
export interface OpenChangeEventDetail {
  open: boolean
}

export function dispatchOpenChangeEvent(host: LitElement, open: boolean): void {
  host.dispatchEvent(
    new CustomEvent<OpenChangeEventDetail>('open-change', {
      detail: { open },
      bubbles: true,
      composed: true
    })
  )
}

/**
 * `closed` 是关闭完成的通知语义：视觉退场结束、原生 dialog 已离开 top layer。
 * 它与 `open-change` 的请求语义并行，只供宿主做「关闭之后」的收尾（恢复焦点、清内容）。
 */
export function dispatchClosedEvent(host: LitElement): void {
  host.dispatchEvent(new CustomEvent<void>('closed', { bubbles: true, composed: true }))
}
