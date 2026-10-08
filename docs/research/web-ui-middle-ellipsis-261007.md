# 单行文本中间省略（issue #198）调研

> 结论先行，论断附一手来源。实测日期 2026-10-06/07，worktree `hp/mono/t-0056-research-198`，
> 被测浏览器 Google Chrome 154.0.0.0（macOS，`agent-verify` 与 chrome-devtools MCP 各自拉起）。
> issue：<https://github.com/pan-Z2l0aHVi/mono/issues/198>

---

## 结论

| 问题                            | 结论                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 纯 CSS 能不能做通用的中间省略？ | **不能**，而且是结构性的：`text-overflow` 渲染的是行盒里**一段连续**内容，天生无法同时显示首尾而丢掉中间。        |
| 有没有近似的 CSS 技巧？         | 有，但都只挪动省略号的位置（开头省略），或需要**预先知道切点**。见 §1。                                           |
| 那要不要加组件？                | **要**。已在 `packages/web-ui` 加 `<web-ui-middle-ellipsis>`（Lit，遵循既有组件约定）。                           |
| 未来能不能删掉这个组件？        | 能，但目前太早：`text-overflow: ellipsis middle` 已在 CSSWG 提案里（PR #14490 未合），任何浏览器都未实现。见 §2。 |

一句话回答 issue 的两问：**不可行（纯 CSS）／必须 JS，所以加组件**。

---

## 1. 纯 CSS 为什么不可行

### 1.1 结构性原因

`text-overflow` 的语义是「行盒里溢出的**行内内容**怎么给出信号」——它渲染的是行盒中一段连续的内容区，
省略号画在这段内容的行末或行首。而中间省略要求的是**两段互不相邻的内容同时可见**（原文前缀 + 原文后缀），
中间那段不存在于渲染结果里。这不是引擎没实现，是这条属性的形状里没有「拼接两段」这个自由度。

唯一能在不拼接的前提下拿到「首尾都在」的办法，是让两段内容本来就分处两个盒子——那就要**先把字符串切开**，
而 CSS 没有任何取子串的原语（没有 substring、没有按已知字符切分）。所以「纯 CSS + 任意文本」这条路是死的。

### 1.2 双值语法 `text-overflow: ellipsis ellipsis`

MDN 记有双值语法，且方向容易读反。原文（[MDN `text-overflow`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-overflow)）：

> If two values are given, the first specifies overflow behavior for the left end of the line, and the second specifies it for the right end of the line.

MDN 的双值示例自己也说明了用法：盒子上要写 `overflow: scroll`，再用 `para.scroll(100, 0)` 把行**滚到中间**——
于是可见窗口是原文的**中段**，两端各顶一个省略号。也就是说双值语法给的是「保留中间、丢掉首尾」，
**与我们要的正好相反**。

支持面同样不成立（[mdn/browser-compat-data `css/properties/text-overflow.json`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/text-overflow.json)，
字段 `two_value_syntax` 与 `string`）：

| 语法                             | Chrome   | Safari   | Firefox |
| -------------------------------- | -------- | -------- | ------- |
| 双值（`ellipsis ellipsis`）      | ✗ 未实现 | ✗ 未实现 | ≥ 9     |
| 字符串值（`text-overflow: "…"`） | ✗ 未实现 | ✗ 未实现 | ≥ 9     |

实测（Chrome 154）：

```js
CSS.supports('text-overflow', 'ellipsis ellipsis') // false
el.style.textOverflow = 'ellipsis ellipsis'
el.style.textOverflow // ""（整条声明被判非法丢弃）
```

被判非法之后 `text-overflow` 回退到初始值 `clip`——**连末尾省略都没有了**，文本直接硬裁。
本仓 `browserslist` 是 `Chrome >=111 / Safari >=16.4 / Firefox >=128`，双值语法在这三家里只有 Firefox 有，
而它给的方向又是反的。

### 1.3 `direction: rtl` 技巧：只是「开头省略」，而且会重排内容

经典技巧是给盒子加 `direction: rtl; text-overflow: ellipsis`，省略号就跑到行首。它**不是中间省略**，
只是把「保头丢尾」换成「保尾丢头」。真正的坑在双向算法：段落方向一变，中性/弱方向字符会**被重排**。

实测（Chrome 154，等宽 16px，220px 盒子，把每个字符的 `Range` 矩形按 x 排序还原视觉顺序）：

| 原串（逻辑顺序）                     | `direction: ltr` 的视觉顺序 | `direction: rtl` 的视觉顺序       |
| ------------------------------------ | --------------------------- | --------------------------------- |
| `very-long-file-name-abcdefghij.txt` | 同原串                      | 同原串                            |
| `2026-report-final-v3.pdf`           | 同原串                      | **`report-final-v3.pdf-2026`**    |
| `-draft-notes-abcdefghij.txt`        | 同原串                      | **`draft-notes-abcdefghij.txt-`** |
| `file (copy) name-abcdefghij.txt`    | 同原串                      | 同原串                            |
| `项目-report-终稿-abcdefghij.docx`   | 同原串                      | 同原串                            |
| `screenshot-🎉-party-abcdefghij.txt` | 同原串                      | 同原串                            |
| `דוח-ישיבת-הנהלה-abcdefghij.txt`     | 希伯来段被反向              | 希伯来段正确、尾部拉丁段跑到最前  |

**头两个数字开头的串就足以否掉这条路**：文件名里以数字或连字符开头的（`2026-…`、`01-intro.md`）极其常见，
在 `direction: rtl` 下会被搬到行尾。同理 `unicode-bidi: plaintext` 也救不了——它按首强方向字符定段落方向，
纯拉丁串会退回 LTR，于是省略号又回到末尾（实测确认）。

### 1.4 flex + 双 span：能做观感，但不是通用解

把文本拆成两个 span 放进 flex 行，右段做成一个 `justify-content: flex-end` 的 flex 容器（**这一条是关键**，
下面会说），**确实不需要预先知道切点**，也能在溢出时做出看起来像「首段…尾段」的结果。实测（Chromium，220px 盒子）：

```css
.box {
  width: 220px;
  display: flex;
  white-space: nowrap;
}
.h {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.t {
  flex: 0 1 auto;
  max-width: 60%;
  display: flex;
  justify-content: flex-end;
  overflow: hidden;
}
```

```
.h = "very-long-file-name-abcde"   .t = "fghij-klmnopqrst-uvwxyz.txt"
→ very-long-fil… qrst-uvwxyz.txt        ← 右段露出结尾，这才是要的形态
```

**少写 `display: flex; justify-content: flex-end` 就完全不是这回事**：同一组输入渲染成
`very-long-fil… fghij-klmnopqrs`——右段露出的是**开头**，整个盒子是「原文开头 + 原文中间」。
也就是说这条路线成不成立，取决于一个不显眼的属性，而不是「拆成两段」这个想法本身。

即便如此，否掉它的理由有三条更硬的：

1. **放得下的时候整串会被渲染两遍**。实测 `short.txt` 在 400px 盒子里渲染成 `short.txtshort.txt`。
   CSS 没有任何机制能在「整串放得下」时按条件隐掉第二份拷贝——两个盒子都无条件渲染自己的内容，
   而「放得下与否」只有测量知道。
2. **给不出位置可控的标记**。省略号由两个盒子各自的 `text-overflow` 给出，位置是布局的副产物，
   没有地方可以表达「标记放在 50% / 80%」。
3. **右段首边在 Chrome/Safari 上拿不到省略号**。只有 Firefox 有双值 `text-overflow`（见 §1.2），
   于是「尾段左侧提示这里被截断了」这件事在这两个引擎上根本不存在。

要让它跟着宽度走、并且给出可控的标记，仍然需要 JS 先算切点——那就回到 §3。

### 1.5 其它被考虑并否掉的路径

- `line-clamp` / `-webkit-line-clamp`：末行末尾省略，与位置无关。
- `mask-image` 渐变：能在中间做出「淡出」，但那是把字**变透明**而不是**拿掉**，占位还在，且给不出省略号。
- SVG `textLength` + `lengthAdjust`：压缩字形而不是截断。
- `content: attr(...)` 拼两段：能拼伪元素内容，但**切点仍然要有人算**，CSS 拿不到子串。

---

## 2. 标准进展：`text-overflow: ellipsis middle`

CSSWG 确实在做这件事，但离落地很远，不能作为现在的方案：

- 议题 [w3c/csswg-drafts#3937 `[css-overflow-4] Ellipsizing of text in middle of string`](https://github.com/w3c/csswg-drafts/issues/3937)：
  2019 年提出、状态 `open`（`state_reason: reopened`）、标签 `Needs Edits`、38 条评论、2026-09-14 仍有更新。
- 提案文档 [`css-overflow-5/middle-truncation.md`](https://github.com/w3c/csswg-drafts/blob/main/css-overflow-5/middle-truncation.md)
  由 PR [#14490](https://github.com/w3c/csswg-drafts/pull/14490)（**仍为 open**）引入。语法：

  ```css
  text-overflow: ellipsis middle; /* 标记居中 */
  text-overflow: ellipsis 30%; /* 标记位置可调，<length-percentage> */
  ```

- 提案里写明「浏览器引擎目前已在 `<input type="file">` 的选中文件名上使用中间省略」——三方引擎都有这套逻辑，
  但它不外露成 CSS。

本仓组件把这条未来路径考虑进去了：`marker-position` 与提案的 `<length-percentage>` **同向同语义**
（量的是标记结束边距行末边的距离占可用行内空间的比例，`0` = 行末、`100` = 行首、`50` = 居中）。
将来 CSS 落地时，`<web-ui-middle-ellipsis text="…">` 可以直接换成
`text-overflow: ellipsis <marker-position>%`，消费方的取值不用改。

---

## 3. JS 方案的测量口径对比

三条常见路线，差别在「用谁的排版量宽度」和「一次重算付几次布局」：

| 口径                                    | 准确性                                                                                                         | 每次重算代价                                         | 结论     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------- |
| canvas `measureText`                    | 差。拿不到 `letter-spacing` / `text-transform` / 字体回退 / 跨段连字，要自己复刻整套解析，复刻不全就是静默量错 | 无需布局                                             | 否       |
| 写隐藏盒子再读 `offsetWidth`            | 准                                                                                                             | **每轮二分都是一次写 + 一次强制布局**                | 否       |
| **Range 读同一文本节点的前缀/后缀宽度** | 准（就是真实排版）                                                                                             | **零写 DOM**；读取之间不失效布局，整次重算只强制一次 | **采用** |

第三种是本仓的实现口径。它不是省了「读」，而是省了「写」——中间省略要二分逼近切点，
面板里可能有成百上千个这样的单元格，一个单元格多一次强制布局就是一帧多上千次。

分段宽度**不蕴含**合串宽度：`head|marker` 与 `marker|tail` 两个接缝处的字距与连字是分段量看不见的。
所以实现里还有一步**对着真实渲染盒子复核**：渲染完读一次文本盒宽度，超出容差（0.5px）就按超出量回收额度
重切，最多 `MAX_REFINE_ROUNDS`（= 3）轮。触发次数**实测过**：四种形态（等宽 ASCII 文件名、CJK 长串、
无空格长串、emoji/ZWJ 混排）各挂载一次，`_apply` 每次都只被调用一次——复核自己会再调一次 `_apply`，
所以调用次数就是拟合次数，**也就是一轮都没触发**；最终结果也都留有余量（chrome-devtools 上各形态
−4 ~ −14px，见 §6）。

---

## 4. 现成库

用 `curl` 直接查 npm registry（字段取自各包 `latest` 版本）：

| 包                               | 最新版 / 该版本发布时间 | 依赖                            | 结论                                                                                        |
| -------------------------------- | ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `react-middle-ellipsis`          | 1.3.0 / 2025-09-16      | `caniuse-lite`，peer React      | React-only。量父节点与子节点宽度后缩短文本，切点在中间；本仓是 Web Components，用不了。     |
| `truncate-middle`                | 2.0.1 / 2025-05-09      | 无                              | **纯字符串函数**，按 `headLength`/`tailLength` 切，完全不看排版——要么自己量，要么等宽场景。 |
| `@dynamic-middle-ellipsis/react` | 1.0.2 / 2025-10-01      | `@dynamic-middle-ellipsis/core` | React-only，与上一条同族。                                                                  |
| `react-truncate`                 | 2.4.0 / 2018-08-14      | peer React ≤ 16                 | 多行末尾省略，不是中间；已停更。                                                            |
| `better-truncate-middle`         | 0.1.1 / 2026-05-18      | `@chenglou/pretext`，peer React | 思路最接近，见下。                                                                          |

`better-truncate-middle` 值得单独说：它把中间那段**留在 DOM 里**，用一个零尺寸的 span 藏起来
（`color: transparent; font-size: 0; letter-spacing: 0; word-spacing: 0`），可见的首段用 `::after` 生成省略号，
于是**选中复制、页内查找、读屏拿到的都是完整原文**，而画面上是截断后的样子。这正是
CSSWG 提案文档把「JS 方案复制不到原文」列为缺点的那个问题的一种解法。

本仓**没有采用**它，理由是它的零尺寸技巧有自己的可见风险，而这次没条件逐个验证：
`font-size: 0` 挡不住继承来的 `text-shadow`（会在接缝处留下阴影），强制颜色模式
（Windows 高对比）下 `color: transparent` 可能被覆盖成系统色、把中间那段显出来。改用
`position: absolute` + `clip-path` 的 `sr-only` 形态能躲开这两条，但会改变拖选时能否自然跨段的行为。
两者都要额外的真实浏览器取证（含强制颜色模式），不适合塞进这次的范围。**这是留给用户的决定**，
见报告。当前实现的选择是：DOM 里就是屏幕上那串，全文经 `title` 提供，并在 README 里明写这条限制。

---

## 5. 本仓实现

- 组件：`packages/web-ui/src/components/middle-ellipsis/`
  - `index.ts`：Lit 组件，属性 `text` / `marker` / `marker-position`。
  - `truncate.ts`：不依赖 Lit 的切分运算（预算分配 + 字素簇二分），可单独测。
  - `style.css`：宿主 `display: block; overflow: hidden`，两个出流隐藏量具（全文量具、标记量具）。
- 共享：`packages/web-ui/src/shared/element-width/`——全模块共用一个 `ResizeObserver` 汇报宿主内容盒行内尺寸
  （同 `element-height` / `label-emptiness` 的既有形态）。

四处非显然的决定，都在源码注释里留了理由：

1. **`position` 语义照抄 CSSWG 提案**（`0` = 行末、`100` = 行首），将来换纯 CSS 时消费方不用改值。
2. **自撑宿主的收敛守卫（必要，不是保险）**。宿主宽度由内容决定时（flex 主轴 `auto`，或
   `width: fit-content` 在内容缩到容器以内之后），截短 → 宿主变窄 → 又排一次尺寸回调。
   实测两种形态结局不同：**flex + 等宽 16px + 默认 50% 只走一步就停**（缩掉的量小于一个簇宽时，
   重新二分落回同一组切点）；而 **`width: fit-content` + `marker-position: 80` + CJK 会一路棘轮**——
   每个簇都是整宽块，切短一簇与宿主窄一簇互相咬合，300px 容器里逐帧 282→266→234→…→10，
   九步塌到只剩标记。摘掉守卫后后者立刻红（本仓 browser spec 的「fit-content 宿主 + 非居中标记」
   用例），所以守卫是承重件：判据取「当前输出已经放得下」，放得下就不重切，自驱动收缩在第一步停，
   **与度量无关**；真正的容器收缩会让输出宽于新宽度，那时才重切。
3. **重切排进微任务**。切分只能在渲染之后量到宽度才算得出，所以第二次更新是必然的；在 `updated()` 里
   直接排会被 Lit 记 `change-in-update` 警告（一个实例一条，千行表就是一千条）。排进微任务后
   同一帧渲染之前排空，画面不闪。变异验证过：把 `_defer` 改回同步 `fit()`，整轮测试仍全绿，
   但控制台恰好出现 **1 条**点名 `web-ui-middle-ellipsis` 的 `change-in-update` 警告——
   这条改动在做实事，只是「警告不算失败」，测试钉不住它。
4. **宽度变化的感知阈 `WIDTH_EPSILON`（0.5px）**。`_currentWidth()` 走 `clientWidth`（整数），
   观察者报的是 `contentRect.width`（分数），同一个盒子在两条路径上最多差 0.5px。不设阈值的后果是
   **每次挂载都白做一次二分**：实测两次 `_apply` 的入参都是同一个 `240`（见 §6 性能行）；
   加阈值后实测降到一次。
   这条短路**依赖一个前提**：当前输出就是按 `_available` 切出来的。宿主无布局期间换 text 时前提不成立
   ——`_apply` 按宽度 0 直接返回、拟合仍悬着，而恢复显示时宽度与上次相同，短路会把唯一的恢复路径吃掉，
   屏幕上只剩一段被 `overflow: hidden` 硬裁的全文，没有标记也没有 title（这是独立 review 在第三轮抓到的
   回归，也是本条最值得记住的地方）。所以两条短路都要求 `!this._dirty`，且 `_dirty` 只在**真的切完之后**
   清（`_apply` 内），而不是在排延迟拟合时就清。browser spec 用四条时序钉住了这一条，它们**不等价**：
   隐藏后同宽、隐藏后更窄、脱离期间跨过一帧这三条会红；**脱离期间不跨帧那条仍绿**——它那趟 text 变更的
   更新在重连时才跑，带着真实宽度执行，短路拦不到。四条都留着是因为各自覆盖一种真实时序，只有前三条
   是这个缺陷的判据。

---

5. **测试强度的实测**（变异验证；独立 review 又复跑了一轮，两边结论一致）：

   | 变异                                                         | 结果                                                                                                                                                                            |
   | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `clusterEnds` 改成按 UTF-16 单元切                           | `truncate.spec.ts` **4 条红** ✓ 承重                                                                                                                                            |
   | `_syncMeasure` 的 `!==` 改成 `===`（量具永不填）             | browser spec **22 条红** ✓ 承重                                                                                                                                                 |
   | `willUpdate` 里的 `_dirty = true` 改成 `false`               | **2 条红**（`运行时把 text 换成仍然溢出的值会重新切分` + `改 marker-position 会重新切分`）✓ 承重                                                                                |
   | 摘掉 `_onWidth` 的收敛守卫                                   | flex 那条仍绿；**fit-content + 非居中标记 + CJK 那条红** ✓ 承重（见 §5.2）                                                                                                      |
   | `_defer` 改回同步 `fit()`                                    | 全绿，但控制台恰好多 1 条点名本组件的 `change-in-update` 警告——在做实事，只是警告不算失败                                                                                       |
   | 把 `_onWidth` 的两条短路还原成不看未落拟合（`_dirty`）的版本 | **3 条红**：隐藏后同宽、隐藏后更窄、脱离期间跨过一帧；**脱离期间不跨帧那条仍绿** ✓ 承重（四条时序为何不等价见 §5.4 第 4 条）                                                    |
   | `if (space <= 0)` 改成 `if (available <= 0)`                 | **全绿** ⇒ 该分支是快速路径而非正确性分支：预算为负时通用路径同样得到 `{head:'',tail:'',truncated:true}`                                                                        |
   | browser spec 的切点性质断言（配 `clusterEnds` 变异）         | **仍绿**。Chromium 会把 `Range` 边界吸附到字素簇上，组合符与 ZWJ 的推进量为 0，切在簇内与切在簇边界量出的宽度相同，二分因此总落在簇边界那一档。该用例的注释写明了它不守分段语义 |

   未被任何用例钉住的防御性代码（不是「正确性」而是防浮点与退化输入）：`truncate.ts` 的重叠夹紧、
   `index.ts` 中 `_rangeWidth` 的空区间守卫、以及上表最后那条 `space <= 0` 快速路径。

## 6. 边界与残余风险

| 项                | 现状                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 字素簇            | 切点只落在 `Intl.Segmenter` 的 grapheme 边界；代理对、组合符、ZWJ emoji 都不劈开（spec 逐档扫全部宽度）。                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 中英混排 / 无空格 | 已覆盖；无空格串不会折行（断言所有 client rect 的 `top` 相同）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 容器 resize       | `ResizeObserver` 重算，变宽可收回截断。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 复制              | **退化**：拿到的是屏幕上那串。见 §4 与报告里的待决项。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 双向文本          | 组件按**逻辑**首尾切分，不做双向感知；`direction: rtl` 宿主下合串仍会被双向算法重排。CSSWG 提案里对双向文件名的处理也仍在讨论（`<length-percentage>` 以行末为参照正是为此）。当前实现要求宿主为 LTR。                                                                                                                                                                                                                                                                                                                                           |
| 强制颜色模式      | 未实测（macOS 上没有 Windows 高对比）。当前实现不使用透明文字，风险面小，但仍是未覆盖项。                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 性能              | 重算零写 DOM + 一次布局；合串复核最多再 `MAX_REFINE_ROUNDS`（= 3）轮渲染，实测四种形态**一轮都没触发**；每次挂载只拟合一次（观察者首次回调落在同一宽度上，已由 `WIDTH_EPSILON` 跳过）。                                                                                                                                                                                                                                                                                                                                                         |
| 边界滞后          | 守卫保留「已经放得下」的旧切分而不重算，因此同一宽度下「收窄过来的」与「全新挂载的」可能不同：等宽 16px + `very-long-file-name-abcdefghij.txt`，从 300px 逐档收到 240px 显示 25 字（`very-long-fi…cdefghij.txt`，实测宽 240.05px），**全新挂载在 240px 只有 23 字**（`very-long-f…defghij.txt`，220.84px），而在 241px 全新挂载又是 25 字（240.05px）。来源是 240px 下每侧额度 115.2px 与 12 字前缀实测 115.22px 之间的亚像素刃口：全新挂载每侧少取一簇；保留的那次切分是在更宽宽度上算的，不受这个刃口影响。两者都放得下，保留的那次显示更多。 |

---

## 7. 参考

- [MDN `text-overflow`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-overflow)（双值语法的语义与 `overflow: scroll` 示例）
- [mdn/browser-compat-data `css/properties/text-overflow.json`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/text-overflow.json)（`two_value_syntax` / `string` 的浏览器支持）
- [w3c/csswg-drafts#3937](https://github.com/w3c/csswg-drafts/issues/3937)、[PR #14490](https://github.com/w3c/csswg-drafts/pull/14490)、
  [`css-overflow-5/middle-truncation.md`](https://github.com/w3c/csswg-drafts/blob/main/css-overflow-5/middle-truncation.md)
- npm registry `latest` 元数据（§4 表格，2026-10-06 查询）
- 本仓实测：Chrome 154 上的 `CSS.supports` / 计算值回读、逐字符 `Range` 矩形视觉序还原、chrome-devtools MCP 集成验证
