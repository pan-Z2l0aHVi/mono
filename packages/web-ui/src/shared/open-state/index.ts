import type { LitElement } from 'lit'

/**
 * overlay 族 `open-change` 事件的单一发出点与契约说明。
 *
 * 同名事件存在两种 flavor（决策见 ADR-0005 / ADR-0007，勿混淆）：
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
