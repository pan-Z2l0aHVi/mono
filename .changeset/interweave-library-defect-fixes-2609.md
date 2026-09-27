---
---

Internal change: 四个缺陷修复都落在 `apps/interweave/frontend`，`@greypan/interweave-frontend` 在 `.changeset/config.json` 的 `ignore` 列表里，没有已发布包受影响，因此本条 changeset 按惯例留空 frontmatter。

**待添加项名称在编辑态跳排版（#190）**。`LibraryAddDialog` 里静态名称带全套排版 class，`web-ui-editable-text` 一个都没有，字重、颜色因此各自取到不同的计算值。组件本身没有 bug：它的排版全部继承宿主，两态只切换 visibility。现在两个分支共用同一份 `queueNameClass`，flex 基准也一并收敛；换行语义靠 `--wui-editable-text-white-space` 收成 nowrap，否则编辑态会沿用组件为多行编辑准备的 `pre-wrap`，长名称折行顶出固定 h-8 的行槽。

**确认弹窗取消时尺寸塌陷（#189）**。`closeConfirmDialog` 原本在同一个 tick 把内容置空、同时翻 `:open`，标题、说明、按钮文案一起塌成空串，弹窗高度单帧掉 61.6px；`compact` 还从标题字符串派生，紧凑变体宽度从 320px 跳回默认的 360px。`:open` 现在由独立的 `confirmOpen` 驱动，内容保留到下一次打开时整体替换，页面侧不必复述退场动画时长；`compact` 收进请求自身，不再从文案反推。确认失败时弹窗保持打开、错误可见、可以再点，这条行为没有变化。

**粘贴网页链接（#188）**。添加弹窗此前根本没有链接入口：`OSService.GetClipboardFilePaths()` 对文本 URL 返回空数组，`enqueueFileLocations([])` 迭代零次就结束，既不添加也不报错。现在 paste 事件把剪贴板文本一并交给页面，拿不到文件时按链接再解析一次，校验与找回资源弹窗共用同一个 http/https 判断，非法输入给一句可读的中文错误。`addQueue` 支持 `kind: 'url'`：重复检查走 `SourceTypeURL`，默认 kind 是 web，不跑本地预览准备。URL 项的标题留空，由后端按 hostname 或页面 `<title>` 定名——队列里预填的猜测值会在提交时把那个名字覆盖掉；列表用主机名兜底显示，完整链接落在位置栏。标题留空也让编辑框和静态名断了线：静态名显示主机名，编辑框却绑着空 `title`，点铅笔进去是空框。因此编辑框改从同一个显示值起步，空提交回落到显示值、不算一次改名，真正改过才发 `rename`。提交接到既有的 `addURLResource` 分支。浏览器预览模式下 `addURLResource` 返回「添加网页链接」不受支持，因此这条路径的最终入库需要在桌面模式确认。

**hover 行按空格预览（#187）**。行原本没有键盘可达性，hover 是纯 CSS。按已确认的决定做成纯鼠标的隐藏入口，不引入焦点管理或 roving tabindex：行显式派发 hover 态，列表持有 `hoveredResourceId`，在 `window` 上按空格时按这个判据决定是否 `preventDefault()` 并派发 `preview`。拦截范围收在「本列表当前有 hover 行」这一个条件上——鼠标不在行上、带修饰键（含 Shift+Space 这个「向上滚一屏」的常规手势）、焦点在编辑控件、列表滚动中都不接管，右键打开菜单时 hover 态一起作废，空格不会从菜单背后再开一次预览。代价是键盘用户拿不到这个入口。

**编辑控件的判定跨不过 shadow 边界（#187 引入，随 #188 一并修）**。「焦点在编辑控件」这条判据原本看 `event.target` 加 `closest()`：监听器挂在 `window` 上，而输入控件都封在 web-ui 的 shadow 里（`input` 的 `<input>`、`editable-text` 的编辑层 `<textarea>`），这些 keydown 与 paste 是 composed 的，冒到 window 时 `event.target` 已被 retarget 成 shadow host，而 host 上的 `closest()` 不跨 shadow 边界——判据漏掉真正的编辑控件。于是工具栏搜索框里打的空格被吃掉（查询词少一个词，还顺带弹一个预览抽屉），行内改名打不出空格；添加弹窗里在名称上按 Cmd+V 会被当成往队列里粘贴，把剪贴板里的链接也顺带入队。改判 `event.composedPath()` 的完整传播链，两处同源判据一起改掉。
