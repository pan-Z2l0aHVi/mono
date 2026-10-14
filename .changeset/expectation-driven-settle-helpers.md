---
'@greypan/web-ui': patch
---

test(web-ui): settle/poll helper 改成期待驱动，并把视口与滚动的设置点纳入等待

只动测试层与测试基础设施，断言与产品代码一字未改。

**「稳定」的定义收紧。** 用户定的口径是「期待驱动为主、帧驱动兜底」：视口、滚动、
样式这类等待改成等**具体的期待值到位**，而不是等「一段时间没变化」。关键认识是
**连续两帧读数相同不足以证明稳**——视口没生效时两帧读到的都还是旧值。

- `waitForAnimationsToFinish` 不再在第一次读到空集合时直接返回。空集合有三种来源：
  已跑完、从未起跑、以及「这一帧还没跑到」，第三种与第一种在读数上无法区分。
  改成要求**连续两个渲染步进**都读到空才返回；取样覆盖传入的全部根而不是第一个；
  `finished` 的 rejection 吞掉（取消意味着「不再跑了」，不该变成未处理的 rejection
  ——`real-gesture` 的 `waitForOpenTransition` 原先会把取消变成用例失败）。
  「确实没动画、不必等」这条快路径因此**在本函数里不存在**：每次调用至少两个渲染步进，
  旧实现读一次空集合就返回。
- 新增 `afterRenderStep()`：rAF 之后再让出一个宏任务，因此返回时样式计算、布局与
  **ResizeObserver 的本批投递**都已落地。`await waitForFrame()` 只保证回调被调用过，
  不保证那一批通知已送到——这正是「连续两帧相同」证明不了「已经就位」的机制来源。
  `drainResizeObserver` / `waitForSettledLayout` / `pollUntil` 统一改用它。
- `waitForSettledLayout` 新增可选 `expect`（期待条件 + 读数诊断），有它时先等期待值
  成立再进入帧驱动收尾；超时诊断带上已耗时与期待值当前读数。
- `pollUntil` 每轮让出完整渲染步进；预算默认 2s → 5s（轮询的进度单位是**帧**，
  帧在负载下会被拉长，2s 的墙钟预算在繁忙 CI 上只够十几帧）；诊断带帧数与已耗时。
  收尾再做一次判定，条件恰好在预算耗尽那一步成立时不误报。放宽的是等待预算不是断言，
  但代价要写明：**真的坏了的用例现在最多花 5s 而不是 2s**，整套的失败墙钟会变长。
  已核过全仓 167 处 `pollUntil` 调用点，没有一处把它当否定断言用（不存在
  「超时即通过」），唯一显式收紧预算的是 layout spec 的去抖守卫（见下）。

**视口与滚动纳入等待。** `page.viewport()` 走的是跨文档往返：iframe 把请求 post 给
orchestrator，orchestrator 改外层容器 CSS 尺寸，再 post `viewport:done` 回来。
往返完成只证明尺寸写进了 orchestrator 的样式，**不证明 iframe 已按新尺寸重新布局**。
新增 `setViewport()` / `scrollWindowTo()` / `scrollElementTo()` / `scrollElementToEnd()`，
一律等期待值本身（`window.innerWidth` 等于目标、`scrollTop` 落定）再让出一个渲染步进。
`web-ui` 的 52 处与两个 demo 的 10 处视口调用点、9 个文件里的滚动设置点全部改用它们。

**顺带修回一条被 helper 改动弄空的守卫。** `layout.browser.spec.ts` 的
「翻转不等 100ms 去抖窗口」原先从 `await page.viewport(...)` 返回那刻起算 80ms 预算；
`setViewport` 等到视口生效才返回，那时 matchMedia 的 change 早已派发、组件早已翻过
`mobile`，那个窗里什么都没发生——守卫名存实亡，负载一拉长还会反过来误报。
改成在 `resize` 事件上取起点、`pollUntil` 的预算按已经过去的时间扣减，
末尾再断一次 `flip 时刻 - resize 时刻 ≤ 80ms`（两个时间戳各自在 `resize` 与
`mobile-change` 的监听里取，与等待 helper 的开销无关）。变异自证：在
`WebUiLayout._onMobileQueryChange` 里临时加回 100ms 去抖，该用例立刻红并报
「跨断点后 80ms 内没有翻转（resize 起已过 84ms）：100ms 去抖被重新引入了」；
还原后产品文件与 HEAD 逐字节相同。

**命中测试的期待值。** `expectInsideViewport()` 把「盒子已完整落在视口内」写成期待值。
`elementFromPoint` 在坐标落到视口外时返回 `null`，于是「胶囊中心命中的是 null」与
「热边没盖住胶囊」在读数上完全一样——前者只是还没进到该有的布局状态。带上读数后
两者在等待阶段就分开了。判据要求宽高里至少有一条为正、并留 0.5px 容差（`getBoundingClientRect()` 是
LayoutUnit 量化值，而 drawer 面板正好贴视口边缘，差 1/64px 就够误判；`display: none`
的零矩形也会被「至少一条边为正」挡住）：`drag-bar-edge-inset` 有一条用例
把 `--wui-drawer-drag-bar-length` 设成 `0px`，那一刻胶囊宽度真的就是 0。

**`real-gesture` 的 `waitForOpenTransition`** 交给共享 helper：原先只查 shadow root 里的
那一个 `dialog`（挂在宿主或更外层上的过渡查不到），且 `Promise.all` 对空数组直接
resolve（等于「读到空就宣布稳定」）。

两个 demo 各留一份 `src/__tests__/viewport.ts`：`test-utils` 不在 `@greypan/web-ui`
的 `exports` 里，把它加进去会把测试辅助代码变成公开契约。
