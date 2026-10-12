---
'@greypan/web-ui': patch
---

fix(context-menu): 菜单项回调里自行 close() 时也让 scrim 提前出顶层，保住消费方的焦点转移

`close()` 判定「要不要立刻让 scrim 退出 top layer」时只读 `_closeSource`，而那个标志由面板上的
`_onMenuClick` 在**冒泡**阶段置位。消费方在自己的菜单项回调里直接调 `close()` 时，回调挂在条目上、
先跑，`close()` 看到的仍是 `'default'`：scrim 留在 top layer 里不退，模态期间整份文档是 inert 的，
消费方紧接着送进编辑器的焦点被浏览器静默丢弃。

现象是「触发重命名后焦点停在菜单项上，编辑器根本没进编辑态」（interweave 资源列表 issue #220）。
本仓已有一条用例守着同一根因的另一种落点（回调不自己关菜单时，UA 归还焦点会 blur 掉编辑器并提交
未改动的标题），但它盖不到这条路径。

改法是新增一次性标志 `_menuItemActivated`：面板在**捕获阶段**记下「可激活的菜单项被点了」，
`close()` 的判定把它与 `_closeSource` 并列。判据复用 `getMenuItemFromEvent` 并排除 disabled 与
submenu 项，与 `_onMenuClick` 同源。

标志的作用域是**一次事件派发**，在微任务检查点复位：捕获阶段与冒泡阶段（关闭动作发生在那里）
都在同一个任务内跑完，需要它判定的两条路径都赶得上；而「点了菜单项但菜单没关」（消费方在自己
的条目回调里 `stopPropagation()`）必然跨过检查点，标志已被清掉，不会让后续的 Escape / 点外面 /
程序式关闭被误判成菜单项激活。那三种关闭的语义不变，仍保留 dialog 默认效果。
