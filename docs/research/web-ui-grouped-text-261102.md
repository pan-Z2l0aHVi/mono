<!-- corpus-status: reference -->

# 「组块」显示组件（长数字分组）调研：复制不受影响的可行边界

> 状态：非权威参考（时点性研究）。结论以现行 ADR、源码与测试为准。
> 文中行号、实测数值与「当前实现」类描述均为写作时点，不随实现同步；现行权威见所引 ADR、源码与测试。

调研日期 2026-11-02/03，worktree `web-ui-new-comp`（base `425a9508`）。本轮只调研，**不实施组件**（交付口径见需求）。
实测引擎：Chromium 156.0.8078.4（Playwright 1.64.1 `chrome-headless-shell`，headless）与 WebKit / Safari 27.2 内核
（Playwright WebKit build 2370，headless）。探针脚本跑完即删，未入库；复现要点见 §8。

---

## 结论

| 问题                                           | 结论                                                                                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 分组后「选择并复制得到原始连续串」能不能做到？ | **能**，但只有一条路：**分隔必须是布局，不是字符**。DOM 文本保持原串，视觉间隙用外边距或字距撑开。实测剪贴板逐码点干净。                                   |
| 用空格 / 窄空格 / 零宽字符当分隔行不行？       | **不行**。四种分隔码点全部原样进剪贴板（实测 U+0020、U+2009、U+202F、U+200B），并且打断双击选词与页内查找。                                                |
| 能不能挂 `copy` 事件把选区改写成原串？         | **不能当默认行为**。实测它会把用户只选中最后一组的部分复制也换成整串——这是越权改写。                                                                       |
| 组块要不要用 `display:inline-block`？          | **不要**。Chromium 下它让 `window.find` 对连续数字串直接失配（WebKit 却命中），是唯一破坏页内查找的分组形状。                                              |
| 选区高亮会不会在组间断开？                     | **取决于间隙归谁**：`margin` / `padding` / 空盒撑出的间隙必断（洞宽 == 间隙宽）；把间隙做成每组末位字符的 `letter-spacing`，实测 2–12px 都不留洞（§3.5）。 |
| 代价是什么？                                   | 免掉高亮洞的代价是多一层 DOM：每组末位要单独成盒（4 组只需 3 个额外 `span`）。`margin` 方案则不必拆分字符，但要接受分段高亮。                              |
| 要不要加组件？                                 | 建议加，但它是**薄组件**：切分与间隙都在渲染层，公共契约只有「值 + 分组形状」。API 形状与待决问题见 §6。                                                   |

一句话：**组块是显示层的事，一旦分隔符进入文本节点，复制、查找、双击三件事同时坏掉。**

---

## 1. 判据

「选择文本并复制不受影响」不是一句感觉，拆成四条可测判据（后文每个形状都按这四条打分）：

- **P1 全量复制**：拖选整块 → 剪贴板逐码点等于原始连续串，不含任何分隔码点、换行或制表符。
- **P2 部分复制**：只拖某一个组 → 剪贴板恰好是那一段，既不少字符也不被扩写成整串。
- **P3 页内查找**：`window.find(原始连续串)` 命中且命中范围落在该元素内（Chromium/WebKit 的 Ctrl+F 与 `window.find` 共用同一套 search backend，用它做代理）。
- **P4 双击选词**：双击数字任意位置选中整串（用户对「这是一整个号码」的心智模型），而不是只选中一组。

另加两项非判据但影响选型的观测：**选区高亮连续性**（像素级）与**窄容器换行行为**。

---

## 2. 实测设置

四类渲染形状（DOM 切分 / 字距切分 / 分隔字符 / SVG），全部只用 CSS 与 DOM 结构表达分组：

| 形状     | 写法                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| `mg*`    | 每组一个 `<span class="g">`，`.g{margin-inline:0.5/1/1.5/2/3px}`                                                 |
| `mend`   | 同上，但只在组间加：`.g + .g{margin-inline-start:6px}`（两端不留白）                                             |
| `pd3`    | `.g{padding-inline:3px}`                                                                                         |
| `ib`     | `.g{display:inline-block;margin-inline:3px}`                                                                     |
| `gapel`  | 组仍是普通行内盒，组间插一个空的 `inline-block` 6px 占位元素                                                     |
| `pseudo` | 组间间隙由 `.g:not(:last-child)::after{content:"";display:inline-block;width:6px}` 撑开                          |
| `char_*` | 单个文本节点，组间写进真字符：U+0020 / U+2009 / U+202F / U+200B                                                  |
| `ls*`    | 每组再拆成单字符盒，**只有每组末位**带 `letter-spacing:2/4/6/8/12px`（组内数字不加宽）                           |
| `lsb*`   | 同上但只把每组末位包成 `span`：`<span class="g">100<span class="b">0</span></span>`，间隙同样走 `letter-spacing` |
| `svg`    | `<svg><text textLength="320" lengthAdjust="spacing">` 承载整串                                                   |

取证方式（关键：不用 `Selection.toString()` 代替复制结果）：

- 真实鼠标 `move → down → move → up` 拖选，再按 `Meta+C`，然后读**系统剪贴板**
  （Chromium：`navigator.clipboard.readText()` + `clipboard-read` 权限；页面必须跑在 `http://127.0.0.1:<port>`，
  `about:blank` 不是安全上下文，读不到剪贴板）。
- 选区高亮用像素判据：`::selection{background:rgb(0,0,255);color:rgb(0,0,255)}` 后按元素矩形截屏，
  逐列统计「整列 ≥50% 像素是蓝底」的列，从而把**背景填充**与**字形抗锯齿**分开——第一版判据只要列里有一个蓝点就算刷到，
  把 2px 间隙误判成连续，结论反了。
- 间隙是否真的撑开了要看**内容跨度**（首组左缘 → 末组右缘）而不是组盒之间的距离：`letter-spacing` 与 `padding` 的间隙
  都长在组盒**内部**，组盒彼此的间距是 0，只测盒间距会把这两种形状误读成「没有间隙」。
- 每个形状用互不相同的卡号。第一版所有行共用同一个卡号，`window.find` 永远命中第一行，
  于是除首行外所有查找结论都是假的；改成一行一号后 `ib` 的失配才暴露出来。
- 换行：把同一棵树克隆进 `width:120px;white-space:normal` 的容器，按各组矩形的 `top` 归行。
- 本轮在探针里踩到三个自己造的坑，都会静默产出错结论，记下来当前置条件：
  **（a）**样式表由 `.<形状> <css>` 拼出，空 css 的形状（`none`、`char_*`）会留下**悬空选择器**，
  把下一条规则的选择器粘成一条永不命中的后代选择器（`.none .mg05{margin-inline:.5px}`）。
  后果是那条形状的样式根本没生效，读起来像「这个形状没有间隙」：`mg05` 与 `ls6` 都被这样吞过一次。
  现在按 `css` 非空过滤，**本文所有 Chromium 数字都出自过滤后的那一轮**。
  **（b）**选区为空时按 `Meta+C` 不改写剪贴板，读到的还是上一次的结果，于是「部分复制」会假报成整串。
  **（c）**合成拖选的命中测试不稳：`lsb4`（4px 间隙 + 只包末位）出现过整次拖选跨到后面几行，
  `fullClipboard` 里带出 `\n` 与别的卡号。这种行按「未测」丢弃，不当形状结论；
  同尺寸的逐字符 `ls4` 正常返回 `"6789"`，说明是拖选落点问题而不是形状问题。
  同一类噪声也让批量轮次里 `char_*` 的双击读成 `"\n"`，所以**§3.2 的双击列取自「一行一个探针页」的隔离轮次**
  （那种布局里 `char_*` 才有可读的双击结果），P1/P3 列则两批一致。

**轮次与可追性**：本文 §3.1 的形状表、§3.2 的剪贴板与查找列、§3.5 的全部读数出自修复前置条件 a 之后的那一轮
（`/tmp/wui-ls-c6.json`，Chromium；WebKit 为 `/tmp/wui-ls-w2.json`；DPR2 定点为 `/tmp/wui-ls-probe.json`）。
§3.3 的 `copy` 改写反例、§3.4 的 SVG 与 §3.2 的双击列出自更早的隔离探针轮次（`/tmp/wui-grouped-*.json`），
取证方式相同但本轮没有重跑；`mg05` 与 `ls6` 两格在早先轮次里因前置条件 a 失真，已按重测值更正。

---

## 3. 结果：四条判据

### 3.1 DOM 切分族（间隙是布局）

Chromium 156，卡号 `1002202123456789` 一类 16 位数字，4-4-4-4 分组：

| 形状     | P1 全量复制 | P2 部分复制 | P3 查找连续串 | P4 双击 | 高亮洞  | 120px 换行 |
| -------- | ----------- | ----------- | ------------- | ------- | ------- | ---------- |
| `none`   | ✅ 整串     | ✅ `6789`   | ✅            | ✅ 整串 | 无      | 1 行       |
| `mg05`   | ✅          | ✅          | ✅            | ✅      | 1px × 3 | 1 行       |
| `mg1`    | ✅          | ✅          | ✅            | ✅      | 2px × 3 | 1 行       |
| `mg15`   | ✅          | ✅          | ✅            | ✅      | 3px × 3 | 1 行       |
| `mg2`    | ✅          | ✅          | ✅            | ✅      | 4px × 3 | 1 行       |
| `mg3`    | ✅          | ✅          | ✅            | ✅      | 6px × 3 | 1 行       |
| `mend`   | ✅          | ✅          | ✅            | ✅      | 6px × 3 | 1 行       |
| `pd3`    | ✅          | ✅          | ✅            | ✅      | 6px × 3 | 1 行       |
| `gapel`  | ✅          | ✅          | ✅            | ✅      | 6px × 3 | **2 行**   |
| `pseudo` | ✅          | ✅          | ✅            | ✅      | 6px × 3 | **2 行**   |
| `ib`     | ✅          | ✅          | **❌ 失配**   | ✅      | 6px × 3 | **2 行**   |
| `ls2`    | ✅          | ✅          | ✅            | ✅      | **无**  | 1 行       |
| `ls4`    | ✅          | ✅          | ✅            | ✅      | **无**  | 1 行       |
| `ls6`    | ✅          | ✅          | ✅            | ✅      | **无**  | 1 行       |
| `ls8`    | ✅          | ✅          | ✅            | ✅      | **无**  | 1 行       |
| `ls12`   | ✅          | ✅          | ✅            | ✅      | **无**  | 1 行       |
| `lsb6`   | ✅          | ✅          | ✅            | ✅      | **无**  | 1 行       |

`ls*` 的间隙宽度分别取 2/4/6/8/12px，四条判据结果一致，只有高亮列与其他行不同（§3.5）。
`lsb6`（每组 4 个字符只把末位包成 `span`）与 `ls6` 同值：内容跨度 160.42 vs 160.5px、洞 0、P1–P4 全过，
所以省 DOM 的形状不改变结论；`lsb4` 那一行因拖选落点问题作废（§2 前置条件 c）。

要点：

- **P1/P2 在整个 DOM 切分族都成立**：剪贴板逐码点是 `0031 0030 0032 0032 …` 这 16 个 ASCII 数字，没有任何填充字符；
  只拖最后一组得到 `"6789"`，一个字符不多不少。这条硬需求用布局间隙是**满足**的。
- **P4 全部成立**：组边界不打断词，双击即选中整串。WebKit 同样成立（`mg*`/`ib`/`gapel`/`ls*` 双击都返回整串）。
- **`ib` 是唯一坏掉 P3 的形状**：Chromium 的 search backend 不把相邻 `inline-block` 里的文本连成一段可匹配文本，
  `window.find("1007202123456789")` 返回 `false`；同一份 HTML 在 WebKit 返回 `true`。
  也就是说这不是「规范如此」，是 Blink 的实现现状——组件库不能靠它，且它随引擎漂移。
- `gapel` 与 `pseudo` 的占位盒虽然也是 `inline-block`，但**不**破坏查找（它们是空盒，不承载文本），
  代价是引入断行机会。
- **`ls*` / `lsb*` 在 Chromium 与 WebKit 双引擎都过了 P3/P4 与不换行**：WebKit 侧另测一轮，
  `ls2`–`ls12` 与 `lsb4`/`lsb6` 的 `window.find` 全命中、双击全选中整串、120px 容器 1 行、`textContent` 等于原串；
  它的剪贴板与高亮像素本轮读不到（§7）。

### 3.2 分隔字符族（间隙是文本）

| 形状         | P1 全量复制                          | P3 查找连续串 | P4 双击     | 120px 换行   |
| ------------ | ------------------------------------ | ------------- | ----------- | ------------ |
| `char_space` | ❌ `"1009 2021 2345 6789"`（U+0020） | ❌            | ❌ 只到一组 | 2 行         |
| `char_thin`  | ❌ 带 U+2009                         | ❌            | 只到一组    | 2 行         |
| `char_nnbsp` | ❌ 带 U+202F                         | ❌            | ✅ 整串     | 1 行（溢出） |
| `char_zwsp`  | ❌ 带 U+200B                         | ✅（见下）    | ❌ 只到一组 | 2 行         |

剪贴板码点实测（Chromium，逐码点打印；每行卡号互不相同，前缀即形状序号）：

```text
none        0031 0030 0030 0030 0032 0030 0032 0031 0032 0033 0034 0035 0036 0037 0038 0039
mg1         0031 0030 0030 0032 0032 0030 0032 0031 0032 0033 0034 0035 0036 0037 0038 0039
char_space  0031 0030 0030 0039 0020 0032 0030 0032 0031 0020 0032 0033 0034 0035 0020 0036 0037 0038 0039
char_thin   0031 0030 0031 0030 2009 0032 0030 0032 0031 2009 0032 0033 0034 0035 2009 0036 0037 0038 0039
char_nnbsp  0031 0030 0031 0031 202F 0032 0030 0032 0031 202F 0032 0033 0034 0035 202F 0036 0037 0038 0039
char_zwsp   0031 0030 0031 0032 200B 0032 0030 0032 0031 200B 0032 0033 0034 0035 200B 0036 0037 0038 0039
```

`none` / `mg1` 是 16 个码点（与自己的原串逐码点相同），四个 `char_*` 都是 19 个——多出来的三个就是分隔符，
`0020` / `2009` / `202F` / `200B` 各自的位置正好在组界上。

- 想「用零宽字符骗过复制」是行不通的：`U+200B` 在两个引擎里都被搜索层忽略，所以 **P3 反而命中**
  （Chromium 与 WebKit 的 `window.find` 都返回 `true`，但返回的选中串本身带 `U+200B`），
  而复制照旧把它写进剪贴板。**查找能过 ≠ 复制干净**，两条判据互相独立。
- `U+202F` 是唯一保住 P4 的分隔字符（它不打断词），但它是 no-break：120px 容器里**不折行直接溢出**，
  窄栏布局更危险。
- 结论：**任何把分隔写进文本节点的做法都违反 P1**，包括「看起来是空白」的薄空格与零宽空格。

### 3.3 `copy` 事件整体改写：反例成立

在容器上挂 capture 阶段的 `copy` 监听，`preventDefault()` 后 `clipboardData.setData('text/plain', 原始串)`：

```json
{ "partialSelected": "7890", "clipboardAfterOverride": "6222021234567890", "brokePartialCopy": true }
```

用户明明只圈了最后一组，拿到的却是整张卡号。除了违反 P2，它还顺带劫持了「把号码片段贴进备注」这类正常操作，
并且对富文本复制（带 HTML 的选区）只能选择覆盖或放弃。所以它不能当默认行为；
**如果确实需要「一键复制完整号」，那是显式动作**（按钮直接 `navigator.clipboard.writeText(原串)`），不是拦截选区。

### 3.4 SVG 文本

Chromium 下 SVG `<text>` 可拖选、可复制（剪贴板 = 整串），`window.find` 也命中。
但用 `textLength` + `lengthAdjust="spacing"` 拉开组间距时，高亮按**每个字形**断开：
实测 15 个洞，宽度 11–12px，覆盖列 144 / 跨度 320。加上它不参与正常文本布局（换行、字体继承、缩放都不走 CSS 那条路），
只适合「静态展示且绝不选中」的场景，不适合组块组件的默认实现。

### 3.5 高亮会不会断：决定因素是间隙归谁，不是间隙多宽

Chromium 的行内选区按**文本片段矩形**填充。所以有没有洞，取决于这段空白**属不属于某个文本片段**：

| 间隙来自                                        | 空白归属                           | 组间视觉间隙         | 高亮洞（Chromium，DPR1） |
| ----------------------------------------------- | ---------------------------------- | -------------------- | ------------------------ |
| 无分组（`none`）                                | —                                  | 0                    | 无                       |
| `.g{margin-inline}`（`mg1`…`mg3`）              | 两个片段之间，谁都不属于           | 2 / 3 / 4 / 6px      | **等宽洞 ×3**            |
| `.g + .g{margin-inline-start}`（`mend`）        | 同上                               | 6px                  | 6px × 3                  |
| `.g{padding-inline}`（`pd3`）                   | 在组盒**内**，但不属于任何文本片段 | 6px                  | 6px × 3                  |
| 空盒 / `::after` 占位（`gapel`/`pseudo`）       | 独立空元素                         | 6px                  | 6px × 3                  |
| 每组末位字符的 `letter-spacing`（`ls2`…`ls12`） | **属于那个字符自己的片段**         | 2 / 4 / 6 / 8 / 12px | **无洞**                 |
| 只包末位成 `span` 的 `letter-spacing`（`lsb6`） | 同上                               | 6px                  | 无洞                     |

- **margin 族是线性的**：`margin-inline:1px` → 间隙 2px → 洞 2px；1.5px → 3px；2px → 4px；3px → 6px；
  `.5px` → 间隙 1px → 洞 **1px**。实测无一例外，**洞宽 == 间隙宽**，只要间隙不归零就有洞。
  （`.5px` 这一格在第一轮读成「无洞」，是 §2 前置条件 a 吞掉了它的 margin；过滤空规则后重测才是 1px 洞。）
- `padding` 与 `letter-spacing` 的组盒彼此的间距都是 0，间隙都长在盒内，但一个有洞一个没洞——
  所以**不能用组盒间距判断间隙是否存在**，要看内容跨度（`pd3` 166.38 / `ls6` 160.50 / `none` 142.38，单位 px）。
- `letter-spacing` 之所以不断：它是加在**这个字符之后**的字距，属于该字符的文本片段，选区填充这个片段时把字距一起刷了。
  这也是它只给每组末位加、组内数字不加宽就能得到 6px 间隙的原因（逐位 `Range` 实测：末位盒 14.91px，普通位 8.91px，差 6.0px）。
  规范侧对应的两句在 §4.2（字符之间的间距 _may_ 属于 overlay）与 §4.3（字距定义在相邻字符之间）。
- 高 DPI 另测一轮（`deviceScaleFactor:2`）：margin 6px 仍是 6 CSS px 洞 ×3，`letter-spacing` 6px 仍是连续 →
  结论不随 DPR 变。
- 代价写在下一节：`letter-spacing` 方案要在组末位多包一层元素（4 组 = 3 个额外 `span`），而 `margin` 方案不拆字符但要接受分段高亮。

也就是说：**「看得见分组」与「高亮连续」并不互斥**，但只有把间隙做成字符自己的字距才能两者兼得；
`margin` / `padding` / 空盒三类都消不掉洞，别在 CSS 上继续找组合。

### 3.6 等宽数字：不能假设各引擎默认等宽

同一串 `0123456789`，24px，`-apple-system`：

| 引擎     | `font-variant-numeric: normal` 逐位前进宽度              | `tabular-nums`                      |
| -------- | -------------------------------------------------------- | ----------------------------------- |
| Chromium | 全部 13.359px（默认即等宽）                              | 完全相同                            |
| WebKit   | `15,12,15,15,16,15,16,14,16,15.375`（`1` 比 `6` 窄 4px） | `15,16,16,15,16,16,15,16,16,14.875` |

Chromium 上看不出差别，WebKit 上不成组的数字会明显错位。残余的 ±1px 来自逐字符 `Range` 矩形的取整，
不是新的结论；**能下的结论是：组块组件应显式写 `font-variant-numeric: tabular-nums`**，
否则同一份页面在两个引擎上的分组对齐不一致。

---

## 4. 一手来源

以下措辞是从来源页面原文取出的（不是转述），后面每条都标出它在本报告里承担什么。

**4.1 复制序列化不在规范里，所以只能实测。**
Clipboard API §5.2.2 _The copy event_：<https://www.w3.org/TR/clipboard-apis/>

> "When the user initiates a copy action, the user agent fires a clipboard event named `copy`. If the event is not
> canceled, the currently selected data will be copied to the system clipboard. The current document selection is not
> affected."

规范只说「当前选中的数据会被复制」，**没有定义怎么序列化**（是否含换行、是否保留行内空白与字距、多片段如何拼接）。
所以 §3 的 P1/P2 全部走真实系统剪贴板取证，`Selection.toString()` 只作为对照列。

**4.2 高亮 overlay 归谁：规范只管「两个字符之间」的间距，且 `::selection` 拿不到布局属性。**
CSS Pseudo-Elements Level 4（`::selection` 定义与 highlight bounds）：<https://drafts.csswg.org/css-pseudo-4/>

> "The `::selection` pseudo-element represents the portion of a document that has been selected as the target or object
> of some possible future user-agent operation(s). […]"

> "Each box owns the piece of the overlay corresponding to any text or replaced content directly contained by the box.
> […] **Spacing between two characters may also be part of the overlay area**, in which case it belongs to the
> innermost element that contains both characters and is selected when both characters are selected."

> "The highlight pseudo-elements can only be styled by a limited set of properties that **do not affect layout** […]
> whose rendering within the required area is not dependent on the exact (UA-determined) bounds of the highlight overlay."

这三段是 §3.5 的直接依据，方向要说准：

- 规范把**两个字符之间**的间距列为「可以进 overlay」，但用词是 _may_，归属由实现决定 →
  Chromium 实测把 `letter-spacing` 的间距刷进了 overlay（连续），这是实现现状而不是强制要求；
- `margin` / 空盒撑出的空白**不是**「两个字符之间的间距」，它落在两个文本片段之外，规范没有把它纳入 overlay → 实测有洞；
- 「highlight 只能用不影响布局的属性」意味着**没法用 `::selection` 自己把洞补上**（`margin` / `padding` 不在可用集合里）。
  这就是 §3.5 说「别在 CSS 上找组合」的规范层理由。

**4.3 `letter-spacing` 的字距挂在字符身上，且「最后一个字符」的边界是实现议题。**
CSS Text Level 3 §7.2 _Tracking: the letter-spacing property_：<https://drafts.csswg.org/css-text-3/#letter-spacing>

> "This property specifies additional spacing (commonly called _tracking_) **between adjacent typographic character
> units**. Letter-spacing is applied after bidi reordering and is in addition to kerning and word-spacing. […] Depending
> on the justification rules in effect, user agents may further increase or decrease the space between typographic
> character units in order to justify text."

同页的编辑注（Draft 状态，原文照抄）：`Missing tests: * switch to applying letter-spacing on both sides of each letter
instead of between letters`，以及 `For legacy reasons, a computed letter-spacing of zero yields a resolved value
(getComputedStyle() return value) of normal`。含义有三条：

- 间隙属于**相邻字符之间**的字距，这解释了 §3.5 为什么它跟着文本片段一起被刷色；
- 「both sides 而不是 between」这句正在改模型，加上「justify 时 UA 可以再增减字距」，
  所以把间隙做成 `letter-spacing` 是**跟着规范走**的做法，但它对对齐方式（justify）不是零风险（§7）；
- 读 `getComputedStyle().letterSpacing` 得到 `normal` 不等于「属性被设成 0」，探针里用它判断样式是否生效是对的。

**4.4 分隔字符的换行行为由 UAX #14 决定，实测与之一一对应。**
Unicode `LineBreak.txt`（`https://www.unicode.org/Public/UCD/latest/ucd/LineBreak.txt`）逐行原文：

```text
0020..0020      ; SP   # Zs   SPACE
2008..200A      ; BA   # Zs   [3] PUNCTUATION SPACE..HAIR SPACE
202F..202F      ; GL   # Zs   NARROW NO-BREAK SPACE
200B..200B      ; ZW   # Cf   ZERO WIDTH SPACE
```

对照 §3.2 的 120px 换行列：`SP`/`BA`/`ZW` 三类都给断点（`char_space`/`char_thin`/`char_zwsp` 折成 2 行），
`202F` 是 `GL`（glue，禁止前面断行）→ 实测**不折行直接溢出**。也就是说窄空格不是「稍微窄一点的空格」，
它在排版上改变了断行可能性；用 `margin` 或 `letter-spacing` 则完全不含码点，自然不引入断点（`mg*`、`ls*` 实测均 1 行）。
UAX #14 对 `ZW` 还有一句与 §4.3 相干的提醒：`its presence between two characters does not prevent increased letter
spacing in justification`（<https://www.unicode.org/reports/tr14/>）——零宽字符不影响 justify 加宽，反过来说明
**justify 会动的正是字距那一层**，`letter-spacing` 方案要按 §7 单独测。

**4.5 双击选词的边界由 UAX #29 决定，实测逐条对得上。**
Unicode `WordBreakProperty-18.0.0.txt`（`https://www.unicode.org/Public/UCD/latest/ucd/auxiliary/WordBreakProperty.txt`）原文：

```text
0020          ; WSegSpace           # Zs       SPACE
2008..200A    ; WSegSpace           # Zs   [3] PUNCTUATION SPACE..HAIR SPACE
202F          ; ExtendNumLet        # Zs       NARROW NO-BREAK SPACE
```

U+200B 不在这份文件里（落进默认 `Other`）。把三类属性和 §3.2 的双击列并起来看：

| 码点   | UAX #29 属性 | 规范规则                                 | 实测双击      |
| ------ | ------------ | ---------------------------------------- | ------------- |
| U+0020 | WSegSpace    | 词边界（WSegSpace 是「按空格切词」的类） | ❌ 只选中一组 |
| U+2009 | WSegSpace    | 同上                                     | ❌ 只选中一组 |
| U+202F | ExtendNumLet | WB13a/WB13b：do not break from extenders | ✅ 选中整串   |
| U+200B | （Other）    | WB99：otherwise, break everywhere        | ❌ 只选中一组 |

> 更正：本节初稿写的是「四种空格都不在 WordBreak 属性里，引擎没有照 UAX #29 实现」。那是我把 `LineBreak.txt`
> 与 `WordBreakProperty.txt` 混读后的错判；按数据文件重核后，**Chromium 的双击行为与 UAX #29 逐条一致**
> （WebKit 本轮只核了 DOM 切分族的双击，`char_*` 四种分隔符在 WebKit 下的双击未测，见 §7）。
> 结论方向不变（字符分隔会打断选词），但依据从「只能实测」升级成「可预测，且实测已验证」。

CSS 侧相关的一句在 `text-transform: capitalize` 小节：
"what constitutes a 'word' is UA-dependent; [UAX29] is suggested (but not required)"，
以及 "Out-of-flow boxes and inline box boundaries must not introduce a text-transform word boundary"
（<https://drafts.csswg.org/css-text-3/#text-transform>）——它讲的是 capitalize，不是选词，
但至少表明「行内盒边界不算词边界」是 CSS 的取向，与 §3.1 里拆分 `span` 后 P4 全过一致。

**4.6 分组分隔符本身就是「文本内容」，这是金额与卡号必须分治的原因。**
本地实测（node 24.18.0，ICU 78.3，`Intl.NumberFormat`）：

| locale                        | 整数分组分隔符 | 备注                       |
| ----------------------------- | -------------- | -------------------------- |
| en-US / zh-CN / ja-JP         | U+002C `,`     | —                          |
| de-DE / pt-BR / tr-TR / id-ID | U+002E `.`     | 与小数点角色互换           |
| ru-RU / cs-CZ / fi-FI / pl-PL | U+00A0 NBSP    | 已是「看起来像空白」的码点 |
| fr-FR                         | U+202F NNbsp   | 正是 §3.2 里换行溢出的那个 |
| ar-EG                         | U+066C         | 阿拉伯语分组符号           |
| hi-IN                         | 2-2-3 分组     | 不是 3 位一组              |

同一轮还测到：把 32 位数字塞进 `Number` 会静默变成 `123 456 789 012 345 680 000 …`（末几位被浮点尾数改写），
`Number.MAX_SAFE_INTEGER = 9007199254740991`（16 位）→ 16 位卡号刚好安全、19 位必然丢位。
这两条决定了组件契约：**`value` 只能是字符串**；金额若要按 locale 分组，分隔符是内容的一部分（复制会带出来），
而卡号/手机号的分组只能是排版（§6）。

**4.7 复制读的是 Text 节点的 data，所以渲染层无法把一个码点从复制里藏掉。**
DOM Standard，`Range` 的 stringification 步骤（<https://dom.spec.whatwg.org/#dom-range-stringifier>）：

> "If `this`'s start node is `this`'s end node and it is a `Text` node, then return the substring of that Text node's
> **data** beginning at `this`'s start offset and ending at `this`'s end offset. […] Append the concatenation of the
> `data` of all `Text` nodes that are contained in `this`, in tree order, to string."

再看 CSS Text Level 4 §4 _White Space Processing_（<https://www.w3.org/TR/css-text-4/#white-space-processing>）：

> "White space processing in CSS (which is controlled with the `white-space-collapse` and `white-space-trim` properties)
> interprets white space characters **only for rendering**: it has no effect on the underlying document data."

两句合起来就是 §3.2 的机制解释：分隔字符一旦写进文本节点，复制路径读的是 data，CSS 只能改它**看起来多宽**，
改不了它**在不在**；反过来，只要 data 里没有分隔码点，怎么排版都不影响复制。

顺带堵住一条退路——用 `::after { content: " " }` 之类生成内容当分隔。CSS Content Level 3 §1.1
（<https://www.w3.org/TR/css-content-3/>）的取向是相反的：

> "Generated content **should be searchable, selectable, and available to assistive technologies**."

（同一文档页首挂着 "This is a very rough draft, and is not ready for implementation."，所以这句不能当强制要求，
但方向明确：generated content 被设计成要参与选择与搜索，不是「看不见就等于不存在」。
本轮测的 `pseudo` 形状用的是 `content: ""` 空串占位盒，不承载文本，因此没有这个问题——它的问题是引入断点。）

## 5. 生态先例

本轮逐条读原文并摘录的只有下面四条（其余标为未复核）。四条措辞都是从各家自己的文档页取回的，
`groupSeparator` / `formatter` 两处还专门核了「分隔符到底进不进文本」。

**5.1 主流做法是「分隔符属于内容」，因为它们解决的是输入数值，不是保真复制。**

- Adobe Spectrum Web Components `sp-number-field`（<https://opensource.adobe.com/spectrum-web-components/components/number-field/>）：

  > "An `<sp-number-field>` element will process its numeric value with
  > `new Intl.NumberFormat(this.resolvedLanguage, this.formatOptions).format(this.value)` in order to prepare it for
  > visual delivery in the input."

  格式化后的字符串**就是**输入框里的文本。

- Ant Design `<InputNumber>`（<https://ant.design/components/input-number>）：`formatter`
  "Specifies the format of the value presented"（`(value, { userTyping, input }) => string`），`parser`
  "Specifies the value extracted from formatter"（`(string) => number`）；同页 `max` 的默认值直接写
  `Number.MAX_SAFE_INTEGER`——与 §4.6 的位数上限是同一件事。
- Ant Design `<Statistic>`（<https://ant.design/components/statistic>）：`groupSeparator`（默认 `,`）与
  `decimalSeparator` 是渲染用参数，产出的是格式化字符串；文档没有任何关于复制或选中的口径。
- MUI `<TextField>`（<https://mui.com/material-ui/react-text-field/>）自己不做分组，文档明说外包：
  > "You can use third-party libraries to format an input. You have to provide a custom implementation of the `<input>`
  > element with the `inputComponent` property. The following demo uses the `react-imask` and `react-number-format`
  > libraries."

四条合起来是一个判断：**生态里没有「显示分组但复制必须拿到原串」的现成先例**。它们分组的对象是金额输入/统计数字，
分隔符进文本是可接受的（复制出 `1,234` 再粘进表格照样能用）；而卡号、账号这类「复制后要拿去用」的连续标识符
不是同一诉求。所以 §3 只能自测，不能引用某家「人家也这么做」。

**5.2 复制保真在生态里由显式动作承担，不是靠拦截选区。**
Ant Design `<Typography>` 的 `copyable`（<https://ant.design/components/typography>）：可传 `text`
（显式指定复制的内容，不必等于可见文本）、有 `onCopy` 回调、自带 tooltip，并在文本后渲染一个独立的复制按钮。
这正是 §3.3 反例给出的解法：**「复制完整号」是一个动作**，走 `navigator.clipboard.writeText(原串)`，
而不是挂 `copy` 监听去改写用户选区。

**5.3 本轮未能读原文的（不作为依据，只登记线索）**：Element Plus `InputNumber` 的 `formatter`/`parser`、
Chakra v3 `NumberInput.Root` 的 `formatOptions`、Base UI `NumberField` 的 `format`、IBM Carbon `NumberInput` 的
locale/formatOptions、Park UI、Shopify Polaris `Amount`、react-number-format 本体。
这些来自委派收集，站点不可达或是客户端渲染壳，我没能逐条核到措辞；引用前需要复核。

**5.4 掩码与分组是两件事，别混在一个组件里。**
卡号展示常与脱敏同时出现（`6222 0212 **** **89` 一类）。按 §3.2 的同一规律，`*` 是内容字符，
复制会原样带出星号——这在脱敏场景里通常**正是**想要的，但组件文档要写清楚，别让消费方以为复制得到真实卡号。
哪些位允许显示属于合规口径（PCI DSS 的 PAN 展示规则），本轮只在委派调查里看到二手摘录、没读到标准正文，
落地前按自家合规确认，不在本报告里代替结论。

## 6. 组件形态建议（本轮不实施）

按实测边界倒推，组件能做的选择其实不多：

- **值与形状分离**：`value` 存原始连续串（属性 + `textContent` 拼接都等于它），分组只是渲染参数。
  预设形状给 `'card' | 'phone' | 'amount'`，同时允许显式 `groups`（如 `[4,4,4,4]`）。
- **间隙默认走 `letter-spacing`，不走 `margin`**：每组末位字符单独成盒并带上间隙（`lsb` 形状：4 组只需 3 个额外 `span`）。
  理由是 §3.5——只有这条路能同时拿到「看得见分组」和「高亮连续」；`margin` / `padding` / 空盒三条路的洞是补不掉的
  （`::selection` 也用不了布局属性，§4.2）。token 建议 `--wui-grouped-text-gap`，默认 `0.25em` 量级，
  实测 2/4/6/8/12px 都不产生洞，也不引入断点。
- **要省 DOM 或不想拆字符时，退到 `margin`**：代价是分段高亮，必须写进 README 当已知行为，别让人以为是 bug。
- **禁用形状**：`display:inline-block` 承载数字组（Chromium 下破坏页内查找）、空占位元素与 `::after` 占位（引入断行机会）、
  任何写进文本节点的分隔字符（复制必带）、`copy` 监听（§3.3）。
- **金额从右分组**：`1234567.89` 的整数部分按 3 位从右往左切，小数与小数点各自成组；
  探针里把小数点单独成组（`1|234|567|.|89`）时，`"123456789"` 这种「去掉小数点」的查找必然失配——
  这是**正确**行为（原串本来就含小数点），组件文档要写清楚「查找以原串为准」，不要为了迎合去小数点搜索而改文本。
- **数字宽度显式对齐**：写 `font-variant-numeric: tabular-nums`（§3.6），否则 WebKit 与 Chromium 的组间对齐不一致。
- **不换行**：容器写 `white-space: nowrap`。实测 `margin` 与 `letter-spacing` 两种间隙都不引入断行机会，
  窄容器是溢出而不是折行；要不要允许折行是产品决定，但一旦允许就必须显式给 `overflow-wrap`，
  不能靠占位元素「顺便」造出断点。`letter-spacing` 方案在 `text-align: justify` 下的行为未测（§7），
  若组件要进 justify 文本流，先补测。
- **不挂 `copy` 监听**（§3.3），不写 `user-select: none`，不给组 span 任何选中相关的属性。
- **可选的显式复制**：`copyable` 之类的开关走按钮 + `navigator.clipboard.writeText(value)`，
  与生态口径一致（§5.2：Ant Design `Typography.copyable` 也是独立按钮 + 可指定 `text`），
  并跟 `<web-ui-copy-button>` 这类既有能力对齐；文案随状态变化，不把文字塞回图标按钮。
- **屏幕阅读器读法未定**：切分成多个行内盒后，VoiceOver / TalkBack 会不会逐组停顿、按位读还是按数读，本轮没有取证。
  这条留作实施前的必测项，不要先写 `aria-label` 兜底——`aria-label` 会把整块变成单一标签，反而可能牺牲逐位选择。
- **`textLength`/SVG 不是选项**（§3.4）：高亮按字形断开，且不参与正常文本布局。

## 7. 未验证缺口

- **WebKit 的剪贴板没读到**：`navigator.clipboard.readText()` 在 Playwright WebKit 里返回 `NotAllowedError`
  （预挂 `Meta+V` 手势监听也没能绕过）。WebKit 侧的复制结论来自 `Selection.toString()`（分组族 = 原串，字符族 = 带分隔），
  **不是**系统剪贴板实测。`ls*` / `lsb*` 在 WebKit 也只核了 `textContent`、`window.find`、双击、120px 换行与
  `letter-spacing` 是否生效，复制与高亮都缺。
- **WebKit 的选区像素判据不可靠**：同一套取色判据下，`char_*` 行读到 0 个填充列，`mg*` 只读到 1px 洞且填充列反而比 Chromium 多。
  判定为探针在 WebKit 上的取色假设不成立，**不据此对 WebKit 的高亮连续性下结论**——`letter-spacing` 免洞目前是
  Chromium（DPR1 与 DPR2 两轮）的结论。
- **`letter-spacing` 方案没测的对齐与排版面**：`text-align: justify`（规范明说 UA 可再增减字距，§4.3）、
  行尾与换行处的 trailing spacing（规范正在从 between 改成 both sides，§4.3）、`text-indent`、`line-clamp`、
  `text-wrap: balance`，以及 RTL 与 CJK 混排下的分组。
- **逐字符 / 逐末位成盒的代价没测**：16 位卡号 = 16 或 7 个元素，32 位账号更多；长文本下的渲染与内存开销、
  Lit 模板生成方式（静态 part vs 运行时拼接）没量化。
- **Chromium 用的是 `chrome-headless-shell`**，不是 headed 桌面 Chrome；系统主题色、`::selection` 默认色与真实高亮观感未取。
- 未测 Firefox；未测真实 Safari.app；未测 VoiceOver / TalkBack 读法。
- `svg` 一族的查找命中只验了 Chromium。
- 合成拖选的命中测试本身有噪声（§2 前置条件 c），小间隙尺寸上的「部分复制」结果需要人工拖选复核一次再写进文档。

## 8. 复现与证据

- 探针：仓库根的 `tmp-grouped-text-measure.mjs`（形状族全量 + 剪贴板 + 像素判据）与
  `tmp-letter-spacing-probe.mjs`（`letter-spacing` 定点验证，DPR2），**两个都跑完即删、未入库**。
  本地 `node:http` 服务把页面挂在 `http://127.0.0.1:<随机端口>`（安全上下文，剪贴板可读），Playwright 驱动浏览器。
- 结果 JSON（临时目录，非仓库产物）：`/tmp/wui-ls-c6.json`（Chromium，§3.1 形状表与 §3.5 全部数字的来源）、
  `/tmp/wui-ls-w2.json`（WebKit）、`/tmp/wui-ls-probe.json`（DPR2 定点）。
  更早的隔离轮次留在 `/tmp/wui-grouped-text-probe.json`、`-probe2.json`、`-probe3.json` 与
  `/tmp/wui-grouped-v4-chromium.json`、`/tmp/wui-grouped-v4-webkit.json`：§3.2 的双击列、
  §3.3 的 `copy` 改写反例、§3.4 的 SVG 读数出自这几轮，形状表与高亮像素一律以 `wui-ls-c6.json` 为准
  （`-probe3.json` 那轮的 `mend`/`pseudo` 已被后一轮重测覆盖，这里只作为过程记录保留）。
- 选区截图证据：`/private/var/folders/w9/h316bg5j44vc5m54t7x3dklw0000gn/T/wui-grouped-shots*/`
  与同目录 `wui-ls-probe-shots/`，其中 `m3.png` 是 4 段高亮 + 3 个 6px 白洞的原始截图，`m1.png` 是连续高亮的对照，
  `one_char.png` / `margin.png` 是 `letter-spacing` 与 `margin` 在 DPR2 下的对照。
- 浏览器资源归属（按 `docs/agents/browser-resources.md`）：
  - 本轮探针累计启动 11 次浏览器，**峰值并发 1**（每次跑完即关），全程 headless，无 headed 会话。
    其中一次在 HTTP 处理里抛错提前退出（就是 §2 前置条件 a 暴露出来的那次），退出后 `ps` 扫描无孤儿。
  - profile 归属要分两档写实：早期几轮用了脚本自己建的具名临时目录
    （`…/T/wui-grouped-text-profile`、`…-profile2`、`…-profile3`、`…/T/wui-grouped-chromium-profile`、
    `…/T/wui-grouped-webkit-profile`）并 `rmSync` 回收；**后几轮（含本文数字来源的两轮）走
    `chromium.launch()`，profile 由 Playwright 自建并自管**，实测路径形如
    `…/T/playwright_chromiumdev_profile-1rybd6`（取自 `ps -ww -axo pid=,ppid=,command=` 的 `--user-data-dir=`）。
    原先记成「五个具名 profile 覆盖全部轮次」的说法是错的，这里更正。
  - 浏览器主进程（最近几轮）：`56411`、`58437`（PPID 为当次 node 探针进程），WebKit 一线 `31004`；
    记录方式同上，按完整 profile 路径边界匹配。
  - 关闭方式：`browser.close()` 正常退出，随后 `server.close()` 关掉本地 HTTP 服务。
  - 退出后核验：`ps -ww -axo pid=,command=` 按完整 profile 路径扫描 → 0 命中；`lsof -nP -iTCP -sTCP:LISTEN` 无残留监听；
    具名 profile 目录已全部消失，Playwright 自建的 `playwright_chromiumdev_profile-*` 由其自行回收。
    用户的日常 Chrome 与共享 MCP 服务未被附加、未被结束。
