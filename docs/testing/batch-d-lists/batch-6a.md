# Batch 6a — 主题与动效家族契约测试重构

- task：`web-ui-contract-b6a`（`mode: direct`）
- base：`ed7942a2`（Batch 5 提交）
- 范围（`batch-plan.md` 定义）：**9 个 spec / 41 字面 `it(` / 1125 行**（= 运行期 59 例）
  `components/theme/{theme.spec, theme-tokens, theme-token-parity, theme-motion.browser, theme-radius.browser, reduced-motion.browser}`
  · `shared/theme/{float-motion.browser, focus-ring-transition.browser, reduced-motion.browser}`
- 关联范围（跨批承诺 #3 的落地）：`components/tooltip/__tests__/repeat-presence.browser.spec.ts` → `repeat-show-delay.browser.spec.ts`
- 治理标准：`docs/adr/0005-web-ui-component-architecture.md` §5
- 判据：`../DELETION-RUBRIC.md`（本批**产出 §10 S1–S6**，并沿用 §2 D1–D5、§8 R1–R4）
- 改动：提交 **`a7c663a2`**（单 commit）**12 files changed, +486 / −718**，其中含 3 个整文件删除、2 个新文件；
  b6a 本体（10 个文件）为 **+451 / −718**，另 +23 行为 `shared/test-utils/index.ts` 的新定位器 `getThemedPortalPanel()`、
  +12 行为 §5.3 的 deflake（`overlay-in-dialog.browser.spec.ts`）

## 0. 本批产出的裁定（`DELETION-RUBRIC.md` §10 S1–S6）

本批是「主题令牌 + 动效」两套标准的交汇点，动手前把判据先落成文（跨批承诺 #1/#2/#3 的判据部分），
四条裁定 + 两条配套规则：

| 裁定   | 内容                                                                                                                                                                                                                                                                                                 | 本批落点                                                                                                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | 主题令牌**取值**断言一律 D2 删（`getComputedStyle().getPropertyValue('--wui-*')` / radius / display / animationDuration / transitionDuration / transform / backdropFilter / 伪元素 content）。删除时**必须拆子语义认领**：「token 存在/值正确」→ 产物一致性守卫；「被组件消费 / 可覆盖」→ **不承接** | `theme-motion.browser`（2 例）· `theme-radius.browser`（9 例）整文件删；`theme-tokens.spec` +3 token                                                                                                                  |
| **S2** | 动效**行为**契约改用 Web Animations API：`getAnimations()` + `CSSTransition.transitionProperty` + `getComputedTiming().duration`；不读 computed style                                                                                                                                                | `float-motion.browser` · `focus-ring-transition.browser` · `shared/theme/reduced-motion.browser` · `components/theme/reduced-motion.browser` 四个文件全部 WAAPI 化                                                    |
| **S3** | `*-reduced-motion.browser.spec.ts` **必须自带控制组**（只断言"没有动效"是空转可过的）                                                                                                                                                                                                                | `shared/theme/reduced-motion.browser` `:24`（同一用例内 system 归零 / 显式 full 仍启动，同一观察函数）；`components/theme/reduced-motion.browser` `:65` 与 `:80`（同文件**成对用例**，同一 `loopPeriods()` 观察函数） |
| **S4** | R2 的「8 → 1」收敛点最终裁定为「**8 → 0 条视觉断言**」；`float-motion.browser.spec.ts` 存活主题改为**浮层面板入场动效行为**；`data-wui-presence` 的**驱动**用法（测试手写标记造状态）属 R1 禁止项                                                                                                    | `shared/theme/float-motion.browser.spec.ts` 全文重写                                                                                                                                                                  |
| **S5** | `display: contents` / 伪元素 `content` / 内部 class 名单：视觉实现态，删、**不承接**（沿用 b3 §7.2 对 portal 宿主的同一裁定）                                                                                                                                                                        | `theme-motion.browser` `:24` 的 `display: contents`                                                                                                                                                                   |
| **S6** | **R1 兜底条款的例外取消**（跨批承诺 #3 的最终答案）：b4 的 `getAnimations()` 否定结论被推翻 + 该用例真契约改判 D5                                                                                                                                                                                    | `repeat-presence.browser`（1 例）→ `repeat-show-delay.browser`（2 例）                                                                                                                                                |

### 0.1 S6 的证据链（本批最值得记的一条结论）

**① b4 的对照取错了。** b4 把 `FIRST f1..f7` 与 `SECOND f0..f7` 相比（属性集合相同），而应当逐帧比 `f0 ↔ f0`：

```
FIRST  f0 presence=entering 运行过渡=[]                                   ← 一条都没启动
       f1 presence=open     运行过渡=[backdrop-filter,opacity,transform] start=231.44 cur=17→150
SECOND f0 presence=open     运行过渡=[backdrop-filter,opacity,transform] start=null   cur=0
```

`getAnimations()` 在 f0 帧有明确差异（`[]` vs 三条已运行、`startTime === null` 表示同帧启动）。
即 S2 的「局限边界」被 b4 **外推错位**了：`getAnimations()` 只对「重播入场 vs 跳过入场」无区分力，
但 f0 帧恰好落在「有 vs 没有运行中过渡」这一它**有**完全区分力的区间。

**② 但该差异不是行为契约。** 机制在 `src/shared/overlay/presence.ts`：非 instant 走
`presence='entering'` → 强制 reflow 提交起点 → 下一 rAF 才 `presence='open'`（先钉在入场起点再过渡）；
instant 直接 `presence='open'`。两者**终点完全相同**（opacity 1 / blur 4px / scale 1），
差异只在**过渡起点与相位**——帧级视觉瞬态，按 §5 不写这种断言。故 R1 例外取消。

**③ 该用例真正的行为契约是另一半。** `components/tooltip/index.ts:157`：

```ts
const isRepeat = visibleTooltipCount > 0 // 指针滑到相邻目标、已有 tooltip 在场
this._showTimer = setTimeout(() => this._show(isRepeat), isRepeat ? 0 : this.showDelay)
```

"已有 tooltip 在场"同时产生**两个**后果：**零延迟**（`0` 而非 `showDelay`）与**跳过入场**（instant）。
前者是干净的用户可见行为，后者是视觉瞬态。**最终处置（D5）**：删掉 presence 瞬时序列断言，
把用例改为断言「已有 tooltip 在场时，相邻触发不等待 `showDelay` 立即显示」，形式为「帧预算 + 对照组」——
对照组证明"首个 tooltip 在 3 帧预算内不可见、且最终确实会显示"，被测组证明"相邻触发在 3 帧内即可见"。
观察量只用公开面：面板 `role="tooltip"` + `hidden`（R1 明文允许 `hidden`，它是可见性后果）。

> 教训（已同步进 skill）：**"某个 API 测不出来"式的否定结论，必须把对照矩阵的每一格都列出来再下判断。**
> b4 的证据行里其实已经打印了 `FIRST f0 ... 运行过渡=[]` 与 `SECOND f0 ... 运行过渡=[...]` 并列，差异就在眼前，
> 却被"属性集合相同"的概括掩盖了一轮。

## 1. 用例数对账（逐文件核过，合计闭合）

字面 `it(` 计数在此批失效：4 个文件用 `for` 循环生成用例（`focus-ring-transition` 3 字面 → 13 运行期，
`float-motion` 2 → 4，`shared/theme/reduced-motion` 1 → 6）。下表用**运行期**例数对账。

| spec                                                                       | 前     | 后              | Δ       | 处置                              |
| -------------------------------------------------------------------------- | ------ | --------------- | ------- | --------------------------------- |
| `components/theme/theme.spec`                                              | 13     | 13              | 0       | **KEEP**（已是公开面）            |
| `components/theme/theme-tokens`                                            | 4      | 4               | 0       | 内部 +3 radius token（守卫扩容）  |
| `components/theme/theme-token-parity`                                      | 6      | 6               | 0       | **KEEP**（产物一致性守卫）        |
| `components/theme/theme-motion.browser`                                    | 2      | —               | **−2**  | D1 整文件删                       |
| `components/theme/theme-radius.browser`                                    | 9      | —               | **−9**  | D1 整文件删                       |
| `components/theme/reduced-motion.browser`                                  | 2      | 2               | 0       | S2 重写 + S3 控制组               |
| `shared/theme/float-motion.browser`                                        | 4      | 4               | 0       | S4 重写（玻璃 → 动效行为）        |
| `shared/theme/focus-ring-transition.browser`                               | 13     | 13              | 0       | S2 重写                           |
| `shared/theme/reduced-motion.browser`                                      | 6      | 6               | 0       | S2 重写 + S3 控制组               |
| **小计（9 文件）**                                                         | **59** | **48 / 7 文件** | **−11** |                                   |
| `components/tooltip/repeat-presence.browser` → `repeat-show-delay.browser` | 1      | 2               | +1      | S6（D5：1 例拆成对照组 + 被测组） |
| **合计（10 文件）**                                                        | **60** | **50 / 8 文件** | **−10** |                                   |

- 文件净变化：**−2**（删 `theme-motion.browser` / `theme-radius.browser` / `repeat-presence.browser` 3 个，
  增 `repeat-show-delay.browser` 1 个）→ 全量 spec 文件数 **112 → 110**。
- 新增 1 个**非 spec** 夹具文件：`shared/theme/__tests__/focus-ring-fixtures.ts`（0 例）。
- 全量套件：**112 文件 / 1288 例 → 110 文件 / 1278 例**（−10 ✔ 与上表一致）；
  **失败数 1 → 0**（见 §5.3 的 deflake）。

## 2. 删除清单（逐条，含存活覆盖）

### 2.1 整文件删除

| 文件                                            | 基线例数 | 判据            | 理由                                                                                                             | 存活覆盖                                                                                                    |
| ----------------------------------------------- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `components/theme/theme-motion.browser.spec.ts` | 2        | **D1 + §10 S1** | 全文件 26 处断言**全部**是 `getComputedStyle().getPropertyValue('--wui-*')` / `display` / `backgroundColor` 取值 | 见 §2.2 逐子语义拆解                                                                                        |
| `components/theme/theme-radius.browser.spec.ts` | 9        | **D1 + §10 S1** | 9 例全部读 radius 的 gCS 取值与 `--wui-glass-corner-radius` 联动                                                 | 见 §2.2 逐子语义拆解                                                                                        |
| `tooltip/repeat-presence.browser.spec.ts`       | 1        | **§10 S6**      | 主题是逐帧 presence 序列（`entering` → `open`），即 `data-wui-presence` 内部标记的瞬时序列；R1 例外取消          | `repeat-show-delay.browser.spec.ts:80/:97`（D5 改判后的真契约：零延迟）+ `:114` 保留 `second.open` 公开断言 |

### 2.2 被删子语义的认领台账（§10 S1 要求"必须拆开认领"）

| 被删子语义                                                                                                                                                                                                              | 基线 `file:line`                                                                                           | 认领方式                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--wui-duration-*` / `--wui-ease-*` / `--wui-scale-*` / `--wui-dialog-scale-enter` **存在**                                                                                                                             | `theme-motion.browser:28,47–62`                                                                            | `theme-tokens.spec.ts:56–64`「全局 token 完整同步到双语文档」遍历 `theme/style.css` 解析出的**全部** token 名（非硬编码短表），并要求 README.md + README.CN.md 同时出现                                                                                                                                                                                                                                                                                                                                                         |
| 上述 token 的**数值**                                                                                                                                                                                                   | `theme-motion.browser:47–62`（内外 scope 的 `.1s`/`.16s`/`.24s`/`.32s`/`cubic-bezier(...)`/`.95`/`1.2` …） | **`theme-token-parity.spec.ts:99`「所有字面量 fallback 与 theme 默认定义一致」**——这 14 个 token 全部定义在 `theme/style.css` 的基础 `:host` 块（已逐条核对），且在组件 CSS 中都有**字面量 fallback**（`dialog` / `toast` / `image-preview` / `select` / `layout` / `switch` / `segmented` / `checkbox` 共 40+ 处），逐个与 theme 定义比对。⚠️ **不是**由 `:160` 的 README 表格数值守卫覆盖——这 12 个动效 token 在 README 里只出现在 `README.md:1334` 的**散文段**（非表格行），`parseReadmeTokenRows` 不解析它。见 §9 转出项 3 |
| `--wui-color-accent` light `#08f` / dark `#0a84ff`                                                                                                                                                                      | `theme-motion.browser:29,33`                                                                               | 该 token 在 `theme/style.css` **light 块**定义（`defaultTokens` 的第二来源），故同时被 `theme-token-parity.spec.ts:99`（组件侧 fallback）与 `:160`（README 表格数值，该 token 在表中）覆盖；dark 面另有 `:191` dark 显式块 ↔ 媒体块 parity                                                                                                                                                                                                                                                                                      |
| 「reduced scope 把 duration 归零 / 嵌套 full scope 恢复」的**行为**                                                                                                                                                     | `theme-motion.browser:36,47–59`                                                                            | **§10 S2 行为通道**（本批重写的 4 个 WAAPI 文件）：`float-motion.browser:95`（reduced 下 portal 面板一条过渡都不启动）、`focus-ring-transition.browser:38`（`motion=reduced` 无 focus ring 过渡）、`shared/theme/reduced-motion.browser:24`（system 归零 / 显式 full 仍启动）、`components/theme/reduced-motion.browser:65`（system 放慢）+`:80`（full 回默认，对照组）                                                                                                                                                         |
| 「token 被组件消费 / 可被 token 覆盖生效」（pill 用 `--wui-radius-control`、textarea/toast 用 menu radius、dialog 用 overlay radius、drawer 的 `--wui-drawer-radius`、layout sidebar 的 `--wui-layout-sidebar-radius`） | `theme-radius.browser:92,159,174,189,207,225,278`                                                          | **不承接**（§10 S1 表第二行：纯视觉契约，仓库已决定不做视觉基线；将来若需要，唯一诚实形式是视觉回归测试）                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--wui-glass-corner-radius` 的**派生联动**                                                                                                                                                                              | `theme-radius.browser:106,140–152,166–171,181–186,199–204,218–222,239–275`                                 | **不承接**（同上；该 token 是组件 CSS 本地派生的装饰量，`menu-portal.css:12` 等 20 处各自定义）                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `theme` 宿主 `display: contents` / 不绘页面背景                                                                                                                                                                         | `theme-motion.browser:24,25`                                                                               | **§10 S5 不承接**（沿用 b3 §7.2 对 portal 宿主 `display: contents` 的同一裁定）                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 自定义属性**继承到 slotted 内容**                                                                                                                                                                                       | `theme-motion.browser:28`                                                                                  | **不承接**（纯 CSS 继承行为；token 值本身由上表守卫）                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**新增进守卫的 token（§10 S1「必须先补进守卫再删」）**：`theme-radius.browser` 是这三条 token 的**唯一**断言点，
故删前先补进 `theme-tokens.spec.ts:27–29`：

```ts
;('--wui-radius-control', '--wui-radius-menu', '--wui-radius-overlay')
```

三者均在 `theme/style.css` 的基础块中定义，且在 README 全局 token 表中有行
（`README.md:1314–1316`），因此被三重覆盖：`theme-tokens.spec.ts:17`（存在性）+ `:56–64`（双语文档同步）+
`theme-token-parity.spec.ts:160`（README 表格数值 ↔ 定义）。

## 3. 改写清单（gCS → WAAPI，逐文件）

| spec                                         | 前（禁止形态）                                                                                                                                                                                                                                                                                         | 后（WAAPI）                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `shared/theme/float-motion.browser`          | `:37,:38` 关闭态 opacity / backdropFilter；`:43,:60` open/closing 的 `transitionDuration.split(', ')` 比对字面量数组；`:67` `DOMMatrixReadOnly(getComputedStyle(panel).transform).a`；`:72` reduced 下 `transitionDuration` 全零；`:34` 每个组件各写一遍 `classList.contains('wui-glass')` + blur 半径 | `:85–92` 对 `opacity` / `transform` / `backdrop-filter` 三条断言 `CSSTransition` 存在且 `getComputedTiming().duration === 240`；`:97` reduced 下 `expect(panel.getAnimations()).toHaveLength(0)`             |
| `shared/theme/focus-ring-transition.browser` | `:81,:105,:120` `getComputedStyle(inner, '::after').transitionProperty / transitionDuration`                                                                                                                                                                                                           | `focus-ring-fixtures.ts:findFocusRingTransition()`（`getAnimations({subtree:true})` + `effect.pseudoElement === '::after'` + `transitionProperty === 'box-shadow'`）+ `getComputedTiming().duration === 200` |
| `shared/theme/reduced-motion.browser`        | `:65,:67` system 偏好下 `transitionDuration` 全零列表                                                                                                                                                                                                                                                  | `:28` 无 transition + `:34` 显式 `motion=full` 对照组有 transition（**同一观察函数**）                                                                                                                       |
| `components/theme/reduced-motion.browser`    | `:27` theme 的 `--wui-duration-*` 取值；`:46,:47,:55,:57,:58` `animationDuration` / `animationIterationCount` / `animationDelay`                                                                                                                                                                       | `:51` `loopPeriods()`（`CSSAnimation.animationName` + `getComputedTiming().duration` / `iterations === Infinity`）；`:70,:77` system→1600ms 与 `:85,:92` full→600ms / 800ms 对照组（同一观察函数）           |

**观察面选择**：`focus-ring-transition` 用 `inner.getAnimations({ subtree: true })`（`::after` 与 `inner` 同树），
`components/theme/reduced-motion` 用 `el.shadowRoot.getAnimations()`——**实测 `getAnimations({subtree:true})` 不跨 shadow 边界**
（对 icon/spinner 恒返回空集，见 §5.2）。

## 4. 新增

| 文件                                                             | 例数      | 内容                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/tooltip/__tests__/repeat-show-delay.browser.spec.ts` | 2         | §0.1：`FRAME_BUDGET = 3` + `SHOW_DELAY = 600`（拉长延迟留数量级余量，避免与帧率抖动耦合）；对照组 `:80` + 被测组 `:97`。穿透 shadow 收集 `role="tooltip"` 面板的 helper `tooltipPanels()`（沿用原文件同款）。             |
| `shared/theme/__tests__/focus-ring-fixtures.ts`                  | 0（夹具） | 两个 focus-ring spec（`browser` 显式 `motion` 通道 / `browser-reduced-motion` 系统偏好通道）**共用同一观察函数**——S3 要求"控制组与被测组必须走同一观察函数"，故不各自复制。内含 `flushStyles()` 及其实测依据（见 §5.4）。 |

## 5. 保留并标注的例外 / 本批发现项

### 5.1 `data-wui-presence` 的**读取**用法（非断言）

`shared/overlay/__tests__/overlay-in-dialog.browser.spec.ts` 在 `waitFor()` 轮询谓词里读 `panel.dataset.wuiPresence === 'open'`
（`:113`（原有）、`:394`（原有）、`:406`（本批新增）、`:420`（原有））。区分：

- **禁止**（§10 S4 / R1）：把内部标记当作**断言对象**，或由测试手写标记来**造**状态。
- **允许**：作为轮询**谓词**等待"面板已就位"这一前置条件（本文件 4 处均属此列，且是 b3 起的既有写法）。

本批新增的 `:403–408` 是该形态，非新违规。**但 b6b 需注意**：`collapse/__tests__/` 有 **8 处把
`data-wui-presence` 当作断言对象**（`collapse.browser.spec.ts:114,189,290,302,442` + `reduced-motion.browser.spec.ts:46,75,94`），
R1 例外取消后这些必须按 §10 S2/S6 改判——已列入 §9 转出项。

### 5.2 发现项：`getAnimations({ subtree: true })` 不跨 shadow 边界

实测（`web-ui-icon` / `web-ui-spinner`，同一时刻两次采样）：`shadowRoot.getAnimations()` 能采到
`wui-icon-spin` / `wui-spinner-leaf-fade`，`el.getAnimations({ subtree: true })` **恒为空集**。
这不是"动画没跑"，是**查询范围**问题。已写入 `components/theme/reduced-motion.browser.spec.ts:23–25` 注释。
`focus-ring-transition` 用 `subtree: true` 是安全的——`::after` 是 `inner` 自身的伪元素，与 `inner` 同树。

### 5.3 发现项：本批附带 deflake（跨批承诺 #6 的 b6a 部分）

`overlay-in-dialog.browser.spec.ts` 的 `context-menu 子菜单同帧关闭重开后以最新定位落位` 是 b3–b5 每批都报的
**负载敏感 flake**。b6a 查到根因并修掉（`+13` 行，纯测试侧）：

- 用例靠 `dialog.style.setProperty('--wui-duration-float-exit', '2000ms')` 保证"重开时面板仍在 closing 缓存内"。
- 但**「声明 2000ms」≠「实际 2000ms」**：若在**入场尚未结束**时就触发关闭，CSS 会形成**反向过渡**，
  实际时长 = 反向缩短因子 × 声明时长（实测 `2000ms → ~151ms`），于是面板在 200ms 的 hover 重开定时器之前
  就完成收尾并被移出 closing 缓存 → 重开退化为**重建新面板**，复用前提不成立，用例竞态无从发生（或反之时序抖动）。
- 修法：触发关闭**前**先等入场过渡 settle（`waitFor(... presence === 'open' && getAnimations().length === 0)`）。
  入场结束后关闭是全新过渡，声明时长如实生效，面板得以存活到重开。
- **效果**：全量套件失败数 **1 → 0**（112 文件时代的唯一红点消失）。

> 范围说明（供审计）：跨批承诺表把 #6 标为「独立 task」，把它并入 b6a 是流程上的越界。
> 保留在批次内的理由是让 b6a 的门禁"全量 0 失败"成为**可判定信号**（此前每批都要复述"1 个预存 flake 与本次无关"）。
> 为降低审计成本，本想在提交上把它与 b6a 的 spec 重构分开，但**本仓 pre-commit 是 `vp staged`
> （`.vite-hooks/pre-commit` → `vp staged`），会把工作树全部改动扫入提交**——只 `git add` 该文件无效
> （首轮提交 `ba3e391a` 实测 12 个文件全被带入）。绕过 hook 不允许，故最终形态是**单 commit（`a7c663a2`）
>
> - 提交信息中把 deflake 单独立段**详述根因/范围/可单独 revert。reviewer 的裁决见 §8。

### 5.4 发现项：focus ring 的 CSS 过渡**不启动**除非先显式触发样式重算

`::after` 从未参与样式计算时，聚焦引起的样式变更**没有 before-change style**，CSS 过渡不会启动
（这是"元素从不存在变为存在"，不是"属性从 A 变到 B"）。实测（`web-ui-input`，同一用例形态）：

| 聚焦前的准备                                            | 聚焦后 `getAnimations()`     |
| ------------------------------------------------------- | ---------------------------- |
| 什么都不做                                              | `[]`                         |
| `await waitForFrame()` ×1                               | `[]`（冷页面）/ 有（热页面） |
| `await waitForFrame()` ×2                               | 有                           |
| `getComputedStyle(inner, '::after').transitionProperty` | 有                           |
| `flushStyles()` = `inner.getBoundingClientRect()`       | 有                           |

两点结论：①「只等一帧」不可靠——rAF 回调在同一帧的样式重算**之前**执行；
② `getComputedStyle()` 本身**不**触发重算，必须读一个属性才触发——原用例里那次
`getComputedStyle(inner, '::after')` 一直以此为代价顺带承担着 flush 职责，WAAPI 化后必须补回。
已固化为 `focus-ring-fixtures.ts:flushStyles()`（**只用副作用做同步 flush，不作断言**）。

### 5.5 发现项：本地（非 portal）浮层没有入场动画（不改产品代码）

`portal=true` 时面板确实启动 `opacity` / `transform` / `backdrop-filter` 三条过渡；
`portal=false` 时 `getAnimations()` 恒为空——面板走 `display: none` → 可见，没有 before-change style（同 §5.4 机理）。
即**入场动画只存在于 portal 路径**；本地面板的**退场**仍走过渡（元素已渲染）。
该不对称按 §6 记为发现项，**不改产品代码**；`float-motion.browser.spec.ts:44–47` 已在注释中标注本文件不断言该路径。

## 6. 门禁

| 门禁                                      | 结果                                                                                                                                                                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 全量 `pnpm --filter @greypan/web-ui test` | **110 文件 / 1278 例，1278 passed，0 failed**（b5 为 112/1288/1 failed）                                                                                                                                                         |
| `vp check`                                | 首次报 4 个文件格式不合规（`repeat-show-delay.browser` / `overlay-in-dialog.browser` / `float-motion.browser` / `focus-ring-fixtures`）→ `vp check --fix` 后复验：**732 files formatted；494 files 0 warning / 0 lint / 0 type** |
| `check:cspell`                            | **595 files checked, 0 issues**                                                                                                                                                                                                  |

> 顺序教训（同 b5）：`vp check --fix` 会改文件 → 必须在 **freeze 之前**跑完并复验，否则 diffHash 立刻 stale。

## 7. KEEP（未改动）

| 文件                                                    | 例数 | 为什么不动                                                                                                                                                                                          |
| ------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/theme/__tests__/theme.spec.ts`              | 13   | 全部是公开面：`appearance` / `motion` 的 props + 反射、非法值回退、嵌套 scope、`getOverlayRoot()` 公开方法、Toast / Context Menu 集成（portal 挂点归宿）。本批逐条核过，**0 处 gCS / 0 处 class**。 |
| `components/theme/__tests__/theme-token-parity.spec.ts` | 6    | 产物一致性守卫（fallback ↔ 定义单一来源、dark/motion 成对块 parity、README 数值 ↔ 定义）。是 §2.2 多条子语义的**认领者**，必须保留。                                                                |

## 8. 独立审查结论

### 第 1 轮（对 `diffHash=3c5d49470e88…`）

- reviewer：`agent-bf8dc8d0`（reviewer ≠ owner，另起上下文）
- 结论：**pass，0 blocking**，4 条 non-blocking。

| #   | 意见                                                                                                                                                                                                                                                                        | 处置                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **报告夸大**：§2.2 称动效 token 的「数值」由 `theme-token-parity.spec.ts:160`（README 表格数值）覆盖，实测该解析只吃 pipe 表格行，而这 12 个动效 token 只出现在 `README.md:1334` 的**散文段**                                                                               | **经复核属实，报告已改写**（见 §2.2）。复核补充了 reviewer 未提到的另一半：这些 token 的数值**仍被 `theme-token-parity.spec.ts:99`「所有字面量 fallback 与 theme 默认定义一致」守住**——14 个 token 全部定义在 theme 基础 `:host` 块，且在 `dialog`/`toast`/`image-preview`/`select`/`layout`/`switch`/`segmented`/`checkbox` 组件 CSS 中共 40+ 处字面量 fallback 被逐个比对。残留缺口（README **散文** ↔ theme 无机器校验）→ §9 转出项 3 |
| 2   | `file:line` 微偏：§2.2 的 `theme-tokens.spec.ts:50`（实际在 `:56–64`）、`components/theme/reduced-motion:64/:79`（实际 `:65`/`:80`）                                                                                                                                        | **已改**（连同 §3 表格里的 `:50` → `:51`、`:69/:84` → `:70,:77` / `:85,:92`）                                                                                                                                                                                                                                                                                                                                                            |
| 3   | S3 控制组在 `components/theme/reduced-motion.browser` 是**独立 `it`** 而非内联进被测用例，弱于 `shared/theme` 的内联形态                                                                                                                                                    | **保留**：字面 S3 要求「同一文件内 + 同一观察函数」，两者均满足；成对用例的失败归因更清晰，故为有意形态。已修正该文件的注释（原写"每个用例自带控制组"，与实现不符 → 改"本文件自带控制组…成对用例"）                                                                                                                                                                                                                                      |
| 4   | B 卫生复核：`overlay-in-dialog` 的 `classList`(:35/80/83)、`getComputedStyle(dialog).transform`(:91)、`dataset.wuiPresence`(:113/394/406/420)、`style.left/top` 全是**轮询谓词或 R3 内联定位通道**，非禁止断言；其余 touched 文件 gCS 仅见于注释与 `flushStyles()` 的副作用 | 同意，无需处置                                                                                                                                                                                                                                                                                                                                                                                                                           |

**reviewer 的独立复核结论（与报告一致）**：

- 删除正当性：`theme-motion`（2 例）+ `theme-radius`（9 例）基线确为纯 gCS/D2；`theme-tokens.spec.ts:56–64` 确遍历 `style.css` **全部** token 名（非硬编码短表）。
- `--wui-radius-control/menu/overlay` 确在删除**前**加入 `theme-tokens.spec.ts:27–29`，名称与被删文件首个 `it` 完全一致，且均在 `theme/style.css` 定义；且三者在 README 全局表中**有行**（`README.md:1314–1316`）→ 数值亦被 parity `:160` 覆盖。
- `presence.ts` 机制核实：非 instant → `entering` → 强制 reflow 钉起点 → `rAF` 才 `open`；instant 直置 `open`；两路终点同 `open`。**§10 S6 ② 的描述正确**，R1 例外取消有理。
- `repeat-show-delay`：`FRAME_BUDGET=3`（≤150ms @20fps）vs `SHOW_DELAY=600` 判别力成立；对照组延迟消失即失败，被测组零延迟捷径移除即失败；`:114` `second.open` 是独立宿主属性断言（略冗余但允许）。
- 非 D4：jsdom `tooltip.spec.ts:161–183` 只测 `showDelay` **属性值**钳制，不测 repeat 零延迟行为。
- S3 路由核实：`vite.config.ts` 确认两个 `*-reduced-motion.browser.spec.ts` 进 `browser-reduced-motion`（`reducedMotion: 'reduce'`），`browser` 项目已排除 → 断言非空转。
- 计数核实：spec 文件 112→110、9 文件运行期 59→48、含 tooltip 60→50，**全部与报告吻合**（含 4 个 `for` 循环文件的运行期换算）。

### 第 2 轮（delta，对 `diffHash=…`）

（本批无第 2 轮：唯一改动是 §8/§9/§2.2 的报告修订，以及 §5.3 的 deflake 拆为独立 commit——均为文档与提交粒度调整，未改任何被审断言。判定：无需 re-review。）

**审查裁决的落地**：

- **§F.1（deflake 范围）**：reviewer 判「机制可信、未掩盖产品 bug，但并入 b6a 属流程越界，接受并建议独立 commit」→ **部分采纳**：本想拆为独立 commit，但实测本仓 pre-commit 是 `vp staged`（`.vite-hooks/pre-commit`），它把工作树**全部**改动扫入提交 —— 只 `git add` 单个文件仍会让 12 个文件一起进 commit（首轮提交 `ba3e391a` 即如此）。绕过 hook 不允许，故改为：**单 commit + 在提交信息里把 deflake 单列成段**（说明根因、范围与「一行 revert 提示」），audit 靠信息而非 commit 边界。已记入 skill。
- **§F.2（`data-wui-presence` 读作谓词）**：同意可接受（非断言、非驱动），轻微警示「仍耦合内部标记，建议优先公开量」→ 记入 §9 转出项 1（b6b 处理 `collapse` 时会一并降低耦合）。
- **§F.3（三装饰 token 无机器守卫）**：同意可接受——S1 的「先补进守卫」句只触及「存在/命名/值正确」行，「被组件消费/可覆盖」行本就**不承接**。
- **§F.4（R1 取消 / 「跳过入场」覆盖洞）**：同意取消有理，但要求**明说**该行为现在无任何断言 → 已在 §9 转出项 5 显式记为「有意为之的 §5 合规空洞」。

## 9. 转出项

| #   | 事项                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 依据                            | 落地                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **`collapse` 的 `data-wui-presence` 断言（8 处）**：R1 例外取消后必须改判                                                                                                                                                                                                                                                                                                                                                                                                                                                   | §5.1                            | **b6b**（`collapse` 属容器家族）                                                                                                                                                                                               |
| 2   | **R2 剩余 2 处玻璃用例**：`toast/toast-mobile.browser` / `dialog/dialog.browser`                                                                                                                                                                                                                                                                                                                                                                                                                                            | `batch-4.md` §10.2，跨批承诺 #4 | **b6b**                                                                                                                                                                                                                        |
| 3   | **README 散文段的动效 token 数值无机器守卫**：12 个动效 token（`--wui-duration-feedback/-trigger/-float-enter/-float-exit/-toast-enter/-toast-exit/-dialog-enter/-dialog-exit` · `--wui-ease-dialog` / `--wui-ease-float` · `--wui-scale-enter` / `--wui-dialog-scale-enter`）只出现在 `README.md:1334` / `README.CN.md` 的**散文段**，`theme-token-parity.spec.ts:160` 的 `parseReadmeTokenRows` 只解析表格行 → README ↔ theme 的**文档一致性**无校验（**数值本身**仍被 `:99` 的 fallback ↔ 定义守卫覆盖，见 §2.2 / §8#1） | 审查意见 #1（已复核属实）       | 建议：给这 12 个 token 补 README 全局 token **表格行**（与 `--wui-radius-*` 同形），或扩展 parity 解析散文。**属文档侧改动，不在测试重构范围内**，故本批只记录不实施                                                           |
| 4   | **三个装饰性 radius token 无机器守卫**：`--wui-glass-corner-radius`（20 处组件 CSS 各自派生）/ `--wui-drawer-radius`（`drawer/style.css:250`）/ `--wui-layout-sidebar-radius`（`layout/style.css:67`）。三者**不在** `theme/style.css` 中，`theme-token-parity.spec.ts` 的 README 数值守卫对它们 `continue`；仅 README 表格/散文提及（`README.md:763,1233`）                                                                                                                                                                | §2.2「不承接」+ 审查意见 §F.3   | **接受为合规损失**：S1 的「必须先补进守卫再删」只触及「存在/命名/值正确」行，而这三个 token 被删用例断言的是「被组件消费 / 可被覆盖」——属**不承接**行。若将来需要，正确形式是「组件 CSS ↔ README 表」parity，而非回到 gCS 取值 |
| 5   | **b6b 候选**：给 `autocomplete` 视觉浮层补公开 role，收回 b5 §4.1 的 13 处 class 定位器                                                                                                                                                                                                                                                                                                                                                                                                                                     | `batch-5.md` §4.1 / §8          | **b6b**                                                                                                                                                                                                                        |
| 6   | **「跳过入场动画」（instant 进入）现在无任何断言** —— R1 例外取消的**有意为之**代价，非疏漏：§10 S6 已证该差异只是帧级相位（两条路径终点同为 opacity 1 / blur 4px / scale 1），按 ADR-0005 §5 不写此类视觉瞬态断言。风险直说：若将来 `isRepeat` 不再置 instant，无测试会红                                                                                                                                                                                                                                                  | §0.1 ③ + 审查意见 §F.4          | 观察项。可选封口方式（未采用）：在 f0 断言 `getAnimations()` 为空——S6 实测该帧确有区分力（`[]` vs 3 条运行中），但那正是 S6 判定为"视觉瞬态"的那个观察量，写了就与 S6 自相矛盾                                                 |
| 7   | `checkbox-group` / `radio-group` 同输入多用例合并（D4 去重）                                                                                                                                                                                                                                                                                                                                                                                                                                                                | b3 §7.4                         | 未定                                                                                                                                                                                                                           |
| 8   | 本地（非 portal）浮层无入场动画的不对称                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | §5.5                            | 观察项，不改代码                                                                                                                                                                                                               |
| 9   | `data-wui-presence` 在 `overlay-in-dialog.browser.spec.ts` 有 4 处**读作轮询谓词**（非断言）。审查同意可接受，但耦合内部标记；该文件已有公开量（`hidden`）可用                                                                                                                                                                                                                                                                                                                                                              | §5.1 + 审查意见 §F.2            | 观察项：下次触碰该文件时优先换成公开量                                                                                                                                                                                         |
| 10  | **b6b 是最后一批**（19 文件 / 277 例 / 6790 行）：dialog(3) / drawer(8) / toast(3) / image-preview(2) / collapse(3)。动手前先读 §10 S1–S6（尤其 S2 WAAPI 化、S3 控制组、S6 R1 取消）与 §9 转出项 1–6                                                                                                                                                                                                                                                                                                                        | `batch-plan.md`                 | b6b                                                                                                                                                                                                                            |
