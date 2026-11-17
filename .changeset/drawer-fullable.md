---
'@greypan/web-ui': minor
---

`web-ui-drawer` 新增 `fullable` 属性（默认 `false`，需同时开启 `draggable`）：向外拖拽越过行程阈值或快速向外甩动松手时，抽屉吸附为占满视口的形态（非 headless 减去四周留边），不要求松手；同一按住的手势往回拉先恢复原尺寸，继续朝关闭方向拉过自身尺寸的一半才关闭。full 形态下按钮 / Escape / 遮罩照常直接关闭，上层新开嵌套抽屉时立即恢复原尺寸。默认关闭，现有 `draggable` 消费方行为不变。

嵌套层叠的 `applyLayers` 重构为「算 depth → 回调 → 读尺寸」的固定顺序，并新增 `onDepthChange` 选项：drawer 借此在读取几何之前同步收起 full 态，露边数学不再可能被过渡中的尺寸污染。
