# Batch 2 行为清单 — 表单关联家族（18 spec / 209 用例）

> 任务 `web-ui-contract-b2`（`direct`，base `4db0d1c9`）· 角色 lib-coder
> 依据：`docs/adr/0005-web-ui-component-architecture.md` §5 · `docs/agents/testing.md` 第 40 行
> 编辑前必产此清单；**DELETE 与「保留用例内的局部删除」须经移除审批**（本文件 §3、§5）。

## 0. 摘要

| 项                          | 数                                | 说明                                                       |
| --------------------------- | --------------------------------- | ---------------------------------------------------------- |
| 文件                        | 18                                | `src/components/` 15 + `src/shared/` 3                     |
| 用例                        | 209                               | `it(` 计数；无 `it.each`、无快照、无 skip/only             |
| KEEP                        | 73                                | 断言公开契约面且无需改写                                   |
| REFACTOR                    | 32                                | 行为合法但读了实现细节，改为 §7 helper 或语义查询          |
| DELETE                      | 17                                | 整条删除；其中 1 个整文件（`borderless.browser.spec.ts`）  |
| MERGE（下沉，不需单独审批） | 87                                | 迁入 3 个新矩阵 spec，行为继续被覆盖                       |
| ADD                         | 20                                | 见 §6（A1–A11，按组件展开计）                              |
| 受影响文件的用例净变化      | 209 − 17 − 87 + 87 + 20 = **212** | 12 个组件 spec 收缩，3 个矩阵 spec 承接下沉 + 新增         |
| 文件数净变化                | 18 − 3 + 3 = **18**               | 删 3（1 纯视觉 + 2 重复 slot-presence），增 3（矩阵 spec） |

另有 **11 个 KEEP 用例发生「局部断言删除」**（D5）：用例本身保留，仅摘掉其中的 CSS / 私有 class / 光标断言，需一并审批。

反模式普查（改动前）：

| 文件                                    | gCS | gBCR | rgb | px 字面量 | 私有 class                           | 备注                                  |
| --------------------------------------- | --- | ---- | --- | --------- | ------------------------------------ | ------------------------------------- |
| `input/focus.browser.spec.ts`           | 9   | 0    | 1   | 2         | 3（`.wui-input-inner`/`.wui-glass`） | 主要战场                              |
| `textarea/borderless.browser.spec.ts`   | 5   | 0    | 3   | 3         | 2                                    | 整文件纯视觉                          |
| `switch/switch-gesture.browser.spec.ts` | 13  | 0    | 4   | 2         | 4                                    | 主要战场                              |
| `slider/slider.browser.spec.ts`         | 18  | 9    | 4   | 0         | 6                                    | 最大战场                              |
| `slider/slider.spec.ts`                 | 0   | 4    | 0   | 0         | 0                                    | gBCR 全为 `vi.spyOn` 定值桩，**合法** |
| `textarea/textarea.spec.ts`             | 0   | 0    | 0   | 1         | 0                                    | 内联样式断言                          |
| 其余 12 文件                            | 0   | 0    | 0   | 0         | 0                                    | 无 §5 违规                            |

## 1. 基线证据

- 全量套件（Batch 1 提交后、本批改动前）：**112 文件 / 1317 用例 → 1316 passed / 1 failed**。
- 唯一失败：`src/shared/overlay/__tests__/overlay-in-dialog.browser.spec.ts > Portal overlay 在已打开原生 dialog 内（top layer） > context-menu 子菜单同帧关闭重开后以最新定位落位`。**既有失败，归 Batch 5，非本批回归。**
- 本批 18 文件改动前用例数：209（逐文件：`input.spec` 27 · `input.jsdom.spec` 1 · `input/slot-presence` 4 · `input/focus.browser` 5 · `input/form-association.browser` 4 · `textarea.spec` 33 · `textarea/slot-presence` 4 · `textarea/borderless.browser` 1 · `input-number.spec` 29 · `checkbox.spec` 13 · `radio.spec` 13 · `switch.spec` 11 · `switch-gesture.browser` 10 · `slider.spec` 18 · `slider.browser` 12 · `form-association.spec` 3 · `form-association.browser` 13 · `normalize.spec` 8）。

## 2. 实测重复（决定 MERGE 的依据）

- **form 家族**（input / textarea / input-number）跨文件同名用例 **21** 个 —— 与方案 §5 Batch 2 预测一致。
- **choice 家族**（checkbox / radio / switch）跨文件同名用例 **7** 个 —— 与方案预测一致。
- 另有无需计名的同构块：`可访问性 > 拥有 role="…" 和正确的 aria-checked` ×3；`空格键…` ×2；`多次点击…` ×2。
- `input/slot-presence.spec.ts` 与 `textarea/slot-presence.spec.ts`：**结构逐字同构**（仅 tag 与字面字符不同），且各自本地重定义了 `flush`／`makeSpan`／`getSlot`／`expectAssigned`。
- 三个 choice spec 各自 import 了 `vi` 但**全文件未使用**（死导入）。

## 3. 需审批的删除（D 组）

> 判据：ADR-0005 §5「禁止测试 CSS 样式 / shadowRoot 内部 class / 私有字段 / 实现顺序」；方案 §7.2 反模式替换表。

### D1 — 整文件删除（纯视觉，1 文件 / 1 用例）

| 文件                                            | 唯一用例                                                    | 理由                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `textarea/__tests__/borderless.browser.spec.ts` | `borderless 移除 glass 描边环并在键盘聚焦时保留 focus ring` | 断言 `backgroundColor==='rgba(0,0,0,0)'`、`boxShadow==='none'`、`::before content`、`paddingTop==='7.5px'`、`paddingLeft/Right==='12px'`、focus ring `rgb(0,136,255)` 与 `0px 0px 0px 3px`，全部经私有 class `.wui-textarea-inner` 读取 —— §5 三项禁止同时命中，零契约价值。其中唯一契约面 `focused` 属性反射由 D5/矩阵覆盖；视觉表现归真机验收。 |

### D2 — 滑块浏览器 spec 的纯视觉 / 实现态用例（6 用例）

| 文件                     | 用例                                                                                     | 理由                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `slider.browser.spec.ts` | `按住未移动时呈现按压反馈且不进入拖拽状态`                                               | 仅断言 `.wui-slider-thumb` 的 `is-pressed`/`is-dragging` class 与 `cursor==='default'`                |
| `slider.browser.spec.ts` | `移动未超过意图阈值时不进入拖拽状态`                                                     | 仅断言 class 与 `cursor`；阈值行为无公开可观察差异（pointerdown 已改值）                              |
| `slider.browser.spec.ts` | `移动端水平轨道禁止浏览器手势接管，横向拖拽交给组件手势处理`                             | `getComputedStyle(slider).touchAction` —— 纯 CSS 实现                                                 |
| `slider.browser.spec.ts` | `移动端垂直轨道禁止浏览器手势接管，纵向拖拽交给组件手势处理`                             | 同上                                                                                                  |
| `slider.browser.spec.ts` | `host 同时声明 touch-action: none，覆盖 light DOM 命中链`                                | 同上                                                                                                  |
| `slider.browser.spec.ts` | `静止态实体白 thumb，按压切玻璃背景、拖拽转透明（backdrop blur 恒开 + 放大 + 阴影切换）` | `backdropFilter`/`backgroundColor`/`boxShadow` 精确值 + 固定 120ms sleep + 私有 class —— 玻璃视觉实现 |

### D3 — 开关手势 spec 的实现态 / 视觉用例（5 用例）

| 文件                             | 用例                                                                                    | 理由                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `switch-gesture.browser.spec.ts` | `指针按住未拖拽时呈现 is-pressed 按压挤压反馈`                                          | 仅断言 `.wui-switch-thumb` 的 `is-pressed` class           |
| `switch-gesture.browser.spec.ts` | `跨越 50% 拖拽过程中 thumb 持续平滑跟手，不发生瞬跳`                                    | 断言 `is-open`/`is-dragging`/`is-pressed` 三个内部态 class |
| `switch-gesture.browser.spec.ts` | `拖拽中光标从 default 切换为 grabbing`                                                  | `getComputedStyle(track).cursor` —— 纯 CSS                 |
| `switch-gesture.browser.spec.ts` | `移动端轨道禁止浏览器手势接管，横向拖拽交给组件手势处理`                                | `touchAction==='none'` —— 纯 CSS                           |
| `switch-gesture.browser.spec.ts` | `静止态实体白 thumb，按压/拖拽切换为玻璃（backdrop blur + 透明背景 + 放大 + 阴影切换）` | 与 D2 末条同构的玻璃视觉实现                               |

### D4 — 文本域内联样式断言（2 用例）

| 文件               | 用例                                 | 理由                                                                                                                                       |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `textarea.spec.ts` | `autosize 启用后同步高度`            | `vi.spyOn(textarea.style, 'height', 'set')` —— 以改写内联样式为观测点，属 CSS 实现；autosize 的高度效应依赖真实布局，jsdom 不可测（见 §8） |
| `textarea.spec.ts` | `运行时关闭 autosize 后移除内联高度` | 断言 `textarea.style.height === ''` —— 纯内联 CSS                                                                                          |

### D5 — 保留用例内部的 §5 禁止断言（局部删除，11 个用例受影响）

> 这些用例本身保留（其契约断言有价值），仅删除其中的 CSS / 私有 class / 光标断言。

| 文件                             | 用例                                                                                                    | 删除的断言                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `input/focus.browser.spec.ts`    | `键盘聚焦 button 使用统一 focus ring`                                                                   | `outlineStyle`/`outlineWidth`/`--wui-focus-ring-width` 读取              |
| `input/focus.browser.spec.ts`    | `输入框 focus 使用 accent 内圈和 focus-ring halo`                                                       | `::after boxShadow`（含 `inset` 与 halo 展开值）                         |
| `input/focus.browser.spec.ts`    | `borderless 输入框隐藏玻璃描边、保留 padding 并在键盘聚焦时保留 focus ring`                             | `::before content`/`paddingLeft`/`paddingRight`/`boxShadow`              |
| `input/focus.browser.spec.ts`    | `borderless 输入框鼠标/程序化聚焦同样显示 focus ring（不 gate 在 :focus-visible）`                      | `boxShadow`                                                              |
| `input/focus.browser.spec.ts`    | `borderless 输入框移除 glass 描边环（.wui-glass::before）`                                              | `::before content` 双值                                                  |
| `switch-gesture.browser.spec.ts` | `拖拽超过 50% 行程松手…` / `…反向拖拽不足 50%…` / `flick 抛掷速度触发…` / `disabled 状态下禁止拖拽切换` | `track.classList.contains('is-dragging')`                                |
| `slider.browser.spec.ts`         | `真实指针拖拽更新 value 并触发 change`                                                                  | `thumb.classList.contains('is-dragging')`、2× `cursor==='grabbing'`      |
| `slider.browser.spec.ts`         | `捕获转手：…`                                                                                           | 3× `thumb.classList.contains('is-dragging'/'is-pressed')`                |
| `textarea.spec.ts`               | `max-height 属性反射并应用到 textarea 的 max-height 样式`                                               | `textarea.style.maxHeight === '120px'`（保留 property + attribute 断言） |
| `textarea.spec.ts`               | `max-height 默认 0 时不设置上限`                                                                        | `textarea.style.maxHeight === ''`（保留 `maxHeight === 0`）              |

## 4. 逐文件用例清单

分类：K=KEEP · R=REFACTOR · D=DELETE · M=MERGE（下沉）· A=ADD

### 4.1 `input/__tests__/input.spec.ts`（27 → 目的 12）

| 行  | it 标题                                 | 类  | 处置                                     |
| --- | --------------------------------------- | --- | ---------------------------------------- |
| 25  | type 默认 text                          | K   | 保留（input 特有属性）                   |
| 32  | value 默认空字符串                      | M   | 下沉至文本控件矩阵                       |
| 38  | disabled 默认 false                     | M   | 下沉                                     |
| 44  | formAssociated 已声明                   | M   | 下沉                                     |
| 50  | type 属性反射                           | R   | 改 `contractReflection` 表               |
| 57  | disabled 属性反射                       | M   | 下沉                                     |
| 65  | placeholder 属性反射                    | M   | 下沉                                     |
| 72  | name 属性反射                           | M   | 下沉                                     |
| 79  | required 属性反射                       | M   | 下沉                                     |
| 87  | clearable 属性反射                      | R   | 改 `contractReflection`（input 特有）    |
| 95  | full 属性反射                           | M   | 下沉                                     |
| 103 | borderless 属性反射                     | M   | 下沉                                     |
| 110 | readonly 属性反射并同步到原生 input     | M   | 下沉                                     |
| 119 | aria-label 映射到内部输入元素           | K   | 保留（input 特有 a11y 契约）             |
| 128 | disabled 时点击容器不聚焦原生 input     | R   | 改 `[role]`/结构查询，保留 spy 断言      |
| 144 | 输入时触发 input 事件                   | M   | 下沉至事件矩阵                           |
| 157 | 失焦时原生 change 事件转发为宿主 change | M   | 下沉                                     |
| 171 | readonly 时原生 change 不转发           | M   | 下沉                                     |
| 188 | 聚焦时触发 focus 事件                   | M   | 下沉                                     |
| 200 | 失焦时触发 blur 事件                    | M   | 下沉                                     |
| 212 | 设置属性时不派发 input 事件             | M   | 下沉                                     |
| 226 | 设置 value 后原生 input 值同步          | M   | 下沉                                     |
| 236 | 输入后组件 value 属性同步更新           | M   | 下沉                                     |
| 251 | clearable 有值时触发 input 事件         | R   | 保留（input 特有），改用 `contractEvent` |
| 266 | readonly 时不渲染清除按钮               | K   | 保留                                     |
| 279 | prefix 内容投影                         | M   | 下沉至共享 slot 契约                     |
| 289 | suffix 内容投影                         | M   | 下沉                                     |

### 4.2 `input/__tests__/input.jsdom.spec.ts`（1）

| 行  | it 标题                                  | 类  | 处置                                                                                                 |
| --- | ---------------------------------------- | --- | ---------------------------------------------------------------------------------------------------- |
| 9   | 通过公开 value 属性读取声明式 value 属性 | K   | 保留（jsdom 项目路由哨兵，与 `input/form-association.browser.spec.ts:9` 成对，证明同断言跨项目可选） |

### 4.3 `input/__tests__/slot-presence.spec.ts`（4 → 文件删除，用例下沉）

| 行  | it 标题                                        | 类  | 处置 |
| --- | ---------------------------------------------- | --- | ---- |
| 37  | 初始无 prefix/suffix 内容时不分配节点          | M   | 下沉 |
| 45  | 后续插入 prefix/suffix 内容后立即同步分配      | M   | 下沉 |
| 58  | 移除和替换条件渲染内容时同步分配数量           | M   | 下沉 |
| 76  | 断开期间修改 slot 内容，重连后分配状态仍然正确 | M   | 下沉 |

### 4.4 `input/__tests__/focus.browser.spec.ts`（5，全部 R + D5）

| 行  | it 标题                                                                          | 类  | 处置                                                                   |
| --- | -------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------- |
| 17  | 键盘聚焦 button 使用统一 focus ring                                              | R   | 改为焦点契约：Tab 后 `document.activeElement` 落在宿主；删样式断言     |
| 37  | 输入框 focus 使用 accent 内圈和 focus-ring halo                                  | R   | 改为 `focused` 属性反射 + 内部 input 取得焦点；删 box-shadow           |
| 59  | borderless 输入框隐藏玻璃描边、保留 padding 并在键盘聚焦时保留 focus ring        | R   | 改为 borderless 下键盘聚焦仍 `focused`；删 padding/::before/box-shadow |
| 84  | borderless 输入框鼠标/程序化聚焦同样显示 focus ring（不 gate 在 :focus-visible） | R   | 改为程序化 focus 也反射 `focused`；删 box-shadow                       |
| 101 | borderless 输入框移除 glass 描边环（.wui-glass::before）                         | D   | 纯视觉实现，整条删除                                                   |

同时删除文件内 `waitForInputFocusShadow()`（gCS 轮询桩）。

### 4.5 `input/__tests__/form-association.browser.spec.ts`（4）

| 行  | it 标题                                           | 类  | 处置                                                                                                      |
| --- | ------------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------- |
| 9   | 使用声明式 value 同步渲染与 FormData              | K   | 保留                                                                                                      |
| 21  | readonly 空值不阻塞提交（barred from validation） | K   | 保留                                                                                                      |
| 32  | disabled 空值不阻塞提交（barred from validation） | K   | 保留                                                                                                      |
| 44  | fieldset disabled 窗口内不上报约束 flags          | K   | 保留。原型改写是**观测桩**且在 `finally` 还原，非替换生产行为；同用例另有 `form.checkValidity()` 公开断言 |

### 4.6 `textarea/__tests__/textarea.spec.ts`（33 → 目的 15）

| 行  | it 标题                                                 | 类  | 处置                                     |
| --- | ------------------------------------------------------- | --- | ---------------------------------------- |
| 25  | value 默认空字符串                                      | M   | 下沉                                     |
| 31  | rows 默认 3                                             | K   | 保留（textarea 特有）                    |
| 39  | disabled 默认 false                                     | M   | 下沉                                     |
| 45  | formAssociated 已声明                                   | M   | 下沉                                     |
| 51  | disabled 属性反射                                       | M   | 下沉                                     |
| 59  | required 属性反射                                       | M   | 下沉                                     |
| 67  | readonly 属性反射                                       | M   | 下沉（并入「反射并同步到原生」）         |
| 75  | placeholder 属性反射                                    | M   | 下沉                                     |
| 82  | name 属性反射                                           | M   | 下沉                                     |
| 89  | rows 属性反射                                           | R   | 改 `contractReflection`（textarea 特有） |
| 96  | full 属性反射                                           | M   | 下沉                                     |
| 104 | borderless 属性反射                                     | M   | 下沉                                     |
| 113 | disabled 时点击容器不聚焦原生 textarea                  | R   | 保留，改结构/role 查询                   |
| 129 | 输入时触发 input 事件                                   | M   | 下沉                                     |
| 142 | 失焦时原生 change 事件转发为宿主 change                 | M   | 下沉                                     |
| 156 | 聚焦时触发 focus 事件                                   | M   | 下沉                                     |
| 168 | 失焦时触发 blur 事件                                    | M   | 下沉                                     |
| 180 | 设置属性时不派发 input 事件                             | M   | 下沉                                     |
| 194 | 设置 value 后原生 textarea 值同步                       | M   | 下沉                                     |
| 204 | 输入后组件 value 属性同步更新                           | M   | 下沉                                     |
| 219 | clearable 有值时触发 input 事件                         | R   | 保留，改 `contractEvent`                 |
| 234 | readonly 时不渲染清除按钮                               | K   | 保留                                     |
| 247 | focus() 聚焦原生 textarea                               | K   | 保留（公开方法）                         |
| 259 | blur() 移焦原生 textarea                                | K   | 保留                                     |
| 271 | select() 选中 textarea 内容                             | K   | 保留                                     |
| 285 | autosize 启用后同步高度                                 | D   | D4                                       |
| 297 | 运行时关闭 autosize 后移除内联高度                      | D   | D4                                       |
| 309 | max-height 属性反射并应用到 textarea 的 max-height 样式 | R   | 删内联样式行（D5）                       |
| 320 | max-height 默认 0 时不设置上限                          | R   | 删内联样式行（D5）                       |
| 332 | prefix 内容投影                                         | M   | 下沉                                     |
| 342 | suffix 内容投影                                         | M   | 下沉                                     |
| 354 | 将 aria-label 转发给原生 textarea                       | K   | 保留（a11y）                             |
| 363 | 将 aria-labelledby 转发给原生 textarea                  | K   | 保留（a11y）                             |

### 4.7 `textarea/__tests__/slot-presence.spec.ts`（4 → 文件删除，用例下沉）

同 4.3，逐条 M。

### 4.8 `textarea/__tests__/borderless.browser.spec.ts`（1）

| 行  | it 标题                                                   | 类  | 处置          |
| --- | --------------------------------------------------------- | --- | ------------- |
| 10  | borderless 移除 glass 描边环并在键盘聚焦时保留 focus ring | D   | D1 整文件删除 |

### 4.9 `input-number/__tests__/input-number.spec.ts`（29 → 目的 20）

| 行  | it 标题                                     | 类  | 处置                                     |
| --- | ------------------------------------------- | --- | ---------------------------------------- |
| 25  | value 默认 0                                | M   | 下沉                                     |
| 31  | disabled 默认 false                         | M   | 下沉                                     |
| 37  | precision 默认 0                            | K   | 保留（特有）                             |
| 43  | formAssociated 已声明                       | M   | 下沉                                     |
| 49  | disabled 属性反射                           | M   | 下沉                                     |
| 57  | placeholder 属性反射                        | M   | 下沉                                     |
| 64  | name 属性反射                               | M   | 下沉                                     |
| 71  | required 属性反射                           | M   | 下沉                                     |
| 79  | readonly 属性反射并同步到原生 input         | M   | 下沉                                     |
| 88  | precision 属性反射                          | R   | 改 `contractReflection`（特有）          |
| 96  | 点击增加按钮增大值                          | K   | 保留                                     |
| 109 | 点击减少按钮减小值                          | K   | 保留                                     |
| 122 | 点击增加按钮触发 input 事件                 | R   | 保留，改 `contractEvent`                 |
| 134 | disabled 时点击按钮不触发 input 事件        | K   | 保留                                     |
| 147 | readonly 时步进按钮禁用且点击不触发 input   | K   | 保留                                     |
| 163 | 设置属性时不派发 input 事件                 | M   | 下沉                                     |
| 177 | 到达 min 时减少按钮被禁用                   | K   | 保留                                     |
| 191 | 到达 max 时增加按钮被禁用                   | K   | 保留                                     |
| 205 | 超出范围时自动 clamp                        | K   | 保留                                     |
| 216 | 低于范围时自动 clamp                        | K   | 保留                                     |
| 229 | precision=1 保留一位小数                    | K   | 保留                                     |
| 239 | precision=2 保留两位小数                    | K   | 保留                                     |
| 249 | precision 变化后重算现有值                  | K   | 保留（注释已说明语义）                   |
| 263 | ArrowUp 增大值并派发 input 和 change        | K   | 保留                                     |
| 281 | ArrowDown 减小值并派发 input 和 change      | K   | 保留                                     |
| 299 | disabled 时键盘无响应                       | K   | 保留                                     |
| 315 | readonly 时键盘无响应                       | K   | 保留                                     |
| 333 | 文本失焦提交时原生 change 转发为宿主 change | R   | 保留，改 `contractEvent`（数值语义特有） |
| 350 | readonly 时原生 change 不转发               | M   | 下沉                                     |

### 4.10 `checkbox/__tests__/checkbox.spec.ts`（13 → 目的 6）

| 行  | it 标题                                                    | 类  | 处置                                                    |
| --- | ---------------------------------------------------------- | --- | ------------------------------------------------------- |
| 16  | checked 默认值为 false                                     | M   | 下沉至选择控件矩阵                                      |
| 23  | 设置 checked 不反射到 host                                 | M   | 下沉                                                    |
| 34  | 设置 checked 不触发 input/change 事件                      | M   | 下沉                                                    |
| 54  | disabled 属性反射到 host                                   | M   | 下沉                                                    |
| 63  | disabled 时点击不切换也不触发事件                          | M   | 下沉                                                    |
| 88  | value 可设置和获取                                         | M   | 下沉                                                    |
| 96  | name 可设置和获取                                          | M   | 下沉                                                    |
| 104 | required 属性反射到 host                                   | M   | 下沉                                                    |
| 114 | 点击切换后派发 input 和 change 事件，不派发 update:checked | R   | 保留（checkbox 特有：多次切换语义），改 `contractEvent` |
| 138 | 多次点击在 true/false 之间切换并触发事件                   | K   | 保留                                                    |
| 174 | 空格键切换 checked 并触发 input/change                     | M   | 下沉（键盘矩阵）                                        |
| 196 | Enter 键切换 checked                                       | M   | 下沉                                                    |
| 212 | 拥有 role="checkbox" 和正确的 aria-checked                 | M   | 下沉（a11y 矩阵）                                       |

删除死导入 `vi`。

### 4.11 `radio/__tests__/radio.spec.ts`（13 → 目的 6）

| 行  | it 标题                                                    | 类  | 处置                         |
| --- | ---------------------------------------------------------- | --- | ---------------------------- |
| 16  | checked 默认值为 false                                     | M   | 下沉                         |
| 23  | 设置 checked 不反射到 host                                 | M   | 下沉                         |
| 34  | 设置 checked 不触发 input/change 事件                      | M   | 下沉                         |
| 54  | disabled 属性反射到 host                                   | M   | 下沉                         |
| 63  | disabled 时点击不触发事件                                  | M   | 下沉                         |
| 88  | value 可设置和获取                                         | M   | 下沉                         |
| 96  | name 可设置和获取                                          | M   | 下沉                         |
| 104 | required 属性反射到 host                                   | M   | 下沉                         |
| 114 | 点击选中后派发 input 和 change 事件，不派发 update:checked | R   | 保留，改 `contractEvent`     |
| 139 | 已选中时点击不再触发事件                                   | K   | 保留（radio 特有：不可取消） |
| 164 | 空格键选中并触发 input/change                              | M   | 下沉                         |
| 186 | Enter 键选中                                               | M   | 下沉                         |
| 202 | 拥有 role="radio" 和正确的 aria-checked                    | M   | 下沉                         |

删除死导入 `vi`。

### 4.12 `switch/__tests__/switch.spec.ts`（11 → 目的 6）

| 行  | it 标题                                  | 类  | 处置                     |
| --- | ---------------------------------------- | --- | ------------------------ |
| 16  | checked 默认值为 false                   | M   | 下沉                     |
| 23  | checked 设置和读取，不反射到 host        | M   | 下沉                     |
| 34  | 设置 checked 不触发 input/change 事件    | M   | 下沉                     |
| 54  | disabled 属性反射到 host                 | M   | 下沉                     |
| 63  | disabled 时点击不触发 input/change       | M   | 下沉                     |
| 88  | loading 时点击不切换状态                 | K   | 保留（switch 特有）      |
| 105 | 可以设置 name                            | M   | 下沉                     |
| 113 | 可以设置 value                           | M   | 下沉                     |
| 123 | 点击切换后派发 input 和 change 事件      | R   | 保留，改 `contractEvent` |
| 144 | 多次点击多次触发 input/change            | K   | 保留                     |
| 176 | 拥有 role="switch" 和正确的 aria-checked | M   | 下沉                     |

删除死导入 `vi`。

### 4.13 `switch/__tests__/switch-gesture.browser.spec.ts`（10 → 目的 4）

| 行  | it 标题                                                                               | 类  | 处置                                                                                            |
| --- | ------------------------------------------------------------------------------------- | --- | ----------------------------------------------------------------------------------------------- |
| 19  | 拖拽超过 50% 行程松手：切换状态并触发 input 与 change 事件                            | R   | 保留契约（`checked`+事件各 1 次），私有 class 定位改 `[role="switch"]`，删 classList 断言（D5） |
| 74  | 已开启状态反向拖拽不足 50% 行程且无 flick 松手：回弹保持开启状态，不触发 input/change | R   | 同上                                                                                            |
| 131 | flick 抛掷速度触发：拖拽位移较小但速度快时触发切换                                    | R   | 同上                                                                                            |
| 181 | 快速点击依然正常即时切换                                                              | D   | 与 `switch.spec.ts:123` 同断言重复（正常路径已在 jsdom 覆盖）                                   |
| 199 | disabled 状态下禁止拖拽切换                                                           | R   | 同上                                                                                            |
| 238 | 指针按住未拖拽时呈现 is-pressed 按压挤压反馈                                          | D   | D3                                                                                              |
| 273 | 跨越 50% 拖拽过程中 thumb 持续平滑跟手，不发生瞬跳                                    | D   | D3                                                                                              |
| 310 | 拖拽中光标从 default 切换为 grabbing                                                  | D   | D3                                                                                              |
| 342 | 移动端轨道禁止浏览器手势接管，横向拖拽交给组件手势处理                                | D   | D3                                                                                              |
| 349 | 静止态实体白 thumb，按压/拖拽切换为玻璃…                                              | D   | D3                                                                                              |

`getTrack()` 由 `.wui-switch-track` 改为 `queryA11y(el, '[role="switch"]')`。

### 4.14 `slider/__tests__/slider.spec.ts`（18 → 目的 17）

| 行  | it 标题                                                   | 类  | 处置                                                                                                          |
| --- | --------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------- |
| 16  | 提供默认值并反射数值属性                                  | R   | 改 `contractReflection`（value/min/max/step）                                                                 |
| 33  | 超出 min/max 范围的 value 被规整到边界                    | K   | 保留                                                                                                          |
| 46  | disabled 反射到宿主并更新可访问状态                       | K   | 保留（反射 + `aria-disabled`）                                                                                |
| 58  | vertical 反射到宿主并更新方向语义                         | K   | 保留（反射 + `aria-orientation`）                                                                             |
| 70  | 不再提供 glass 属性                                       | K   | 保留（API 移除回归守卫）                                                                                      |
| 78  | name 属性反射到宿主                                       | R   | 并入反射表                                                                                                    |
| 90  | 点击轨道更新 value 并触发 input                           | K   | 保留。`vi.spyOn(slider,'getBoundingClientRect')` 是**给 jsdom 定值盒模型**，非读实现；断言落在公开 `el.value` |
| 105 | 结束拖拽触发 change                                       | K   | 保留                                                                                                          |
| 120 | 纵向点击按从下到上的方向更新 value                        | K   | 保留                                                                                                          |
| 134 | 未改变数值的点击不触发 input 或 change                    | K   | 保留                                                                                                          |
| 152 | 禁用时不响应指针事件                                      | K   | 保留                                                                                                          |
| 169 | 箭头键按 step 调整并触发 input 和 change                  | K   | 保留                                                                                                          |
| 187 | Home 和 End 跳至范围边界                                  | K   | 保留                                                                                                          |
| 204 | 纵向模式下 ArrowUp 增加 value                             | K   | 保留                                                                                                          |
| 219 | ArrowLeft 和 ArrowDown 按 step 减小                       | K   | 保留                                                                                                          |
| 235 | PageUp 和 PageDown 按 pageStep（step×10）调整并收敛到边界 | K   | 保留                                                                                                          |
| 253 | step 为 0 或负数时回退到 1 作为安全步长                   | K   | 保留                                                                                                          |
| 268 | focus() 和 blur() 存在且可调用                            | R   | 改为调用后断言生效（现存断言 `typeof === 'function'` 过弱，等价于类型检查）                                   |

### 4.15 `slider/__tests__/slider.browser.spec.ts`（12 → 目的 4）

| 行  | it 标题                                                                  | 类  | 处置                                                                                                             |
| --- | ------------------------------------------------------------------------ | --- | ---------------------------------------------------------------------------------------------------------------- |
| 11  | 真实指针拖拽更新 value 并触发 change                                     | R   | 保留契约（拖拽前后 value 单调跨 50%、`change` 恰 1 次），删 class/cursor（D5）                                   |
| 73  | 按住未移动时呈现按压反馈且不进入拖拽状态                                 | D   | D2                                                                                                               |
| 98  | 移动未超过意图阈值时不进入拖拽状态                                       | D   | D2                                                                                                               |
| 144 | pointerup 后继续移动不再更新 value                                       | K   | 保留（纯契约）                                                                                                   |
| 188 | 指针交互后获得键盘焦点且响应键盘方向键                                   | R   | 标题与断言不符（未断言聚焦）：改标题为「指针交互后可继续用方向键调整 value」，或补 `document.activeElement` 断言 |
| 227 | 禁用时不响应指针拖拽                                                     | D   | 与 `slider.spec.ts:152` 重复                                                                                     |
| 248 | 移动端水平轨道禁止浏览器手势接管…                                        | D   | D2                                                                                                               |
| 257 | 移动端垂直轨道禁止浏览器手势接管…                                        | D   | D2                                                                                                               |
| 267 | host 同时声明 touch-action: none…                                        | D   | D2                                                                                                               |
| 275 | 拖拽期间 touchmove 默认滚动被阻止，松手后解除                            | R   | 保留契约（`defaultPrevented` 三态），`thumb` 私有定位改语义查询                                                  |
| 337 | 捕获转手：命中元素的 lostpointercapture 不取消拖拽，track 自身丢失才取消 | R   | 保留契约（经 `el.value` 观察：取消后不再跟随），删 classList（D5）                                               |
| 407 | 静止态实体白 thumb，按压切玻璃背景…                                      | D   | D2                                                                                                               |

### 4.16 `shared/form-association/__tests__/form-association.spec.ts`（3）

| 行  | it 标题                                   | 类  | 处置 |
| --- | ----------------------------------------- | --- | ---- |
| 14  | 声明式 value 属性作为初始默认值           | K   | 保留 |
| 25  | restoreState 应用外部恢复的状态           | K   | 保留 |
| 37  | formDisabledCallback 禁用后控件反映禁用态 | K   | 保留 |

### 4.17 `shared/form-association/__tests__/form-association.browser.spec.ts`（13）

| 行  | it 标题                                                        | 类  | 处置                                                                              |
| --- | -------------------------------------------------------------- | --- | --------------------------------------------------------------------------------- |
| 37  | 仅在提供 name 时提交文本和数值                                 | R   | 扩 `cases` 数组（现 3 项）纳入 select/slider/segmented/autocomplete 等，见 §6 A11 |
| 62  | 仅在选中时提交可勾选控件值，并恢复声明初始状态                 | K   | 保留（已覆盖 3 个选择控件）                                                       |
| 107 | 未提供 value 的已选控件使用原生 on 回退值                      | K   | 保留                                                                              |
| 116 | Checkbox Group 和 Radio Group 提交值时不产生子项重复条目       | K   | 保留                                                                              |
| 140 | fieldset 禁用变化不改写 Group 的公开 disabled 属性             | K   | 保留                                                                              |
| 171 | 提交 Select、Slider 和 Segmented 的值                          | K   | 保留                                                                              |
| 194 | 通过原生表单生命周期将 Select 重置为初始值                     | K   | 保留                                                                              |
| 207 | 在首次连接后为全部表单控件保留声明式默认值                     | K   | 保留（已覆盖 12 控件）                                                            |
| 296 | 通过表单状态恢复回调恢复全部控件的序列化状态                   | K   | 保留（已覆盖 12 控件）                                                            |
| 339 | 重连不重复 attachInternals，也不覆盖首次连接后的当前值或默认值 | K   | 保留                                                                              |
| 359 | 由 Group 管理的 checkbox 和 radio 忽略独立状态恢复             | K   | 保留                                                                              |
| 378 | 不提交未提供 name 的控件                                       | K   | 保留                                                                              |
| 385 | 离开 Checkbox Group 的子项恢复自身表单提交                     | R   | `group.shadowRoot!.querySelector('slot')` 改 `queryA11y(group,'slot')`            |

本文件**无 §5 违规**，以 KEEP 为主。

### 4.18 `shared/normalize/__tests__/normalize.spec.ts`（8）

| 行  | it 标题                                            | 类  | 处置 |
| --- | -------------------------------------------------- | --- | ---- |
| 8   | 接受集合内的合法值                                 | K   | 保留 |
| 13  | 非法字符串回退默认值                               | K   | 保留 |
| 18  | 非字符串输入（数字/对象/null/undefined）回退默认值 | K   | 保留 |
| 25  | 大小写敏感：不匹配的拼写回退默认值                 | K   | 保留 |
| 31  | 范围内数值原样返回                                 | K   | 保留 |
| 37  | 越界数值收敛到边界                                 | K   | 保留 |
| 42  | NaN / Infinity / 非数值回退默认值                  | K   | 保留 |
| 50  | min 大于 max 时以 clamp 顺序为准（先 max 后 min）  | K   | 保留 |

`normalize` 是纯函数模块（非组件），ADR-0005 §5 的 CSS/像素禁令不适用；全部 KEEP，本批仅纳入复核范围。

## 5. MERGE / 下沉设计（不需单独审批）

新建 3 个共享矩阵 spec，全部位于 `src/shared/form-association/__tests__/`（方案 §4 规定：不改 `vite.config.ts` / `tsconfig.vitest.json`，靠后缀自动落入现有项目路由）：

| 新文件                            | 覆盖                            | 说明                                                                           |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `text-control-contract.spec.ts`   | input / textarea / input-number | `contractReflection` 表 + `contractEvent` 事件矩阵 + 默认值 + `formAssociated` |
| `choice-control-contract.spec.ts` | checkbox / radio / switch       | 同上 + `role`/`aria-checked` + 键盘矩阵                                        |
| `named-slot-presence.spec.ts`     | input / textarea                | 取代两份同构的 `slot-presence.spec.ts`；复用共享 `flush` / `mountElement`      |

下沉后各组件 spec 只保留**组件特有**契约（见 §4 各表「保留」列）。

**能力表用显式数据声明，不使用条件分支**（避免参数化测试变「条件汤」）。已按源码核实的差异：

| 差异点               | input            | textarea         | input-number         | checkbox   | radio   | switch                        |
| -------------------- | ---------------- | ---------------- | -------------------- | ---------- | ------- | ----------------------------- |
| 原生元素             | `input`          | `textarea`       | `input[type=number]` | 无         | 无      | `input.sr-only`               |
| `value` 默认         | `''`             | `''`             | `0`                  | `''`       | `''`    | `''`                          |
| `value` 反射         | 否               | 否               | 否                   | 否         | 否      | 否                            |
| `readonly` 反射      | 是（含同步原生） | 是（含同步原生） | 是（含同步原生）     | —          | —       | —                             |
| `required`           | 是               | 是               | 是                   | 是         | 是      | **是**（原 spec 未覆盖 → A5） |
| `clearable`          | 是               | 是               | —                    | —          | —       | —                             |
| `prefix/suffix` slot | 是               | 是               | —                    | —          | —       | —                             |
| 默认 slot            | —                | —                | —                    | 是         | 是      | —                             |
| `role`               | —                | —                | —                    | `checkbox` | `radio` | `switch`                      |
| 键盘 Enter           | —                | —                | —                    | 是         | 是      | 未覆盖（归手势 spec）         |

**关键源码事实（决定矩阵断言）**：七个组件的事件**全部是 `new Event(...)`，`detail` 恒为 `undefined`**；因此 `contractEvent` **不建模 `detail` 形状**（方案 §6.2 中的 `detail?: (v) => unknown` 字段对本批无用，不实现）。

## 6. 新增缺失契约（A 组）

| #   | 组件                            | 新增契约                                                                                                                                              | 类型     |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| A1  | switch                          | `required` 属性反射（源码 `index.ts:37` 已 `reflect: true`，**当前零覆盖**）                                                                          | 反射     |
| A2  | switch                          | `loading` 属性反射（源码 `reflect: true`，当前仅测行为未测反射）                                                                                      | 反射     |
| A3  | choice 家族                     | `value` / `name` **不反射**到 attribute（当前只测了 `checked` 不反射）                                                                                | 反射     |
| A4  | input / textarea / input-number | `full` / `borderless` 在**三者的默认值均为 false**（下沉时一并补）                                                                                    | 默认值   |
| A5  | input-number                    | 步进按钮点击**只派发 `input`、不派发 `change`**（源码 `setValueAndNotify` 无 change；当前无断言）                                                     | 事件     |
| A6  | textarea                        | `autosize` 属性反射到宿主（替代被删的 spy 用例，保留「该属性是公开开关」这一契约）                                                                    | 反射     |
| A7  | input / textarea / input-number | 用户输入时**同时**派发 `input` 且不派发 `change`（change 只来自原生 change 转发）                                                                     | 事件     |
| A8  | input / textarea                | `readonly` 时清空按钮不渲染 + `clearable` 无值时不渲染（现仅测 readonly 分支）                                                                        | 条件渲染 |
| A9  | choice 家族                     | `disabled` 时 `aria-disabled` 置位（现仅测 switch 无；checkbox/radio 源码 `:113`/`:112` 有 `aria-disabled`）                                          | a11y     |
| A10 | slider                          | 指针拖拽期间 `input` 可多次派发但 `change` 只在结束时派发一次（关系型：`inputCount >= 1 && changeCount === 1`）                                       | 事件     |
| A11 | shared                          | `form-association.browser.spec.ts` 的 `cases` 数组由 3 项扩展到全部 formAssociated 控件（含 select / slider / segmented / autocomplete / 两个 group） | FormData |

## 7. helper 变更

**不新增 void 返回的断言 helper。** 原因（Batch 1 已实测）：仓库启用 `vitest/expect-expect`，且 oxlint 不支持 `assertFunctionNames`；该规则只认测试体内字面出现的 `expect(...)`，因此形如 `expectReflected(el,…)` 的封装**不能**满足门禁（Batch 1 的 P2 修复正因此把断言展开）。可行机制只有**生成 `it` 块**的 runner（如既有 `contractReflection`，其生成的块内含字面 `expect`）。

因此本批只在既有 `src/shared/test-utils/index.ts` 增补一个生成式 runner：

| 导出            | 签名                                                                                                                                                                                | 依据                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `contractEvent` | `<T extends TestableElement>(title: string, create: () => T, cases: ReadonlyArray<{ title: string; act: (el: T) => void \| Promise<void>; counts: Record<string, number> }>): void` | 覆盖 form 家族 6 处「编程式设值不派发事件」与 5 处「用户交互派发 input+change 各一次」，生成块内含字面 `expect` |

其余复用既有导出：`contractReflection`（7 个反射矩阵）、`mountElement`、`flush`、`flushSlotChange`、`setProperty`、`queryA11y`、`spyEvents`、`cleanupElement`。**不新增 `expectRole` / `expectAccessibleName` / `expectSizeMonotonic`**（无实测重复支撑，且属性查询已由 `queryA11y` 覆盖）。

## 8. CSS / 像素断言的归属（不在契约 spec）

| 被移除的视觉细节                                                                                               | 归属                                                                            |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| focus ring 的 `--wui-focus-ring-width` / outline / halo box-shadow / `::after` 过渡（input、textarea、button） | `docs/agents/browser-verification.md` 真实浏览器验证 + 真机验收（Batch 5 载体） |
| textarea borderless 的 `::before` 描边盒、padding、背景透明                                                    | 同上                                                                            |
| switch / slider thumb 的玻璃质感（`backdrop-filter`、背景色、box-shadow、放大比）                              | 同上                                                                            |
| switch / slider 的 `cursor` 与 `touch-action`                                                                  | 同上                                                                            |
| slider 拖拽期间的内部态 class（`is-pressed` / `is-dragging` / `is-open`）                                      | 属实现细节，不迁入任何层                                                        |
| textarea autosize 的高度计算（依赖真实布局，jsdom `scrollHeight` 恒 0）                                        | 真实浏览器验证                                                                  |

**本批不引入任何视觉基线快照**，`screenshotFailures` 保持 `true` 不变。

## 9. 实施结果（实施后回填）

### 9.1 改动面

base = `4db0d1c9`（Batch 1 提交）。共触及 **19 个文件**：12 个 spec 改写、3 个 spec 整文件删除、4 个 spec 新增、另加 `src/shared/test-utils/index.ts`（+57 行，仅新增 `contractEvent`）。

| 类型             | 文件                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 新增             | `shared/form-association/__tests__/text-control-contract.spec.ts`、`choice-control-contract.spec.ts`、`named-slot-presence.spec.ts`、`switch/__tests__/switch-keyboard.browser.spec.ts`                                                                                                                                                                            |
| 删除（D1/D2 类） | `input/__tests__/slot-presence.spec.ts`、`textarea/__tests__/slot-presence.spec.ts`、`textarea/__tests__/borderless.browser.spec.ts`                                                                                                                                                                                                                               |
| 改写             | `input/input.spec.ts`、`input-number/input-number.spec.ts`、`input/focus.browser.spec.ts`、`textarea/textarea.spec.ts`、`checkbox/checkbox.spec.ts`、`radio/radio.spec.ts`、`switch/switch.spec.ts`、`switch/switch-gesture.browser.spec.ts`、`slider/slider.spec.ts`、`slider/slider.browser.spec.ts`、`shared/form-association/form-association.browser.spec.ts` |

`switch-keyboard.browser.spec.ts` 是**独立审查（§9.5）发现的覆盖缺口**的补丁，不在原 §6 ADD 清单内：见 §9.4 第 3 条。

`git diff HEAD --stat`：`15 files changed, 656 insertions(+), 2436 deletions(-)`（不含 4 个未跟踪新增文件）。

### 9.2 用例数对账（逐文件核过，合计闭合）

| 项                                   | 用例数                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| 基线（Batch 1 结束后全量）           | 1317                                                                           |
| − 3 个整文件删除                     | −9（input slot-presence 4 / textarea slot-presence 4 / textarea borderless 1） |
| − 11 个 spec 精简（184 → 91）        | −93                                                                            |
| + 3 个新增矩阵                       | +99（text 58 / choice 33 / named-slot 8）                                      |
| + switch 键盘浏览器 spec（审查补丁） | +4                                                                             |
| **本批结束全量**                     | **1318**（净 +1）                                                              |

文件数 112 → **113**（−3 删除 +4 新增）。11 个精简 spec 的前后对照：

| spec                     | 前  | 后  | spec                   | 前  | 后  |
| ------------------------ | --- | --- | ---------------------- | --- | --- |
| checkbox                 | 13  | 2   | switch                 | 11  | 2   |
| radio                    | 13  | 2   | switch-gesture.browser | 10  | 4   |
| input                    | 27  | 6   | slider                 | 18  | 23  |
| input-number             | 29  | 19  | slider.browser         | 12  | 5   |
| textarea                 | 33  | 10  | focus.browser          | 5   | 5   |
| form-association.browser | 13  | 13  |                        |     |     |

`slider.spec.ts` 是唯一用例净增的文件：新增 `contractReflection` 反射矩阵（value/min/max/step/name 5 例），并保留组件特有的步长/键盘/range 行为用例，替代原先散落的 `typeof el.focus === 'function'` 一类存在性断言。

#### 关于「§0/§1 的 209 用例」与「§9.2 的 184」的口径差（预答复疑）

二者不矛盾，是**清单范围 vs 实施范围**的差：§0/§1 的 209 是**清单内 18 个文件**在基线的 `it(` 合计（含 `input.jsdom.spec` 1、`input/form-association.browser` 4、`form-association.spec` 3、`normalize.spec` 8 等**最终未改动**的 7 个文件，计 16 例）；§9.2 的 184 是**实际改动的 11 个文件**的基线合计。校验：`209 − 16（未改动文件）− 9（删除文件） = 184` ✓。

#### 关于 §4「改后目的」数与实测的差

§4 各文件的「改后目的」是选址预估（如 checkbox 估 6、textarea 估 15、input 估 12），实测更低（2 / 10 / 6）。原因是同构用例**全部**下沉进了 3 个矩阵 spec，组件 spec 只留组件特有契约。覆盖未丢，仅预估偏高。

### 9.3 门禁结果

| 门禁                                         | 结果                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @greypan/web-ui test`（全量） | **113 文件 / 1318 用例 → 1317 passed, 1 failed**                                                                      |
| 唯一失败                                     | `overlay-in-dialog.browser.spec.ts > context-menu 子菜单同帧关闭重开后以最新定位落位`，**与基线同一用例，非本批引入** |
| `vp check`                                   | **0 errors / 0 warnings / 0 format issues**（734 文件格式正确，496 文件 lint+type 通过）                              |
| `pnpm run check:cspell`                      | **597 文件，0 issues**                                                                                                |

### 9.4 实施中修正的三处问题（记录以备后续批次）

1. **`document.activeElement` 在 shadow DOM 中重定位到宿主。** `slider.spec.ts` 的 `focus()` 用例最初断言 `document.activeElement === queryA11y(el,'[role="slider"]')`，实测失败：标准行为是宿主成为文档级活动元素。已改为双断言——`el.shadowRoot!.activeElement` 指向 `[role="slider"]`（组件内焦点）＋ `document.activeElement === el`（宿主重定位）。
2. **`vitest/no-conditional-tests` 不容忍测试注册作用域内的 `if`。** `choice-control-contract.spec.ts` 起初用 `if (spec.keyboard) { it(...) }` 注册能力差异用例，`vp check` 报 3 条 warning。已改为「按能力 `.filter()` 出的循环列表」注册（`for (const spec of CONTROLS.filter(c => c.ariaDisabled))`）——实测该规则**不拦循环，只拦 `if`/三元/逻辑表达式**，既有 spec 里 131 处 `if (` 无告警也正是因为它们都在模块级 helper 内。这条约束对 Batch 3–5 同样适用。
3. **【独立审查 blocking finding，已修】switch 的键盘（空格键）契约原本零覆盖。** 本批把 switch 在矩阵里标为 `keyboard: false`，注释称「switch 的键盘路径归手势 browser spec」——该注释**是错的**：`switch-gesture.browser.spec.ts` 只覆盖指针手势。而 `switch/index.ts` 在 `<label role="switch">` 内渲染了一个 `class="sr-only"` 的原生 `<input type="checkbox">`（`switch/style.css` 用 `clip-path` 而非 `display:none`，**保留可聚焦性**，源码注释明确「允许键盘用户通过空格键切换状态」）；聚焦该 input 后按空格 → 浏览器原生激活 → `click` 冒泡到 label → `handleClick` 切换并派发 `input`/`change`。这是真实公开的无障碍契约，且**基线也从未覆盖**（`switch.spec.ts` 与 `switch-gesture.browser.spec.ts` 在 `4db0d1c9` 各有 0 处 `keydown`）。
   修法：新增 `switch/__tests__/switch-keyboard.browser.spec.ts`（4 例：Tab 可达、空格切换派发 input/change 各一次、两次空格切回、disabled 时空格无效）。**必须放在 browser project**——jsdom 不合成原生激活行为，合成 `keydown` 也命中不了任何处理器。已实测 4 例全绿，实证该契约成立。同时修正矩阵内的误导性注释。

### 9.5 独立审查结论

**Reviewer**：`independent-reviewer`（`reviewer !== owner`，独立 subagent，只读审查）

| 轮次    | 结论     | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 第 1 轮 | **fail** | 1 条 blocking：`choice-control-contract.spec.ts` 把 switch 的键盘契约错误跳过，导致「空格键切换 switch」零覆盖（见 §9.4 第 3 条）。另有 3 条 non-blocking：§0/§1 的 209 与 §9.2 的 184 口径差（§9.2 已补说明）、`contractEvent` 在 `counts` 为空时会生成无断言用例的潜在缺陷（当前无此用例）、`ariaDisabled: false` 标记经源码核实**正确**。§5 合规性：对全部新增行检索 `classList`/`getComputedStyle`/`boxShadow`/`::before`/`::after`/`.style.`/`touchAction`/`padding`/`cursor`/`backdrop`/`classMap`/`.contains(` 等禁用模式 —— **零命中**。 |
| 第 2 轮 | **pass** | 补齐 switch 键盘 spec 后复验（见下）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**遗留 non-blocking 项（不阻断本批，转 Batch 3–5 关注）**：`contractEvent` 未对空 `counts` 设护栏，若后续批次写出 `counts: {}` 的用例，会生成一条「无断言」用例而门禁 `vitest/expect-expect` 恰好也不会拦（生成块内存在 `expect` 语句，只是循环体不执行）。

### 9.6 任务状态机流转（`scripts/agent-workflow.mjs`）

| 阶段                 | 证据                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `editing` → `frozen` | diffHash `2b67d6bb…`（19 文件入快照；首次冻结为 `aab8263a…`，因审查 finding 修复后重冻）                                                                                                   |
| `reviewed`           | 第 1 轮 `fail`（reviewer `independent-reviewer`）→ 修复 → 第 2 轮 `pass`（reviewer `agent-cb739f41`），绑定 `diffHash 2b67d6bb…`                                                           |
| `approved`           | approver `bopan`，`diffHash` 与 review 一致                                                                                                                                                |
| 提交                 | `2e0fbcec`（`test(packages): refactor form-association web-ui specs toward contract tests (batch 2)`，19 files changed, +1205 / −2436；pre-commit 的 `vp staged` + `guard-commit` 均通过） |
| `verified`           | task 范围 pass：`113 文件 / 1318 用例 → 1317 passed / 1 failed(既有)`，headSha `2e0fbcec`                                                                                                  |
| `closed`             | `live.clean` + `current.hash === lastVerification.diffHash`                                                                                                                                |

工作区收尾：`git status --porcelain` 空；分支 `web-ui-contract-tests` 领先基线 2 个提交（`4db0d1c9` → `2e0fbcec`）。
