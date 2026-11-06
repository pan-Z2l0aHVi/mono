<!-- corpus-status: reference -->

# Theme transition 的输入行为调研

调研日期：2026-11-06。以下规范结论是标准要求，不能替代目标 WebView 的实际验证。

## View Transition 与 hit testing

- 在 document 的 rendering suppression 为 true 期间，所有 pointer hit testing 都指向 document element；已经 capture 的 pointer 不受此规则影响。这是 capture 和更新阶段的规则，不能通过给 transition pseudo-element 设置 `pointer-events: none` 改写。[CSS View Transitions Level 1](https://drafts.csswg.org/css-view-transitions-1/#document-rendering-suppression-for-view-transitions)
- `animating` 阶段另有规则：参与 transition 的元素及其内容在原 DOM 位置不绘制，也不参与 hit testing；transition pseudo-element 的后代除外。默认 root 参与 transition，因此不能假设仅给 overlay 设置 `pointer-events: none` 就能恢复整个页面的交互。未参与 transition 的元素可通过禁用 overlay 的 pointer events 保持交互，但要同时检查 root 是否参与。[CSS View Transitions Level 1](https://drafts.csswg.org/css-view-transitions-1/#captured-in-a-view-transition)、[Chrome 开发文档](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/group-element-transitions)
- `ready` 表示 pseudo-element tree 已创建且动画即将开始；`finished` 表示 transition 已结束。跳过动画的 `skipTransition()` 不会跳过 DOM update callback。异常或跳过时也要处理 promise 的 rejection 和清理，不能只按成功路径维护输入状态。[ViewTransition 接口](https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition)

## Pointer Events 与 click

- 对 `pointerdown` 调用 `preventDefault()` 可以阻止某些 compatibility mouse events，但规范明确规定，取消 pointer event 不得影响 `click`、`auxclick` 或 `contextmenu` 是否触发。因此它不是阻止 click 激活的可靠方案。[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/#compatibility-mapping-with-mouse-events)
- Pointer capture 使后续 pointer events 指向 capture target，并不等同于阻止 click。click 的 target 另有计算规则：相关 `pointerup` 被 capture 时使用其 target，否则通常使用 `pointerdown` 与 `pointerup` target 的最近公共祖先。capture 的释放、节点移除和设备行为仍需在目标环境验证。[Pointer Events Level 3：事件派发](https://www.w3.org/TR/pointerevents3/#the-click-auxclick-and-contextmenu-events)、[Pointer capture](https://www.w3.org/TR/pointerevents3/#pointer-capture)
- 若产品要求阻止特定激活，应在实际 `click` 的处理路径处理该事件及其默认行为，并考虑键盘产生的 click；仅拦截 pointerdown 或依赖 overlay 不足以覆盖所有输入。是否阻止以及何时恢复应由明确的交互语义决定。

## 可选方向与验证

- 调研时的 `web-ui-theme` 在 `window` capture 阶段拦截所有 `pointerdown`，并对滚轮执行 `skipTransition()`；这波及主题控件以外的输入，也可能截断后注册的全局监听器。该拦截不覆盖键盘激活或程序赋值，且不能单凭 `preventDefault()` 保证阻止 `click`。现有浏览器测试仅人工派发并检查被取消的 `pointerdown`，不能证明完整用户点击序列的行为。
- 更贴近需求的方案是由主题选择入口维护一次切换的进行状态，仅在进行中拒绝该入口的后续选择，并以 `ViewTransition.finished` 的完成、跳过及失败路径解除；还需处理键盘、受控组件内部选择与宿主状态一致性。共享组件需要提供可观测的生命周期或受控切换接口，不能通过固定 500ms 计时器推断结束。
- 不主动拦截输入而依赖浏览器的 transition 命中规则更简单，但不保证键盘或程序化切换被忽略；保留 `skipTransition()` 则更快恢复交互，却会中断视觉过渡。这两种策略各有不同的产品行为，应先明确优先级。
- 局部变化可考虑 `element.startViewTransition()`：只捕获该 subtree，scope 外的页面保持交互。Chrome 文档称此能力从 Chrome 147 提供；应检测 `Element.prototype.startViewTransition` 并在不支持时直接执行更新。全局主题变化通常跨越整个页面，局部 scope 未必适用，需按实际视觉范围评估。[Chrome：element-scoped view transitions](https://developer.chrome.com/docs/css-ui/view-transitions/element-scoped-view-transitions)、[Chrome：fallback](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/scoped-component-transitions)
- 在目标浏览器或 WebView 分别验证 suppression 与 animation 期间的 pointerdown、pointerup、click target，覆盖 mouse、touch、已有 pointer capture、快速连续操作和键盘激活；不要把 CSS 规范或 Chrome 支持情况直接当成其他引擎的运行结果。
