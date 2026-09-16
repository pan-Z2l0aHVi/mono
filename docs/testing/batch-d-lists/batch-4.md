# Batch 4 — 菜单与浮层家族契约测试重构

- task：`web-ui-contract-b4`（`mode: direct`）
- base：`e7c1148b`（Batch 3 提交）
- 范围：**18 个 spec / 225 例 / 4990 行**（`popover` 5 · `tooltip` 4 · `context-menu` 2 · `dropdown` 3 · `dropdown-item` · `dropdown-header` · `dropdown-divider`）
- 治理标准：`docs/adr/0005-web-ui-component-architecture.md` §5
- 判据：`../DELETION-RUBRIC.md`（本批新增 **§8 浮层家族裁定 R1–R4**）

## 0. 本批新增的裁定（写入判据 §8）

浮层家族的断言有 4 类"看起来像契约、实际是实现态"的东西，本批逐一定了口径。裁定文字见 `DELETION-RUBRIC.md` §8，摘要：

| 裁定   | 内容                                                                                                                                                                                             | 影响面                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| **R1** | `data-wui-presence` 是 `shared/overlay/presence.ts` 写的内部状态标记（仅被包自身 CSS 消费，docs/apps/demo 无引用）→ 禁止断言；替换为宿主 `open` ∧ 面板已挂载 ∧ `role` ∧ 面板非 `hidden`          | b4/b5/b6 全体浮层                  |
| **R2** | "单层玻璃"用例（`classList.contains('wui-glass')` + `getComputedStyle` 三连）是 D2+D4（8 个组件逐份重复）→ 删，契约收敛到唯一一处 `shared/theme/float-motion.browser.spec.ts`（b6 动效判据处理） | b4 删 4 处、b5 另 2 处、b6 另 2 处 |
| **R3** | 公开方法/公开副作用若**唯一**观察通道是内联定位样式、边界约束或文档级滚动锁样式 → 保留并标注                                                                                                     | b4 保留 6 组                       |
| **R4** | portal 托管协议断言**可观察后果**（条目顺序、成员进出、关闭后宿主集合、重开稳定），删内部 class 选择器与注释 marker 计数                                                                         | context-menu / dropdown            |

R1 的兜底条款被**实际触发了一次**（`tooltip/repeat-presence`），见 §5。

## 1. 用例数对账（逐文件核过，合计闭合）

基线 17 个 spec 共 **225 例**（与 `batch-plan.md` 预测一致）。

| spec                                | 前  | 后  | Δ   |     | spec                                | 前      | 后      | Δ       |
| ----------------------------------- | --- | --- | --- | --- | ----------------------------------- | ------- | ------- | ------- |
| `popover/popover.spec`              | 47  | 44  | −3  |     | `context-menu/context-menu.spec`    | 49      | 45      | −4      |
| `popover/popover.browser`           | 12  | 11  | −1  |     | `context-menu/context-menu.browser` | 13      | 12      | −1      |
| `popover/conditional.browser`       | 5   | 5   | 0   |     | `dropdown/dropdown.spec`            | 32      | 28      | −4      |
| `popover/conditional-lit.browser`   | 4   | 4   | 0   |     | `dropdown/dropdown.browser`         | 9       | 8       | −1      |
| `popover/conditional-react.browser` | 3   | 3   | 0   |     | `dropdown/conditional.browser`      | 2       | 2       | 0       |
| `tooltip/tooltip.spec`              | 28  | 27  | −1  |     | `dropdown-item/dropdown-item`       | 8       | 10      | **+2**  |
| `tooltip/tooltip.browser`           | 4   | 3   | −1  |     | `dropdown-header/dropdown-header`   | 3       | 2       | −1      |
| `tooltip/conditional.browser`       | 3   | 3   | 0   |     | `dropdown-divider/dropdown-divider` | 2       | 1       | −1      |
| `tooltip/repeat-presence.browser`   | 1   | 1   | 0   |     | **小计（17 文件）**                 | **225** | **209** | **−16** |

新增矩阵 1 个：

| 新增                                                       | 例  |
| ---------------------------------------------------------- | --- |
| `shared/open-state/__tests__/open-change-contract.spec.ts` | 22  |

**合计：17 文件 / 225 例 → 18 文件 / 231 例（净 +6）**。全量套件 **110 文件 / 1306 例 → 111 文件 / 1312 例**（+1 文件 = 新矩阵；+6 例 = 矩阵比它替换掉的旧用例多出的覆盖，见 §2.1）。

净增而非净 0 的原因：独立 review 抓到「被删的 popover `相同值不重复触发` 与属性面 `程序打开不触发` 在新矩阵里没有等价槽位」（`batch-4.md` 原 §3.1 的"等价覆盖"宣称落空），故补 6 例把这两条子语义收进来 —— 见 §2.1 与 §9。

`dropdown-item` 是唯一净减之外净增的既有文件（+2）：原来 8 例里有 6 例是**恒真断言**（断言测试自己刚写进 light DOM 的 `textContent`/`innerHTML`），改为 slot 投影 + 反射矩阵 + 可聚焦性契约后为 10 例。

`git diff --cached --stat`：**15 files changed, +689 / −811**（13 个 spec 改写 + 1 个 spec 新增 + `test-utils/index.ts`；4 个 KEEP 的 conditional spec 未改动）。

## 2. 新增：open-change 契约矩阵

`packages/web-ui/src/shared/open-state/__tests__/open-change-contract.spec.ts`（22 例）

`shared/open-state` 是浮层族 `open-change` 的**唯一致出点**，其模块注释写明了 notification 语义（组件总是自行变更 `open`，事件只作通知）。由此得出一条跨组件恒定契约，本矩阵把它收敛到一处：

> **程序式变更（属性或公开方法）静默；只有用户手势才派发 `open-change`，且 `detail.open` 是变更后的值。**

4 个组件（popover / tooltip / dropdown / context-menu）× 4 条基础语义 = 16 例，替换原先散落在 4 个 spec 里各自重写的 15 例（popover 5 · dropdown 4 · tooltip 2 · context-menu 4）：

| 语义                                     | 各组件对应的程序式通道                                | 用户手势通道                                               |
| ---------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| 程序式打开静默                           | `show()` / `open = true` / `openMenu()` / `openAt()`  | 点击 trigger / pointerenter / 点击 trigger / `contextmenu` |
| 程序式关闭静默                           | `close()` / `open = false` / `closeAll()` / `close()` | Escape                                                     |
| 用户手势派发一次 `detail.open === true`  | —                                                     | 同上                                                       |
| 用户手势派发一次 `detail.open === false` | —                                                     | 同上                                                       |

### 2.1 review 后补的 6 例（补回被删用例的子语义）

独立 reviewer 指出 §3.1 把 popover 的 5 条旧用例整体标为"矩阵等价"，但矩阵每组件只有 4 个槽位，**两条子语义没有落点**：

| 被删的旧用例（`popover.spec`） | 旧断言                                               | 矩阵里原先的缺口                                                                                                             | 补法                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `相同值不重复触发`             | `el.open = true` 连设两次，两次均 `handler` 未被调用 | 矩阵只测 `false→true` 单次跳变；若实现回归为"冗余同值也补发通知"，矩阵仍绿灯                                                 | 新增 `程序式重复施加同一目标状态（同一入口）不派发 open-change`（4 组件各 1 例，`programRepeat` **复用与 `programOpen` 相同的入口**） |
| `程序打开不触发`               | `el.open = true`（**属性面**）不派发                 | 矩阵里 popover / dropdown 的 `programOpen` 走的是**公开方法**（`show()` / `openMenu()`），属性面 `open` 这条并列入口无人覆盖 | 新增 `程序式属性变更（open 属性）不派发 open-change`（popover / dropdown 各 1 例）                                                    |

补充用例**强于**被替换的旧用例：旧的两条只有 `expect(handler).not.toHaveBeenCalled()`，没有任何状态断言；新用例同时断言「面板真的挂出来了」与通知计数。

各组件同值通道（`programRepeat`）：popover `show()` → `show()`、dropdown `openMenu()` → `openMenu()`、tooltip `el.open = true` → 同值、context-menu `openAt(100, 100)` 重复定位到同一坐标（context-menu 无公开 `open` 属性，只有 `openAt()` / `close()`）。

**同义反复的修正（reviewer F2/F3）**：属性面用例初版断言 `expect(el.open).toBe(true)` —— `open` 是 `@property({ reflect: true })` 的公开属性且 `isOpen` 只是 `() => this.open` 的别名，赋值后自读恒真、对回归零保护。已改为断言**可观察后果** `openedConsequence(el)`（popover：非 portal 面板 `[role="dialog"]` 已挂且非 `hidden`；dropdown：`getMenuPanels()` 非空）。同时把 `programRepeat` 从"跨通道重复"（先 `show()` 再写属性）改为**同通道重复**，使"幂等"名副其实。改后 22/22 通过 —— 这同时证明了属性面 `el.open = true` 确实驱动了面板渲染。

**保留在组件 spec 里的特有项**（矩阵不覆盖）：popover 的「hover 重入不让后续命令式关闭派发残留事件」、context-menu 的「重新定位已打开菜单后，命令式关闭不派发残留事件」。

## 3. 删除清单（逐条）

### 3.1 整条删除

| 类     | 用例                                                                                                    | 位置                                                                     | 理由与存活覆盖                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R2** | `菜单浮层面板使用双层玻璃结构：blur 层 + surface 层各自 opacity 过渡`                                   | `dropdown/dropdown.browser`                                              | `classList.contains('wui-glass')` + `getComputedStyle(...).backgroundColor/transitionProperty/backdropFilter` 是 §5 明文禁止的 CSS 样式断言，同一份在 8 个组件逐份重复 → 存活覆盖收敛到 `shared/theme/__tests__/float-motion.browser.spec.ts`（b6） |
| **R2** | `浮层面板单层玻璃：面板自身 opacity + backdrop-filter 插值过渡`                                         | `popover/popover.browser`                                                | 同上                                                                                                                                                                                                                                                |
| **R2** | `浮层面板单层玻璃：面板自身 opacity + backdrop-filter 插值过渡`                                         | `tooltip/tooltip.browser`                                                | 同上                                                                                                                                                                                                                                                |
| **R2** | `菜单浮层面板使用双层玻璃结构：blur 层 + surface 层各自 opacity 过渡`                                   | `context-menu/context-menu.browser`                                      | 同上（本批共删 4 处，8 → 4）                                                                                                                                                                                                                        |
| **D4** | `程序打开不触发` / `程序关闭不触发` / `通过 show() 不触发` / `通过 close() 不触发` / `相同值不重复触发` | `popover/popover.spec`                                                   | 与 §2 矩阵等价 → 存活覆盖 = 矩阵 `web-ui-popover` 组；其中**属性面**（`程序打开不触发`）与**同值幂等**（`相同值不重复触发`）两条由 §2.1 新增用例补齐（reviewer 指出初版无落点）                                                                     |
| **D4** | `命令式打开不触发` / `命令式关闭不触发` / `trigger 点击打开时触发` / `trigger 点击关闭时触发`           | `dropdown/dropdown.spec`                                                 | 同上 → 矩阵 `web-ui-dropdown` 组；属性面由 §2.1 补齐                                                                                                                                                                                                |
| **D4** | `打开时触发` / `关闭时触发`                                                                             | `tooltip/tooltip.spec`                                                   | 同上 → 矩阵 `web-ui-tooltip` 组                                                                                                                                                                                                                     |
| **D4** | `命令式打开不触发` / `命令式关闭不触发` / `右键打开时触发` / `按 Escape 关闭时触发`                     | `context-menu/context-menu.spec`                                         | 同上 → 矩阵 `web-ui-context-menu` 组                                                                                                                                                                                                                |
| **D3** | `slot 文本内容可通过 textContent 访问`                                                                  | `dropdown-header`                                                        | 断言测试自己刚写入 light DOM 的文本，恒真                                                                                                                                                                                                           |
| **D3** | `slot HTML 内容渲染到宿主`                                                                              | `dropdown-header`                                                        | 断言测试自己写入的 `innerHTML`，恒真                                                                                                                                                                                                                |
| **D3** | `空内容不中断渲染`                                                                                      | `dropdown-header`                                                        | `expect(el).toBeInstanceOf(HTMLElement)`，恒真                                                                                                                                                                                                      |
| **D3** | `渲染文本内容`                                                                                          | `dropdown-item`                                                          | 断言测试自己写入的 `textContent`，恒真                                                                                                                                                                                                              |
| **D3** | `可多次创建独立实例`                                                                                    | `dropdown-divider`                                                       | 两个实例各有 separator 属"两份同一断言"，无独立契约                                                                                                                                                                                                 |
| **D2** | `expect(nested.getBoundingClientRect().width).toBe(0)`                                                  | `context-menu/context-menu.browser`                                      | 纯尺寸无行为语义；同一用例的 `slot="context-menu-hidden"` 断言（slot 投影契约）保留                                                                                                                                                                 |
| **D2** | `expect(getComputedStyle(panel).opacity).toBe('1')`                                                     | `popover/popover.browser`                                                | 计算样式；同用例的 `open === true` + 面板非 `hidden` 保留                                                                                                                                                                                           |
| **R1** | `expect(getMenus()[0]?.dataset.wuiPresence).toBe('entering')`                                           | `dropdown/dropdown.browser`、`context-menu/context-menu.browser`         | 顺带断言（用例主题是"子菜单打开"/"右键打开"），瞬时态归 b6 动效判据；打开/可见后果保留                                                                                                                                                              |
| **R1** | `expect(submenu?.dataset.wuiPresence).toBe('closing')`                                                  | `dropdown/dropdown.browser`                                              | 同上；用例的"重开后仍可见"断言保留                                                                                                                                                                                                                  |
| **R4** | 注释 marker 计数 `getManagedMarkers(menu).toHaveLength(N)`                                              | `context-menu/context-menu.browser`（4 处）、`context-menu.spec`（3 处） | 内部机制 → 改为可观察后果：面板条目顺序、关闭后宿主项集合、重开后无重复                                                                                                                                                                             |
| **R4** | `'#v-if'` 注释节点计数                                                                                  | `context-menu.spec`                                                      | Vue 的占位注释是 Vue 产物，非本组件契约 → 改为条目顺序/集合稳定                                                                                                                                                                                     |
| **R4** | 注释 marker 计数（`wui-dropdown-menu-item`）                                                            | `dropdown/conditional.browser`                                           | 改为行为稳定性：多轮开关后项数不增不减、顺序不变                                                                                                                                                                                                    |

### 3.2 只删局部断言（D5，保留用例）

| 位置                                                          | 删除的部分                                                                      | 保留的部分                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `tooltip.spec` · `open=true 显示本地面板且不触发 open-change` | `expect(handler).not.toHaveBeenCalled()`                                        | 可见性 + host attribute 反射（标题同步改为「open=true 显示本地面板并反射到 host attribute」） |
| `tooltip.spec` · `open=false 隐藏面板且不触发 open-change`    | 同上                                                                            | 可见性（标题改为「open=false 隐藏面板」）                                                     |
| `dropdown.spec` · `touch pointerenter 不打开子菜单`           | `expect(item.hasAttribute('active')).toBe(false)`（`active` 非公开 API，见 §4） | 改为"不产生第二级子菜单面板"                                                                  |

### 3.3 改写（非删除）

| 位置                                                                                     | 改法                                                                                                                                                               |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `popover.browser` · `show() 以即时状态打开面板`                                          | `presence === 'open'` → `open === true` ∧ `role === 'dialog'` ∧ 非 `hidden`                                                                                        |
| `popover.browser` · `temporary disconnect 后 reconnect 仍可打开`                         | 同上                                                                                                                                                               |
| `dropdown.browser` · `直接设置 open 时以即时状态显示根菜单`                              | → `open === true` ∧ 面板 1 个 ∧ `role="menu"` ∧ 内容                                                                                                               |
| `context-menu.browser` · `openAt() 以即时状态显示根菜单` / `指针右键…`                   | → `isOpen` ∧ 面板挂载 ∧ `role="menu"` ∧ `aria-label="上下文菜单"` ∧ 非 `hidden`                                                                                    |
| `context-menu.browser` · `getMenuContent()`                                              | `.wui-menu-content` 内部 class → 面板自身（`getMenuPanels('上下文菜单')[0]`）                                                                                      |
| `dropdown.spec` · `clickTrigger`                                                         | 去掉 `shadowRoot` 里的 `slot[name="trigger"]` 查询，改 `el.querySelector('[slot="trigger"]')`（与 popover 一致）                                                   |
| `dropdown.spec` · `getMenuItem/getMenuItems`、`context-menu.spec` 的 `.dropdown-overlay` | 内部 class → `getMenuPanels()`（本批新增的公开定位器）                                                                                                             |
| `popover.spec` · 反射用例（open / portal / disabled / placement）                        | 改用 `contractReflection` 批量生成（断言强度不变；`hasAttribute` → `getAttribute === ''` 更精确）                                                                  |
| `tooltip.spec` · 反射用例（placement / portal）+ Portal 内容同步                         | `contractReflection` + `getPortalPanel('tooltip')` 替代手写 overlay 链                                                                                             |
| `dropdown-item` · 6 条恒真断言                                                           | 改为 slot 投影（默认 / prefix / suffix / submenu 替代 suffix）+ 反射矩阵（disabled / pl / value / submenu）+ 可聚焦性（`tabindex` 0 / −1）+ `focusItem()` 焦点落点 |
| `popover.spec` · `面板有 role="dialog"`                                                  | `expect(panel).toBeTruthy()` → `expect(panel?.getAttribute('role')).toBe('dialog')`（补强）                                                                        |

## 4. 两处裁定与一处例外

### 4.1 `active` 属性不是公开 API（dropdown）

`web-ui-dropdown-item` 的 `@property` 只有 `disabled / pl / value / submenu`（`dropdown-item/index.ts:13-16`）；`active` 由 dropdown 的 `_syncActiveAttrs`（`dropdown/index.ts:326-338`）作为内部高亮标记写入。故 `expect(item.hasAttribute('active'))` 按 D2 删，改为焦点/面板数等可观察量。

### 4.2 `getMenuChildren`（内部模块）保留一处

`@/shared/menu-portal/menu-tree` 是内部模块（包 `exports` 只有 `./components/*` 与 `./icons`）。`context-menu.browser.spec.ts` 仍保留它的导入，原因是**不等价**：面板里带嵌套子菜单的项（`导出`→`PDF`）用公开 `querySelectorAll('web-ui-dropdown-item')` 会把 `PDF` 重复计入，而 `getMenuChildren` 不递归进 submenu 子项。其余用途（宿主计数、扁平面板解构）已全部换成公开 DOM 查询。

### 4.3 例外（R3 保留并标注）

| 位置                                     | 断言                                                                      | 为什么留                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `context-menu.spec`（openAt / 右键定位） | `menu.style.left === '100px'` / `style.top`                               | `openAt(x, y)` 是公开方法，坐标→位置是决定性映射；改用 `getBoundingClientRect()` 更差（几何 + 更易 flake） |
| `context-menu.spec`（边界检测 / 负坐标） | `left < window.innerWidth`、`top < innerHeight`、`>= 0`                   | 断言"不出视口"的行为约束，不是像素值                                                                       |
| `context-menu.spec`、`dropdown.spec`     | `document.documentElement.style.overflow`、`document.body.style.position` | 组件之外的文档级副作用，滚动锁的唯一观察面（b3 已把 `scroll-lock.spec.ts` 判为 KEEP，口径一致）            |
| `context-menu.browser`                   | `portal 顺序稳定时不再触发 childList mutation`                            | 断言"稳态无 DOM 抖动"（防 marker 繁殖活锁），MutationRecord 是该契约唯一观察面                             |
| `dropdown.browser`                       | drawer 等待条件用 `drawerDialog.open` + 轮询菜单挂载                      | 等待/同步条件，非断言（b3 同口径）                                                                         |

### 4.4 freeze 前一致性收口：合并菜单定位器

3 个 spec 各自实现了一份「从 overlay root shadow 直查 `[role="menu"]`」的定位器，与本批新增的共享定位器 `@/shared/test-utils getMenuPanels(ariaLabel?)` 重复：

| 文件                           | 原实现                                                 | 改法                                                                                   |
| ------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `dropdown.spec.ts`             | 本地 `getMenuPanels()`（无参）                         | 删本地实现，改从 `@/shared/test-utils` 导入；`getMenuItem` / `getMenuItems` 薄封装保留 |
| `context-menu.spec.ts`         | 本地 `getMenu()` / `getSubmenu()`（各查 `aria-label`） | 改为 `getMenuPanels('上下文菜单')[0] ?? null` / `getMenuPanels('子菜单')[0] ?? null`   |
| `context-menu.browser.spec.ts` | 本地 `getMenus()`（枚举全部 `[role="menu"]`）          | 改为 `getMenuPanels()`                                                                 |

两者对菜单族**功能等价**（菜单面板是 `[data-wui-overlay-container]` 的直接子节点，文档序一致），共享版把查询收窄到容器内、并支持按 `aria-label` 区分根面板 / 子菜单，更精确。复验：`dropdown.spec.ts` 28 例、`context-menu.spec.ts` 45 例、`context-menu.browser.spec.ts` 12 例全通过。

收口后本批 7 个组件目录的 spec **已无 `[data-wui-overlay-root]` 直查**（全仓剩余命中仅在 b5 的 `select`/`autocomplete` 与 b6 的 `theme`/`image-preview`/`toast`）。

### 4.5 保留：`host.shadowRoot` 下的 `role` 查询（非 portal 面板）

`popover.browser.spec.ts`（3 处）与 `popover.spec.ts`（2 处）仍有 `el.shadowRoot?.querySelector('[role="dialog"]')` / `('[aria-expanded]')`。这些用例的面板是**非 portal** 渲染（`portal` 默认 false），面板就落在组件自己的 shadow root 内，**只能**经宿主 shadow 到达。

不属 §5 禁止项：查询用的是 `role` / `aria-*`（§5 明确允许的公开面），不是内部 class，也不是私有字段；且这些行**非本批引入**（`git diff e7c1148b` 中该文件无新增的 `shadowRoot` 行，只删了 2 处 portal 链）。与 `dropdown.browser.spec.ts:183` 用 `shadowRoot.activeElement` 观察组件内焦点同属「标准 API + 公开语义」，一并保留。

## 5. R1 兜底条款被触发一次：`tooltip/repeat-presence.browser.spec.ts`

该用例的全部主题就是 presence 瞬时序列（"指针滑到相邻 tooltip 时不重播入场"）。按 R1 首选方案改用 Web Animations API，**实测不可行**：

```
FIRST  f0 presence=entering 运行过渡=[]   f1..f7 presence=open 运行过渡=[backdrop-filter,opacity,transform]
SECOND f0..f7               presence=open 运行过渡=[backdrop-filter,opacity,transform]
```

面板一经创建就带三条运行中的过渡，"重播入场"与"跳过入场"采到的属性集合**完全相同**；差异只存在于帧级视觉渐变，无行为层可观察量。故按 R1 兜底条款保留 presence 序列断言，并在 spec 内写明证据，**移交 Batch 6 与 reduced-motion 缺口一并按动效判据重新裁定**。

**区分口径**（避免与 §3.1 里删掉 `entering`/`closing` 的做法被质疑不一致）：那些是**顺带断言**（用例主题是"子菜单打开"或"右键打开"，打开/可见/顺序等后果可断言）；本例外中瞬时序列是**全部主题**，不能照删。

## 6. 门禁

冻结（最终）：`diffHash = 8133114e18b4205bf9576cb34ff439e10025abb73774bf4495a35f2e1fef5f0f`（base `e7c1148b`，15 文件）。

冻结历史：初次 `6d39310a…` → reviewer 提 F1 后补 6 例 → 二次 `aff4ba11…` → reviewer 复验 pass 并提 F2/F3 → 按 F2/F3 改进断言与通道 → 三次（最终）`8133114e…`。每次工作区变化都会让 `diffHash` 变 stale，而 review / approval 都绑定 diffHash，故每轮都需 reviewer 复验该 delta 并重新确认结论。

| 门禁                                                | 结果                                                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 家族汇总（18 文件）                                 | **231 例全通过**                                                                                         |
| 全量 `pnpm --filter @greypan/web-ui test`（提交前） | **111 文件 / 1312 例 → 1311 passed, 1 failed**                                                           |
| 全量（提交后 `3a093385` 上复跑）                    | **111 文件 / 1312 例 → 1311 passed, 1 failed**（唯一失败是 §7 的既有负载敏感抖动；多次运行中偶有全通过） |
| `vp check`                                          | **0 errors / 0 warnings / 0 format issues**（732 文件格式、494 文件 lint+type）                          |
| `pnpm run check:cspell`                             | **595 文件，0 issues**                                                                                   |

**提交**：`3a093385`（`test(packages): refactor menu and floating-layer web-ui specs toward contract tests (batch 4)`，15 files changed, +766 / −811）。任务状态：`closed`（verified `headSha = 3a093385`）。（提交时的 +766 高于 `git diff --cached` 时代的 +689，差值来自矩阵在 F1/F2/F3 三轮 review 后的扩充。）

### 6.1 实施中修掉的两处

1. 本批新增矩阵初版用 `describe(spec.name, …)` 触发门禁 `vitest(valid-title): Title must be a string`（该规则认字面量/模板串，不认成员访问）→ 改 ``describe(`${spec.name}`, …)``。
2. `cspell` 对注释里的 `anims=` 报 3 处 unknown word → 注释改为中文「运行过渡」。

## 7. 重大发现：既有失败用例是**负载敏感抖动**，不是确定性缺陷

b3 的记录把 `shared/overlay/__tests__/overlay-in-dialog.browser.spec.ts > context-menu 子菜单同帧关闭重开后以最新定位落位` 描述为「失败在断言之前的定位就绪前置条件，稳定复现」。**本批实测推翻了"稳定复现"**：

| 运行方式                                    | 结果                                                   |
| ------------------------------------------- | ------------------------------------------------------ |
| 该 spec 单独跑（`--project browser`），3 次 | **3/3 失败**（失败在 `waitFor` 前置条件，1716ms 超时） |
| 该 spec + 1 个邻居 spec 同跑                | 1 失败 / 23 通过（仍失败）                             |
| **全量套件**（111 文件并行），3 次          | **1 失败 / 2 全通过**                                  |

即：浏览器项目**负载低**时该用例稳定失败、**全量并行负载高**时约 2/3 通过 —— 是**用例侧的时序假设**问题（对定位就绪的等待预算/采样时机敏感），不是组件竞态缺陷，也不是本批引入（该 spec 与 `context-menu` 源码本批**均未改动**，可 `git diff e7c1148b -- <两个路径>` 验证为空）。

**处置**：本批不修（不在重构范围，且属 deflake 议题）。已修正 `batch-3.md` §7.4 的表述，并在 `batch-plan.md` 转出项里记为 deflake 事项（参考既有 `ci-web-ui-browser-spec-flaky` 类 task）。

## 8. KEEP（未改动）

| 文件                                | 例  | 理由                                                                                                                                     |
| ----------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `popover/conditional.browser`       | 5   | portal 条件渲染边界（v-if 删除/新增/同 flush 关闭重开/中段插入保序）——断言的是面板内投影内容的去留，属 §5 允许的 slot 投影，已是契约内聚 |
| `popover/conditional-lit.browser`   | 4   | 同上的 Lit 消费方渲染器路径（仓库既有的框架对等惯例，`.probe-flag` 是 spec 自建标记，非组件内部 class）                                  |
| `popover/conditional-react.browser` | 3   | 同上的 React 路径                                                                                                                        |
| `tooltip/conditional.browser`       | 3   | 同上的 tooltip 路径                                                                                                                      |

4 个文件属**框架对等**设计（同一契约在 Vue/Lit/React 消费方下各验一次），合并会破坏该惯例且无断言重复可去，故不动。

## 9. 独立审查结论

共三轮，reviewer 均另起上下文（`reviewer !== owner`）。**最终结论：`pass`，无未闭合 finding。**

| 轮次                | reviewer         | 结论                  | 提出                                                                            |
| ------------------- | ---------------- | --------------------- | ------------------------------------------------------------------------------- |
| 1（对 `6d39310a…`） | `agent-eafce446` | **pass**              | F1（属性面 / 同值幂等两条子语义无落点）、F2（注释措辞）、F3（范式出处无法溯源） |
| 2（对 `aff4ba11…`） | `agent-7c0a5a9b` | **pass**（F1 已闭合） | F2（`expect(el.open)` 同义反复）、F3（`programRepeat` 跨通道；"同值"命名误导）  |
| 3（对 `8133114e…`） | `agent-77dba509` | **pass**，findings 无 | —                                                                               |

第 1 轮 reviewer 用自己的复扫脚本逐文件确认 15 个文件无 §5 禁止项，实跑矩阵 16/16、抽查 6 条删除的存活覆盖、逐文件例数与本文档 §1 核对吻合，**未发现"报告改了代码没改"**。

**findings 处置**：

| finding                         | 内容                                                                                                                                                          | 处置                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **F1**（真实覆盖缺口）          | §3.1 把 popover 的 5 条旧用例整体标为"矩阵等价"，而矩阵每组件只有 4 个槽位 —— `相同值不重复触发`（同值幂等）与 `程序打开不触发`（**属性面**）两条子语义无落点 | 补 6 例（§2.1）；矩阵 16 → 22，本批净由 0 变 **+6**                                                                                                                                                                                                                                  |
| **F2**（弱断言）                | 属性面用例断言 `expect(el.open)` —— reflect 属性自读恒真，对回归零保护                                                                                        | 改为断言 `openedConsequence(el)`（面板已挂出且非 hidden）。第 3 轮 reviewer 独立核实其**有真实区分度**：popover 面板关闭态带 `hidden`（`popover/index.ts:382`）、dropdown 菜单面板**懒惰挂载**于 `_buildOverlay`（`dropdown/index.ts:409-455`），`el.open = true` 前 length=0、后 >0 |
| **F3**（通道不一致 / 命名误导） | `programRepeat` 跨通道（先 `show()` 再写属性），"同值"名不副实                                                                                                | `programRepeat` 改为复用 `programOpen` 同一入口；用例改名为「程序式重复施加同一目标状态（同一入口）」。第 3 轮 reviewer 核实三者均走"已开早退"分支（`popover/index.ts:174`、`dropdown/index.ts:238`、`context-menu/index.ts:221-227`），是**幂等而非重开**                           |
| **F3-文档 nit**（第 1 轮）      | `test-utils` 注释写"菜单面板**直接**挂到容器"，代码用后代查询                                                                                                 | 无动作（面板恒在容器内，两者功能等价；归属关系描述无误）                                                                                                                                                                                                                             |

**reviewer 明确核实的通过项**：R1 例外成立（证据块自洽、该用例全部主题即 presence 瞬时序列、`getAnimations()` 范式文件存在）；定位器合并前后查询结果集语义等价；矩阵手势通道与程序式通道分离（无"手势走程序式路径"的假通过）；无断言弱化（无 `toBeDefined`、无"具体值→存在"替换，`popover.spec` 反而把 `hasAttribute` 补强为 `getAttribute === ''`）；`openedConsequence` 声明为可选、仅 popover/dropdown 填属有意（这两者才有并列的属性面入口），新增 import 无死引用。

## 10. 转出项（不阻断本批）

1. **`overlay-in-dialog` context-menu 用例的负载敏感抖动**（§7）：deflake，另立 task。
2. **R2 的剩余 4 处玻璃用例**（b5 的 `select.browser` / `autocomplete.browser`，b6 的 `toast-mobile.browser` / `dialog.browser`）按同一裁定删除，契约仍收敛在 `shared/theme/float-motion.browser.spec.ts`。
3. **R1 的动效断言观察面**（b6）：`presence` 瞬时态到底能用什么观察面替代 —— b4 已证 `getAnimations()` 对 anchored panel 不可行；b6 需给最终答案，并与 reduced-motion 缺口（b3 删掉 `shared/overlay/reduced-motion.browser.spec.ts` 留下的）一并处理。
4. **`checkbox-group` / `radio-group` 的同输入多用例合并**（b3 转出，仍未做）。
