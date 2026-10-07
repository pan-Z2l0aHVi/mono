import { ClickScrollPlugin, OverlayScrollbars, type PartialOptions } from 'overlayscrollbars'

import './style.css'

/**
 * `scrollbars.theme` 的取值，同时也是 `@greypan/web-ui/scrollbars.css` 里主题类的名字。
 */
export const WEB_UI_SCROLLBARS_THEME = 'os-theme-macos'

/*
 * track 点击滚动由 ClickScrollPlugin 提供；插件未注册时 `clickScroll` 静默失效——
 * 不报错、不打日志，轨道只是没有反应。注册写在模块作用域，只要消费方用了本模块，
 * 插件就一定在位，不会因为漏掉一行 bootstrap 而退化。
 */
OverlayScrollbars.plugin(ClickScrollPlugin)

/**
 * 全仓统一的滚动条行为：外观对齐 macOS、自动隐藏、滚动时短暂显示、track 点击跳转。
 *
 * 内容尺寸或平台变化都不需要改这里，只有三条产品要求本身变了才改。覆盖层要实现的是
 * 同一套手势语言，所以用法是把它整个传给 OverlayScrollbars 初始化，而不是逐项拼接：
 *
 * ```ts
 * import { webUiScrollbarsOptions } from '@greypan/web-ui/scrollbars'
 * import '@greypan/web-ui/scrollbars.css'
 * ```
 *
 * - `autoHide: 'scroll'`：滚动条只在滚动时出现，停下 `autoHideDelay` 之后自动隐去。用户明确选了
 *   这一档而不是 `'move'`——`'move'` 会让指针在滚动区域内移动就唤出，比 macOS 原生积极得多。
 *   代价写清楚：**hover 本身不再唤出滚动条**（隐藏态的元素不可命中，指针根本落不到它上面），
 *   所以 issue 里「hover 的时候短暂显示」那条只以「滚动时短暂显示」的形式满足。
 * - `autoHideDelay: 2500`：这一档同时是「track 点击跳转」的可用窗口——滚动条隐去后它就不可命中。
 *   指针从滚动的位置移到轨道、再点下去，实测预算在 1s 上下，默认的 1300ms 太贴边；2500ms 留出
 *   余量又不至于让半透明滚动条在静止画面上久留（macOS 原生的淡出也在 2–3s 这个量级）。
 * - `autoHideSuspend` 保持关闭：打开会让滚动条在首次滚动前一直可见，与「自动隐藏」相反。
 * - `clickScroll` 走函数形态：`true` 只是「按一个视口步进」，跳到的是当前位置的下/上一屏，
 *   与点击处的距离无关。`clickScrollDistance: 0` 才是「以点击处为目标」——库把 0 定义为
 *   「距离等于目标距离」，于是 200ms 内滚到点击的位置。函数形态是必需的：这个选项只在
 *   实现里经过 `isFunction` 分支才会被读到，直接传对象会被静默忽略。
 */
export const webUiScrollbarsOptions: PartialOptions = {
  scrollbars: {
    theme: WEB_UI_SCROLLBARS_THEME,
    autoHide: 'scroll',
    autoHideDelay: 2500,
    clickScroll: () => ({ clickScrollDistance: 0 })
  }
}
