# Batch 6b — 容器家族（对话框 / 提示条 / 折叠）契约测试重构

> 范围：9 文件 / 139 例（运行期）/ 2354 行 —— `dialog/{dialog.spec, dialog.browser, slot-presence}` ·
> `toast/{toast.spec, toast-enter-motion.browser → reduced-motion.browser, toast-mobile.browser}` ·
> `collapse/{collapse.spec, collapse.browser, reduced-motion.browser}`
>
> 基线提交 `a7c663a2`（b6a closed）。本批从原 Batch 6b（19 文件 / 277 例 / 6715 行）拆出，
> 拆出理由与另一半（`drawer` / `image-preview`）见 `batch-plan.md` 的「实施期调整（2026-09-16）」。
>
> 判据：`DELETION-RUBRIC.md` §12 **C1–C7**（本批新定，6c 沿用）+ §10 S1–S6 + §8 R1–R4 + §2 D1–D5。
> 本批动手前先把 C1–C7 落盘，理由与 b6a 先定 §10 相同：容器家族的违规形态（几何 / 手势位移 /
> 状态类名）在既有判据里只有零散先例，不先收敛就会边删边立标准。

## 0. 本批产出的裁定（`DELETION-RUBRIC.md` §12 C1–C7）

| #      | 裁定                                      | 一句话                                                                                                                                                                           |
| ------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | 容器尺寸 / 几何断言一律 D2 删，**不承接** | `getBoundingClientRect()` 的宽高、`getComputedStyle` 的 `width/scale/transform` 矩阵分量、`maskImage` 活动长度一律删；`collapse` 的 peek 长度、`toast` 的移动端宽度 288 全在此列 |
| **C2** | 手势断言改用**行为后果**，不读过程几何    | 留阈值行为（拖过阈值 → `open=false`）与归宿（焦点、`open` 反射、事件），删拖动中的 `style.transform` 位移量与"跟手"程度                                                          |
| **C3** | 内部 class 名单禁止断言，只可作轮询谓词   | `is-visible` / `is-dragging` / `is-current` / `wui-glass` / `wui-toast-container` 一律不得进 `expect`；定位改用 data 属性或 a11y 属性                                            |
| **C4** | `data-wui-presence` 同 R1，只可作轮询谓词 | `collapse` 的轨道也写它；落稳态优先用 `getAnimations().length === 0`（§10 S2）                                                                                                   |
| **C5** | 保留：平台级 a11y 与可见性后果            | `hidden` / `inert` / `aria-*` / `document.activeElement` / `scrollTop` / `role` / slot 投影                                                                                      |
| **C6** | 玻璃用例：兑现 R2 剩余的 2 处             | `toast-mobile.browser` 与 `dialog.browser` 各 1 处按 R2 删，收敛点已在 §10 S4 归零，不另立承接                                                                                   |
| **C7** | 容器家族的 reduced-motion 按 §10 S2/S3    | 改 WAAPI + **自带控制组**；`transitionDuration === '0s'` 之类取值删                                                                                                              |

### 0.1 C1 的边界：`collapse` 的 `peek` 被认真权衡过，仍判不承接

`peek` 是 README 记录过的公开 prop，其"定义"就是长度（"关闭态露出这么长"）。删掉长度断言后，
**peek 的长度语义自此无测试覆盖**——这是本批最需要 reviewer 盯的一条判断，故把正反两面都摊开：

- **反方（保留）**：R3 第 1 行保留过 `openAt(100,100) → style.left === '100px'`，理由是"参数→结果
  是决定性映射，非视觉细节"。`peek='100px' → 关闭态轨道高 100px` 与之同形；且换成 clip-path / max-height
  的等价实现，该断言仍然成立（不像 `empty` 的 `size → 内部 icon.size` 那样绑内部 DOM）。
- **正方（删除，本批采纳）**：① ADR-0005 §5 白名单不含尺寸；`openAt` 是**公开方法**（白名单明文），
  `peek` 是**属性**，属性在白名单里只到"反射"为止。② §10 S1 已把「令牌被组件消费 / 可被覆盖生效」
  整类判为不承接——`peek` 的长度就是"组件消费 `--wui-collapse-peek` 的结果"，与 b5 删
  `--wui-select-max-height` 同源。③ 若保留，"怎样算裁剪正确"没有任何行为层判据，只能锁死像素，
  正是 b3 §186 明确拒绝的形态。
- **存活的部分**：peek 的**非视觉后果**全部保留 —— 关闭态内容可见（`hidden=false`）且不可交互
  （`inert`）、展开后恢复可聚焦（`document.activeElement`）、`peek` 反射、`peek` 清空后回落默认稳态。
  即"peek 改变了关闭态的**交互语义**"仍有覆盖，"peek 露出的**长度**"没有。
- **诚实结论**：将来若要覆盖长度，唯一诚实形式是视觉回归测试。

## 1. 用例数对账（逐文件核过，合计闭合）

运行期例数为准（`toast.spec` 有 `for (const t of types)` 循环，字面 `it(` 数 ≠ 运行期数）。

| 文件                                                          | 基线    | 现在    | Δ       | 说明                                                            |
| ------------------------------------------------------------- | ------- | ------- | ------- | --------------------------------------------------------------- |
| `collapse/collapse.spec.ts`                                   | 35      | 33      | −2      | 删 2 例纯 CSS 变量；1 例改写（D3 恒真 → 真实契约）；1 例改名    |
| `collapse/collapse.browser.spec.ts`                           | 26      | 7       | **−19** | 删 `peek 边缘渐隐` 整 describe（11）+ 4 例 D4 重复 + 4 例纯几何 |
| `collapse/reduced-motion.browser.spec.ts`                     | 4       | 2       | −2      | 整文件改写（WAAPI + 控制组）；1 例 D4 并入                      |
| `dialog/dialog.spec.ts`                                       | 18      | 17      | −1      | 删 1 例 D3 存在性                                               |
| `dialog/dialog.browser.spec.ts`                               | 10      | 9       | −1      | 删玻璃 1 例（C6）；2 例按 D5 / R3 改写                          |
| `dialog/slot-presence.spec.ts`                                | 4       | 4       | 0       | **KEEP 未动**                                                   |
| `toast/toast.spec.ts`                                         | 38      | 39      | **+1**  | 观察面从内部钩子换公开面；新增播报语义 1 例；2 例改写           |
| `toast/toast-mobile.browser.spec.ts`                          | 2       | 1       | −1      | 删玻璃 1 例（C6）；1 例留 R3 边界约束                           |
| `toast/toast-enter-motion.browser` → `reduced-motion.browser` | 2       | 2       | 0       | **改名** + 整文件改写（WAAPI + 控制组）                         |
| **合计**                                                      | **139** | **114** | **−25** | 文件数 9 → 9（1 处改名）                                        |

全量套件（提交前实测）：**110 文件 / 1253 例 / 0 失败**（b6a 后为 110 / 1278，Δ = −25 ✔ 与上表闭合）。

## 2. 删除清单（逐条，含存活覆盖）

### 2.1 整 describe / 整段删除

| 位置（基线）                                                                                                                     | 例数  | 类                   | 理由与存活覆盖                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collapse.browser.spec.ts:446` `describe('peek 边缘渐隐（长度由 peek 推导）')`（`:447,465,481,496,510,522,539,564,584,592,617`） | 11    | D2 / §12 C1 + §10 S1 | 全部断言落在 `getComputedStyle(...).maskImage` 字符串、`--wui-collapse-peek-edge-active` 活动长度、`--wui-collapse-peek-edge-ratio/-edge/-edge-max` 的推导值上——即"组件消费组件私有令牌的结果"。**不承接**（同 b5 删 `--wui-select-max-height`、§10 S1「令牌被消费」）。所观察的"边缘渐隐"是纯装饰                                                                                            |
| `toast.toast-mobile.browser.spec.ts:28` 玻璃用例                                                                                 | 1     | D2 / §12 C6（§8 R2） | `classList.contains('wui-glass')` + `backgroundColor` / `transitionProperty` / `backdropFilter` / `opacity` 取值。R2 记录的 8 处分身之一，收敛点已在 §10 S4 归零为"8 → 0 条视觉断言"，**不承接**                                                                                                                                                                                              |
| `dialog.dialog.browser.spec.ts:228` 玻璃用例                                                                                     | 1     | D2 / §12 C6（§8 R2） | 同上（`wui-glass` + `transitionProperty` / `opacity` / `backgroundColor` / `backdropFilter` / `transitionDuration`）                                                                                                                                                                                                                                                                          |
| `collapse.reduced-motion.browser.spec.ts` 全文改写（基线 `:28,:58,:78,:104`）                                                    | 4 → 2 | D2 + D4 + §10 S2/S3  | `getComputedStyle(track).transitionDuration.startsWith('0s')`（`:47`）删；`data-wui-presence` 断言（`:46,:75,:94`）删（C4）；peek 几何（`:118,:131,:136`）与 mask/活动长度（`:122,:123`）删（C1）；`:58`「theme motion=reduced 时同样瞬时完成」与 `:28` 是同一路径同一断言 → D4。存活：改写为「系统 reduce 下全程无过渡 + 对照组 full 出现」（§10 S2/S3），`keep-mounted 关闭稳态 inert` 并入 |

### 2.2 用例内局部断言删除（D5）

| 用例（基线）                                                                              | 删掉的断言                                                                                                                                                                     | 类                                      | 保留的部分                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialog.browser.spec.ts:20`                                                               | `expect(dialog).toBeTruthy()`（`:30`）、`expect(getComputedStyle(dialog).outlineStyle).toBe('none')`（`:32`）                                                                  | D3 + D2                                 | `document.activeElement === button`（§3 白名单：焦点归宿）。用例改名「面板自身不夺焦，内部按钮可聚焦」                                                                                                                                               |
| `dialog.browser.spec.ts:189`                                                              | `expect(getComputedStyle(dialog).position).toBe('fixed')`（`:210`）、滚动前后 `rect.top/left` 等值（`:220,:221`）、`DOMMatrixReadOnly(...).a === 1` 的轮询谓词（`:207`）       | D2 / C1                                 | 改为 §8 R3 第二通道「边界约束」：滚动后 `rect.top >= 0 && rect.bottom <= innerHeight`（"modal 不随页面滚动离开视口"），外加平台语义 `dialog.matches(':modal')`。**该回归仍被抓住**：`position: relative` 时滚动 500px 后 dialog 已在视口外           |
| `collapse.browser.spec.ts:100`                                                            | `expect(track.getAttribute('data-wui-presence')).toBe('open')`（`:114`）                                                                                                       | C4（R1 同源）                           | `hidden` 的两向切换                                                                                                                                                                                                                                  |
| `collapse.browser.spec.ts:174`                                                            | presence 断言（`:189`）+ 其余                                                                                                                                                  | C4 + D4                                 | **整例删除**：去掉 presence 与几何（`is-horizontal` 轴差异只能以宽/高度量，C1）后，只剩"open/close 切 `hidden`"，与保留的 `:100` 同观察量 → 指名 `collapse.browser.spec.ts` 的「展开收起切换内容可见性」（改后 `:89`）                               |
| `collapse.browser.spec.ts:281,317,355,365,386`                                            | 全部（`trackHeight/trackWidth` 与 `getBoundingClientRect()` 增量）                                                                                                             | C1                                      | **整例删除**。存活：peek 的交互语义在 `collapse.spec.ts:194,207,223,247,261,278`（jsdom）；"内层展开外层跟随"的像素增量不承接，但"外层收起只裁剪内容、不改写内层 open"改写保留在 `collapse.browser.spec.ts`「嵌套 collapse」                         |
| `collapse.browser.spec.ts:417`                                                            | `expect(track.getAttribute('data-wui-presence')).toBe(null)`（`:442`）                                                                                                         | C4                                      | `hidden === true`、`inert === false`、`getAnimations()` 为空                                                                                                                                                                                         |
| `collapse.spec.ts:63`                                                                     | 无删除（标题名不副实：说"不播动画"但 jsdom 观察不到动效）                                                                                                                      | D5（改名）                              | 改名「初始 open attribute 直接展开，不隐藏内容」；"不播放展开过渡"移入 `collapse.browser.spec.ts` 用 WAAPI 断言（新增例）                                                                                                                            |
| `collapse.spec.ts:563`                                                                    | `expect(el.querySelector('.trigger')?.textContent).toContain('自定义')`、`expect(content.querySelector('p')).toBeTruthy()`、`expect(content.querySelector('li')).toBeTruthy()` | D3（恒真：把注入的 light DOM 再读回来） | 改为真实后果：非 `button` 的 `<span class="trigger">` 被当作 trigger 回写 `aria-expanded`/`aria-controls`，且点击它沿同一 click 代理路径切换 `open`                                                                                                  |
| `toast.spec.ts:99`                                                                        | 无删除（标题"默认显示关闭按钮"却只断言 prop 反射）                                                                                                                             | D5（补断言 + 改名）                     | 补 `queryA11y(el,'[aria-label="关闭"]')` 存在性；改名「默认渲染带无障碍名的关闭按钮」                                                                                                                                                                |
| `toast.spec.ts:107`                                                                       | `querySelector('.toast-close-btn')`（内部 class 定位）                                                                                                                         | C3（改定位）                            | 改 `queryA11y(el,'[aria-label="关闭"]')`                                                                                                                                                                                                             |
| `toast.spec.ts:457`                                                                       | `container.classList.contains('wui-toast-container')`（`:462`）                                                                                                                | D2 / C3                                 | 改为容器的公开播报语义：`role="log"` + `aria-live="polite"` + `aria-relevant="additions"`                                                                                                                                                            |
| `dialog.dialog.spec.ts:154` 「打开时 shadow DOM 内存在原生 dialog 元素」（断言在 `:160`） | 整例（`querySelector('dialog')` 的存在性断言）                                                                                                                                 | D3                                      | **存在性恒真**：任何"渲染出某种容器"的实现都能过（换成 `div[role=dialog]` 也过）。被删的是**实现态**（shadow 里有原生 `dialog`），不是契约（"可聚焦的对话框存在"）。行为那一半已由 `dialog.browser.spec.ts` 的 `dialog.matches(':modal')` 承接（§5） |
| `toast.toast-mobile.browser.spec.ts:14`                                                   | `expect(toast).toBeTruthy()`（`:23`）、`expect(toast.getBoundingClientRect().width).toBe(288)`（`:24`）                                                                        | D3 + C1                                 | 留 `document.documentElement.scrollWidth <= 320`（R3 边界约束：窄视口不撑出横向滚动），用例改名                                                                                                                                                      |

### 2.3 观察面替换（非删除，但强度变了）

| 位置（基线）                                                             | 原观察面                                                                                                      | 新观察面                                                                                                                | 为什么                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toast.spec.ts:276,291,299,307,316,324,329,334,374,379,472,476`（12 处） | `expect(toast._visibleCount()).toBe(n)` —— `manager.ts:161` 的**内部测试钩子**（`visibleToasts` Map 的 size） | `expect(mountedToasts()).toHaveLength(n)` —— overlay root 里实际挂载的 `web-ui-toast` 元素（公开元素 + 公开 `visible`） | §2 D2「私有字段/内部状态」。换面**更强**：断言的是真实挂载，且**因此暴露了一个既有缺陷**（见 §7）                                                                                                                       |
| `toast.spec.ts:454`                                                      | `.wui-toast-top-left` class 选择器                                                                            | `[data-wui-toast-position="top-left"]`                                                                                  | C3：定位不用 class 名单（data 属性定位器，非断言）                                                                                                                                                                      |
| `collapse.browser.spec.ts:92` `waitForOpenSettled()`                     | 轮询 `track.getAttribute('data-wui-presence') === 'open'`                                                     | `settle()` = 轮询 `track.getAnimations().length === 0`                                                                  | §10 S2：对「有动效 vs 无动效」有完全区分力；C4 要求"优先换 `getAnimations()`"。**顺带修掉一个隐性脆弱**：原注释自述"不用 transitionend，因为同帧 close→reopen 会取消过渡"，而 presence 轮询在中断路径上也可能错过中间态 |
| `dialog.browser.spec.ts:207`                                             | `pollUntil(() => new DOMMatrixReadOnly(getComputedStyle(dialog).transform).a === 1)`                          | `pollUntil(() => dialog.getAnimations().length === 0)`                                                                  | 同上（轮询谓词，非断言；但顺带去掉一处计算样式读取）                                                                                                                                                                    |
| `toast.toast-enter-motion.browser.spec.ts` 全文                          | 拆 `getComputedStyle(toast).transform` 的 matrix，断言 `scale === ['0.95','0.95']` / `['1','1']`              | WAAPI：系统 reduce 下**一条过渡都不出现**，对照组 `motion='full'` 出现                                                  | §10 S2/S1：token 取值属计算样式读；改名进 `browser-reduced-motion` project，被测组走**系统** reduce（原文件在 browser 项目里只能靠显式 `motion='reduced'`，断言被迫落在 token 值上）                                    |

## 3. 保留并标注的例外

| 位置（改后）                                                                                                           | 例外                                                                 | 依据                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialog.spec.ts:37,41,51,62`                                                                                           | `document.body.style.position === 'fixed'` / `''`（滚动锁三例）      | §8 R3 第三通道：作用在**组件之外**的文档级副作用，是滚动锁的唯一观察面；b3 已把 `scroll-lock.spec.ts` 判 KEEP，口径一致                                                               |
| `dialog.browser.spec.ts:197-222`（modal 视口约束）                                                                     | `rect.top >= 0` / `rect.bottom <= innerHeight`                       | §8 R3 第二通道：断言的是"不出视口"这一行为，不是某个像素值                                                                                                                            |
| `dialog.browser.spec.ts:38`                                                                                            | `dialog.open`（shadow 内原生 dialog 的 open）                        | R1 同源：退场期"面板仍可见"的唯一观察面（组件的 `open` 已为 false）。R1 已明文允许以"面板仍挂载且 `!hidden`"作为退场可见性的后果，原生 dialog 的 `open` 是其等价物                    |
| `collapse.browser.spec.ts` / `toast.spec.ts`                                                                           | `inert`（内容内层）                                                  | §12 C5：平台级 a11y 属性，语义＝"子树不可交互"，与 §3 白名单的 `role`/`aria-*`/**可聚焦性**同通道。浏览器侧另以 `document.activeElement` 断言其后果（`collapse.browser.spec.ts:136`） |
| `collapse.browser.spec.ts` `queryTrack/queryInner`、`toast` 的 `queryPanel`                                            | `.wui-collapse-track` / `.wui-collapse-inner` / `[aria-live]` 定位器 | 定位器（非断言），且只用于观察动画生命周期与 a11y 语义；`toast` 侧已改用 `[aria-live]` 而非 `.toast` class                                                                            |
| `collapse.browser` / `collapse.reduced-motion` / `toast.reduced-motion` 的 `getBoundingClientRect()` / `flushStyles()` | 强制同步样式结算                                                     | 驱动手段（非断言）：给元素建立 before-change 样式，否则过渡不启动（§10 S2 / b6a 实测）。在调用点均有注释                                                                              |
| `toast.spec.ts` 的 `toast._reset()`（`beforeEach`/`afterEach`）                                                        | 内部测试钩子，作**驱动**用                                           | 无公开等价物（`toast.clear()` 不清 `pendingBatch` / 容器集合）。已留注释；不作断言                                                                                                    |

## 4. 改写观察面后的**缺陷发现**（本批最重要的一条）

把 `toast.spec.ts` 的去重用例观察面从 `toast._visibleCount()`（内部 Map 的 size）换成**实际挂载的
`web-ui-toast` 元素**后，用例立刻变红，实测证据：

```
ids: dup / dup (same=true)
mounted count = 2
  toastId=dup message="first"  visible=true
  toastId=dup message="second" visible=true
sequential same-id mounted = 1     ← 已挂载后再用同 id 调用，去重正常
```

- **缺陷**：**同一次批量里重复的 id 不会被去重**，DOM 里出现两条 `visible=true`、`toastId` 相同的 toast
  （用户会看到两条），而 `_visibleCount()` 报 1 —— 旧断言只读内部 Map，**恰好看不到这个重复挂载**。
- **根因**：`manager.ts` 的 `createToast()`（`:77-90`）只查 `visibleToasts`，不查 `pendingBatch`；
  同文件的 `updateMessage()`（`:131-143`）两边都查——即同一模块内两处去重口径不一致。
  修法（一行）：`if (visibleToasts.has(id) || pendingBatch?.some(item => item.id === id)) return id`。
- **处置**：修源码不在本批范围（§6「不删测试资产以外的任何文件」）。本批只断言**确实成立**的那一半
  契约（已挂载后同 id 去重），**不改成"期望 2 条"**把缺陷固化成契约。已记为转出项 #1（含复现与修法）。

> **措辞校正（reviewer 指出，属实）**：上面的探针是**同批次**时序（两次 `toast(...)` 之间没有 `await`）。
> 最终提交的用例在两次调用之间插入了 `await waitForToastMounted()`，走的是「已挂载后再用同 id 调用」
> 这条**去重正常**的路径 —— 即**提交后的用例本身并不复现该缺陷**。所以准确说法是：
> 「换观察面**的过程中**暴露了缺陷（中间态复现），终态用例只覆盖成立的一半，缺陷留痕于此处与转出项 #1」，
> 而非「用例覆盖了缺陷」。用例内的注释已同步写明这一时序差别。

## 5. 新增

| 位置                                                                           | 内容                                                                                                               | 理由                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collapse.browser.spec.ts`「初始带 open attribute 直接落稳态，不播放展开过渡」 | `expect(queryTrack(el).getAnimations()).toHaveLength(0)`                                                           | 承接 `collapse.spec.ts:63` 被改名的标题丢掉的那一半（"不播动画"）。§10 S2：`getAnimations()` 对"有过渡 vs 无过渡"有完全区分力（不是 §10 S6 否决的那类帧级相位差）                                                                                                                             |
| `toast.spec.ts`「无障碍：播报语义」                                            | 非 error：`aria-live="polite"` + `aria-atomic="true"` + 无 `role`；error：`aria-live="assertive"` + `role="alert"` | §3 白名单的 `role`/`aria-*` 通道，原全仓无覆盖；也补上被删玻璃用例留下的位置                                                                                                                                                                                                                  |
| `collapse.browser.spec.ts`「peek：露出的内容是只读预览，展开后恢复可交互」     | 保留并重写（原 `:336`）；**补一条 `hidden === false`**（审查意见 4）                                               | peek 的唯一非视觉后果。补的这条是**区分力**所在：原版只断言"关闭态内部按钮不可聚焦"，而无 peek 的默认关闭态（内容 `hidden`）同样不可聚焦，该断言区分不出 peek；补上"关闭态内容容器**不是** `hidden`"后，本例才真正绑定 `peek`（默认路径会红）。长度已按 C1 删，"露出"只能靠这个可见性差异体现 |
| `dialog.browser.spec.ts` 的 `dialog.matches(':modal')`                         | 平台语义断言                                                                                                       | 原 `:154`（jsdom 存在性用例）被删后，"打开 = 进入 modal 层"这一有行为语义的一半改由此承接                                                                                                                                                                                                     |

## 6. 门禁

| 门禁                                         | 结果                                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @greypan/web-ui test`（全量） | ✅ **110 文件 / 1253 例 / 0 失败**（b6a 后 110 / 1278；Δ = −25 ✔ 与 §1 闭合）。冻结后又跑过一次，同为 110 / 1253 / 0 |
| `pnpm exec vp check`                         | ✅ 732 files formatted；494 files **0 warnings / 0 lint / 0 type**                                                   |
| `pnpm run check:cspell`                      | ✅ 595 files / **0 issues**                                                                                          |

> `vp check` 首轮报 4 个 `TS2322`：`waitFor(() => …hidden)` 的谓词类型是 `string | boolean`
> （TS 5.6+ 的 lib.dom 把 `HTMLElement.hidden` 放宽为 `boolean | string` 以支持 `hidden="until-found"`）。
> 4 处改为 `=== true`，**纯类型修正，语义不变**（`hidden` 在本组件里只会是布尔反射）。

## 7. KEEP（未改动）

- `dialog/slot-presence.spec.ts`（4 例）—— `slot` 投影契约（`assignedElements()` 与 mode 切换），
  §3 白名单；`hidden` 在 slot 上属可见性后果。9 文件里唯一**逐字未动**的文件。
- `toast.spec.ts` 的反射 / `duration` / `position` / `show()` / `dismiss()` / 指针暂停 / 自动关闭 /
  命令式 API 主体 / `toast-close` 的 reason 三态 —— 全是公开契约，除观察面替换（§2.3）外未动。
- `dialog.spec.ts` 的 `open` 反射 / `open-change` 负向契约 / `showModal()` / `close()` /
  `noEscapeClose` 与 `noBackdropClose` 的反射与行为 / `controlled` —— 未动。
- `collapse.spec.ts` 的反射 / `aria-*` / 事件与 `detail` / 命令 / 关闭稳态三态 / 指针代理 —— 未动。

## 8. 独立审查结论

**VERDICT: pass（0 blocking）**，4 条非阻断。逐条处置：

| #   | 意见                                                                                                                  | 处置                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | §4「换个观察面后用例立刻变红／暴露缺陷」的叙事偏强：终态用例因插入 `await waitForToastMounted()` 已**不再复现**该缺陷 | **属实，已采纳**：§4 末尾补「措辞校正」段说明中间态 vs 终态，`toast.spec.ts` 内注释同步写明时序差别                  |
| 2   | `dialog.spec.ts` 删掉的 D3 存在性用例只在文件内注释留痕，未进 §2.1/§2.2 明细表（rubric §4 要求每条删除落 D 清单）     | **已采纳**：补进 §2.2（含基线行号 `:154` / `:160`）                                                                  |
| 3   | §3 滚动锁断言行号漂移（写 `:32,45,55`）                                                                               | **已采纳**：实测为 `:37,41,51,62`，已改                                                                              |
| 4   | `collapse.browser` 的 peek 浏览器用例只断言焦点，无法区分 peek（无 peek 的默认关闭态同样不可聚焦）                    | **已采纳并加强**：补 `expect(queryContentContainer(el).hidden).toBe(false)` —— 默认路径会红，本例自此真正绑定 `peek` |

审查独立确认（未逐条复核的部分）：缺陷可复现且根因属实（`manager.ts:79` 单查 vs `:131-139` 双查）、
一行修法正确完整；`peek` 是 README 记录的公开 prop，按 C1 删与 §10 S1 同源、非视觉后果确有覆盖
（`collapse.spec.ts:206` 忽略 peek 即红）；modal 用例改写后对 `position: relative` 回归仍有区分力；
两个 `reduced-motion` 的控制组用同一 `sampleTransitions()` 且实跑 4/4，移除 reduce 处理必红；
`mountedToasts()` 是公开面非内部钩子；**逐文件运行期例数重数与本报告完全闭合（139 → 114）**，
抽样 `file:line` 在基线均命中。

审查对 §G 四条判断的裁决：C1（含 peek 代价）**同意**；改名换 project 以获得真实系统 reduce 环境
**同意**（`vite.config.ts:53-55/68-69` 确认路由）；新 reduced-motion 的控制组承担了「入场动画存在」
的契约，旧文件的 `scale 0.95→1` 取值按 D2 删合理、**同意**；toast 去重缺陷的处置**同意**，附上述措辞 caveat。

## 9. 转出项

| #   | 事项                                                                                                                                                                                         | 来源            | 去向                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| 1   | **`toast` 同批次重复 id 不去重（真实缺陷，含复现与一行修法）**                                                                                                                               | 本批 §4         | **需单独立 task 修 `manager.ts`**；本批只在文档与提交信息留痕，未改源码 |
| 2   | `collapse` 的 **peek 长度语义自此无测试覆盖**（§0.1 的有意代价）                                                                                                                             | 本批 §0.1       | 观察项。若将来要覆盖，唯一诚实形式是视觉回归测试                        |
| 3   | `dialog` 的 **modal 视口锚定**由"位置不变"降为"不出视口"（R3 边界约束）                                                                                                                      | 本批 §2.2       | 观察项。更严格的形式需要视觉基线                                        |
| 4   | `dialog.browser` 的 `controlled + showModal()` 用例与 jsdom 的 `showModal()` / `controlled + close()` 有部分重叠                                                                             | 本批 §1         | 观察项（保留：`controlled` 与 `showModal` 的组合未被其他用例覆盖）      |
| 5   | `b6c` 是最后一批（10 文件 / 139 例 / 4361 行）：`drawer`(8) / `image-preview`(2)。动手前先读 §12 C1–C7，尤其 C1（几何）与 C2（手势阈值 vs 过程几何）；`drawer/glass-inherit.browser` 需判 D1 | `batch-plan.md` | b6c                                                                     |
| 6   | `toast._visibleCount()` / `_reset()` 是 `manager.ts` 里**仅为测试存在**的钩子；本批已停止把 `_visibleCount()` 用作断言通道，但它仍留在源码里（§6 禁改源码）                                  | 本批 §2.3       | 观察项：可随 #1 的修复一并清理                                          |
