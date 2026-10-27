import './style.css'

import { ClickScrollPlugin, OverlayScrollbars, type PartialOptions } from 'overlayscrollbars'

/**
 * `scrollbars.theme` 的取值，同时也是 `src/style.css` 里主题类的名字。
 */
export const APP_SCROLLBARS_THEME = 'os-theme-macos'

/*
 * track 点击滚动由 ClickScrollPlugin 提供；插件未注册时 `clickScroll` 静默失效——
 * 不报错、不打日志，track 只是没有反应。注册写在模块作用域，导入本模块时插件就一定在位，
 * 不会因为漏掉一行 bootstrap 而退化。
 */
OverlayScrollbars.plugin(ClickScrollPlugin)

/**
 * 应用级统一的 scrollbar 行为：外观对齐 macOS、自动隐藏、滚动时短暂显示、track 点击直达。
 *
 * 它只服务应用表面。`@greypan/web-ui` 的组件内部滚动容器不经过 OverlayScrollbars，改用原生
 * `scrollbar-color` / `scrollbar-width` 读 theme 的 `--wui-scrollbar-handle`；本包因此不进组件库，
 * 也不被 `web-ui` 依赖。
 *
 * 样式随本模块一起导入，不需要单独引用。
 *
 * ```ts
 * import appScrollbarsOptions from '@greypan/app-scrollbars'
 * ```
 *
 * - `autoHide: 'scroll'`：scrollbar 只在滚动时出现，停下 `autoHideDelay` 之后自动隐去。用户明确选了
 *   这一档而不是 `'move'`——`'move'` 会让指针在滚动区域内移动就唤出，比 macOS 原生积极得多。
 *   代价写清楚：**hover 本身不再唤出 scrollbar**（隐藏态的元素不可命中，指针根本落不到它上面）。
 * - `autoHideDelay: 2000`：这一档同时是「track 点击跳转」的可用窗口——scrollbar 隐去后它就不可命中。
 *   指针从滚动的位置移到 track、再点下去，实测预算在 1s 上下，默认的 1300ms 太贴边；2000ms 留出
 *   余量，又不至于让半透明 scrollbar 在静止画面上久留（macOS 原生的淡出也在 2s 这个量级）。
 * - `autoHideSuspend` 保持关闭：打开会让 scrollbar 在首次滚动前一直可见，与「自动隐藏」相反。
 * - `clickScroll` 走函数形态：`true` 只是「按一个视口步进」，跳到的是当前位置的下/上一屏，
 *   与点击处的距离无关。`clickScrollDistance: 0` 才是「以点击处为目标」——库把 0 定义为
 *   「距离等于目标距离」。函数形态是必需的：这个 option 只在实现里经过 `isFunction` 分支才会被读到，
 *   直接传对象会被静默忽略。
 * - `clickScrollDuration: 0`：库默认用 200ms 缓动滚到点击处，在渲染虚拟列表的资源列表上会卡顿，
 *   这里改成即时落位。0 是合法时长而不是「非法值被忽略」：`animateNumber` 先用 `Math.max(0, ms)`
 *   得到时长 0，首帧（同步执行、不经 rAF）就判定已到期并落到终点。
 */
export default {
  scrollbars: {
    theme: APP_SCROLLBARS_THEME,
    autoHide: 'scroll',
    autoHideDelay: 2000,
    clickScroll: () => ({ clickScrollDistance: 0, clickScrollDuration: 0 })
  }
} satisfies PartialOptions
