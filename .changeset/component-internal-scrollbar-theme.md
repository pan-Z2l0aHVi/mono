---
'@greypan/web-ui': patch
---

组件内部的滚动条接上整页同一套 macOS 滚动条主题，且不额外引入滚动条依赖（#225）。

`web-ui-theme` 的外观分支、`.os-theme-macos` 主题都活在文档层：`.os-scrollbar` 的结构样式是
文档级选择器，shadow root 永远匹配不到，所以组件内部的滚动容器此前一直是浏览器默认滚动条。
本次给这些容器加一个 `.wui-scroll` 工具类，在组件自己的 shadow 里 adopted 一份只读继承 token 的
样式：`scrollbar-color: var(--wui-scrollbar-handle, rgb(0 0 0 / 0.39)) transparent` +
`scrollbar-width: thin`。自定义属性跨 shadow 边界继承，颜色因此与整页的覆盖式滚动条同源；
样式只 adopted 进各组件的 shadow，不落文档层。覆盖 select、autocomplete、菜单浮层
（dropdown / context-menu，含 portal 与 top layer 两种容器）、dialog 的 `.desc` 与 headless 内容区、
drawer 内容区、toast 容器。

**结论：用纯 CSS，不引入 OverlayScrollbars，也不删除既有依赖。** 库继续服务文档/应用级滚动条
（它是唯一能做出「可见 + 自动隐藏 + 零布局宽度」覆盖式滚动条的东西），但把库初始化进每个
shadow root 需要用 JS 重建每一条滚动条，超出 issue「组件不必引入第三方依赖」的范围。

**为什么不用 `::-webkit-scrollbar`：** 它是纯 CSS 里唯一能拿到 macOS 几何（细拇指、圆角）的手段，
但一旦声明，引擎就会放弃平台自带的覆盖式滚动条，改用经典滚动条并固定占一条布局宽度。实测
（macOS Chromium，`width: 7px`）：同尺寸容器的 `offsetWidth - clientWidth` 从 0 变成 7，直接违反
issue 的第 (1) 条「不占用宽度」。`scrollbar-color` / `scrollbar-width` 不触发这个切换——覆盖式
平台上滚动条保持零宽覆盖，经典平台上才按它们上色、收窄。

**未覆盖的既有缺口（沿用 #233 已记录的两条，本次不扩大也不修复）：** (a) `var()` 回退值恒为黑拇指，
无任何 `web-ui-theme` 的深色页面在组件内部同样拿到黑拇指——与整页 `.os-theme-macos` 一致，属同
一条既有缺口；正确的修法是在主题 token 层给出跟随外观的回退，会改变文档级 `scrollbars.css` 对库
路径的既有行为，超出本 issue 的组件内部范围。(b) 只覆写 `--wui-scrollbar-handle` 的消费方在**
库路径**上悬停档只 +0.01：本条只涉及 `.os-theme-macos` 的 hover/active 字面量，`scrollbar-color`
没有悬停态，组件内部路径不受影响，故一并保持原样。

新增 `src/scrollbars/__tests__/internal-scrollbars.browser.spec.ts`：在真实浏览器里量 dialog
内容区的计算 `scrollbar-color` 随 `web-ui-theme` 的浅/深外观切换，并断言滚动条不占布局宽度
（`offsetWidth - clientWidth === 0`）。`scrollbars.spec.ts` 追加源码形状断言：走 `var()` 读 token、
`scrollbar-width: thin`、且**不出现** `::-webkit-scrollbar`（这条是承重的，变异已验证）。
