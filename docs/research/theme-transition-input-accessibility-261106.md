<!-- corpus-status: reference -->

# Theme transition 的输入与无障碍语义

> 状态：非权威参考（时点性研究）。结论以现行 ADR、源码与测试为准。

调研日期：2026-11-06。本文记录规范要求和设计推论；规范不能代替目标浏览器或 WebView 的运行时验证。

## 规范证据

- Document 的 rendering suppression 为 true 时，pointer hit testing 指向 document element；已经 capture 的 pointer 不受这条规则影响。`animating` 阶段另有规则：参与 transition 的元素及其内容在原 DOM 位置不绘制，也不参与 hit testing，transition pseudo-element 的后代除外。不能把这两个阶段等同，也不能假定隐藏 overlay 就能恢复被捕获元素的 hit testing。[CSS View Transitions Level 1](https://drafts.csswg.org/css-view-transitions-1/#document-rendering-suppression-for-view-transitions)、[捕获元素的绘制规则](https://drafts.csswg.org/css-view-transitions-1/#captured-in-a-view-transition)
- `pointer-events: none` 排除元素自身的 pointer hit testing，但不阻止 sequential focus navigation。该属性可继承，后代也可设为 `auto` 重新参与 hit testing。因此它不是键盘操作的通用阻断机制。[CSS UI Level 4](https://drafts.csswg.org/css-ui-4/#propdef-pointer-events)
- 取消 `pointerdown` 可阻止某些 compatibility mouse events，但 Pointer Events 规定取消 pointer event 不得影响 `click`、`auxclick` 或 `contextmenu` 是否触发。[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/#compatibility-mapping-with-mouse-events)
- `inert` 会影响 subtree 的 hit testing、文本选择和编辑；inert 节点通常不能获得 focus，也不会暴露给 accessibility API。它的作用范围不只是忽略一次重复选择。[HTML Standard](https://html.spec.whatwg.org/multipage/interaction.html#inert-subtrees)
- `aria-disabled` 表达元素可感知但不可操作，WAI-ARIA 建议通过外观表明 disabled 状态。ARIA 属性本身不等于功能性禁用：ARIA in HTML 以带 `href` 的链接为例说明，`aria-disabled` 不会自动阻止操作。[WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#aria-disabled)、[ARIA in HTML](https://www.w3.org/TR/html-aria/)

## 对主题选择的推论

若产品要求短暂过渡期间忽略重复选择，并保留原有外观，可以在所有输入方式共享的选择处理路径检查过渡状态。这样无需为这段时间引入 disabled 外观或声明不符合实际的 disabled 语义。这个方案是对上述规范的设计推论，不是规范规定的唯一实现。状态必须在完成、跳过和失败等路径正确释放；具体状态边界和对新选择的处理仍由产品行为决定。

如果操作实际不可用且用户能感知到等待，静默忽略输入可能令人困惑，应评估适当反馈。应在目标环境验证 mouse、touch、键盘和辅助技术操作，覆盖快速重复选择、pointer capture 和过渡失败；上述规范不保证具体引擎实现完全一致。
