# Batch 6c — 容器家族（抽屉 / 图片预览）契约测试重构

> 范围：10 文件 / 139 例（运行期）/ 4162 行 —— `drawer/{drawer.spec, drag-close.browser, glass-inherit.browser,
drag-zone-sizing.browser, nested.browser, reduced-motion.browser, slot-presence.spec, tap-transition.browser}` ·
> `image-preview/{image-preview.spec, image-preview.browser}`
>
> 基线提交 `581c78c5`（b6b closed）。本批是 Batch 6 的最后一批，也是 `batch-plan.md` 里最后一个未闭合批次。
>
> 判据：`DELETION-RUBRIC.md` §12 **C1–C7**（b6b 定，本批沿用，未另立容器条款）+ §10 S1–S6 + §8 R1–R4 + §2 D1–D5。
> 本批**新产出**一条通用裁定 **§13 C8（断言区分力探针纪律）** —— 起因见 §4：本批实测发现**被替换的原断言
> 有 2 处本身是空转的**，而"原断言曾经抓到过什么"这一假设是前 5 批从未验证过的。

## 0. 本批的结论速览

- 用例 **139 → 110（Δ −29）**；全量套件 **1224 例 / 0 失败**（b6b 后为 1253，Δ −29 ✔ 闭合）。
- 整文件删 2 个（`glass-inherit.browser` / `drag-zone-sizing.browser`，兑现 C6 留给 6c 的裁决）。
- `image-preview.browser.spec.ts` 是本次最重的改写：**32 → 25 例、1072 → 674 行**，
  删掉全部 `DOMMatrixReadOnly(...).m41/.a`、`getBoundingClientRect()` 比对、`viewBox` 字形断言。
- **存活的契约全部是公开量**：`handle.index` / `handle.scale` / `open` 反射 / `open-change` 事件与 `detail` /
  `aria-hidden` / `disabled` / `document.activeElement` / slot 投影 / `dialog.open`（top layer）。
- 发现并修复 2 处**空转断言**（§4），其中一处是"原断言从未真正跑过"的历史遗留。

## 1. 用例数对账（逐文件核过，合计闭合）

| 文件                                          | 基线    | 现在    | Δ       | 说明                                                                                         |
| --------------------------------------------- | ------- | ------- | ------- | -------------------------------------------------------------------------------------------- |
| `drawer/glass-inherit.browser.spec.ts`        | 5       | **0**   | **−5**  | **D1 整文件删**（C6 留给 6c 的裁决）                                                         |
| `drawer/drag-zone-sizing.browser.spec.ts`     | 4       | **0**   | **−4**  | **D1 整文件删**（C1 明文点名 drag-zone 尺寸）                                                |
| `drawer/drag-close.browser.spec.ts`           | 15      | 10      | **−5**  | 删 6 例（几何 / 过程跟手 / 2 例 placement 合并为 1）；6 例改名改写；3 例标题未变但体内删断言 |
| `drawer/drawer.spec.ts`                       | 38      | 35      | −3      | 删 3 例内部 Web Animations 实现；2 例由"存在性"改写为行为；保留例内含 D5                     |
| `drawer/nested.browser.spec.ts`               | 12      | 7       | **−5**  | 删 4 例纯几何 + 3 例同级缩放/露边；2 例改名改写；2 例 Esc 层序为新增                         |
| `drawer/reduced-motion.browser.spec.ts`       | 3       | 3       | 0       | 整文件改写（WAAPI + **控制组**），第 3 例改为显式的 S3 控制组                                |
| `drawer/tap-transition.browser.spec.ts`       | 1       | 1       | 0       | 整文件改写（WAAPI），见 §4.2 的探针结论                                                      |
| `drawer/slot-presence.spec.ts`                | 4       | 4       | 0       | **KEEP 逐字未动**（slot 投影，§3 白名单）                                                    |
| `image-preview/image-preview.browser.spec.ts` | 32      | 25      | **−7**  | 删 7 例；9 例改名改写为行为断言                                                              |
| `image-preview/image-preview.spec.ts`         | 25      | 25      | 0       | D5：删重置图标的 `viewBox` / `innerHTML` 字形断言（8 行）                                    |
| **合计**                                      | **139** | **110** | **−29** | 文件数 10 → 8（2 处 D1）                                                                     |

全量套件（提交前实测）：**108 文件 / 1224 例 / 0 失败**（b6b 后为 110 / 1253；文件 Δ −2、例 Δ −29 ✔ 与上表闭合）。

## 2. 删除清单（逐条，含存活覆盖）

### 2.1 整文件删除（D1）

| 位置（基线）                                                    | 例数 | 类                                         | 理由与存活覆盖                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------- | ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drawer/glass-inherit.browser.spec.ts` 全文（5 例 / 192 行）    | 5    | **D1**（D2 + §12 **C6** + §8 R2 + §10 S1） | 全部断言落在 `--wui-internal-glass-shadow` / `--wui-internal-drawer-inset` 等**内部令牌取值**与计算 `top` 上。C6 已预告"`glass-inherit` / `glass` 系列若整文件只剩视觉断言 → 按 D1 整文件删（6c 裁决）"；R2 的收敛点已在 §10 S4 归零为"8 → 0 条视觉断言"。**不承接**（视觉契约，仓库无基线）。存活：`drawer` 的 `open` 反射 / `open-change` / 焦点归宿在 `drawer.spec.ts` 与 `drag-close.browser.spec.ts` |
| `drawer/drag-zone-sizing.browser.spec.ts` 全文（4 例 / 141 行） | 4    | **D1**（D2 + §12 **C1**）                  | 全部断言落在 drag-zone 的 `getBoundingClientRect().width/height`（48px 规格、四 placement 轴向）与内部令牌 `--wui-drawer-drag-zone-*` 上。C1 的表格已明文点名"`drawer` 的 `drag-zone` 尺寸（48px / 与 dialog 等宽）…**不承接**。存活：拖拽阈值行为由 `open` 归宿观察（C2），见 `drag-close.browser.spec.ts`                                                                                               |

### 2.2 `image-preview.browser.spec.ts` 整例删除（7 例）

| 位置（基线）                                                                                    | 类                                | 理由与存活覆盖                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:229` 滚轮以光标位置为锚点缩放，锚点覆盖的图片内容保持不动                                     | D2 / **C1** + **C2**              | 全部断言是 `offsetXOf(image)`（`DOMMatrixReadOnly(...).m41`）与锚点换算 `(anchorX - offsetX)/scale`。C1 明文"`image-preview` 的平移 `m41` …**不承接**"。锚点位置不在公开面上（`handle` 只暴露 `scale` / `index`），无任何行为层观察量                                   |
| `:316` 放大后拖拽平移，位移被钳制在图片与舞台的尺寸差内                                         | D2 / **C1**                       | 断言 `offsetX/offsetY ≈ panBounds(...)`，即"图片与舞台的尺寸差"——纯几何。C1 表格点名                                                                                                                                                                                    |
| `:344` 1x 时鼠标与单指拖拽都能移动图片，方向不限且不会被拖出视口                                | D2 / **C1**                       | 同上是 `offsetX/offsetY` + `imageRect` vs `stageRect`。**其中"拖拽余波 click 不关闭"这一半有存活**：`image-preview.spec.ts:274`「1x 拖拽进入平移手势路径，释放后的余波 click 不关闭浮层」（jsdom）。"跟手方向"与"不拖出视口"不承接                                      |
| `:454` 图片加载完成后淡入可见                                                                   | D2 / **§10 S1**                   | `expect(Number(getComputedStyle(image).opacity)).toBe(1)` —— 读计算样式取值。S1 明列 `opacity`。不承接                                                                                                                                                                  |
| `:465` 1x 时图片收缩到视口内，不被舞台裁切                                                      | D2 / **C1**                       | `image.offsetWidth <= stage.clientWidth` 的尺寸比对。C1 明列。不承接                                                                                                                                                                                                    |
| `:981` 玻璃控件 blur 由独立层承担：dialog 不过渡 opacity，遮罩/舞台层 opacity 过渡              | D2 / **§10 S1** + **§12 C6**      | 全篇 `getComputedStyle(...).transitionProperty / .opacity / .backdropFilter` + 祖先链 opacity 过渡扫描。R2 收敛点已在 §10 S4 归零；C6 明列玻璃用例按 R2 删。不承接                                                                                                      |
| `:1032` 遮罩不随进场缩放：dialog/遮罩/控件层无 transform，scale 落在图片舞台层，dialog 固定定位 | D2 / **C1** + **S1** + **§12 C7** | 全篇 `DOMMatrixReadOnly(getComputedStyle(...).transform).a` + `transitionDuration === '0s'`（**C7 已点名 `image-preview.browser.spec.ts:1048` 这条**）+ `position === 'fixed'` 取值 + `content.contains(surface)` 结构包含关系。C1 明列 `scaleOf(...).a` 不承接。不承接 |

### 2.3 `drawer` 整例删除

| 位置（基线）                                                                                | 类             | 理由与存活覆盖                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drag-close.browser.spec.ts:84` 内置关闭按钮定位在 header 右上角，不拉伸到抽屉中间          | D2 / **C1**    | `close.getBoundingClientRect()` 的位置与宽度比对。C1 表格已点名"`drawer` 的 `close.getBoundingClientRect().width < 200`…不承接（纯尺寸无行为语义）"。存活：关闭按钮的**可聚焦性**在同文件「drawer 面板自身不夺焦，内置关闭按钮仍可聚焦」            |
| `drag-close.browser.spec.ts:100` pointermove 实时跟手：transform 位移随指针变化             | D2 / **C2**    | 拖动过程中 `style.transform` 的位移量。C2 表格明列"删：拖动中 `style.transform` 的位移量、'跟手'程度"。存活：阈值行为与归宿在「超过阈值松手…」「未达阈值松手…」                                                                                     |
| `drag-close.browser.spec.ts:444` left placement：闭合方向为向左拖                           | D2+D4 / **C2** | 与 `:466` 合并为 1 例「闭合方向随 placement：沿闭合方向拖过阈值关闭，反向拖弹回不关闭」。合并后**更强**：原两例各测一个方向，新例对同一 placement 同时断言"闭合方向关 / 反向不关"两侧。观察量是 `open-change` 的 `detail` 与 `open` 归宿（C2 允许） |
| `drag-close.browser.spec.ts:466` top placement：沿 Y 轴闭合方向为向上拖                     | 同上           | 同上（合并到同一例）                                                                                                                                                                                                                                |
| `drag-close.browser.spec.ts:490` 浮动卡片几何：静止态四周留边且圆角生效                     | D2 / **C1**    | `getBoundingClientRect()` 的留边量与 `borderRadius` 取值。C1 + S5。不承接                                                                                                                                                                           |
| `drag-close.browser.spec.ts:593` controlled 悬停闭合位越过留边补偿：dialog 完全位于视口之外 | D2 / **C1**    | "完全位于视口之外"是 `rect` 比对（几何）。且本例主题是"留边补偿"这一视觉参数。不承接。存活：controlled 的语义（只派发请求、不回写 `open`）在「controlled 拒绝回写…」                                                                                |
| `drawer.spec.ts:606` 弹回 onfinish 覆写内联为打开态终值并保留                               | D2 / **D3**    | 断言 `animateSpy` 调用次数、`animateSpy.mock.calls[0][1]` 的 `fill: 'both'`、`fakeAnimation.onfinish` —— **内部 Web Animations 调用契约**（§5 白名单无此项；换用 CSS transition 或 rAF 的等价实现必红）。不承接                                     |
| `drawer.spec.ts:713` tap 拖拽区收尾移除内联拖拽样式：不残留 translateX(0px)                 | D2 / **D5→删** | 断言 `dialog.style.transform === 'ta'` 清空。属内部内联样式（R3 只保护"公开方法参数→内联定位映射"，`tap` 收尾不是映射）。**其动效行为那一半由 `tap-transition.browser.spec.ts` 的 WAAPI 版承接**（见 §5 与 §4.2）                                   |
| `drawer.spec.ts:789` 关闭 onfinish 先写终态再 cancel：cancel 时内联已处于闭合位             | D2 / **C1**    | 断言内联 `transform` 终值 + `animateSpy`。同上                                                                                                                                                                                                      |
| `nested.browser.spec.ts:212` 非顶层抽屉的几何：scale 缩小为 0.95 且向内侧偏移露出边缘       | D2 / **C1**    | `nestedScale(d3)`（`DOMMatrixReadOnly(...).a`）与缩进几何。C1 明列。不承接                                                                                                                                                                          |
| `nested.browser.spec.ts:241` / `:271` / `:301` 多宽度嵌套 / 乱序宽度交错嵌套（3 例）        | D2 / **C1**    | 全部断言是 `r1.left < r2.left`、`parentRect.left < childRect.left` 之类的露边阶梯几何与宽度补偿。C1 明列"『内层展开外层跟随』的像素增量不承接"。不承接                                                                                              |
| `nested.browser.spec.ts:355` 两个同级 drawer 依次打开，先开的被缩放 0.95                    | D2 / **C1**    | 同上（缩放 + 露边几何）                                                                                                                                                                                                                             |
| `nested.browser.spec.ts:397` 三个同级 drawer 依次打开，逐层缩放 depth=2/1/0                 | D2 / **C1**    | 同上                                                                                                                                                                                                                                                |
| `nested.browser.spec.ts:442` 同级 drawer 左缘阶梯露边                                       | D2 / **C1**    | 同上                                                                                                                                                                                                                                                |

### 2.4 用例内局部断言删除（D5）

| 用例（基线）                                                                  | 删掉的断言                                                                                                                                                          | 类                                                                  | 保留的部分                                                                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `drag-close.browser.spec.ts:67` 「drawer 面板自身不显示 focus ring…」         | `expect(getComputedStyle(dialog).outlineStyle).toBe('none')`                                                                                                        | D2 / **C2**（C2 表格明列 `outlineStyle === 'none'` 属焦点环实现态） | 关闭按钮可聚焦（`activeElement`）。**改名**「drawer 面板自身不夺焦，内置关闭按钮仍可聚焦」                                                  |
| `drag-close.browser.spec.ts` 保留例体内                                       | `expect(dialog.classList.contains('is-dragging')).toBe(true/false)`（8 处）、`is-visible`（4 处）                                                                   | **C3**                                                              | 行为断言（`open` 归宿、`open-change` 次数与 `detail`）。C3：内部 class 名单禁止断言                                                         |
| `drag-close.browser.spec.ts:133,232,288,409,524,593` 体内                     | `getCloseOffset(el)`（`DOMMatrixReadOnly` 位移）、`animateSpy` 系列、`bounds` 几何                                                                                  | D2 / **C1+C2**                                                      | 阈值行为、`open-change` 的 `detail` 数组、`open` 归宿、`pointercancel` 取消语义                                                             |
| `drawer.spec.ts:510` 「draggable 时渲染 drag bar 热区…」                      | 热区元素的**存在性 / 尺寸**断言                                                                                                                                     | D3 + **C1**                                                         | **改写为行为**：「draggable 时拖拽手势走关闭管线」——同一指针序列在 `draggable` 下产生 `open-change(false)`。§2 D3（存在性恒真）             |
| `drawer.spec.ts:527` 「未启用 draggable 时不渲染 drag bar」                   | 同上（"不渲染"的存在性断言）                                                                                                                                        | D3                                                                  | **改写为行为**：「未启用 draggable 时，同样的指针序列既不关闭也不派发 open-change」——与上一例构成**对照组**，双向绑定 `draggable`           |
| `drawer.spec.ts` 保留例体内                                                   | `.wui-drawer-body` 存在性（→ `el.hasAttribute('headless')`）、`.wui-drawer-close` 定位（→ `queryA11y(el,'[aria-label="关闭"]')`）、`is-visible`/`is-dragging`       | D3 + **C3** + §8 R4（改定位器）                                     | `open` 反射、`open-change` 与 `detail`、`headless` 反射、slot 投影                                                                          |
| `nested.browser.spec.ts:64` 「声明式嵌套…父层缩放 0.95 并平滑过渡」           | `nestedScale(...)` 与缩进几何                                                                                                                                       | **C1**                                                              | **改名**「声明式嵌套：两层同时打开且都进入 top layer」——断言两层 `dialog.open` 均为 true（top layer 是平台语义）                            |
| `nested.browser.spec.ts:101` 「子层关闭后：父层平滑回到全尺寸（depth 归零）」 | 同上                                                                                                                                                                | **C1**                                                              | **改名**「子层关闭后父层仍保持打开」——`open` 归宿                                                                                           |
| `image-preview.browser.spec.ts` 9 例（见 §3）                                 | `offsetXOf/offsetYOf`、`panBounds`、`scaleOf(...).a`、`trackX()`、`slides.length`、`rects` 宽度/基线、`svg` 的 `viewBox` 与宽度、`classList.contains('is-current')` | **C1 + C3 + S1**                                                    | `handle.index` / `handle.scale` / `aria-hidden` / `disabled` / `isMounted()`                                                                |
| `image-preview.spec.ts:399-406`（jsdom）                                      | `expect(resetSvg?.getAttribute('viewBox')).toBe('0 0 15 15')`、`expect(resetSvg?.innerHTML).toContain('fill="currentColor"')`                                       | D2 / **S5**（内部字形实现态）                                       | 同一用例保留 `queryA11y(host,'[aria-label="重置缩放"]')` 的存在性与其余 toolbar 按钮的无障碍名断言。与 browser 侧 `:514` 的同类删除口径一致 |

## 3. `image-preview.browser.spec.ts` 的改写对照（9 例改名，几何 → 行为）

| 基线用例                                                                        | 改后用例                                                            | 换用的观察面                                                                                                                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:153` 预览面板自身不显示 focus ring，内部关闭按钮仍可聚焦                      | 内部关闭按钮可获得焦点                                              | 删 `outlineStyle`；留 `shadowRoot.activeElement`                                                                                                                |
| `:408` 1x 平移后「重置缩放」可用，点击后**图片移回视口中心**                    | …点击后**回到 1x 并重新禁用**                                       | 删 `waitForOffset`/`offsetX/Y ≈ 0`；留 `disabled` 三态机（`true → false → true`）+ `handle.scale === 1`                                                         |
| `:514` toolbar 重置按钮**用 radix-icons:reset 字形**，真实点击后回到 1x         | toolbar 重置按钮真实点击后回到 1x                                   | 删 `viewBox === '0 0 15 15'`、`getBoundingClientRect().width > 0`；留 `handle.scale === 1`                                                                      |
| `:592` 横向拖拽**退回平移**而不是切图                                           | 横向拖拽**不切换图片**                                              | 删 `bounds`/`offsetXOf`；留 `handle.index === 0`                                                                                                                |
| `:687` 横向拖拽**平移图片**而不是切换                                           | 横向拖拽不切换图片                                                  | 同上                                                                                                                                                            |
| `:731` 单轨道结构：当前图居中、左右相邻**同尺寸同基线**，仅当前图可见于可访问树 | swipe 多图时**仅当前图暴露给辅助技术**，相邻图对可访问树隐藏        | 删 `slides.length === 3`、`rects` 宽高/基线/±100% 位置、`classList.contains('is-current')`；留 `aria-hidden !== 'true'` 的恰好 1 格 + 该格 `img.alt === '图 A'` |
| `:771` 相邻首图**跟手进入**                                                     | 最后一张向左拖，**松手**滑入首图                                    | 删 `alts` 三格结构断言、`trackX()`、`visibleAlts()` 重叠计算；留**拖拽中不提交**（`index === 2`）+ 松手后 `index === 0`                                         |
| `:811` 轨道**随手指平移**，相邻图同步进入/退出                                  | 拖拽**未松手不提交**，松手越过阈值才切图                            | 删 `trackX() ≈ -80 / -250`；留"进行中 `index === 0`"两次 + 松手后 `index === 1`                                                                                 |
| `:840` 缩放/平移只作用于当前图，**相邻图恒 1x 且不进入视口**                    | 放大后横向拖拽走平移不切图，**resetZoom 回到 1x 后 swipe 恢复切图** | 删 `scaleOf(...)`、`offsetXOf`、`slides` 的 `rects` 前后比对；留 `handle.scale` 三态 + `handle.index` 归宿                                                      |

## 4. 本批最重要的产出：**两处空转断言**（新立 §13 C8）

### 4.1 原断言从未真正跑过：`image-preview` 的"弹回原位"

基线 `image-preview.browser.spec.ts:906`「swipe 未达阈值释放：弹回原位且不切换图片」：

```ts
stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
stage.dispatchEvent(pointer('pointermove', { clientX: 370, clientY: 300 }))
stage.dispatchEvent(pointer('pointerup', { clientX: 370, clientY: 300 }))
await pollUntil(() => Math.abs(trackX()) < 0.5, 'swipe did not bounce back to origin')
```

**这条断言是空转的。** 三次 `dispatchEvent` 之间没有任何 `await`，而轨道位移由 Lit 渲染提交；
探针实测（逐帧打印 `getComputedStyle(track).transform`）：

```
[before-down]     trackTransform=matrix(1,0,0,1,0,0)
[after-move]      trackTransform=matrix(1,0,0,1,0,0)      ← 渲染未提交，位移还不存在
[after-up-sync]   trackTransform=matrix(1,0,0,1,0,0)
[after-up-raf1]   trackTransform=matrix(1,0,0,1,0,0)
```

即 `trackX()` 全程为 0，`Math.abs(0) < 0.5` 在**第一次轮询就成立**——"弹回原位"从未被验证过，
被删的 7 例里若混入这种断言，删除本身无损，但**说明不能用"原断言绿过"来证明契约曾经被覆盖**。

**补了 `await host.updateComplete` 之后的真实时间线**（这才是位移确实发生、过渡确实跑完的证据）：

```
[after-move+render] trackTransform=matrix(1,0,0,1,-30,0)  trackAnims=0
[after-up-sync]     trackTransform=matrix(1,0,0,1,-30,0)  trackAnims=0
[after-up-raf1]     trackTransform=matrix(1,0,0,1,-30,0)  trackAnims=1  ← 弹回过渡已注册
[after-up-raf2]     trackTransform=matrix(1,0,0,1,-24.17,0) trackAnims=1 ← 插值中
[after-400ms]       trackTransform=matrix(1,0,0,1,0,0)    trackAnims=0  ← 收敛
```

**改后断言**（§10 S2 WAAPI，且非空转）：

```ts
await host.updateComplete                                   // 让位移先落定
stage.dispatchEvent(pointer('pointerup', …))
await waitForFrame()                                        // 过渡在松手后下一帧才注册
expect(trackOf(host).getAnimations().length).toBeGreaterThan(0)   // 证明确实跑了过渡
await pollUntil(() => trackOf(host).getAnimations().length === 0, …)
expect(handle.index).toBe(0)
```

**C8 §② 的变异探针（补记，回应 reviewer N1）**：在 `pointerup` 前注入 `track.style.transition = 'none'`
（即"弹回不发生过渡"这一缺陷），新断言**确实变红**：

```
AssertionError: expected 0 to be greater than 0
 613|     expect(trackOf(host).getAnimations().length).toBeGreaterThan(0)
```

探针已删除，代码回到无注入状态。故新断言对"弹回过渡是否真的发生"有完全区分力——
方向相反于 §4.1 的原断言（原断言对该缺陷恒绿）。

> 副产物（写进 §13）：`track.getAnimations()` 在 `pointerup` **同帧**读恒为 0，必须让过一帧；
> 且 `shadowRoot.getAnimations()` 里始终有 2 条 `opacity` 常驻过渡，不能拿它当收敛判据。

### 4.2 新断言也要验区分力：`tap-transition` 的探针结论

`drawer/tap-transition.browser.spec.ts` 改写为 WAAPI 后，按惯例做**变异探针**：注入本例原本要防的旧缺陷
（在收尾后残留 `dialog.style.transform = 'translateX(0px)'`），期望新断言变红。

**结果：没红。** 说明 WAAPI 版断言的是"关闭与重开各跑一条真实 transform 过渡"，
**并不覆盖"内联残留样式被清理"**这一子语义。

处置（与 §5 的等价性要求一致，**不弱化、不虚标**）：

- 用例标题与注释改为它**真正在断言的东西**：「tap 关闭与重开各触发一次真实 transform 过渡」，
  不再声称覆盖内联样式清理。
- 用 `transition = 'none'` 做反向探针，确认断言非空转（此时确实变红）。
- 被放弃的子语义（内联残留清理）按 §2 D2 判为内部实现态，**不承接**。

### 4.3 由此新立的通用裁定（已写入 `DELETION-RUBRIC.md` §13）

> **C8 — 断言区分力探针纪律**。① 不得假设"被替换的原断言曾经抓到过什么"：
> 改写法前先确认原断言在**当前驱动序列**下会真的走到被断言的状态（本批 §4.1 的教训）。
> ② 新断言必须做变异探针：注入它声称要防的缺陷，确认变红；不红则说明断言的是别的东西，
> 须把用例**改名为它真正在断言的东西**（本批 §4.2 的教训），不得保留原标题造成"假覆盖"。

## 5. 观察面替换（非删除，但强度变了）

| 位置（基线）                                                 | 原观察面                                                               | 新观察面                                                                                     | 为什么                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `drawer/reduced-motion.browser.spec.ts` 全文                 | `animateSpy` 调用次数、`fakeAnimation.onfinish`、内联 `transform` 终值 | WAAPI：`getAnimations()` 在 reduce 下**一条都不启动**；**控制组** `motion='full'` 下确实启动 | §10 **S2**（WAAPI）+ **S3**（必须自带控制组）。第 3 例整例改为显式的 S3 控制组「theme 作用域优先于系统」 |
| `drawer/tap-transition.browser.spec.ts` 全文                 | `animateSpy` / 内联 `translateX(0px)` 是否清空                         | WAAPI：关闭、重开各跑一条真实 transform 过渡                                                 | 同上；区分力边界见 §4.2                                                                                  |
| `drawer/nested.browser.spec.ts` 全文                         | `nestedScale()` / `rect.left` 阶梯几何                                 | 原生 `dialog.open`（两层是否都在 top layer）、Esc 的层序后果                                 | C1 删几何后，嵌套唯一剩下的公开观察面是 top layer 与 Esc 路由                                            |
| `image-preview` 的 `currentImage()` / `trackOf()`            | —                                                                      | `.is-current` / `.wui-image-preview-track` **只作定位器**                                    | §12 **C3**：内部 class 可定位、不可断言。文件内已注释说明                                                |
| `image-preview` 的 `waitForStageSettled()` / `stageCenter()` | —                                                                      | `getBoundingClientRect()` 只用于**稳定判据与手势落点换算**                                   | §12 **C2**：驱动用途允许，非断言。调用点均有注释                                                         |

> 收尾自检：两个 `image-preview` spec 现在 `grep -n 'getComputedStyle\|classList'` **均为 0 命中**。

## 6. 门禁

| 门禁                                         | 结果                                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @greypan/web-ui test`（全量） | ✅ **108 文件 / 1224 例 / 0 失败**（b6b 后 110 / 1253；Δ −2 文件 / −29 例 ✔ 与 §1 闭合）。`vp check --fix` 之后又跑过一次，同为 108 / 1224 / 0 |
| `pnpm exec vp check`                         | ✅ 492 files，**0 warnings / 0 lint / 0 type**（首轮报 4 个文件格式问题，`vp check --fix` 后干净；本批**无** b6b 那类 `TS2322`）               |
| `pnpm run check:cspell`                      | ✅ 593 files / **0 issues**                                                                                                                    |

## 7. KEEP（未改动）

- `drawer/slot-presence.spec.ts`（4 例）—— slot 投影契约（`assignedElements()` 与 `hidden` 同步），
  §3 白名单；`hidden` 属 R1 明文允许的可见性后果。**10 文件里唯一逐字未动的文件**。
- `drawer.spec.ts` 的 `open` / `placement` / `closable` / `draggable` / `headless` 反射、`no-scroll-lock` 三例
  （§8 R3 第三通道：文档级滚动锁副作用）、`open-change` 的负向契约（程序设值不派发）、
  `transitionend` 缺失时的 fallback、关闭中重开取消关闭、过期 close 事件不误关 —— 除 §2.4 的 D5 外未动。
- `nested.browser.spec.ts` 的 `Esc 只关闭最顶层`（:127）、`scroll lock 双 lease`（:153）、
  `footer slot 内 Escape`（:185）—— 平台级键盘路由与滚动锁，未动。
- `image-preview.spec.ts`（jsdom）除重置图标字形断言外的全部 25 例。

## 8. 过程中的两个执行注记

- **`git index.lock` 残留**：首次 `git rm` 被 worktree 的 `.git/worktrees/<worktree>/index.lock`
  阻塞（前一批异常退出留下的锁）。确认无 git 进程在跑后删除该锁文件，`git rm -q` 随即成功。
  属环境问题，非本批改动。
- **测试运行器会在仓库根留下 0 字节的 `_tmp_<pid>_<hash>` 文件**（本批累积 10 个，git 视为未跟踪）。
  提交前已清理；建议后续批次提交前统一扫一遍未跟踪文件。

## 9. 转出项

| #   | 事项                                                                                                                                                           | 来源                      | 去向                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **`toast` 同批次重复 id 不去重（真实缺陷）** —— `manager.ts` 的 `createToast()` 只查 `visibleToasts`、不查 `pendingBatch`，而同文件 `updateMessage()` 两边都查 | **b6b §4**（跨批承诺 #8） | **已由 #135（task `toast-upsert-260916`）收口 ✅**：改为 upsert 语义 + `removeStray` 兜底 + 删除 `_visibleCount()`；修法与验收记于 `batch-plan.md` 的「承诺 #8 的收口记录」。本批（b6c）同样只动测试资产，未修源码 |
| 2   | `image-preview` 的**缩放锚点**（滚轮以光标为锚）自此无测试覆盖                                                                                                 | 本批 §2.2 `:229`          | 观察项。锚点位置不在公开面上；若将来要覆盖，需先有视觉基线或公开化锚点状态                                                                                                                                         |
| 3   | `drawer` 的 **drag-zone 尺寸语义**与**嵌套阶梯露边几何**自此无测试覆盖                                                                                         | 本批 §2.1 / §2.3          | 观察项（C1 的有意代价，同 b6b 的 `peek` 长度）                                                                                                                                                                     |
| 4   | `drawer` 的**内联拖拽样式收尾清理**（原 `drawer.spec.ts:713`）不再有覆盖                                                                                       | 本批 §4.2                 | 观察项。WAAPI 版覆盖的是"过渡确实发生"，不是"内联残留被清理"；后者判为内部实现态，不承接                                                                                                                           |
| 5   | 测试运行器在仓库根产生的 `_tmp_*` 空文件                                                                                                                       | 本批 §8                   | 观察项：可在 `.gitignore` 加 `_tmp_*`，或由运行器自行清理                                                                                                                                                          |
| 6   | 前 5 批删除的断言中，可能还有 §4.1 那类**空转断言**（"看起来绿、其实没跑到"）                                                                                  | 本批 §4.1 + §13 C8        | **不建议回头全量复审**（成本高、收益不确定）；新判据 C8 已要求后续批次在改写时顺带验证。若将来某批发现同类问题，在此追加登记                                                                                       |
