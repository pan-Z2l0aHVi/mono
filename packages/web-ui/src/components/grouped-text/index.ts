import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import {
  groupedRuns,
  parseGroupsAttribute,
  resolveGroups,
  type GroupedRun,
  type GroupedTextGroupsInput
} from './grouping'

export type { GroupedTextPreset, GroupedTextGroups, GroupedTextGroupsInput } from './grouping'

import style from './style.css?inline'

/*
 * 两个形状各自写成一行：**模板里不许出现换行与缩进**。Lit 将标记之间的空白落成文本节点，
 * 而复制读的是文本节点的 data——组间多一个换行，剪贴板就多一个换行，组件唯一的硬需求当场失效。
 *
 * 分隔符走 `data-separator` attribute，由 `.group[data-separator]::after` 取 attr() 渲染成生成内容：
 * 文本节点一个不多。它是末组之外每组一个；末组与整串自成一组时 Lit 摘掉空值 attribute，
 * 渲染与没有分隔符时逐节点相同。
 */
function renderRun(run: GroupedRun, separator: string) {
  if (run.gap === '') return html`<span class="group">${run.body}</span>`
  return html`<span class="group" data-separator=${separator || nothing}
    >${run.body}<span class="gap">${run.gap}</span></span
  >`
}

/**
 * 组块显示：把长数字或字符串按组撑开肉眼可见的间隙，同时让「选中并复制」拿到的仍是**原始连续串**。
 *
 * 适用面是复制出去要能直接用的连续标识符——银行卡号、手机号、大额金额。间隙走字距而不走字符或
 * 外边距：分隔符一旦写进文本节点，复制、页内查找、双击选词三件事同时坏掉；`margin` 撑出的间隙落在
 * 两个文本片段之外，选区高亮会在每个组间断开一条与间隙等宽的洞，而 `::selection` 用不了布局属性，
 * 补不掉。实测边界与取证见 docs/research/web-ui-grouped-text-261102.md。
 *
 * 只读显示：没有事件、没有插槽、不参与表单。`value` 始终是那串原文，渲染只是把它切成首尾相接的组
 * 并给每组末位挂上字距，`renderRoot.textContent` 拼回去等于 `value`。
 */
@customElement('web-ui-grouped-text')
export class WebUiGroupedText extends LitElement {
  static override styles = [unsafeCSS(style)]

  /** 要显示的原始连续串。组件只读它，不回写。 */
  @property({ type: String }) value = ''

  /**
   * 组形：`'card'`（每 4 位一组）、`'phone'`（3-4-4）、`'amount'`（整数部分从右往左每 3 位一组，
   * 小数点连同小数部分自成一组），或显式的逐组字素簇数数组（如 `[4, 4, 4, 4]`）。
   *
   * 字符串写法在 attribute 与 property 两条通道都认：`groups="card"`、`groups="4,4,4,4"`。Vue 这类
   * 框架发现 `'groups' in el` 成立就直接赋 property，`fromAttribute` 转换器不会跑，所以解析不能只挂在
   * attribute 那条路上。省略或读不出时**不分组**——猜一个组形会把身份证按 4 位切开，那种错切比
   * 不分组的可见成本高得多。
   */
  @property({ converter: { fromAttribute: parseGroupsAttribute } }) groups?: GroupedTextGroupsInput

  /**
   * 组与组之间展示的分隔符（如 `'-'`、`'·'`）。只做展示：它以 `.group` 的生成内容渲染，不进文本
   * 节点，因此选中复制、页内查找与双击选词拿到的仍是原始连续串。省略或空串时不渲染分隔符。
   */
  @property({ type: String }) separator = ''

  override render() {
    return html`${groupedRuns(this.value, resolveGroups(this.groups)).map(run => renderRun(run, this.separator))}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-grouped-text': WebUiGroupedText
  }
}
