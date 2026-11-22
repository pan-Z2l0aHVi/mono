/*
 * 置空 `window.ScrollTimeline`：让 OverlayScrollbars 走 JS 变量驱动的 handle 位移路径。
 *
 * 为什么要有这一步：OverlayScrollbars v2 在支持 `ScrollTimeline` 的引擎上用 scroll() 时间线
 * 动画驱动 thumb 位移（`--os-scroll-percent` 变量路径被整体跳过，位置完全交给动画）。时间线
 * 的滚动区间取自滚动源的可滚动溢出，而 **WebKit 在内容高度动态变化后不重算隐式时间线的
 * 区间**——区间停在某个历史布局值上。虚拟化列表（virtua）的估算高度会在滚动过程中不断修正，
 * 区间于是长期偏离真实布局：列表滚到底、甚至把 thumb 拖到轨道底端，画面上的 thumb 仍停在
 * 半途，轨道下端留白且无法继续拖动；窗口 resize 会强制区间重算、thumb 立即归位——这是定位
 * 该缺陷的关键实验（2026-11 真机 WKWebView 实测，Chrome 无此问题）。
 *
 * 置空后库按「无 ScrollTimeline 环境」（Firefox 即此形态）的既定路径工作：滚动事件同步
 * `--os-scroll-percent` 变量，thumb 位置与库缓存的几何永远一致。代价是 thumb 位移从合成器
 * 动画退回主线程样式更新，肉眼无差别。
 *
 * 为什么放在这里而不是 `@greypan/app-scrollbars`：OverlayScrollbars 在模块顶层读取一次该
 * API，守卫必须先于它求值。打包器会把外部依赖的 import 提升到产物顶部，包内任何「先导入
 * 守卫模块」的写法经打包后都会落到 overlayscrollbars 求值之后——真机已复现失效。应用入口的
 * 第一条导入在 dev（vite 逐模块求值）与 prod（rollup 按执行序拼接）下都先于一切依赖求值，
 * 是唯一可靠的挂载点。仓库内其它直接依赖 overlayscrollbars 的代码（AddDialog、
 * DuplicateConfirmDialog 经 overlayscrollbars-vue）都在本入口的下游，天然被覆盖。
 */

if (typeof window !== 'undefined') {
  ;(window as unknown as { ScrollTimeline?: unknown }).ScrollTimeline = undefined
}
