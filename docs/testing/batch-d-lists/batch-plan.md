# Batch 3–6 批次划分（Batch 2 结束后重新切分）

## 总览

基线：`2e0fbcec`（Batch 2 结束）。web-ui 共 **113 个 spec**（`src/**/*.spec.ts`；另有 2 个 `__screenshots__/` 目录名恰以 `.spec.ts` 结尾，被 `.gitignore` 与 vitest 默认排除，**不是 spec**，勿用 `find -name "*.spec.ts"` 计数）。
已重构：Batch 1（17 文件）+ Batch 2（18 文件）= 35 文件。
**剩余 85 文件 / 952 字面 `it` / 22457 行**。

## 划分依据（自行判断，替代原先的 3 批设想）

1. **按家族整批推进**（用户既定 rollout 口径），批内必须家族内聚，同批共享同一套矩阵辅助。
2. **单批规模上限约 250 例**：Batch 2 为 18 文件 / 209 例，可作为"一次 freeze→review→approve 循环"的舒适区。原设想把 446 例的"浮层触发与选择家族"塞进一批，规模达 2.1×Batch 2，一旦 reviewer 报 blocking 就要重冻重审 446 例——故**拆成两批**，剩余批次由 3 批变为 **4 批**。
3. 顺序按**依赖方向**：`shared/overlay` 是 popover/tooltip/context-menu/select/autocomplete 定位与关闭语义的公共底座 → 先做；drawer/dialog 又复用 overlay 与 gesture → 最后做。

## 批次表

| 批           | 家族                                           | 文件 | 例  | 行数 | 风险与说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------ | ---------------------------------------------- | ---- | --- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Batch 3**  | shared 基础设施 + 表单组 + 布局                | 29   | 188 | 4592 | overlay / portal / scroll-lock / visible-area / 纯逻辑 helper / input 2 个 / checkbox-group / radio-group / layout。**文件多但单文件小、jsdom 占比高**，风险最低。实际只改了 12 个文件（其余 17 个已是契约内聚，KEEP 未动），删 3 文件 4 例、`layout.browser` 29→20。见 `batch-3.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Batch 4**  | 菜单与浮层家族                                 | 17   | 225 | 4990 | popover(5) / tooltip(4) / context-menu(2) / dropdown(6, 含 item/header/divider)。契约模式高度同构（触发-定位-关闭-键盘 Escape-外部点击），矩阵去重收益最大。**已完成并 closed**（提交 `3a093385`）：18 文件 / **231 例（净 +6）** = −16 精简 + 1 新矩阵 22 例；4 文件 KEEP 未动；新增判据 §8 R1–R4；3 轮独立 review（第 1 轮抓出 F1 覆盖缺口，补 6 例后闭合）。见 `batch-4.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Batch 5**  | 组合框与分段家族                               | 11   | 221 | 4960 | select(4) / autocomplete(3) / option(1) / segmented(3, 含 trigger)。组合框的「输入+列表+键盘导航+异步过滤」契约最厚，`autocomplete.spec.ts` 单文件 815 行/52 例。**已完成并 closed**（提交 `ed7942a2`）：11 文件 / 221 例 → **12 文件 / 197 例（净 −24）** = −28 精简 + 1 新护栏 4 例；`option[active]` 内部标记 11 处改走 `aria-activedescendant` 公开通道；落地跨批承诺 #7（`contractEvent` 空 `counts` 护栏）与 #4 的 b5 部分（2 处玻璃删）。2 轮独立 review，均 pass（第 1 轮 5 条 non-blocking 全部闭环，其中 1 条经实测判定为误报）。见 `batch-5.md`                                                                                                                                                                                                                                                                                                                                                                                                |
| **Batch 6a** | 主题与动效家族（拆自原 Batch 6）               | 9    | 41  | 1125 | **components/theme(6) + shared/theme(3)**。全部 token 取值 + `reduced-motion` 家族。**§5 视觉断言密度最高的一批**（9 文件里 4 个是纯 gCS 取值）。动手前必须先定主题令牌判据（跨批承诺 #2）——已落 `DELETION-RUBRIC.md` §10 S1–S6。**已完成并 closed**（提交 `a7c663a2`）：9 文件 **59 → 48 运行期例**（−11）+ tooltip 1 → 2 = **10 文件 60 → 50（−10）**；删 2 个纯 gCS 文件（`theme-motion` / `theme-radius` 共 11 例）、3 个动效文件全部 WAAPI 化、R1 例外取消（`repeat-presence` → `repeat-show-delay`）、落地跨批承诺 #1（reduced-motion 重建）/#2（令牌判据）/#3（动效观察面）；顺带 deflake 掉全量套件唯一红点（承诺 #6）。1 轮独立 review，pass（0 blocking，4 条 non-blocking：1 条经复核属实并已改写报告，1 条行号，2 条判据边界确认）。见 `batch-6a.md`                                                                                                                                                                                          |
| **Batch 6b** | 容器：对话框 / 提示条 / 折叠（拆自原 Batch 6） | 9    | 136 | 2354 | dialog(3) / toast(3) / collapse(3)。承接跨批承诺 #4 的 1 处玻璃（`toast-mobile.browser`）与 `collapse` 的 11 处 `data-wui-presence`（R1 例外已取消，按 §10 S2/S6 + §12 改判）。`collapse.browser` 的 peek 几何与 `toast-enter-motion` 的 transform 分解是视觉断言重灾区。**已完成并 closed**（提交 `581c78c5`）：9 文件 **139 → 114 运行期例（−25）**，全量 110 文件 / **1253 例 / 0 失败**（b6a 后 1278，Δ 闭合）；动手前先落容器判据 `DELETION-RUBRIC.md` §12 C1–C7（**6c 沿用**）；删 peek 边缘渐隐整 describe(11) + 4 例 D4 + 4 例纯几何 + 2 处玻璃（承接承诺 #4 的**最后 2 处**）+ 1 例 D3；`toast._visibleCount()` 12 处换公开挂载面**并因此暴露真实产品缺陷**（同批次重复 id 不去重，含一行修法，转出独立 task）；`toast-enter-motion.browser` 改名 `reduced-motion.browser` 以换入系统 reduce 工程。1 轮独立 review，pass（0 blocking，4 条 non-blocking **全部采纳**：措辞校正 / D 清单补登 / 行号漂移 / peek 用例加强区分力）。见 `batch-6b.md` |
| **Batch 6c** | 容器：抽屉 / 图像预览（拆自原 Batch 6）        | 10   | 139 | 4361 | drawer(8) / image-preview(2)。四个手势 browser spec（`nested` / `drag-close` / `drag-zone-sizing` / `tap-transition`）与 `image-preview.browser` 的观察层是 transform/rect 几何，需整层重写为行为断言。跨批承诺 #4 的 2 处玻璃全部落在 6b（`toast-mobile.browser` + `dialog.browser`）。**已完成并 closed**：10 文件 **139 → 110 运行期例（−29）**，全量 **108 文件 / 1224 例 / 0 失败**（b6b 后 110 / 1253，Δ 闭合）；整文件删 2 个（`glass-inherit.browser` 兑现 C6 的 6c 裁决、`drag-zone-sizing.browser` 兑现 C1）；`image-preview.browser` 1072 → 674 行、32 → 25 例，几何观察层整层换 `handle.index` / `handle.scale` / `aria-hidden` / `disabled`。**本批实测发现 2 处空转断言**（原「弹回原位」从未真正跑到；`tap-transition` 的 WAAPI 版不覆盖内联残留）→ 新立通用裁定 `DELETION-RUBRIC.md` **§13 C8（断言区分力探针纪律）**。见 `batch-6c.md`                                                                                                   |

合计：**85 文件 / 952 例 / 22457 行** ✔

> **实施期调整（2026-09-15，记于此以供审计）**：原 Batch 3 为 38 文件 / 231 例（含主题 9 文件 / 43 例）。实施前把主题/动效 9 文件**移入 Batch 6**：
> 其断言绝大多数是 `getComputedStyle().getPropertyValue('--wui-*')` 取值与 `backdrop-filter`/`transform` 视觉量，
> 需要一套独立判据（动效契约改用 `getAnimations()`、纯取值按 D2 删、docs/token parity 守卫保留——见 `batch-3.md` §7.1），
> 与「容器与动效」批次同源，混入同批会使一次 freeze→review→approve 承载两套标准。
> 调整后 Batch 3 = 29 文件 / 188 例 / 4592 行，总批次仍为 4（3/4/5/6），合计 85 文件不变。

> **实施期调整（2026-09-16，b6 动手前，记于此以供审计）**：原 Batch 6（28 文件 / 318 例 / 7915 行）**拆为 6a + 6b**：
> ① **规模**：318 例远超本文档 §2 自定的「单批上限约 250 例」舒适区（b2 = 209 例），
> 一次 freeze→review→approve 承载 318 例会让 reviewer 报 blocking 时的重冻成本翻倍；
> ② **标准**：主题令牌家族（纯 gCS 取值 + docs/token parity）与容器家族（dialog/drawer 语义、手势）
> 是两套判据 —— 这正是当初把主题从 Batch 3 挪出来的同一条理由（"混入同批会使一次 freeze 承载两套标准"），
> 挪进 b6 后该问题依旧存在，只是换了个批号。
> 拆分后 6a = 9 文件 / 41 例（**先定判据**，兑现跨批承诺 #1/#2/#3），6b = 19 文件 / 277 例。总批次由 4 变 5（3/4/5/6a/6b），合计 85 文件不变。

## 各批文件清单

### Batch 3（38）

**shared/overlay（10）**
`composition` · `lifecycle` · `native-dialog-presence` · `overlay-in-dialog.browser` · `overlay-positioning-generation` · `overlay-root` · `overlay` · `portal` · `reduced-motion.browser` · `theme-overlay-scope`

**shared 其他基础设施（11）**
`menu-portal/menu-portal` · `menu-portal/menu-tree` · `option-portal/option-portal` · `scroll-lock/scroll-lock` · `visible-area/visible-area.browser` · `events/user-change` · `focus/pointer-focus` · `gesture/gesture` · `group-management/group-management` · `normalize/normalize` · `form-association/form-association.spec`

**components/input（2）**
`input/form-association.browser` · `input/input.jsdom.spec`

**组与布局（5）**
`checkbox-group/checkbox-group` · `checkbox-group/cross-group.browser` · `radio-group/radio-group` · `layout/breakpoint-parity` · `layout/layout.browser` · `layout/mobile-toggle-header-alignment.browser`

**主题（9）**
`theme/theme.spec` · `theme/theme-tokens` · `theme/theme-token-parity` · `theme/theme-motion.browser` · `theme/theme-radius.browser` · `theme/reduced-motion.browser` · `shared/theme/float-motion.browser` · `shared/theme/focus-ring-transition.browser` · `shared/theme/reduced-motion.browser`

### Batch 4（17）

`popover/{popover.spec, popover.browser, conditional.browser, conditional-lit.browser, conditional-react.browser}` · `tooltip/{tooltip.spec, tooltip.browser, conditional.browser, ~~repeat-presence.browser~~ → repeat-show-delay.browser}` · `context-menu/{context-menu.spec, context-menu.browser}` · `dropdown/{dropdown.spec, dropdown.browser, conditional.browser}` · `dropdown-item/dropdown-item` · `dropdown-header/dropdown-header` · `dropdown-divider/dropdown-divider`

> `tooltip/repeat-presence.browser` 于 **Batch 6a** 改名为 `repeat-show-delay.browser`（R1 例外取消后
> 用例主题不再是 presence 序列，见 `DELETION-RUBRIC.md` §10 S6）。批 4 的计数与结论不受影响——
> 文件数 1 → 1，例数 1 → 2（对照组拆为独立用例）。

### Batch 5（11）

`select/{select.spec, select.browser, conditional-combo.spec, conditional-combo.browser}` · `autocomplete/{autocomplete.spec, autocomplete.browser, conditional-boundary}` · `option/option` · `segmented/{segmented.spec, segmented-gesture.browser}` · `segmented-trigger/segmented-trigger`

### Batch 6a（9）— 主题与动效

`theme/{theme.spec, theme-tokens, theme-token-parity, theme-motion.browser, theme-radius.browser, reduced-motion.browser}` · `shared/theme/{float-motion.browser, focus-ring-transition.browser, reduced-motion.browser}`

### Batch 6b（9）— 容器：对话框 / 提示条 / 折叠

`dialog/{dialog.spec, dialog.browser, slot-presence}` · `toast/{toast.spec, toast-enter-motion.browser → reduced-motion.browser, toast-mobile.browser}` · `collapse/{collapse.spec, collapse.browser, reduced-motion.browser}`

> **状态：已 closed**（提交 `581c78c5`；139 → 114 运行期例，全量 110 文件 / 1253 例 / 0 失败；
> 1 轮独立 review：pass / 0 blocking / 4 条非阻断全部采纳）。见 `batch-6b.md`。
> 判据 `DELETION-RUBRIC.md` §12 C1–C7 在本批定稿，**6c 沿用**。
> 转出项：**toast 同批次重复 id 不去重（真实产品缺陷，含一行修法，需独立 task 修 `manager.ts`）**。

### Batch 6c（10）— 容器：抽屉 / 图像预览

`drawer/{drawer.spec, nested.browser, drag-close.browser, drag-zone-sizing.browser, glass-inherit.browser, tap-transition.browser, reduced-motion.browser, slot-presence}` · `image-preview/{image-preview.spec, image-preview.browser}`

> **实施期调整（2026-09-16，b6b 动手前，记于此以供审计）**：原 Batch 6b（19 文件 / 277 例 / 6715 行）**拆为 6b + 6c**：
> ① **diff 规模**：19 文件的禁止断言点实测约 **200 处**（`image-preview.browser` 56、`drag-close.browser` 21、
> `collapse.browser` 21、`nested.browser` 17、`dialog.browser` 14、`drawer.spec` 12…），
> 远超单次 freeze→review→approve 可对抗性验证的范围（b6a 为 1125 行 / 486+/718−）。按本文档 §2 自定的
> 「单批 ≤250 例」口径，277 例只是勉强越线，但按 **reviewer 可验证的 diff 规模**口径，6700 行是 6a 的 6 倍。
> ② **工作量异质**：`drawer` 的四个手势 browser spec 与 `image-preview.browser` 的观察层是
> **transform 矩阵 / 包围盒几何**（`DOMMatrixReadOnly(getComputedStyle(x).transform).m41`、
> `getBoundingClientRect()` 比对），要改成行为断言需要重写整个观察层（工作量≈b6a 抽出
> `focus-ring-fixtures.ts` 那一步）；而 `dialog`/`toast`/`collapse` 的删除是**容器语义**层，
> 与「拖动手势阈值」「缩放/平移跟随」不是同一类改动。两者混在一批，reviewer 会在一次冻结里
> 同时审「语义删除」与「观察层重写」两种风险。
> 拆分后 6b = 9 文件 / 136 例 / 2354 行，6c = 10 文件 / 139 例 / 4361 行。总批次由 5 变 6（3/4/5/6a/6b/6c），合计 85 文件不变。
> 容器家族的判据（C1–C7）在 6b 定稿、6c 沿用，见 `DELETION-RUBRIC.md` §12。
>
> **状态：已 closed**：139 → 110 运行期例（−29），全量 108 文件 / **1224 例 / 0 失败**（b6b 后 1253，Δ 闭合）。
> 整文件删 2（`glass-inherit.browser` 5 例 / `drag-zone-sizing.browser` 4 例，均 D1）；
> `drawer.spec` 删 3 例内部 Web Animations 实现；`nested.browser` 12 → 7；`image-preview.browser` 32 → 25。
> `slot-presence.spec` **逐字未动**（slot 投影，§3 白名单）。
> **新增判据 `DELETION-RUBRIC.md` §13 C8**：本批实测发现 2 处**空转断言** —— ① 原「swipe 弹回原位」
> 因三次 `dispatchEvent` 间无 `await`、轨道从未移动而恒真（从未真正覆盖过）；
> ② `tap-transition` 的 WAAPI 版注入旧缺陷不变红，故改名为它真正在断言的东西。
> 转出：image-preview 缩放锚点 / drawer drag-zone 尺寸与嵌套阶梯露边几何 / 内联拖拽样式收尾清理，自此无覆盖（C1 的有意代价）。
> 见 `batch-6c.md`。

## 跨批承诺（Batch 4 之后更新，不能丢）

| #   | 承诺                                                                                                                                                                                                                 | 来源                                                                   | 落地批                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **reduced-motion 覆盖缺口**：b3 删掉 `shared/overlay/reduced-motion.browser.spec.ts` 后零覆盖，须用 `getAnimations()` 重建（b1 已批范式）                                                                            | b3 §7.2 + reviewer 明确提示「不落地即成永久缺口」                      | **b6a 已落地 ✅**（`shared/theme/reduced-motion.browser.spec.ts` 6 例 + `components/theme/reduced-motion.browser.spec.ts` 2 例成对控制组，见 `batch-6a.md` §0 S2/S3）                                    |
| 2   | **主题令牌判据**：动手前先定（b1 已批判例倾向严格——连 `--wui-button-color` 的 gCS 断言都删了；但 b1 又新增了 `getAnimations()` 式 reduced-motion spec）                                                              | b3 §7.1                                                                | **b6a 已落 `DELETION-RUBRIC.md` §10 S1 ✅**                                                                                                                                                              |
| 3   | **R1 动效断言观察面**：`presence` 瞬时态（`entering`/`closing`）到底能用什么观察面替代 —— b4 已**证伪** `getAnimations()`（对 anchored panel 不可行，面板一创建就带三条运行过渡）。b6 需给最终答案，并与 #1 同批处理 | `batch-4.md` §5                                                        | **b6a 已裁决 ✅**：b4 的对照取错（应逐帧比 f0↔f0）；差异属视觉瞬态、无行为契约 → **R1 例外取消**，用例改判 D5 断言"不等待 showDelay"。见 `DELETION-RUBRIC.md` §10 S6                                     |
| 4   | **R2 剩余 4 处玻璃用例**：b5 的 `select.browser` / `autocomplete.browser`，b6 的 `toast-mobile.browser` / `dialog.browser` 按同一裁定删除；契约仍收敛在 `shared/theme/float-motion.browser.spec.ts`                  | `batch-4.md` §10.2                                                     | **b5 已删 2 处 ✅ / b6a 已把收敛点按 §10 S4 改判为动效行为（8 → 0 条视觉断言）✅ / b6b 已删剩余 2 处 ✅ —— 全部兑现**                                                                                    |
| 5   | `checkbox-group` / `radio-group` 同输入多用例合并（D4 去重）                                                                                                                                                         | b3 §7.4                                                                | 未定                                                                                                                                                                                                     |
| 6   | `overlay-in-dialog` context-menu 用例的**负载敏感时序抖动** → deflake（参考既有 `ci-web-ui-browser-spec-flaky` 类 task）                                                                                             | `batch-4.md` §7                                                        | **b6a 已 deflake ✅**：根因是「入场未结束时关闭 → 反向过渡把声明 2000ms 压到 ~151ms → 面板在 200ms 重开定时器前离开 closing 缓存」；修法是关闭前等入场 settle。全量套件红点 1 → 0。见 `batch-6a.md` §5.3 |
| 7   | `contractEvent` 的**空 `counts` 护栏**（空对象会生成"无断言用例"而门禁不拦）                                                                                                                                         | b2 遗留                                                                | **b5 已落地 ✅**（`assertNonEmptyCounts` + 4 例 spec，见 `batch-5.md` §2）                                                                                                                               |
| 8   | **产品缺陷（非测试）**：`toast` **同一次 microtask 批里重复的显式 id 不去重**                                                                                                                                        | `batch-6b.md` §4（换观察面时发现，**b6c 已写探针实测定论**，探针已删） | **已收口 ✅**：issue #135 / task `toast-upsert-260916`（release/260917）改为 upsert 语义。见下方「承诺 #8 的收口记录」                                                                                   |

### 承诺 #8 的实测定论（b6c 补记，交接给修源码的 task）

**id 来源**：`manager.ts:13,23` —— `let toastIdCounter = 0` + `` generateId() = `toast-${++toastIdCounter}` ``，
**模块级单调自增**，`_reset()` 也不重置。自动生成不可能撞号；**只有调用方显式传 `id` 才会撞**（`createToast` 的 `options.id ||` 分支）。

**触发窗口**：`createToast()`（`:77`）把新 toast 先推入 `pendingBatch`，flush 是微任务
（`scheduleBatchFlush` → `Promise.resolve().then(flushBatch)`）；去重检查 `:79` 只查 `visibleToasts` ——
而 `visibleToasts` 要到 `mountToast()`（`:108`）flush 那一刻才写入。所以**同一 microtask 批内的第二次调用，
第一次还没进 `visibleToasts`，去重必然落空**。跨 tick 调用则正常去重（对照组实测 1 个元素）。

**探针实测**（jsdom，临时 spec，已删）：

| 时序                                                     | DOM 里 `web-ui-toast` 元素                                         | `_visibleCount()`   |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ------------------- |
| 同 tick 两次 `toast.error(msg, {id:'dup'})` + 让过微任务 | **2 个**，`toastId` 均为 `dup`，message 分别是「第一条」「第二条」 | 1（Map 被后者覆盖） |
| `toast.close('dup')` + 400ms                             | 2 个（无一移除）                                                   | 1                   |
| `toast.clear()` + 400ms                                  | 1 个（**孤儿「第一条」留下**）                                     | 0                   |
| 再等到自然超时之后（> 默认 duration）                    | **仍是 1 个**                                                      | 0                   |

最后一行是真正的坏消息：孤儿元素的自动关闭事件 `removeToast(id)`（`:112`）查 Map 查不到就 `return`，
**它连自己都删不掉**，永久残留在 `role="log"` 容器里 —— DOM 泄漏 + 读屏朗读重复，且不可通过任何公开 API 回收。
`updateMessage` 同理只打到 Map 里那一个（实测「改过了 / 第二条」）。

**修法（择一）**：

1. 最小一行（记于 `batch-6b.md` §4）：`if (visibleToasts.has(id) || pendingBatch?.some(item => item.id === id)) return id`
   —— 语义与既有的"已可见就返回 id、不覆盖内容"一致。
2. 更稳的是同时给 `removeToast` 兜底：按 `id` 找不着时，再按容器里 `web-ui-toast[toastId=id]` 全量清理，
   避免"孤儿自己删不掉"。**两者不互斥，建议同批做。**

（修源码时还可一并清理两个仅为测试存在的钩子：`manager.ts` 的 `_visibleCount()` 已随 #135 删除，
`_reset()` 保留 —— 它仍是各 spec `beforeEach`/`afterEach` 的重置入口。）

### 承诺 #8 的收口记录（#135 / `toast-upsert-260916`）

上面的两条修法**都已落地**，与建议一致：

1. 去重从「只查 `visibleToasts`」改为查两侧（`visibleToasts` + `pendingBatch`），并把语义从「丢弃更新」升级为 **upsert**：同 id 的后续调用覆盖给出的字段、保留未给出的字段；
2. `removeToast` 兜底按容器里的 `web-ui-toast[toastId=id]` 全量清理（现为 `removeStray()`），孤儿不再「连自己都删不掉」。

此外修掉两处同源边界（独立复审提出，均已补用例）：

- 退场窗口（`close()` 之后、`toast-close` 派发之前）内用同 id 调用**不再复用那条正在消失的元素**，改走新建路径；解绑按元素身份而非 `detail.id`，退场元素延迟派发的 `toast-close` 不会误删同 id 的新元素；
- `toast.error` 的 5000 默认值从 shortcut 挪到挂载时兜底，`duration` 恢复「只有显式传入才重启」。

> **R1–R4 是 b5/b6 的共同前置判据**，已写入 `DELETION-RUBRIC.md` §8。b5（组合框/分段）与 b6（容器/动效/主题）动手前请先读 §8，尤其是：
> `select`/`autocomplete` 的 presence 断言走 R1、玻璃用例走 R2、`segmented-gesture.browser` 的视觉量走 R2 并归入动效判据。
> b6a 另须先读 §10（S1–S6）：主题令牌判据、动效改用 WAAPI、reduced-motion 自带控制组、R2 收敛点裁定、R1 例外取消。

## 待观察项（跨批，实施时逐条裁决）

1. ~~**`shared/overlay` 是否合并**（Batch 3）~~ → **已决**：b3 实测该目录 17 个文件里 15 个已是契约内聚，KEEP 未动；无合并收益。
2. ~~**重复判定**（Batch 3）~~ → **已决**：`input.jsdom.spec.ts` 判为 D4 重复并整文件删除，存活覆盖在 `shared/form-association/` 两个 spec。
3. **reduced-motion 家族**（横跨 b3/b6a/b6b 共 6 个 `*-reduced-motion.browser.spec.ts`）共享 `browser-reduced-motion` project。**b6a 已决**：不合并为单一矩阵 —— 各文件按**被观察组件**就近存放（`shared/theme` = focus-ring；`shared/overlay` = dialog/drawer 开合；`components/*` = 各组件自主动效），收敛点只会带来跨目录的定位成本。判据落 §10 S3。
4. ~~**drawer 的 4 个手势 browser spec**（Batch 6）：`nested` / `drag-close` / `drag-zone-sizing` / `tap-transition` 可能收敛为 `drawer-gesture.browser.spec.ts`~~ → **已决（b6c）：不合并，就地改写**。`drag-zone-sizing.browser` 按 D1 整文件删（尺寸几何，C1）；`drag-close` 15 → 10（其中 `left`/`top` placement 两例**合并**为 1 例「闭合方向随 placement」，双向断言更强）；`nested` 12 → 7；`tap-transition` 1 → 1 改 WAAPI。剩下的三个各自主题不同（阈值关闭 / 嵌套层序 / 开合过渡），合并只会增加定位成本——与待观察项 #3（reduced-motion 不合并为单一矩阵）同一口径。
5. ~~**`contractEvent` 的空 `counts` 护栏**~~ → 转入跨批承诺 #7（**b5 已落地** ✅）。
6. ~~**select / autocomplete 的 `open` 是否并入 open-change 矩阵**~~ → **已决（b5）**：两者 `open` 均为 getter-only、无程序式设值通道，并入会产出"手势走程序式槽位"的假用例 → **有意不并入**，见 `batch-5.md` §0.2。
7. **b6b 候选**：给 `autocomplete` 的视觉浮层补一个可定位的公开 role（或暴露"定位锚点"访问器），以便把 `batch-5.md` §4.1 里 13 处 class 定位器收回 `getPortalPanel()` / `queryA11y`。当前它们只是定位器（无 class 名断言），不违规。
