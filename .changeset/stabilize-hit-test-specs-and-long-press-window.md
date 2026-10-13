---
'@greypan/web-ui': patch
---

fix(web-ui): 长按补发事件窗口改以手势结束为起点，并让 hit-test 类 spec 等布局定版

两件事都只影响「负载下量到的几何不是终态」这一类 flaky：

1. `context-menu` 长按开菜单后吸收引擎补发 `contextmenu` / `click` 的窗口，起点从
   **菜单打开时刻**改到**手势结束（pointerup）时刻**。补发事件由引擎在 touchend 处理时
   生成，与那次 pointerup 同属一个输入批处理（实测 click 的 `timeStamp` 与 pointerup 的
   处理时刻相差 ≤3ms）；而主线程被长任务占住时，touchend 的处理能比菜单打开晚 1s 以上
   （实测 1325ms）。以打开时刻为起点，1000ms 的兜底上限会被那段延迟挤爆——补发 click
   落到窗口外，被当成用户真实点击把**同一次长按刚打开**的菜单关掉。窗口的两条硬边界
   （下一次 `pointerdown`、菜单关闭）不变，只把起点换成与补发事件同源的那个时刻。

2. 指向 shadow DOM 的命中测试 spec 原先只等比 dialog 矩形两次相等，两个方向都不够：
   进场过渡的进度只在渲染步进里推进，`getBoundingClientRect()` 的强制重算不推它，于是
   「相等」也可以意味着过渡还没起跑（量到的是闭合位矩形，胶囊整个在视口外，
   `elementFromPoint` 返回 null）；而 header / footer 的让位量由 `ResizeObserver` 写回
   宿主样式，移动的是热区 / 热边而不是 dialog 矩形。`drag-bar-edge-inset`、
   `header-drag-surface` 与 `long-press` 三个 spec 改用共享的
   `waitForSettledLayout()`：等过渡跑完 → 抽干一次 ResizeObserver 批次 → 再等一帧让
   写回的样式进入布局 → 连续若干帧矩形真的不再变化。断言一字未改，改的只是取样前的等待。

负载下的复现率（两个 web-ui browser suite 并发 + CPU 满载）：修前 12 次聚焦运行里
6 条失败（涉及 4 个用例），修后 24 次聚焦运行与 16 次全量 suite 运行 0 失败。
