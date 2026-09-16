# 删除判据（D 组）— 统一口径，Batch 3 起自行判定

> 本文件是 `@greypan/web-ui` 契约化重构（2026-09）的删除授权判据，随同批台账
> `BATCH-LEDGER.md` 一起提交在 `docs/testing/` 下，供后续 review / CI / 新 clone 核验删除链。
> 组件源码里的判据注释一律指向这里。

## 0. 适用范围与授权

用户已授权：**Batch 3 起由执行者按本判据自行判定删除，不再逐批请示**（"自行判断"）。
授权的前提是**留痕**：每批必须在 `BATCH-LEDGER.md` 的 D 清单里逐条给出 `file:line` + 类别 + 理由 + 存活覆盖位置；
判据边界本身若需放宽/收紧，先改本文件再执行（判据变更与用例变更分开可审）。

## 1. 上位标准

`docs/adr/0005-web-ui-component-architecture.md` §5「公开契约测试」。允许断言的**全部**对象：

- 宿主 property ↔ attribute 反射
- 公开方法（及其可观察后果）
- 事件名 + 派发次数 + `detail` 载荷
- `role` / `aria-*` / 可聚焦性 / `document.activeElement` 归宿
- `FormData` 参与与提交语义
- slot 投影

## 2. 可删类别（白名单，逐条需落到具体行）

| 类     | 名称                     | 判据                                                                                                                                                                                                                                                                               | 举例形态                                                                                                                                                            |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | 整文件删除               | 文件内**全部**用例均为 D2/D3/D4，或整文件功能已被新矩阵完全覆盖                                                                                                                                                                                                                    | `*-glass.browser.spec.ts`、`*-slot-presence.spec.ts`（与 matrix 重复时）                                                                                            |
| **D2** | 纯视觉 / 实现态用例      | 用例的**唯一**断言落在：`getComputedStyle` 取值、CSS 变量解析值、`box-shadow`/`padding`/`margin`/`border-radius`/`background`/`opacity`、`cursor`、`touch-action`、`will-change`、`transition-*` 时长曲线、伪元素（`::before`/`::after`）内容、像素度量、内部 class 名单、私有字段 | `expect(getComputedStyle(el).boxShadow).toContain(...)`                                                                                                             |
| **D3** | 存在性 / 恒真用例        | 断言不承载行为契约：`expect(typeof el.focus).toBe('function')`、`expect(el.shadowRoot).toBeTruthy()`、`expect(customElements.get('web-ui-x')).toBeDefined()`（后者仅允许全仓保留**一处**注册冒烟）                                                                                 | `expect(el.shadowRoot!.querySelector('.inner')).toBeTruthy()`                                                                                                       |
| **D4** | 重复用例                 | 同一公开契约在同一文件或跨文件已有等价覆盖。**必须指名存活的那一条**（`file:line`）；无法指名则不得删                                                                                                                                                                              | 组件 spec 里重复矩阵已覆盖的 `name` 反射                                                                                                                            |
| **D5** | 保留用例内的局部断言删除 | 用例标题承载公开契约，但函数体内夹带 D2/D3 断言 → **只删断言，保留用例**；用例名若已名不副实，同步改名                                                                                                                                                                             | `it('disabled 时不响应', ...)` 内含 `expect(el.getAttribute('aria-disabled')).toBe('true')` ✔保留 + `expect(getComputedStyle(el).cursor).toBe('not-allowed')` ✖删除 |

## 3. 不得删除（黑名单，违反即 blocking）

- 宿主 property ↔ attribute 反射（含"某 prop **不**反射"这类负向契约）
- 公开方法的存在 + 可观察行为
- 事件名 / 次数 / `detail`；含"编程式设值**不**派发事件"这类负向契约
- `role` / `aria-*` / `tabindex` / 键盘可达性 / 指针可达性 / `document.activeElement` 归宿
- `FormData` 参与、`name`/`value` 提交语义、表单联动
- slot 投影（默认 slot 与具名 slot）
- 与视觉断言混在同一用例内的上述契约 → 走 **D5**，保留行为部分

**灰区裁决规则**：拿不准的断言，问"如果实现重写成等价但结构完全不同的组件，这条断言该不该失败？"——
该失败 → 保留（是契约）；不该失败 → 删除（是实现态）。裁决过程写进 D 清单的理由列。

## 4. 必须留痕的字段

`BATCH-LEDGER.md` 的 D 清单每行至少含：

```
| 类 | file:line | 被删内容摘要 | 归类理由 | 存活覆盖位置 |
```

- **D4 的"存活覆盖位置"必填**，其余类别若为"该契约不再有覆盖"须显式写 `—（该契约非公开契约）`。
- **新增覆盖缺口（"本可从无到有"）**不属删除，走 ADD 清单（如 Batch 2 的 switch 键盘契约补丁）。

## 5. 允许"删除 + 新增等价覆盖"的等价性要求

若某条被删断言承载的公开契约由新矩阵承接，须保证等价性：**同一输入 → 同一断言强度**。
弱化（如从精确值 `toEqual` 降为 `toBeTruthy`）视为覆盖丢失，须走 D5 改为保留原断言强度。

## 7. 内部模块 spec 的标准（Batch 3 首次遇到，需与组件 spec 区分）

包 `exports` 只有 `./components/*` 与 `./icons`，因此 **`src/shared/**` 一律是内部实现**（`shared/overlay/*` 亦仅有组件内部引用）。
§5 的条文针对**组件**（`web-ui-*` 自定义元素）的公开契约；内部模块 spec 的目标不是"公开契约"而是**可观察后果**：

|            | 内部模块 spec                                                                        | 组件 spec（§5）                                            |
| ---------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 断言对象   | 导入函数的输入→输出、对**测试自建 DOM** 的可观察改动、单例性、清理彻底性、返回值语义 | 宿主 props/反射、公开方法、事件、role/aria、FormData、slot |
| 仍属删除项 | 内部状态标记（内部 class、`dataset.*` 状态机标记）、调用/布局读取顺序、计算样式      | 同 §2                                                      |
| 不适用     | "宿主 attribute 反射"（无宿主）                                                      | —                                                          |

**裁决口径**：内部模块的断言若"换一份等价实现就会失败"，即为实现态 → 删；若"重新实现仍须满足"，即为契约 → 留。
整文件删除仅当**每一条**断言都落在删除项、且没有任何可观察后果承接时。

## 8. 浮层家族裁定（Batch 4 定，b5/b6 沿用）

### R1 — presence 标记是内部状态标记，禁止断言

`data-wui-presence` 由 `src/shared/overlay/presence.ts` 写入，**只被包自身 CSS 消费**（全仓 `docs/`、`apps/`、demo 无引用；
`docs/research/web-ui-portal-library-survey.md` 把它列为"本仓库领域语义"的内部状态机）。
该模块真正的契约是它的**导出**：`showOverlayPresence(panel, { isInstant })`（写了 `panel.hidden`）与
`hideOverlayPresence(panel): Promise<boolean>`（**退场被中断时返回 `false`**）。

| 原断言                                           | 替换为（公开可观察量）                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `panel.dataset.wuiPresence === 'open'`           | 宿主 `open === true` ∧ 面板已挂载于 overlay root（portal 契约）∧ `role` 正确 ∧ 内容已投影 ∧ 面板非 `hidden` |
| `panel.dataset.wuiPresence === 'closing'` 仍可见 | 面板仍挂载且 `!hidden`（退场期可见就是它的后果）                                                            |
| 宿主卸载后面板不存在                             | 面板不在 overlay root 内                                                                                    |

- `hidden` 属性**允许**断言：它是 presence 的公开可见后果（可见性），不是状态名。
- **瞬时态 `entering` / `closing` 的"动画语义"**（是否重播入场、是否可中断）属**动效判据**，归 Batch 6；
  b4 只保留"打开/关闭/仍可见"这层后果。若某用例的**全部**主题就是瞬时序列（如 `tooltip/repeat-presence`），
  优先改用 Web Animations API（`getAnimations()`，b1 已批范式）表达"未重播入场"；若不可行则保留原标记断言并
  **显式标注为待 b6 动效判据裁决的例外**。

  > **实测证据（b4，2026-09-15）**：`getAnimations()` 对 anchored panel **不可行**。
  > 面板一经创建就带三条运行中的过渡（`opacity` / `backdrop-filter` / `transform`），
  > 「重播入场」与「跳过入场」采到的属性集合完全相同：
  > `FIRST f0 presence=entering anims=[] → f1 open anims=[backdrop-filter,opacity,transform]`；
  > `SECOND f0..f7 presence=open anims=[backdrop-filter,opacity,transform]`。
  > 该差异只存在于**帧级视觉渐变**，无行为层可观察量。故 b4 对 `tooltip/repeat-presence.browser.spec.ts`
  > 启用 R1 兜底条款，并把「动效断言到底能用什么观察面」这一裁决交给 b6（与 reduced-motion 缺口同批）。
  >
  > **区分口径（避免被质疑不一致）**：b4 从 dropdown/context-menu 的 browser spec 里删掉的
  > `presence === 'entering' / 'closing'` 是**顺带断言**（用例主题是"子菜单打开"或"右键打开"，
  > 存在打开/可见/顺序等行为后果可断言）；本例外中瞬时序列是**全部主题**，故不能照删。
  >
  > ⚠️ **本段结论已被 §10 S6 推翻，阅读到此请继续看下文。** b4 的实测对照取错了帧
  > （拿 `FIRST f1..f7` 比 `SECOND f0..f7`，而非逐帧比 `f0 ↔ f0`），据此得出的
  > 「`getAnimations()` 不可行」不成立；且即使可行，那一帧相位差也只是视觉瞬态。
  > **最终处置：R1 例外取消**，用例改写为断言零延迟行为，文件名由
  > `repeat-presence.browser.spec.ts` 改为 `repeat-show-delay.browser.spec.ts`（详见 §10 S6）。

### R2 — "单层玻璃"用例是 D2，收敛到主题层

`classList.contains('wui-glass')` + `getComputedStyle(...).backgroundColor / transitionProperty / backdropFilter`
是 §5 明文禁止的 CSS 样式断言，且同一份断言在 popover / tooltip / dropdown / context-menu / select / autocomplete / toast / dialog
**逐组件重复 8 次**（属 D2 + D4）。b4 删除本批 4 处（popover.browser、tooltip.browser、dropdown.browser、context-menu.browser），
该契约**收敛到唯一一处**：`shared/theme/float-motion.browser.spec.ts`（Batch 6 主题/动效判据处理）。
这不是静默丢失：8 处 → 1 处，且那 1 处由 b6 按动效判据重新裁定。

### R3 — 公开方法/公开副作用的输出通道例外

公开方法（§5 明确允许）或公开副作用，若其**唯一**可观察通道是下列之一，断言**保留**并在批次文档标注为例外
（b3 先例：`overlay.spec.ts:152` 的 `--wui-overlay-min-width`）：

| 通道           | 例                                                                                                 | 为什么留                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 内联定位样式   | `openAt(100,100)` → `menu.style.left === '100px'`                                                  | 参数→位置是**决定性映射**，非视觉细节；改用 `getBoundingClientRect()` 更差（几何+更易 flake）               |
| 边界**约束**   | `left < window.innerWidth`、`left >= 0`                                                            | 断言的是"不出视口"这一行为，不是某个像素值                                                                  |
| 全局滚动锁样式 | `document.documentElement.style.overflow === 'hidden'`、`document.body.style.position === 'fixed'` | 作用在**组件之外**的文档级副作用，是滚动锁的唯一观察面（b3 已把 `scroll-lock.spec.ts` 判为 KEEP，口径一致） |

同时满足"仅是视觉/尺寸细节"+"无行为语义"的几何断言（如 `getBoundingClientRect().width === 0` 之外的纯尺寸）仍按 D2 删。

### R4 — portal 托管协议的断言对象

menu 族（dropdown / context-menu）的 portal 托管协议，断言**可观察后果**：

| 留（可观察）                                                      | 删（内部机制）                                                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 面板内条目文本**顺序**、关闭后宿主 light DOM 顺序、重开后顺序稳定 | `.wui-menu-content` / `.dropdown-overlay` 等内部 class 选择器（**定位**改用 `getPortalPanel()` / `queryA11y`）    |
| 框架增删项后条目集合的变化（进面板 / 离面板）                     | 内部注释 marker 的**计数**（`node.textContent === 'wui-dropdown-menu-item'`）→ 改为"多轮开关后项数稳定、无重复项" |
| 关闭后无残留（宿主子节点集合 == 期望项）                          | 内部锚点注释的存在性/数量                                                                                         |
| 嵌套项的 `slot="context-menu-hidden"`                             | — （`slot` 名是 slot 投影契约，§5 允许）                                                                          |

## 6. 禁止项

- 不删测试资产以外的任何文件（源码、docs、demo 一律不碰）。
- 不以"覆盖率数字好看"为由删用例。
- 不因用例"跑得慢/不稳定"而删——不稳定走 deflake（另立 task）。

## 9. 组合框 / 分段家族裁定（Batch 5 定，b6 沿用）

### R5 — `option[active]`（内部高亮标记）不是公开 API

`active` 由 `select/index.ts` 与 `autocomplete/index.ts` 的
`this._options.forEach((o, i) => o.toggleAttribute('active', i === this._activeIndex))` 写入，
**`docs/`、`apps/`、`packages/web-ui/README*.md` 零引用**，且不在 `web-ui-option` 的公开面里
（option 公开面 = `value` / `disabled` / `selected` / `label` + `default` / `prefix` / `suffix` slot）。
属 b4 §4.1 对 dropdown `active` 同一裁定的延续 → **禁止断言**。

| 原断言                                                            | 替换为（公开可观察量）                                                                                                                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `el.querySelector('web-ui-option[active]')` 取"当前激活项"        | 宿主 combobox 的 `aria-activedescendant` → 该 id 在 shadow 内的 `role="option"` 镜像节点（`autocomplete/index.ts:656/698`）；select 非 portal 模式下 id 直接指向 light DOM 里的 `web-ui-option` |
| `expect(el.querySelector('[active]')).toBeNull()`（激活态被清理） | `expect(input.getAttribute('aria-activedescendant')).toBeFalsy()`（同一后果）                                                                                                                   |

**⚠️ 用文本/label 反查节点时必须加唯一性断言**：`[...options].find(o => o.label === activeLabel)` 在 label 重名时
会**静默选错项**。写法固定为：

```ts
const matched = [...panel.querySelectorAll('web-ui-option')].filter(o => o.label === activeLabel)
expect(matched).toHaveLength(1) // 把"静默错选"变成"响亮失败"
matched[0]!.remove()
```

### R6 — 视觉变体（`borderless` 一类）的用例走 D5，别整条删

`borderless 输入框聚焦时保留 focus ring` 这类用例的主题是 CSS（focus ring 三连 + `padding` 度量 + 面板背景），
但用例体内常夹带**焦点归宿**（`document.activeElement`）与**宿主 `focused` 属性反射**两个公开契约。

- 视觉部分 → D2 删；焦点部分 → 保留。
- 口径来源（引用既有先例，别新立标准）：`packages/web-ui/src/components/input/__tests__/focus.browser.spec.ts`
  文件头注释 ——「`focused` 反射是可观察公开面；focus ring 的 outline / box-shadow / halo / `::before` 描边盒 /
  padding 度量属 CSS 实现细节，按 ADR-0005 §5 不在契约 spec 断言」。
- 通用动作：裁"拿不准"的用例前，先全仓 Grep 同题先例，跟着已有口径走。

### R7 — `open` 为 getter-only 的组件不并入 open-change 矩阵

`select` / `autocomplete` 的 `open` 没有程序式设值通道（仅用户手势：点击 / `ArrowDown` / `Escape` / 外部点击）。
把它们塞进 `shared/open-state/__tests__/open-change-contract.spec.ts` 只能靠派发合成手势事件——
**那本身就是手势路径**，会产出"手势走程序式槽位"的**假通过**用例。

**判据**：矩阵槽位只收真有程序式通道（属性或公开方法）的组件；没有的保留各自的手势用例，
并在 `BATCH-LEDGER.md` 写明这是**有意决策**（不是遗漏），以便后续审计区分。

### R8 — 面板无公开 role 时，class **定位器**是允许的例外

autocomplete 把无障碍面镜像到 shadow 内的 `role="listbox"` / `role="option"`，
视觉浮层 `.autocomplete-overlay` 是 `aria-hidden="true"`（`autocomplete/index.ts:710–712`）——
**没有任何 role 能定位它**；`.input-wrapper` 又是 Floating UI 的定位锚点、无公开访问器。
此时 R4 的"改用 `getPortalPanel()` / `queryA11y`"**不适用**。

**区分（关键）**：

| 允许                                                                               | 禁止                                                                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 用 class 作 `querySelector` **定位器**（取到元素后断言的是 role/aria/文本/可见性） | 断言**内部 class 名单本身**（`classList.contains('is-pressed')`）或 class 名是断言对象 |

收尾自检：全批跑一遍 `grep -n 'getComputedStyle\|classList'` **必须为 0**；class 定位器则应在批次文档里
逐个列出并说明为什么没有公开替代。

## 10. 主题与动效家族裁定（Batch 6 定，后续沿用）

> 本裁定兑现跨批承诺 **#2**（主题令牌判据）与 **#1/#3**（动效观察面）的判据部分。
> 来源：`BATCH-LEDGER.md` §Batch 3 §7.1/§7.2/§7.4、`BATCH-LEDGER.md` §Batch 4 §5（R1 兜底实测）、b1 先例。

### S1 — 主题令牌取值断言一律 D2 删

`getComputedStyle(...).getPropertyValue('--wui-*')`、`borderTopLeftRadius`、`display`、
`backgroundColor`、`animationDuration` / `animationDelay`、`transitionDuration` / `transitionProperty`、
`transform`、`backdropFilter`、`maskImage`、伪元素 `content` —— **凡"读一个计算样式值再比对"的断言一律删**。
依据：ADR-0005 §5 明文禁测 CSS 样式；b1 先例（`group-color.browser.spec.ts` 的 `--wui-button-color` gCS 断言已按 D2 删）。

删除时**必须把子语义拆开认领**，不许整条含糊带过：

| 被删子语义                           | 承接方式                                                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 「令牌存在 / 命名正确 / 值正确」     | **产物一致性守卫**：`theme-tokens.spec.ts`（token 名清单 + 双语文档同步）、`theme-token-parity.spec.ts`（README 数值 ↔ theme 定义；dark / motion 成对块 parity）。**被删用例点名的 token 必须已在守卫覆盖范围内，否则先补进守卫再删** |
| 「令牌被组件消费 / 可被覆盖生效」    | **不承接**（纯视觉契约）。沿用 b3 §7.2 对 `layout` Banner 高度、portal `display: contents` 的同一裁定：仓库已决定不做视觉基线；若将来需要，唯一诚实形式是视觉回归测试                                                                 |
| 「主题作用域（嵌套 / 覆盖 / 回退）」 | 走 **S2** 的行为通道（动效），或宿主 props/反射（留在 `theme.spec.ts`）                                                                                                                                                               |

### S2 — 动效契约改用 Web Animations API（WAAPI）

动效的**行为**契约用 WAAPI 表达，**不读 computed style**：

```ts
const session = () => el.getAnimations({ subtree: true })
// 有动效：确实启动了一条目标过渡，且时长来自 token
const transition = session().find(a => {
  const effect = a.effect as KeyframeEffect | null
  return effect?.target === el && (a as CSSTransition).transitionProperty === 'opacity'
}) as CSSTransition | undefined
expect(transition).toBeTruthy()
expect(transition!.effect!.getComputedTiming().duration).toBe(240)
// 无动效（reduced）：一条都没启动
expect(session()).toHaveLength(0)
```

- 范式来源（**仓内已批，勿另立标准**）：
  - `components/svg-draw-lines/__tests__/reduced-motion.browser.spec.ts` → `expect(path.getAnimations()).toHaveLength(0)`（b1 已批范式）
  - `shared/theme/focus-ring-transition.browser.spec.ts` → `getAnimations({ subtree: true })` + `CSSTransition.transitionProperty` + `getComputedTiming().duration`
- **局限边界**：`getAnimations()` **只**在「重播入场 vs 跳过入场」这一对上无区分力（b4 实测，见 §8 R1 证据）；
  对「有动效 vs 没有动效」它有完全区分力。勿把前一局限错误外推到后一问题。
- 若某条动效契约在 WAAPI 层同样没有观察量，走 **R1 兜底条款**并在 spec 内写明实测证据。

### S3 — `*-reduced-motion.browser.spec.ts` 必须自带控制组

文件名会被 vitest 路由到 `browser-reduced-motion` project（Playwright `reducedMotion: 'reduce'`；
`packages/web-ui/vite.config.ts` 按文件名 include/exclude，改文件名即改 project）。
**只断言"没有动效"是空转可过的**——组件压根没动效时也绿，等于没有断言。

**强制**：同一文件内给出控制组 —— 显式 `motion='full'`（或任何非 `system` 值；theme 的媒体块只匹配
`:host([motion='system'])`，见 `components/theme/style.css`）作用域在系统 reduce 下**仍应启动动效**，
以此证明断言有区分力。控制组与被测组必须走**同一个观察函数**。

### S4 — R2 收敛点 `shared/theme/float-motion.browser.spec.ts` 的最终裁定

R2 把 8 处"单层玻璃"用例收敛到这一个文件，并注明"由 b6 按动效判据重新裁定"。**最终裁定**：

- 玻璃的**视觉**契约（`classList.contains('wui-glass')`、blur 半径、背景色、transition-property 列表）
  按 §5 删除，**不承接**（视觉契约，仓库无基线）——即 R2 的"8 → 1"最终收束为"**8 → 0 条视觉断言**"。
- 该文件**存活主题改为浮层面板的动效行为**（S2）：打开时面板启动 `opacity` / `backdrop-filter` / `transform`
  过渡且时长取自 float token；`motion='reduced'` 时一条都不启动。
- 顺带确立：`data-wui-presence` 的**驱动**用法（`panel.setAttribute('data-wui-presence','closing')` 去观察样式）
  也属 R1 禁止项 —— 测试不得手写内部状态标记来造状态，只能经公开入口驱动。

### S5 — `display: contents` / 伪元素内容 / 内部 class 名单

沿用 b3 §7.2 对 `portal` 宿主 `display: contents` 的同一裁定：**视觉实现态，删，不承接**。
`getComputedStyle(el, '::after').content` / `classList.contains('is-*')` 同属此列（§2 D2 已有明文，此处仅备同一先例）。

### S6 — R1 兜底条款的最终答案：**例外取消**（兑现跨批承诺 #3）

b4 对 `tooltip/repeat-presence.browser.spec.ts` 启用 R1 兜底条款，理由是「`getAnimations()` 无法区分重播入场与跳过入场」。
**b6 实测推翻了该结论，并给出该用例的最终处置。**

**① b4 的对照取错了。** 它把 `FIRST f1..f7` 与 `SECOND f0..f7` 相比（属性集合相同），而应当逐帧比 `f0 ↔ f0`：

```
FIRST  f0 presence=entering 运行过渡=[]                                   ← 一条都没启动
       f1 presence=open     运行过渡=[backdrop-filter,opacity,transform] start=231.44 cur=17→150
SECOND f0 presence=open     运行过渡=[backdrop-filter,opacity,transform] start=null   cur=0
       f1 presence=open     运行过渡=[backdrop-filter,opacity,transform] start=398.10 cur=17→150
```

`getAnimations()` 在 f0 帧有明确差异（`[]` vs 三条已运行、`startTime === null` 表示同帧启动）。

**② 但该差异不是行为契约。** 机制在 `src/shared/overlay/presence.ts`：非 instant 走
`presence='entering'` → 强制 reflow 提交起点 → 下一 rAF 才 `presence='open'`（即"先钉在入场起点再过渡"，比 instant 晚一帧启动）；
instant 直接 `presence='open'`。两者**终点完全相同**（都是 opacity 1 / blur 4px / scale 1），
差异只在**过渡起点与相位**——属帧级视觉瞬态，无行为层可观察量。按 §5 不写这种断言。

**③ 该用例真正的行为契约是另一半。** `components/tooltip/index.ts:157`：

```ts
const isRepeat = visibleTooltipCount > 0 // 指针滑到相邻目标、已有 tooltip 在场
this._showTimer = setTimeout(() => this._show(isRepeat), isRepeat ? 0 : this.showDelay)
```

"已有 tooltip 在场"同时产生**两个**后果：**零延迟**（`0` 而非 `showDelay`）与**跳过入场**（instant）。
前者是干净的用户可见行为，后者是视觉瞬态。

**最终处置（D5）**：删掉 presence 瞬时序列断言（`entering` / `open` 序列），把用例改为断言
**「已有 tooltip 在场时，相邻触发不等待 `showDelay` 立即显示」**，形式为「帧预算 + 对照组」：

```ts
// 对照组：首个 tooltip 必须等满 showDelay（setTimeout(showDelay) 未到 → 数帧内不可见）
// 被测组：已有 tooltip 在场时走 setTimeout(0) → 少数帧内即可见
```

观察量只用公开面：面板 `role="tooltip"` + `hidden`（R1 明文允许 `hidden`，它是可见性后果）。
**R1 的例外因此取消**（本仓不再有动效断言例外）；`getAnimations()` 的局限边界见 S2。

> 教训（写进 skill）：**"某个 API 测不出来"式的否定结论，必须把对照矩阵的每一格都列出来再下判断**；
> b4 的证据行里其实已经打印了 `FIRST f0 ... 运行过渡=[]`，与 `SECOND f0 ... 运行过渡=[...]` 并列，
> 差异就在眼前，却被"属性集合相同"的概括掩盖了一轮。

## 11. 授权记录（Batch 6a 期间，用户明确指示）

- **2026-09-16**：用户指示「批量删除直接允许，别管 50 的阈值。不要让我手动确认了」——
  即本重构的删除操作**不再逐批请示**，直接执行（延续 b3 起「自行判断」「后续所有执行不用请示权限，全部通过」的授权）。
  删除仍须逐条落到 §2 的白名单类别、留痕 `file:line` 与理由、并在批次文档给出存活覆盖（§4/§5）。

## 12. 容器家族裁定（Batch 6b 定，6c 沿用）

容器组件（dialog / toast / collapse / drawer / image-preview）的测试主题集中在
**尺寸、几何、手势位移、视觉状态类名**上，是全仓 §5 违规密度最高的一族。逐条裁定如下。
依据：ADR-0005 §5 白名单；b1 §D2「几何 / 精确像素（非公开契约，属视觉实现）」；
b3 §7.2（`layout` Banner 可见高度、`mobile-toggle-header-alignment` 整文件）；
b4（`context-menu` 的 `getBoundingClientRect().width === 0`）；b5（`--wui-select-max-height`）；§10 S1（令牌被消费）。

### C1 — 容器尺寸 / 几何断言一律 D2 删，**不承接**

凡「量一个几何值再比对」的断言一律删：`getBoundingClientRect()` 的 `width/height/left/top`、
由 `getComputedStyle` 取的 `width/height/scale/transform` 矩阵分量（`DOMMatrixReadOnly(...).m41/.a`）、
`maskImage` 活动长度、`--wui-peek-*` 推导值。

| 被删子语义                                                                                                                                     | 承接方式                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `collapse` 的 peek 长度（`peek='100px'` → 关闭态轨道高 100px、`horizontal` 沿宽度、`peek` 不足内容时按内容尺寸、边缘渐隐带长度 / 比率 / 上限） | **不承接**（纯视觉契约）。存活的是 peek 的**非视觉后果**：关闭态内容可见（`hidden=false`）且不可交互（`inert` / 焦点被拒），见 C5 |
| 「内层展开外层跟随」的像素增量                                                                                                                 | **不承接**（几何）。存活：外层收起后外层内容 `hidden`、内层 `open` 仍为 `true`                                                    |
| `drawer` 的拖拽位移（`style.transform` 内联位移量）、`drag-zone` 尺寸（48px / 与 dialog 等宽）、`innerEdgeGap` / `innerEdgeBarCenter`          | **不承接**。存活：拖拽阈值行为由 `open` 归宿观察（C2）                                                                            |
| `image-preview` 的平移 `m41`、缩放 `scaleOf(...).a`、slide 宽度 == stage 宽度、`svg` 宽度 > 0                                                  | **不承接**。存活：`open` 归宿、当前页公开量、焦点/键盘契约、事件                                                                  |
| `toast` 的移动端宽度 `288`、`drawer` 的 `close.getBoundingClientRect().width < 200`                                                            | **不承接**（纯尺寸无行为语义，同 b4 对 `context-menu` 的裁定）                                                                    |

**例外（R3 通道，沿用不改）**：公开方法参数→内联定位映射（`openAt(x,y)` → `style.left/top`）、
边界**约束**（不出视口，写成不等式）、文档级滚动锁样式。容器家族本期实测**未新增** R3 例外。

> `collapse` 的 `peek` 是 6b 唯一被认真权衡过的边界：它是 README 记录过的公开 prop，
> 其"定义"就是长度。仍判 **不承接**，理由有二：① §5 白名单不含尺寸，§10 S1 已把
> 「令牌被消费 / 可被覆盖生效」整类判为不承接，`peek` 的长度就是"组件消费 `--wui-collapse-peek` 的结果"；
> ② 若保留，"如何算裁剪正确"没有任何行为层判据，只能锁死像素 → 是 b3 §186 明确拒绝的形态。
> 诚实结论：**peek 的长度语义自此无测试覆盖**；将来若需要，唯一诚实形式是视觉回归测试。

### C2 — 手势断言改用**行为后果**，不读过程几何

手势用例（drawer 的 `drag-close` / `tap-transition`、image-preview 的 pan/pinch）保留的是
**阈值行为**与**归宿**，不是拖动过程中的跟随量：

| 留（行为后果）                                                                        | 删（过程实现态）                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 拖到阈值以上松手 → 关闭（观察 `open === false`）；未达阈值 → 回弹保持 `open === true` | 拖动中 `style.transform` 的位移量、"跟手"程度           |
| 取消手势 → 不关闭、无残留（`open` 不变）                                              | `is-dragging` 类名的增删（见 C3）                       |
| 关闭事件及其 `detail` / cancelable 语义                                               | `::backdrop` 的 `opacity` 数值、`borderRadius` 是否非 0 |
| 关闭后宿主/层叠归宿（`open` 反射、焦点归还 `document.activeElement`）                 | `outlineStyle === 'none'`（焦点环的实现态）             |

**手势驱动方式**：合成 `PointerEvent` 序列时允许用 `getBoundingClientRect()` **计算 clientX/Y**
（b5 §242 先例：测试驱动，非像素契约断言）——必须在调用点注释说明它是驱动而非断言。

### C3 — 内部 class 名单禁止断言，只可作轮询谓词

`is-visible` / `is-dragging` / `is-closing` / `is-current` / `wui-glass` / `wui-toast-container` 等
状态类名是**纯实现态**（§2 D2「内部 class 名单」）：

- **禁止** `expect(el.classList.contains('is-visible')).toBe(true)`。
- **允许**作为 `waitFor` / `pollUntil` 的**同步谓词**（且不得是唯一断言）。优先换公开量：
  `open`（已反射）、`hidden`、`getAnimations().length === 0`、`transitionend`、`document.activeElement`。

### C4 — `data-wui-presence` 同 R1，只可作轮询谓词

`collapse` 的轨道也写 `data-wui-presence`（`open` / 缺省即关闭稳态），与浮层家族同源、同属内部状态标记：

- **禁止断言**（`expect(track.getAttribute('data-wui-presence')).toBe('open')` ✖）。
- **允许**作轮询谓词，但**优先**用 `getAnimations()` 观察落稳态（§10 S2：对「有动效 vs 无动效」有完全区分力）：
  `await waitFor(() => queryTrack(el).getAnimations().length === 0)`，或直接 `transitionend`。

### C5 — 保留：平台级 a11y 与可见性后果

| 保留                                                           | 理由                                                                                                                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hidden`（内容容器）                                           | 可见性后果，R1 明文允许                                                                                                                                                             |
| `inert`（内容内层）                                            | 平台级 a11y 属性，语义＝"子树不可交互"，与 §3 白名单的 `role`/`aria-*`/**可聚焦性**同通道；比"读 `pointer-events` 计算值"更接近契约。配套用 `document.activeElement` 断言其**后果** |
| `aria-expanded` / `aria-controls` / `aria-disabled` / `aria-*` | §3 白名单                                                                                                                                                                           |
| `document.activeElement` 归宿、`scrollTop` 保留                | 焦点契约 / 用户可见状态                                                                                                                                                             |
| `role` / `open` 反射 / 事件与 `detail` / slot 投影             | §3 白名单                                                                                                                                                                           |

### C6 — 玻璃用例：兑现 R2 的剩余 2 处

`toast/toast-mobile.browser.spec.ts` 与 `dialog/dialog.browser.spec.ts` 各有一处
`classList.contains('wui-glass')` + `getComputedStyle(...).backgroundColor/transitionProperty/backdropFilter`
断言组，按 §8 R2 删除（收敛点已在 §10 S4 归零为"8 → 0 条视觉断言"，**不承接**）。
`glass-inherit` / `glass` 系列若整文件只剩视觉断言 → 按 D1 整文件删（6c 裁决）。

### C7 — 容器家族的 reduced-motion 按 §10 S2/S3 处理

`collapse/reduced-motion.browser.spec.ts`、`drawer/reduced-motion.browser.spec.ts`：
改用 WAAPI 观察（`getAnimations()`），并**必须自带控制组**（`motion='full'` 下过渡确实启动）。
`image-preview.browser.spec.ts:1048` 的 `transitionDuration === '0s'` 属纯取值 → 按 **C1/S1** 删，
其"reduced 下不动画"的行为面若无 WAAPI 观察量则按 §10 S2 末句走 R1 兜底 —— 但 R1 例外已取消（§10 S6），
故只保留"有动效 vs 无动效"这一层（`getAnimations()` 有完全区分力），不写"相位差"类断言。

## 13. 断言区分力裁定（Batch 6c 定，后续沿用）

> 起因：b6c 实测发现**被替换的原断言有 2 处本身是空转的**（`BATCH-LEDGER.md` §Batch 6c §4）。
> "原用例是绿的"只说明它没失败过，不能说明它真的跑到了被断言的状态——这是前 5 批从未验证过的假设。

### C8 — 断言区分力探针纪律（改写前/后各做一次）

**① 改写前：先确认原断言在当前驱动序列下真的会走到被断言的状态。**

反例（`BATCH-LEDGER.md` §Batch 6c §4.1）：`image-preview.browser.spec.ts:906`「swipe 未达阈值释放：弹回原位」的
`pollUntil(() => Math.abs(trackX()) < 0.5)` —— 三次 `dispatchEvent` 之间没有任何 `await`，
轨道位移由 Lit 渲染提交，实测 `trackTransform` 全程为 `matrix(1,0,0,1,0,0)`，
即**轨道从未移动过**，该断言从第一次轮询起就成立。"弹回原位"这条契约其实**从来没有被覆盖过**。

**② 改写后：对新断言做变异探针——注入它声称要防的缺陷，确认它变红。**

反例（`BATCH-LEDGER.md` §Batch 6c §4.2）：`drawer/tap-transition.browser.spec.ts` 的 WAAPI 版，
注入旧缺陷（收尾后残留 `dialog.style.transform = 'translateX(0px)'`）**没有变红**——
说明新断言覆盖的是"关闭与重开各跑一条真实 transform 过渡"，**不是**"内联残留样式被清理"。

**不红时的处置（强制）**：把用例**改名为它真正在断言的东西**，并在注释里写明被放弃的子语义按哪条判据不承接。
**严禁**保留原标题——那会制造"看起来有覆盖、其实测的是别的"的假覆盖（比没有更危险）。
另需补一次反向探针（如 `transition = 'none'`）确认新断言本身非空转。

### WAAPI 的两个时序陷阱（b6c 实测，避免重复踩）

| 陷阱                                                 | 实测结论                                                                                                         | 写法                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `getAnimations()` 在事件**同帧**读恒为 0             | 手势位移由框架渲染提交，`pointerup` 同帧过渡尚未注册；必须先 `await host.updateComplete`（让位移落定）再让过一帧 | `pointerup` → `await waitForFrame()` → 读 `getAnimations()` |
| `shadowRoot.getAnimations({subtree})` 不能当收敛判据 | 浮层里常驻 2 条 `opacity` 过渡，轮询"长度为 0"永不收敛                                                           | 收敛判据取**具体元素**的 `getAnimations()`                  |

### 顺带确立

- 测试运行器会在仓库根留下 0 字节的 `_tmp_<pid>_<hash>` 未跟踪文件，提交前需清理。
- 前 5 批删掉的断言里可能也有 §4.1 那类空转断言；**不回头全量复审**（成本高于收益），
  但后续批次改写时按 C8 顺带验证，发现问题登记到各批「转出项」。

## 14. T 组 — 文档化公开 CSS token（review fixup 新增）

### T1 — 文档化并注册的公开 token 属公开契约，可断言其归一化结果

组件用 `CSS.registerProperty` 注册、且在 `README.md` / `README.CN.md` 的 CSS 变量表里文档化的 token
（例如 `drawer` 的 `--wui-drawer-inset`，注册为 `<length>`，文档写明「置 `0` 为贴边几何」），
其**归一化结果**是 README 承诺给 Consumer 的行为，允许断言；这与 §12 C1 排除的「组件内部几何」不是一回事。

边界：只断言 token 经注册后的计算值（如 unitless `0` → `0px`），**不断言**依赖该 token 的几何结果
（元素位置、尺寸、像素级位移）。前者是 API 行为，后者是视觉，仍归 C1。

### T2 — 行为面在 token 类缺陷上可能没有区分力，按 C8 处置

实测（review fixup）：`--wui-drawer-inset` 的注册被去掉后，闭合 transform 整条失效
（`calc(100% + 0)` 因 number 与 percentage 不兼容），但「开合仍各自触发 transform 过渡」这条
行为级断言**照样通过**——因为 `none → translate(0,0)` 仍会产生一条 transform 过渡。

结论：token 类缺陷不要指望行为面兜住。要么走 T1 的 token 面，要么明确记录不测并按 §4 写明
存活覆盖为空。写行为级断言前先按 C8 注入缺陷验证，别凭直觉认为「过渡还在跑」就等于「位移正确」。
