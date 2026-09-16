# Batch 5 — 组合框与分段家族契约测试重构

- task：`web-ui-contract-b5`（`mode: direct`）
- base：`3a093385`（Batch 4 提交）
- 范围：**11 个 spec / 221 例 / 4960 行**（`select` 4 · `autocomplete` 3 · `option` 1 · `segmented` 2 · `segmented-trigger` 1）
- 治理标准：`docs/adr/0005-web-ui-component-architecture.md` §5
- 判据：`../DELETION-RUBRIC.md`（沿用 Batch 4 新增的 **§8 浮层家族裁定 R1–R4**）
- 改动：**12 files changed, +288 / −1036**（11 个 spec 改写 + 1 个 spec 新增 + `shared/test-utils/index.ts`）

## 0. 本批沿用的裁定与一处判据澄清

本批把 4 条新裁定写进判据 **`DELETION-RUBRIC.md` §9（R5–R8）**，供 b6 沿用：
R5 = `option[active]` 内部高亮标记（+ label 反查须加唯一性断言）；R6 = 视觉变体用例走 D5 的拆法（引用 `input/focus.browser.spec.ts` 先例）；
R7 = `open` 为 getter-only 的组件不并入 open-change 矩阵；R8 = 面板无公开 role 时 class **定位器**是允许的例外（与"断言 class 名单"区分）。

| 裁定                          | 本批落点                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R2** "单层玻璃"用例是 D2+D4 | 删 2 处（`select.browser` / `autocomplete.browser`），契约收敛到 `shared/theme/float-motion.browser.spec.ts`（b6 裁决）——跨批承诺 #4 的 b5 部分已闭环                                 |
| **D2** 纯视觉/实现态          | b5 主战场：`getComputedStyle`（blur/box-shadow/::before/cursor/touch-action/max-height）、内部 class（`is-dragging` / `is-pressed` / `is-indicator-ready`）、`shadowRoot.textContent` |
| **D3** 存在性/恒真            | `expect(wrapper).toBeTruthy()`、property 自读（`el.value = x; expect(el.value).toBe(x)`）                                                                                             |
| **D4** 重复                   | 反射用例并入 `contractReflection` 矩阵；跨文件重复（`select.browser` 的 prefix 装饰用例）指名存活项后删                                                                               |
| **D5** 保留用例只删局部断言   | `borderless` 焦点用例：保留 `document.activeElement` + `focused` 反射，删 focus ring 视觉三连                                                                                         |
| **R3** 公开副作用输出通道例外 | 滚动锁 `document.body.style.position`（select 4 + autocomplete 4）、面板对齐边界约束（1）                                                                                             |
| **R4** portal 托管协议        | 删 v-if 内部注释 marker 计数断言（`conditional-combo.browser` 2 处），改由"关闭后重开仍保模板序"这一可观察后果覆盖                                                                    |

### 0.1 判据澄清：内部高亮标记 `option[active]`（沿用 b4 §4.1）

`option[active]` / `web-ui-option[active]` 由 select（`select/index.ts:445`）与 autocomplete（`autocomplete/index.ts:445`）用
`toggleAttribute('active', index === this._activeIndex)` 写入，**全仓 `docs/`、`apps/` 无任何引用**，也不是 `web-ui-option`
的公开 API（option 公开面只有 `value` / `disabled` / `selected` / `label` 与 `default`/`prefix`/`suffix` slot）。
按 b4 对 dropdown 的同一裁定，属内部实现态 → **本批把 11 处站点全部改走公开通道**（4 个文件：
`conditional-combo.spec` :65/:71/:81/:307 · `conditional-combo.browser` :103/:105/:109 · `autocomplete.spec` :690/:695 ·
`autocomplete.browser` :154/:162；`select.spec` 基线里一处都没有）：

> 公开通道 = 宿主 combobox 的 `aria-activedescendant` → 该 id 在 shadow 内的 `role="option"` 镜像节点
> （autocomplete `index.ts:656/698`；select 非 portal 模式下 id 直接指向 light DOM 里的 `web-ui-option`）。

改后 b5 全部文件 **0 处 `[active]`**。

### 0.2 有意决策：select / autocomplete **不并入** b4 的 open-change 矩阵

b4 新增的 `shared/open-state/__tests__/open-change-contract.spec.ts` 矩阵要求"程序式变更通道"（`programOpen` / `programClose`）。
本批核查源码后确认：

| 组件                  | `open` 形态                          | 是否有程序式设值通道                                         |
| --------------------- | ------------------------------------ | ------------------------------------------------------------ |
| `web-ui-select`       | getter-only（`select/index.ts:134`） | ✗ 仅用户手势（点击 / `ArrowDown` / `Escape` / 外部点击）驱动 |
| `web-ui-autocomplete` | getter-only                          | ✗ 同上                                                       |

给它们造 `programOpen` 只能靠派发合成键盘/指针事件——那**本身就是手势路径**，并进矩阵会产出"手势走程序式槽位"的
假通过用例（b4 reviewer 明确把这种形态列为禁止）。故本批**有意不并入**，`select.spec` / `autocomplete.spec` 继续
保留各自的 `open-change` 用例（`select.spec:333`、`autocomplete.spec` 事件段）。这不是遗漏，是矩阵适用边界的记录。

## 1. 用例数对账（逐文件核过，合计闭合）

基线 11 个 spec 共 **221 例**（与 `batch-plan.md` 预测一致；基线这 11 个文件均未使用矩阵，故字面 `it(` 计数即例数）。

| spec                                  | 前  | 后  | Δ   |     | spec                                  | 前      | 后      | Δ       |
| ------------------------------------- | --- | --- | --- | --- | ------------------------------------- | ------- | ------- | ------- |
| `select/select.spec`                  | 43  | 39  | −4  |     | `autocomplete/autocomplete.spec`      | 52      | 52      | 0       |
| `select/select.browser`               | 8   | 4   | −4  |     | `autocomplete/autocomplete.browser`   | 32      | 27      | −5      |
| `select/conditional-combo.spec`       | 11  | 11  | 0   |     | `autocomplete/conditional-boundary`   | 2       | 2       | 0       |
| `select/conditional-combo.browser`    | 7   | 7   | 0   |     | `option/option`                       | 13      | 8       | −5      |
| `segmented/segmented.spec`            | 29  | 25  | −4  |     | `segmented/segmented-gesture.browser` | 13      | 8       | −5      |
| `segmented-trigger/segmented-trigger` | 11  | 10  | −1  |     | **小计（11 文件）**                   | **221** | **193** | **−28** |

新增（跨批承诺 #7）：

| 新增                                                       | 例  |
| ---------------------------------------------------------- | --- |
| `shared/test-utils/__tests__/contract-event-guard.spec.ts` | 4   |

**合计：11 文件 / 221 例 → 12 文件 / 197 例（净 −24）**。
全量套件 **111 文件 / 1312 例 → 112 文件 / 1288 例**（+1 文件 = 新护栏；−28 +4 = −24 例，与上表闭合）。

净减集中在三类：① 反射用例并入矩阵（option −4、segmented −2、select −2）；② 视觉/内部态整条删（segmented −1、
segmented-gesture −5、autocomplete.browser −5、select.browser −4）；③ 重复用例（select −2、option −3、segmented-trigger −1）。

`autocomplete.spec`（813 行 / 52 例）**例数不变**：它是本批唯一逐条核对后判定"已基本契约内聚"的文件，只删掉 2 处
`toBeTruthy()` 守卫与 1 处 `[active]` 通道（后者属改写）。这与 b4 有 4 个 KEEP 文件同理——本批没有为了凑减数而动它。

## 2. 新增：`contractEvent` 空 `counts` 护栏（跨批承诺 #7，b2 遗留）

```ts
export function assertNonEmptyCounts(title, cases): void {
  for (const testCase of cases) {
    if (Object.keys(testCase.counts).length === 0) {
      throw new Error(`contractEvent(${title}): 用例「${testCase.title}」的 counts 为空，会生成无断言的空过用例`)
    }
  }
}
// contractEvent(...) 函数体首行调用它
```

**为什么必须落**：门禁 `vitest/expect-expect` 只认**语法上**存在 `expect(...)`，而生成器用例体里的 `expect` 写在
`for` 循环内——于是 `counts: {}` 会生成一条**零断言、永远绿**的用例，静态门禁与运行时都拦不住。改为**收集期硬失败**。

配套 spec（4 例）固定住该行为：空 `counts` 抛错、真实 `contractEvent` 调用路径同样抛错、逐条检查（混合集合命中
具体条目名）、非空不抛（含 `{ change: 0 }` 这种"零次也是断言"的合法形态）。

`git diff` 同时修正了一处排版缺陷：新函数的 JSDoc 曾被插到 `contractEvent` 的 JSDoc 与函数声明之间（导致旧注释
挂到了新函数上），已把 `assertNonEmptyCounts` 整体移到 `contractEvent` 注释块之前。

## 3. 删除清单（逐条）

### 3.1 整条删除

| 类     | file:line（基线）                                 | 被删内容摘要                                                                                   | 归类理由                                                                                                                   | 存活覆盖位置                                                                |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| D4     | `select/select.spec.ts:147`                       | `isOpen 别名反映浮层状态`                                                                      | 与 `:138` open getter 断言同一状态的两个读法                                                                               | 改后 `select.spec.ts:144` `open 与 isOpen 初始均反映未打开状态`             |
| D4     | `select/select.spec.ts:172`                       | `打开时 aria-expanded 为 true`                                                                 | 打开语义已在 `:158` 覆盖；`aria-expanded` 在改后 `:356`（ArrowDown）与 portal/fieldset 用例中仍断言                        | 改后 `select.spec.ts:156` `点击触发器打开浮层`                              |
| D4     | `select/select.spec.ts:406`                       | `打开时 aria-activedescendant 指向激活选项`                                                    | ArrowDown 用例已改为直接断言 activedescendant 指向 apple                                                                   | 改后 `select.spec.ts:356`                                                   |
| D4     | `select/select.spec.ts:660`                       | `不提供 trigger slot 时显示默认 label`                                                         | 与 `:98` 断言同一"触发器文本"通道                                                                                          | 改后 `select.spec.ts:104` `无选中值时显示 placeholder`                      |
| D4     | `select/select.browser.spec.ts:12`                | `点击 option 的 prefix 装饰时选择所属 option`                                                  | 同契约在 jsdom 已覆盖；browser 侧无额外环境价值（不涉指针命中差异）                                                        | `select/select.spec.ts:189` `点击 option 的 prefix 装饰仍选择所属 option`   |
| **R2** | `select/select.browser.spec.ts:31`                | `浮层面板使用双层玻璃结构`（`wui-glass` + transitionProperty + backdropFilter 轮询）           | §5 禁止的 CSS 断言；同断言在 8 个组件逐份重复（D2+D4）                                                                     | `shared/theme/float-motion.browser.spec.ts`（唯一处，b6 按动效判据裁定）    |
| D2     | `select/select.browser.spec.ts:57`                | `下拉滚动区域默认高度可通过 CSS variable 覆盖`                                                 | 自定义令牌 `--wui-select-max-height`：组件专属、非公开 API、`docs/`+`apps/` 零引用                                         | —（该契约非公开契约）                                                       |
| D2     | `select/select.browser.spec.ts:70`                | `Portal 下拉滚动区域继承 CSS variable`                                                         | 同上                                                                                                                       | —（非公开契约）                                                             |
| D3/D4  | `option/option.spec.ts:22`                        | `value 可设置和获取`                                                                           | property 自读（恒真）                                                                                                      | 改后 `option.spec.ts:28` 反射矩阵                                           |
| D4     | `option/option.spec.ts:30`                        | `value 反映到 host 属性`                                                                       | 进反射矩阵                                                                                                                 | 改后 `option.spec.ts:28`                                                    |
| D4     | `option/option.spec.ts:39`                        | `disabled 属性反射到 host`                                                                     | 进反射矩阵                                                                                                                 | 改后 `option.spec.ts:28`                                                    |
| D4     | `option/option.spec.ts:53`                        | `selected 属性反射到 host`                                                                     | 进反射矩阵                                                                                                                 | 改后 `option.spec.ts:28`                                                    |
| D4     | `option/option.spec.ts:67`                        | `label 可设置和获取`                                                                           | 与 `:75` 同契约（label 取值）                                                                                              | 改后 `option.spec.ts:35` `显式 label 优先于默认 slot 文本`                  |
| D2     | `option/option.spec.ts:85`                        | `label 渲染到 shadow DOM`（`shadowRoot.textContent`）                                          | 内部渲染细节；`label` getter 已承载契约                                                                                    | —（非公开契约）                                                             |
| D2/D4  | `option/option.spec.ts:155`                       | `无 prefix/suffix 时 label 正常显示`                                                           | `shadowRoot.textContent` + label 自读，与 `:67`/`:75` 重复                                                                 | 改后 `option.spec.ts:35`                                                    |
| D4     | `option/option.spec.ts:165`                       | `prefix + label + suffix 同时存在`                                                             | 与 `:131`/`:143` 的 slot 投影重复                                                                                          | 改后 `option.spec.ts:86` `prefix 与 suffix 按 name 各自投影`                |
| D2/D3  | `segmented/segmented.spec.ts:43`                  | `indicator 首帧定位后才启用移动动画`（`classList.contains('is-indicator-ready')`）             | 内部 class + 实现态就绪标记                                                                                                | 改后 `segmented-gesture.browser.spec.ts:238`（首帧 `getAnimations()` 为空） |
| D4     | `segmented/segmented.spec.ts:440`                 | `初始状态无子 trigger 时 value 为空字符串`                                                     | 与 `:59` 同一"初始 value"契约                                                                                              | 改后 `segmented.spec.ts:44` `初始值为空字符串`                              |
| D2     | `segmented/segmented-gesture.browser.spec.ts:252` | `按下当前选中的 trigger 时进入按压状态`（`is-pressed`）                                        | 内部 class                                                                                                                 | —（纯内部反馈；按压→选中的行为后果由"轻点"与"非激活项起始"用例覆盖）        |
| D2     | `segmented/segmented-gesture.browser.spec.ts:289` | `拖拽光标穿过 trigger shadow DOM 从 default 切换为 grabbing`（`cursor` gCS）                   | §2 D2 明文列举 `cursor`                                                                                                    | —（非公开契约）                                                             |
| D2     | `segmented/segmented-gesture.browser.spec.ts:325` | `按住当前选项后 pointerleave 不清除按压反馈`（`is-pressed`）                                   | 内部 class                                                                                                                 | —（非公开契约）                                                             |
| D2     | `segmented/segmented-gesture.browser.spec.ts:457` | `移动端分组禁止浏览器手势接管`（`touch-action: none` gCS）                                     | §2 D2 明文列举 `touch-action`                                                                                              | —（非公开契约；手势行为由拖拽系列用例覆盖）                                 |
| **R2** | `segmented/segmented-gesture.browser.spec.ts:534` | `静止态实体白指示器，按压/拖拽切换为玻璃`（backdropFilter + backgroundColor + boxShadow 三态） | §5 禁止的 CSS 断言（本轮最厚的一条，53 行）                                                                                | 同上 `shared/theme/float-motion.browser.spec.ts`（b6）                      |
| D3     | `segmented-trigger/segmented-trigger.spec.ts:16`  | `value 可通过属性设置和获取`                                                                   | property 自读；且 `value` 声明为 `@property({ type: String })`（**无 `reflect`**），本条原本也未断言反射，无反射契约可失去 | —（非公开契约）                                                             |
| **R2** | `autocomplete/autocomplete.browser.spec.ts:67`    | `浮层面板使用双层玻璃结构`                                                                     | 同 select.browser:31                                                                                                       | 同上（b6）                                                                  |
| D2     | `autocomplete/autocomplete.browser.spec.ts:94`    | `下拉滚动区域默认高度可通过 CSS variable 覆盖`                                                 | 自定义令牌 `--wui-autocomplete-max-height`                                                                                 | —（非公开契约）                                                             |
| D2     | `autocomplete/autocomplete.browser.spec.ts:107`   | `Portal 下拉滚动区域继承 CSS variable`                                                         | 同上                                                                                                                       | —（非公开契约）                                                             |
| D2     | `autocomplete/autocomplete.browser.spec.ts:935`   | `borderless 移除输入容器的 glass 描边环`（`::before content`）                                 | §2 D2 明文列举伪元素内容                                                                                                   | —（非公开契约；`borderless` 反射在 `autocomplete.spec.ts:168` 覆盖）        |
| D2     | `autocomplete/autocomplete.browser.spec.ts:954`   | `borderless 与 disabled/readonly/open 组合仍无框`                                              | 全条断言均为 gCS（backgroundColor / boxShadow / `::before`）                                                               | —（非公开契约）                                                             |

### 3.2 只删局部断言（D5，保留用例）

| file:line（基线）                                                                        | 删除的断言                                                                                                            | 保留的公开面                                                             |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `select/select.spec.ts:611`                                                              | `expect(wrapper).toBeTruthy()`                                                                                        | 用例后续的选中标签/结构断言                                              |
| `autocomplete/autocomplete.spec.ts:145`                                                  | `expect(labelledby).toBeTruthy()`                                                                                     | 紧接的 `#id` 解析 → `textContent === '水果'`                             |
| `autocomplete/autocomplete.spec.ts:354`                                                  | `expect(controls).toBeTruthy()`                                                                                       | 紧接的 `#id` 解析                                                        |
| `autocomplete/autocomplete.browser.spec.ts:56` / `:207` / `:857`                         | `toBeTruthy()` 存在性                                                                                                 | 同用例后续的 portal 挂载 / 选项集合 / 内容断言                           |
| `select/conditional-combo.spec.ts:145` / `:165`、`conditional-combo.browser.spec.ts:189` | `toBeTruthy()`                                                                                                        | `.not.toBeNull()` / `.length toBe(3)`（等强，未弱化）                    |
| `autocomplete/autocomplete.browser.spec.ts:898`（用例保留并改名）                        | focus ring 的 `::after` box-shadow 三连、`paddingLeft/Right`、面板 backgroundColor、`input.matches(':focus-visible')` | `document.activeElement === el` + 宿主 `focused` 反射（borderless 组合） |

> 第 6 条的口径来源是本仓库既有先例：`input/__tests__/focus.browser.spec.ts` 文件头注释已写明
> 「`focused` 反射是可观察公开面；focus ring 的 outline / box-shadow / halo / `::before` 描边盒 / padding 度量属 CSS 实现细节，
> 按 ADR-0005 §5 不在契约 spec 断言」。b5 只是把 autocomplete 的同类用例对齐到该口径，未新立标准。

### 3.3 改写（非删除）

| file                                                                                      | 改写内容                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `select.spec.ts:371` → 改后 `:356`                                                        | `ArrowDown 激活选项` → `ArrowDown 打开浮层并把 aria-activedescendant 指向首个选项`（`toBeTruthy()` 守卫 → id → option 文本 `apple`，强度提升）                                                           |
| `select.spec.ts:629` → 改后 `:601`                                                        | trigger slot 渲染 → `projectedCount(el, 'trigger')`（`slot assigndNodes` 计数，替代 `shadowRoot.querySelector` 内部取样）                                                                                |
| `select.browser.spec.ts:119` → 改后 `:12`                                                 | `主题作用域内打开 Portal Select 不撑开 theme-owned overlay root` 与 `:95` 的 portal 用例合并为一条；删除 `getComputedStyle(portalHost).display === 'contents'`，保留"面板挂在 theme 自己的 overlay root" |
| `conditional-combo.spec.ts` 4 处、`conditional-combo.browser.spec.ts` 2 处                | `option[active]` → `aria-activedescendant` 解析（见 §0.1）                                                                                                                                               |
| `conditional-combo.spec.ts:286` → 改后 `:293`                                             | 标题去掉内部说法"激活索引"→`打开期间新增 option 后可被键盘导航选中，且已选标签不丢失`                                                                                                                    |
| `option.spec.ts:131` / `:143` → 改后 `:86`                                                | prefix/suffix slot 渲染 → `projectedCount(el, 'prefix'/'suffix')`；新增 `:97` `默认 slot 在未设 label 时参与投影`                                                                                        |
| `segmented.spec.ts:86` / `:98` / `:114` → 改后 `:71`                                      | 3 个 value 用例合并为 `设置并切换 value 时子选项 checked 唯一且与 value 一致`                                                                                                                            |
| `segmented.spec.ts` 2 处                                                                  | 手写 `new Promise(slotchange)` 监听 → `flushSlotChange(el)`                                                                                                                                              |
| `segmented-gesture.browser.spec.ts:361` → 改后 `:189`                                     | `按下未选中的 trigger 不启动拖拽且指示器不产生 scale(1.5)` → `从非激活项起始的指针序列不切换选项，也不触发事件`（删内部 class，保留 value 不变 + 零事件）                                                |
| `segmented-trigger.spec.ts:62/78/94/110/127/144/161` → 改后 `:64`                         | 7 个事件用例 → `contractEvent('WebUiSegmentedTrigger 事件契约', …)` 7 例（`clickControl`/`pressKey` 均经 `queryA11y(el,'[role="option"]')`）                                                             |
| `segmented-trigger.spec.ts:44` → 改后 `:47`                                               | disabled 用例补 `tabindex="-1"`（键盘可达性，§5 允许）                                                                                                                                                   |
| `autocomplete.browser.spec.ts:131` → 改后 `:65`、`autocomplete.spec.ts:688` → 改后 `:681` | `[active]` → `aria-activedescendant` 解析（见 §0.1）                                                                                                                                                     |
| `autocomplete.browser.spec.ts:165` → 改后 `:104`                                          | 空白区点击目标 `.autocomplete-scroll` → 面板本身（去掉一处内部 class 取样）                                                                                                                              |
| `autocomplete.browser.spec.ts:14` → 改后 `:8`                                             | 本地 `waitForFrame` → `@/shared/test-utils` 的共享实现                                                                                                                                                   |
| `autocomplete/conditional-boundary.spec.ts:29` 一带                                       | `.autocomplete-a11y-listbox` textContent → `aria-activedescendant` → `#id` 解析；`shadowRoot.querySelector('input')` → `queryA11y('[role="combobox"]')`                                                  |
| 4 个文件（`option` / `segmented` / `segmented-trigger` / `select.spec`）                  | 删 `expectReflected` 死导入：b5 里这 4 个文件 import 但**零调用**（`expectReflected` 在本仓的合规用法是"字面 `expect` + `expectReflected` 同体共存"，如 badge），留着是误导性死代码                      |

## 4. 保留并标注的例外（R3）

| file:line                                                                        | 断言                                                                                          | 为什么留                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `select.spec.ts:272/277/290/305`、`autocomplete.browser.spec.ts:354/358/747/793` | `document.body.style.position === 'fixed'` / `''`                                             | 作用在**组件之外**的文档级副作用，滚动锁的唯一观察面（b3 已判 `scroll-lock.spec.ts` KEEP，口径一致）                                                                                                            |
| `autocomplete.browser.spec.ts:797`（改后）                                       | `Math.abs(panelRect.left - wrapperRect.left) < 2` + `panelRect.top >= wrapperRect.bottom - 1` | 边界**约束**（"面板不出锚点"），不是某个像素值。改用内部 class 取样 `panel.getBoundingClientRect()` 对照 `getBoundingClientRect()` 是唯一可行观察面；R4 的"改用 `getPortalPanel()`/`queryA11y`"在此不适用——见下 |

### 4.1 面板定位为何仍按 class 取样（对 R4 的适用边界说明）

R4 要求 portal 托管协议的断言改用 `getPortalPanel()` / `queryA11y`。autocomplete 是**例外且无法避免**：

- 组件把**无障碍面镜像**到 shadow 内的 `role="listbox"` / `role="option"` 节点（`index.ts:688–707`）；
- **视觉浮层** `.autocomplete-overlay` 是 `aria-hidden="true"`（`index.ts:710–712`）——它刻意不进 a11y 树，
  因此**没有任何 role 能定位它**；
- `.input-wrapper`（`index.ts:661`）是 Floating UI 的定位锚点，也没有公开访问器。

故本批在文件头加注释说明这一点，保留 4 类 class 取样共 13 处：`.autocomplete-overlay`（面板，行 19/151/214/824）、
`.autocomplete-empty` / `.autocomplete-empty-a11y`（空态与它的 a11y `role="status"` 镜像，行 544/591/595/627/630/633/658/662）、
`.input-wrapper`（定位锚点，行 825）。**只保留必要的**：改写过程中已去掉 `.autocomplete-scroll` 取样 2 处
（空白区点击目标、第二条 maxHeight 用例），改后 b5 全批 0 处 `getComputedStyle` 与 0 处 `classList`。

> 口径澄清（两轮 review 均确认）：这是**定位器**用法，不是"断言内部 class 名单"（§2 D2 禁的是后者）。
> 改后文件里没有任何 `classList.contains(...)` 或 class 名断言。

## 5. 门禁

| 门禁                                      | 结果                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| b5 定向（12 spec）                        | **12 files / 197 例 全通过**（select 4 · segmented-trigger 10 · option 8 · segmented 25 · segmented-gesture.browser 8 · conditional-boundary 2 · conditional-combo 11 · guard 4 · conditional-combo.browser 7 · select.spec 39 · autocomplete.spec 52 · autocomplete.browser 27） |
| 全量 `pnpm --filter @greypan/web-ui test` | 112 files / **1288 例，1287 通过，1 失败**（预存 flake，见下）                                                                                                                                                                                                                    |
| `vp check`                                | `All 733 files are correctly formatted` + `no warnings, lint errors, or type errors in 495 files`                                                                                                                                                                                 |
| `pnpm run check:cspell`                   | `Files checked: 596, Issues found: 0`                                                                                                                                                                                                                                             |

**唯一失败 = 预存 flake，与 b5 无关**：
`shared/overlay/__tests__/overlay-in-dialog.browser.spec.ts > Portal overlay 在已打开原生 dialog 内（top layer） > context-menu 子菜单同帧关闭重开后以最新定位落位`。
证据：① `git diff 3a093385 -- packages/web-ui/src/shared/overlay packages/web-ui/src/components/context-menu packages/web-ui/src/components/dialog` **为空**（b5 未触及该 spec 的整个依赖闭包）；② 该 spec 最后一次修改是 `e7c1148b`（Batch 3），早于 b4 base；③ b4 的 verification 记录里已经带着同一条失败
（`111 files / 1312 cases, 1311 pass, 1 pre-existing overlay-in-dialog context-menu flake`）。
它已登记为跨批承诺 #6（"负载敏感时序抖动 → deflake，独立 task"），本批不做改动。

**实施中修掉的一处**：`vp check` 首轮报 4 个文件格式不合规（`option.spec` / `segmented-gesture.browser.spec` /
`contract-event-guard.spec` / `autocomplete.spec`），`vp check --fix` 修复后复跑通过（只动了这 4 个文件的换行）。

## 6. KEEP（未改动）

无。本批 11 个文件全部有改动；`shared/test-utils/index.ts` 为功能新增（护栏），非重写。

## 7. 独立审查结论

**两轮，均 pass，无 blocking。** reviewer ≠ owner（`agent-dd617800`，delta 复验 `agent-56247d0e`）。

### 第 1 轮（对 `diffHash=1ee66d22…`）

- **无 blocking**：未发现①公开契约断言被删除却无等价替代、②D4 未指名真实存活项、③断言被弱化（精确值→存在性）。
- **独立复核通过**：基线 11 文件 `it(` 计数 **221** 与逐文件「前」列一致；改后 **193**（含 `option` 的 3 例矩阵、`segmented-trigger` 的 7 例矩阵）+ 护栏 4 = **197**；全量 1312 → 1288 与批内 Δ 闭合。`[active]` 在 `docs/`、`apps/`、`README*.md` 零引用（非公开 API）确认成立。删除后的存活项逐条实存且等强，其中 `select.spec:104/:156/:189/:356` 四条经打开文件核对。11 文件 0 处 `getComputedStyle` / 0 处 `classList`。
- **裁决**：F.1（不并入 open-change 矩阵）同意；F.2（面板按 class 取样）同意；F.3（borderless 焦点用例对齐 `input/focus.browser.spec.ts` 口径）同意。
- **提出 5 条 non-blocking**。

### 第 2 轮（delta，对 `diffHash=14b5f1df…`）

逐条裁决第 1 轮的 5 条：

| #   | 第 1 轮意见                                                       | delta 裁决                                                                                                                                                           |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 报告把两条 `borderless` 删除项的行号写成 872/891                  | **已解决**（报告改为 `:935` / `:954`，已核对基线 933–956 确为这两条）                                                                                                |
| 2   | "文件仍按 class 取样"被认为陈旧（称 grep 出 0 处）                | **原审查意见有误**：实测当前文件确有 **13 处** class 定位器（4 + 8 + 1）。均属定位用法，无 class 名断言 → 非判据违规。报告 §4.1 已按实测收紧并把这一口径澄清写进文档 |
| 3   | `.label` 匹配在 label 重名时会静默选错项                          | **已解决**：两处改为 `.filter` + `expect(...).toHaveLength(1)` 后再移除（`autocomplete.browser` :93–96、`autocomplete.spec` :696–699），契约不变、更严格             |
| 4   | `segmented-gesture` 的 `getBoundingClientRect()` 超出 R3 明文范围 | **已解决**：在 `pointer()` 上方加注释说明它只用于给合成指针事件算 clientX/Y（测试驱动，非像素契约断言）                                                              |
| 5   | 报告 §0.1「7 处」与所列站点数不自洽                               | **已解决**：独立复核基线 `[active]` = 4+3+2+2+0 = **11 处 / 4 文件**，与订正后的 §0.1 一致                                                                           |

delta 复跑：`autocomplete.spec` 52 passed、`autocomplete.browser` 27 passed、`vp check` pass。

> **trust-but-verify 记录**：第 1 轮的意见 #2 是**误报**（本轮已实测推翻）。把它写在这里是因为"审查意见也可能错"——
> 后续批次遇到 reviewer 的"某文件已无 X"式否定判断时，应先用 `grep` 复核再改代码/文档。

## 8. 转出项

| #   | 项                                                                                                                                                                                       | 归属                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | **R2 剩余 2 处玻璃用例**：`toast/toast-mobile.browser`、`dialog/dialog.browser`                                                                                                          | **b6**（跨批承诺 #4 后半） |
| 2   | **动效观察面裁决**：`segmented-gesture.browser.spec.ts:238`（改后）首帧 `getAnimations()` 长度 0 是本批保留的动效断言，按 R1 兜底条款**显式标注为待 b6 动效判据裁决的例外**              | **b6**（跨批承诺 #1/#3）   |
| 3   | **reduced-motion 覆盖缺口**（b3 删除后零覆盖）                                                                                                                                           | b6（跨批承诺 #1）          |
| 4   | `overlay-in-dialog` context-menu 负载敏感抖动 deflake                                                                                                                                    | 独立 task（跨批承诺 #6）   |
| 5   | `select` / `autocomplete` 的 `open-change` 未并入矩阵的边界（§0.2）——若 b6 决定给这两个组件补程序式 `open`，需回头评估                                                                   | b6 观察项                  |
| 6   | `autocomplete.browser.spec.ts` 仍有 13 处 class 定位器（§4.1）。若 b6 给 autocomplete 的视觉浮层补一个可定位的公开 role（或暴露"锚点"访问器），可回收到 `getPortalPanel()` / `queryA11y` | b6 观察项                  |
