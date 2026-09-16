# Batch 1 行为清单 — 展示型原语（16 spec / 162 用例）

> 依据 `docs/agents/testing.md` 第 40 行：**行为不变的重构，编辑前必须记录现有行为清单，保留行为或获得移除审批后才能变更。**
> 验收标准与禁止清单：`docs/adr/0005-web-ui-component-architecture.md` §5。
> Task：`web-ui-contract-b1`（mode `direct`）· base `67ee0087`
> 本文件是 Batch 1 的逐用例判定记录（原为工作区笔记，现已随批次入仓）。

## 清单口径

分类：**KEEP**（已是 ADR-§5 契约，基本不动）· **REFACTOR**（行为合法但读实现细节，改等价公开断言）· **DELETE**（§5 禁止项或无行为价值，**需移除审批**）· **MERGE**（并入参数化契约矩阵，行为不丢失）· **ADD**（真正缺失的公开契约）。

## 文件与用例总览

| 文件                                                      | 用例    | KEEP | REFACTOR | DELETE          | ADD |
| --------------------------------------------------------- | ------- | ---- | -------- | --------------- | --- |
| `badge/__tests__/badge.spec.ts`                           | 21      | 21   | —        | 死代码 1 处     | 2   |
| `badge/__tests__/badge.browser.spec.ts`                   | 2       | —    | —        | **2（整文件）** | 1   |
| `avatar/__tests__/avatar.spec.ts`                         | 16      | 16   | —        | —               | 3   |
| `empty/__tests__/empty.spec.ts`                           | 15      | 12   | —        | **3**           | 2   |
| `empty/__tests__/empty.slot-presence.spec.ts`             | 3       | 3    | 1 helper | —               | —   |
| `icon/__tests__/icon.spec.ts`                             | 6       | 6    | —        | —               | 1   |
| `spinner/__tests__/spinner.spec.ts`                       | 10      | 10   | —        | —               | 2   |
| `svg-draw-lines/__tests__/svg-draw-lines.spec.ts`         | 15      | 15   | —        | —               | 2   |
| `svg-draw-lines/__tests__/svg-draw-lines.browser.spec.ts` | 8       | 1    | —        | **7**           | —   |
| `back-top/__tests__/back-top.spec.ts`                     | 19      | 19   | —        | —               | 3   |
| `back-top/__tests__/back-top-glass.browser.spec.ts`       | 2       | —    | —        | **2（整文件）** | —   |
| `button/__tests__/button.spec.ts`                         | 21      | 21   | —        | —               | 3   |
| `button/__tests__/button.browser.spec.ts`                 | 10      | —    | 3        | **7**           | —   |
| `button/__tests__/group-color.browser.spec.ts`            | 2       | —    | —        | **2（整文件）** | —   |
| `button-group/__tests__/button-group.spec.ts`             | 8       | 5    | —        | **3**           | 2   |
| `shared/events/__tests__/user-change.spec.ts`             | 4       | 4    | —        | —               | —   |
| **合计**                                                  | **162** | 135  | 4        | **24**          | 21  |

> 注：`empty.slot-presence.spec.ts` 的 REFACTOR 列记的是「1 个本地 helper」，不是用例；故 135+4+24=163 比用例总数 162 多 1。

---

## 一、DELETE 审批请求（26 例 + 1 处死代码）

> **未获批准前不执行任何删除。** 分组列出，可按组批量批准。

### D1 — 纯计算样式 / 精确颜色（§5 明文禁止「CSS 样式」）

| #   | 文件:行                                | 用例                                                                                     | 断言内容                                                                                                                  | 删除理由                                                                                                      |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1-2 | `back-top-glass.browser.spec.ts:25,44` | 使用 glass fallback 阴影，不再继承 panel 阴影 / 嵌套在 glass 容器内同样走 glass fallback | 穿透两层 shadowRoot 取 `<button>` 后 `getComputedStyle(native).boxShadow`，断言字面量 `'3px 9px'` 缺失、`'8px 32px'` 存在 | §5 禁测 CSS 样式 + 内部 DOM。**整个文件 2 例皆为该项 → 文件整体删除**                                         |
| 3-4 | `badge.browser.spec.ts:19,39`          | 插入和删除 slot 内容时同步徽章定位 / 反复断开重连后仍保持单次 slot 状态语义              | `getComputedStyle(status).position` 在 `absolute` / 非 `absolute` 间切换                                                  | §5 禁测 CSS 样式。**整个文件 2 例皆为该项 → 文件整体删除**                                                    |
| 5-6 | `group-color.browser.spec.ts:10,22`    | 分组中的 danger 按钮保留 danger 文本颜色 / 尊重宿主传入的 `--wui-button-color`           | `getComputedStyle(inner).color === 'rgb(220, 38, 38)'` / `'rgb(18, 52, 86)'`                                              | §5 禁测 CSS 样式与精确颜色值。**整个文件 2 例皆为该项 → 文件整体删除**                                        |
| 7   | `button.browser.spec.ts:12`            | glass 按钮使用不占布局的 glass border ring                                               | `getComputedStyle(inner,'::before')` 的 `content==='""'`、`background` 含 `radial-gradient` 与 `rgba(0,0,0,0.06)`         | §5 禁测 CSS 样式；伪元素是实现细节                                                                            |
| 8   | `button.browser.spec.ts:157`           | hover/active 背景反馈即时切换，不做过渡动画                                              | `transitionProperty` 不含 `background-color`、`transitionDuration==='0s'`                                                 | §5 禁测 CSS 样式；动效时长属视觉实现                                                                          |
| 9   | `button.browser.spec.ts:169`           | 指针点击后自动聚焦不显示 focus ring，键盘导航恢复 focus-visible                          | 断言 `getComputedStyle(inner).outlineColor` 精确等于 `'rgba(0, 0, 0, 0)'`                                                 | 颜色断言部分删除。**注**：`data-wui-pointer-focus` 部分与 `resetPointerFocusState` 的交互是可保留契约 → 见 R3 |

### D2 — 几何 / 精确像素（非公开契约，属视觉实现）

| #     | 文件:行                              | 用例                                                                      | 断言内容                                                                                           | 删除理由                                                            |
| ----- | ------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 10-12 | `empty.spec.ts:64`（3 case）         | `small`/`medium`/`large` 尺寸设置图标 size 属性为 16/24/32                | `shadowRoot.querySelector('web-ui-icon').size === 16/24/32`                                        | 内部 DOM + 精确像素。`size` 本身已有属性/反射覆盖（用例 44-47）     |
| 13    | `svg-draw-lines.browser.spec.ts:107` | host 布局中性：不抬高图标盒高，但仍保持可 transform 的盒子                | `getBoundingClientRect().height` 精确 `18`、`toBeCloseTo(svgH*1.3, 0)`                             | 精确像素 + 盒模型实现。属历史事故快照，非公开契约                   |
| 14-16 | `button.browser.spec.ts:76,89,144`   | 有 size 时保持正方形比例 / full+icon 撑满容器宽度 / icon+显式宽度变胶囊形 | `getBoundingClientRect()` 的 `width===height`、`width===parentElement.clientWidth`、`width>height` | 精确几何比例属视觉实现。**注**：`full` 属性反射已有覆盖（用例 135） |
| 17    | `button.browser.spec.ts:146`         | 非 icon 模式下宽度由内容决定                                              | `rect.width > rect.height`                                                                         | 同上                                                                |

### D3 — shadow 内部 class / 内部实现产物

| #     | 文件:行                                     | 用例                                                                                                                                   | 断言内容                                                                                   | 删除理由                                                                                                                                  |
| ----- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 18-20 | `button-group.spec.ts:76,100,121`           | v-if 插入的子按钮应刷新末位 divider 上下文 / v-if 移除末位后新的末位应无 divider / v-if 插入的子按钮应继承 direction=vertical 的上下文 | `buttons[i].shadowRoot.querySelector('.group-divider')` + `classList.contains('vertical')` | §5 禁测 shadowRoot 内部 class。三条是同一内部实现的切片。**注**：末位/direction 上下文是真实行为，但当前只能经私有 class 观察 → 见 ADD-18 |
| 21-23 | `svg-draw-lines.browser.spec.ts:32,52,77`   | 多个同级 SVG 并行动画 / 深层嵌套 SVG 内的几何元素被收集并动画 / 重播中断旧动画并重新开始                                               | `path.style.strokeDasharray === ''`                                                        | 断言"动画结束后清空临时写入"的实现产物                                                                                                    |
| 24    | `svg-draw-lines.browser.spec.ts:136`        | 最近的嵌套 theme motion 决定是否播放                                                                                                   | `vi.spyOn(path,'animate')` 调用次数 1 / 0                                                  | 测"是否播放"的实现路径，非公开契约                                                                                                        |
| 25    | `button.spec.ts:168,222` 中的 `.label` 依赖 | 组合: icon + loading / 非 icon 模式 loading 行为不回归                                                                                 | helper `getShadowParts` 内 `shadow.querySelector('.label')`                                | **仅删除 `.label` 私有 class 依赖这一取法**，用例本身按 R2 改写保留                                                                       |
| 26    | `button-group.spec.ts:154` 的部分           | 不向子 button 注入旧的实现属性                                                                                                         | `expect(button.getAttribute('style')).toBeNull()`                                          | 断言"未注入内联 style"属实现细节。**仅删该断言**，同用例的 `group`/`last`/`direction` 不注入断言保留                                      |

### D4 — 死代码（非用例）

| #   | 位置                  | 内容                                           | 理由                                                                                             |
| --- | --------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 27  | `badge.spec.ts:20-26` | `async function waitForSlotChange(el, mutate)` | 全文件仅定义、**无任何调用**（已核验）。其内部用 `shadowRoot.querySelector('slot')` 穿透内部 DOM |

---

## 二、REFACTOR（脆弱但行为合法）

| #   | 位置                                                                                        | 原反模式                                                                                         | 改为                                                                                                                             | 所用 helper                              |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| R1  | `back-top-glass.browser.spec.ts:9-11`、`empty.slot-presence.spec.ts:17`、`badge.spec.ts:20` | 三处本地重定义 `nextFrame` / `flush`                                                             | 共享 `flush` / `flushSlotChange`（推进单帧沿用已有 `waitForFrame`）                                                              | 新增 `flush`、`flushSlotChange`          |
| R2  | `button.spec.ts` 6 处（L168-249）                                                           | 经 `getShadowParts` 读 `.label` 私有 class；经 `shadowRoot.querySelector('button').click()` 驱动 | 改断宿主可观察面：`loading` 时宿主不可点击 / slot 投影状态 / 公开 `disabled` 语义；交互用宿主或 `web-ui-button` 的公开 `click()` | —                                        |
| R3  | `button.browser.spec.ts:169`                                                                | `outlineColor` 精确 rgba                                                                         | 保留 `data-wui-pointer-focus` + `resetPointerFocusState` 的**焦点状态契约**，删除颜色断言                                        | —                                        |
| R4  | 全部 16 文件                                                                                | 手写 `expect(el.hasAttribute('x')).toBe(...)` 共 30+ 处                                          | `expectReflected(el, attr, value)`（已存在但全批**零使用**）                                                                     | 已有 `expectReflected`                   |
| R5  | `badge.spec.ts:44`、`avatar.spec.ts:40`、`empty.spec.ts:31`、`icon.spec.ts:46`              | 4 份逐字相同的反射矩阵；`(el as any)[prop] = value` 散落                                         | 下沉为 `contractReflection` 表驱动；`setProperty` 封装 `as any`                                                                  | 新增 `contractReflection`、`setProperty` |
| R6  | 全部 16 文件                                                                                | 16 个内联 `createXxx` 工厂各自重复 attrs 循环 + append                                           | 经 `mountElement` 收敛公共骨架（保留薄封装以维持可读性）                                                                         | 新增 `mountElement`                      |
| R7  | `icon.spec.ts:15,24`                                                                        | `shadowRoot?.querySelector('svg[aria-hidden="true"]')` 判渲染                                    | 改 `queryA11y('[aria-hidden="true"]')` 或断宿主可观察状态                                                                        | 已有 `queryA11y`                         |

---

## 三、ADD（真正缺失的公开契约）

> 只补有实际行为意义的契约，不为 coverage 凑数。

| #   | 组件           | 缺失契约                                                                                                       | 类型             | 依据                                                           |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------- |
| A1  | badge          | `showZero` 且 `count=0` 时的 `aria-label='无未读消息'` 分支**零覆盖**                                          | a11y             | 源码 `badge/index.ts` 该分支存在，现有用例 16 只断言文本 `'0'` |
| A2  | badge          | `count` 负数钳制到 0                                                                                           | property         | 源码 `normalizeNumber(value, 0, MAX_SAFE, 0)`                  |
| A3  | badge          | slot 内容增删后**徽章可见性与 `aria-label`** 保持不变（原 `badge.browser.spec.ts` 的真实意图，改用公开面表达） | state, a11y      | 替代 D1 的 3-4                                                 |
| A4  | avatar         | `<img>` `@error` 回退到 initials（`_imgError` 分支）**零覆盖**                                                 | rendering, state | 源码 `avatar/index.ts`                                         |
| A5  | avatar         | 多词 `name` 双首字母（`'John Doe'` → `'JD'`）                                                                  | rendering        | 现有只测单词                                                   |
| A6  | avatar         | `alt` 传递到内部 `<img alt>`                                                                                   | a11y             | 源码契约                                                       |
| A7  | empty          | `title`/`description` **属性文本渲染**（现有 4 例全是 slot 优先，属性分支未验证）                              | rendering        | 源码 `showTitle = _hasTitleSlot \|\| Boolean(title)`           |
| A8  | empty          | `icon` slot 存在时替换默认图标                                                                                 | slot             | 源码命名 slot                                                  |
| A9  | icon           | `size` 的属性→property 方向（`setAttribute` 后 `el.size===32`）（现有只测 property→attribute）                 | reflection       | ADR-§5 双向反射                                                |
| A10 | spinner        | `description` 文本渲染（现有只断言 light DOM 中 slot 元素存在，未断投影结果）                                  | rendering, slot  | 源码非 reflect 属性                                            |
| A11 | spinner        | 消费者自带 `role`/`aria-label` 时不被组件覆盖（源码 L49-54「仅缺省时写入」）                                   | a11y             | 源码显式分支                                                   |
| A12 | svg-draw-lines | **自动播放契约**：首次 slot 内容出现后自动 `replay()`（`_hasAutoPlayed`）**零覆盖**                            | state            | 源码 L181-185                                                  |
| A13 | svg-draw-lines | 无 `web-ui-theme` 祖先时回退 `matchMedia('(prefers-reduced-motion: reduce)')`                                  | state, a11y      | 源码 L71                                                       |
| A14 | back-top       | **`@click` 触发 `toTop()` 完全未测**（role=button + `@click` 存在，只有 Enter 用例）                           | method, keyboard | 源码 L118                                                      |
| A15 | back-top       | Space 键分支（源码 `onEnter` 同时处理 `' '`）                                                                  | keyboard         | 源码                                                           |
| A16 | back-top       | window 阈值可见性：滚动超过 `threshold` → `visible=true`                                                       | state            | 源码 `computeVisible()` window 分支                            |
| A17 | button         | 命名 slot `prefix` / `suffix` **零覆盖**                                                                       | slot             | 源码 L108/L110                                                 |
| A18 | button-group   | 末位/direction 上下文的**公开可观察**表达（替代 D3 的 18-20）；若无公开面则不补，并记录为源码契约缺口          | state            | 源码经 `GroupController` 注入内部 `direction`/`isLast`         |

---

## 四、MERGE（并入参数化契约矩阵）

| #   | 来源                                                                                            | 目标                                              | 行为不丢失的保证                                                             |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| M1  | `badge.spec.ts:44`、`avatar.spec.ts:40`、`empty.spec.ts:31`、`icon.spec.ts:46` 四份逐字反射矩阵 | `contractReflection(title, create, cases)` 表驱动 | 每个 prop→attr 对在表中逐条保留，用例名由表生成（`%s 反射到宿主 attribute`） |

> 本批的 MERGE 限于 helper 化，**不跨文件合并用例数**；跨组件契约矩阵（如 FormData 矩阵）从 Batch 2 起引入。

---

## 五、明确判定「不属于单元测试」的视觉细节（移交 browser/真实视觉验证）

- `back-top` 默认按钮的 glass 阴影层次与 fallback
- `badge` 徽章相对 slot 内容的定位方式（`position` 取值）
- `button` 的 glass border ring、hover/active 过渡、focus ring 颜色、图标按钮几何比例
- `button-group` 分组内 danger 文本色与 `--wui-button-color` 继承的**具体色值**
- `empty` 尺寸到内部图标尺寸的映射（16/24/32）
- `svg-draw-lines` 的宿主盒模型中性性、动画插值细节、`stroke-dasharray` 临时写入时机

以上由 `docs/agents/browser-verification.md` 的真实浏览器验证 + 真机验收覆盖；契约 spec 只保留属性反射、事件、a11y 语义、slot 投影、公开方法与状态迁移。

---

## 六、审批状态

| 组     | 内容                                                      | 状态                             |
| ------ | --------------------------------------------------------- | -------------------------------- |
| D1     | 计算样式 / 精确颜色（9 例 + 3 个整文件）                  | ✅ 已批准（2026-09-15）          |
| D2     | 几何 / 精确像素（8 例）                                   | ✅ 已批准（2026-09-15）          |
| D3     | shadow 内部 class / 实现产物（9 处，含 2 处仅删局部断言） | ✅ 已批准（2026-09-15）          |
| D4     | 死代码（1 处）                                            | ✅ 已批准（2026-09-15）          |
| R1-R7  | REFACTOR                                                  | 不需单独审批                     |
| A1-A18 | ADD                                                       | 不需单独审批                     |
| M1     | MERGE                                                     | 不需单独审批（须验证行为未丢失） |

## 七、基线证据

- 测试命令（含环境必要绕过）：`env -u CODEBUDDY_SAFE_DELETE_BULK_STATE_DIR -u CODEBUDDY_TOOL_CALL_ID mise exec -- pnpm --filter @greypan/web-ui test`
- 基线：**114 文件 / 1322 用例 → 1321 passed, 1 failed**
- 唯一失败：`src/shared/overlay/__tests__/overlay-in-dialog.browser.spec.ts > Portal overlay 在已打开原生 dialog 内（top layer） > context-menu 子菜单同帧关闭重开后以最新定位落位` — **属既有失败**（与上一任务 `dialog-enter-scale-flip-260915` 的验证记录一致），归 Batch 5 范围，非本批回归。
- Batch 1 的 16 个文件基线：**162 用例全绿**（已单文件核验 `badge.spec.ts` 21/21）。

---

## 八、实际执行结果（Batch 1 收口）

### 8.1 实际删除：**23 用例 + 1 处死代码**

| 组                            | 计划       | 实际       | 差异原因                                                                                                      |
| ----------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| D1 计算样式/精确颜色          | 9          | 8          | item 9（`button.browser` 焦点颜色）按 R3 处理：只删颜色断言、保留 `data-wui-pointer-focus` 契约，用例本体存活 |
| D2 几何/精确像素              | 8          | 8          | 一致                                                                                                          |
| D3 shadow 内部 class/实现产物 | 7          | 7          | item 25（`.label`）、item 26（内联 style 断言）属「删局部断言」，不计入用例数；item 26 在原文件中已不存在     |
| D4 死代码                     | 1          | 1          | `badge.spec.ts` 的 `waitForSlotChange` 已删除                                                                 |
| **合计**                      | **24 + 1** | **23 + 1** | —                                                                                                             |

三个整文件删除已落地：`badge.browser.spec.ts`、`back-top-glass.browser.spec.ts`、`group-color.browser.spec.ts`。

### 8.2 实际新增：**18 用例**

A1–A17 共 17 例全部落地，另加 1 例（avatat 单词 `name` → initials 基线，作为 A5 多词用例的对照，非凑数：它是回退内容的直接契约）。

| 例外                           | 处理                                                           | 理由                                                                                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A12（自动播放）**            | 从 jsdom 迁至 `svg-draw-lines.browser.spec.ts`                 | jsdom 无 `SVGGeometryElement#getTotalLength`，`collectGeometryElements()` 恒返回空，自动播放路径不可达；断言改用 `expect.poll(path.getAnimations())`（公开 Web Animations API）                                                |
| **A13（reduced-motion 回退）** | 新建 `svg-draw-lines/__tests__/reduced-motion.browser.spec.ts` | 需真实 `matchMedia('(prefers-reduced-motion: reduce)')` 命中；归入既有 `browser-reduced-motion` 项目（与 collapse/drawer/theme 同惯例）                                                                                        |
| **A18（button-group 上下文）** | **不补测试，登记为源码契约缺口**                               | 组上下文（`direction` / `isLast`）只经 `GroupController` 注入按钮内部状态，对外仅表现为私有 class（`.group-divider`、`.is-grouped`）与内联 `--wui-control-size`，**无公开可观察面**。末位分隔线属视觉呈现，交 browser/真机验收 |

### 8.3 边界判定：公开可观察面的选择策略

shadow DOM 查询只在**语义/公开面**上使用，不触碰内部 class：

- ✅ 允许：`slot`（投影是 ADR-§5 明列契约）、`[part="button"]`、原生交互元素（`button`/`img`）、`role`/`aria-*`
- ❌ 禁止：内部 CSS class（`.label`、`.group-divider`）、私有字段、CSS 数值

据此，R2 的 `.label` 依赖全部改为 `slot:not([name])` 的投影状态断言。

### 8.4 验证证据

| 门禁             | 命令                                              | 结果                                                                                                                                                                |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 测试             | `mise exec -- pnpm --filter @greypan/web-ui test` | **112 文件 / 1317 用例 → 1316 passed / 1 failed**（唯一失败为既有 `overlay-in-dialog.browser.spec.ts` context-menu 子菜单定位，与上一任务验证记录一致，归 Batch 5） |
| 用例数对账       | —                                                 | `1322（基线）− 23（删）+ 18（增）= 1317` ✅                                                                                                                         |
| lint/type/format | `mise exec -- pnpm exec vp check`                 | **pass**：`Found no warnings, lint errors, or type errors in 495 files`                                                                                             |
| 拼写             | `cspell`（14 个改动文件）                         | 0 issues                                                                                                                                                            |

**环境前置（重要）**：`vp check` 的 6 个 TS2307（`@greypan/deps-reload/vite`、`@greypan/unplugin-web-components/vite`）**不是本批引入**，而是这两个 workspace 包未构建导致子路径导出无法解析。先执行
`turbo build --filter=@greypan/deps-reload --filter=@greypan/unplugin-web-components` 后即全绿。

### 8.5 本批已处理的行为清单（保真核对）

16 个文件的 KEEP 用例逐条保留，未因 helper 化丢失任何行为；跨 describe 移动过的用例：

- `avatar`：`动态插入和删除默认 slot 时同步 fallback`、`反复断开重连后仍保持 slot 状态语义` 由「边界与极端」移入新增「回退渲染」（语义归类更准，断言不变）
- `button`：`非 icon 模式 loading 行为不回归：spinner 与 label 并存` 更名为 `非 icon 模式 loading 时 spinner 与默认 slot 并存`（断言等价，仅换掉私有 class 表述）
- `back-top`：`键盘 Enter 触发 toTop` 由「无障碍」移入「无障碍与激活」，与新增的 Space/click 用例同组

### 8.6 独立审查（第一轮）与修正

独立审查结论：**APPROVE**（P0=0 / P1=0 / P2=7）。逐条处理如下：

| #   | 审查意见                                                    | 处理                                                                                                  |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | `createIsolatedMount` 无任何调用方，属本批引入的死代码      | **已删除**（其真实场景是 Batch 4 的浮层指针隔离，届时随调用方一起加入，不做投机式 API）               |
| 2   | 清单 R1 引用了从未新增的 `flushFrames`                      | 清单已订正为 `flush` / `flushSlotChange`                                                              |
| 3   | badge slot 用例标题含「可见性」但只断言 `aria-label`        | 已补 `expect(statusOf(el)).toBeTruthy()`                                                              |
| 4   | avatar 图片失败用例复用了可能被重建的节点引用               | 已改为每次重新 `innerOf(el)` 查询                                                                     |
| 5   | back-top 窗口滚动用例只覆盖 `window.scrollY`                | 已核对源码：`getRootScrollTop()` 首读 `window.scrollY`，覆盖有效；用例同时断言 true 与 false 两个方向 |
| 6   | §8.1 未计入 `button.browser` 中「保留用例内的几何断言删除」 | 见下方说明                                                                                            |
| 7   | `contractReflection` 仅在成功路径清理节点                   | 已改为 `try/finally`                                                                                  |

**关于 #6（保留用例内的局部断言删除）**：`button.browser.spec.ts` 的 `icon + loading 只渲染 spinner，保持正方形且不可交互` 属 KEEP，但其中 `expect(rect.width).toBe(rect.height)` 属 D2 定义的「精确几何比例」——已按同一判据删除该行，保留 spinner／默认 slot 投影、`inner.disabled`、聚焦被拒三项断言。这不是用例数变化，故不计入 §8.1 的删除计数。

### 8.7 独立审查（第二轮）与两条误报的澄清

第二轮审查确认第一轮 7 条 P2 **全部 FIXED**，且断言「无新增死导出、`test-utils` 文件自洽」。它另提 2 条，经逐条核查**均为审查方法本身的产物，不是缺陷**：

**(1) 「冻结哈希与 `git diff` 哈希不匹配」— 误报。**
`agent-workflow` 的 `diffHash` **不是** `git diff` 文本的 SHA-256，而是 `currentSnapshot()` 自算的归一化快照哈希：以 `baseSha` 起头，对「排序后的（已跟踪变更文件 ∪ 未跟踪文件）」逐项写入文件名、文件 mode 与**文件原始字节**（见 `scripts/agent-workflow.mjs` 的 `currentSnapshot`）。因此拿它与 `git diff --cached -M | sha256` 相比必然不等，两者本就不可比。工作流的 `stale` 判定复用同一函数，本批 `stale: false`，即当前工作区快照与冻结记录**一致**。

**(2) 「用例增减数与清单不符」— 误报（计数方法错误）。**
审查者统计的是 **diff 文本中 `it(` 的行数**，它与运行时用例数并不等价：`it.each([...])` 只占 1 行 `it(`，却产生 N 个用例；整文件删除与整段重写还会让未变动的用例同样表现为 `-`/`+` 行。改用两种互相独立的方法核对：

| 方法                     | 结果                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| 整套运行器报告的用例总数 | 基线 **1322** → 现在 **1317**，差 **−5**                                            |
| 逐文件推导（本批）       | 基线 162 − 删 23 + 增 18 = **157**，与本批 15 个存活文件 + 1 个新增文件的现计数一致 |
| 一致性                   | 全套 −5 与本批 −5 吻合                                                              |

故 §8.1/§8.2 的「删 23 / 增 18」成立。**权威依据是运行器报告的用例总数，而非 diff 文本行数。**
