# 契约化重构台账（Batch 1 – 6c）

`@greypan/web-ui` 测试套件从「断言实现细节」改为「断言公开契约」的分批台账。
判据在 [`DELETION-RUBRIC.md`](./DELETION-RUBRIC.md)，本文件是它的留痕侧。

## 怎么审计

1. **逐用例的 D 清单**（位置 + 类别 + 理由 + 存活覆盖位置）在
   [`batch-d-lists/`](./batch-d-lists/) 下按批次分文件保存，随仓库分发；索引见
   [`batch-d-lists/README.md`](./batch-d-lists/README.md)。本文件给的是批次级摘要，
   各批提交信息只有更粗的批次级说明。定位粒度各批不统一（部分批只到文件 + 用例标题、
   不带行号），见 README「怎么读」第 3 条。
2. 每批都走过 freeze → 独立 review → approve → 提交的闸门，review 结论记在各批小节。
3. 全量口径：用例 **1322 → 1226（−96）**，spec 文件 **113 → 109**，失败数 1 → 0。
   b6c 提交 `56ce44b1` 时点为 1224 例 / 108 文件；review fixup `4f515204` 补回 2 例
   （新增 `drawer/inset-token.browser` 1 例、`svg-draw-lines` 的 WAAPI replay 1 例，后者落在已有文件），
   故当前为 1226 例 / 109 文件——**各批小节里的用例数仍是该批自己提交时点的数字**。

## 批次

### Batch 1–2 · 基础组件 + 表单关联（35 文件）

| 提交       | 内容                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `4db0d1c9` | 基础组件 17 文件。整文件删 3：`back-top/back-top-glass.browser`、`badge/badge.browser`、`button/group-color.browser`                                                             |
| `2e0fbcec` | 表单关联 18 文件。整文件删 3：`input/slot-presence.spec`、`textarea/slot-presence.spec`（两者并入共享 `named-slot-presence.spec.ts`，逐用例等价）、`textarea/borderless.browser` |

两批合计用例 1322 → 1314。

### Batch 3 · shared 基础设施 / 组 / 布局（29 文件 / 188 例）

提交 `e7c1148b`，用例 −12。实际只改 12 个文件，其余 17 个已是契约内聚、KEEP 未动。

整文件删 3：`input/input.jsdom.spec`（声明式 value 由 `form-association.spec.ts:14` 承接）、
`layout/mobile-toggle-header-alignment.browser`、`shared/overlay/reduced-motion.browser`
（overlay 的 reduce 语义后由 drawer / theme 的 `reduced-motion.browser` 承接）。
判据增补：主题令牌裁决（后落地为 `DELETION-RUBRIC.md` §10）。

### Batch 4 · 菜单与浮层（17 文件 / 225 例）

提交 `3a093385`，17 文件 225 例 → **18 文件 231 例（净 +6）**——精简 16 例，新增 1 个 22 例矩阵。
整文件删 0，4 文件 KEEP 未动。新增判据 §8 R1–R4。
3 轮独立 review，第 1 轮抓出 F1 覆盖缺口，补 6 例后闭合。

### Batch 5 · 组合框与分段（11 文件 / 221 例）

提交 `ed7942a2`，11 文件 221 例 → **12 文件 197 例（净 −24）**。整文件删 0。
`option[active]` 内部标记 11 处改走 `aria-activedescendant` 公开通道。
落地跨批承诺 #7（`contractEvent` 空 `counts` 护栏）与 #4 的 b5 部分（2 处玻璃）。
2 轮独立 review 均 pass，5 条 non-blocking 全部闭环（1 条经实测判定为误报）。

### Batch 6a · 主题与动效（9 文件 / 59 例）

提交 `a7c663a2`，9 文件 59 → 48 例（含 tooltip 1 → 2，全量 10 文件 60 → 50 例）。
整文件删 2 个纯 `getComputedStyle` 取值文件：`theme/theme-motion.browser`、`theme/theme-radius.browser`（共 11 例）。
`tooltip/repeat-presence.browser` 改名 `repeat-show-delay.browser`（R1 例外取消）。
落地 §10 S1–S6（令牌判据 + 动效 WAAPI 观察面 + reduce 控制组），顺带 deflake 掉全量套件唯一红点。

### Batch 6b · dialog / toast / collapse（9 文件 / 139 例）

提交 `581c78c5`，139 → 114 例。动手前先落容器判据 §12 C1–C7（6c 沿用）。
整文件删 1：`toast/toast-enter-motion.browser`（改名重建为 `toast/reduced-motion.browser`，换入系统 reduce 工程）。
另删 collapse peek 边缘渐隐整 describe（11 例）+ 4 例 D4 重复 + 4 例纯几何 + 2 处玻璃（跨批承诺 #4 的最后 2 处）。

观察面从 `toast._visibleCount()` 换成实际挂载元素后，**暴露一个真实产品缺陷**：同批次重复 id 不去重。
已单独提 issue `pan-Z2l0aHVi/mono#135`（改为 upsert 语义），不在本批修复范围。

### Batch 6c · drawer / image-preview（10 文件 / 139 例）

提交 `56ce44b1`，139 → 110 例，`image-preview.browser` 1072 → 674 行。
整文件删 2：`drawer/glass-inherit.browser`（兑现 C6 的 6c 裁决）、`drawer/drag-zone-sizing.browser`（兑现 C1）。
`drawer/slot-presence.spec.ts` 逐字未动（纯插槽投影）。
本批实测发现 2 处空转断言，据此新立判据 §13 C8（断言区分力探针纪律）。

## 有意放弃的覆盖

以下按判据有意不测，**回归时测试会全绿但视觉会变**，需靠视觉回归手段兜底：

- badge slot 增删时的定位同步
- drawer 嵌套 `0.95^depth` 缩放几何与阶梯露边量
- segmented 静止 / 按压玻璃切换、back-top 玻璃阴影
- theme radius token 与各组件的接线（现仅守 token 存在性 + 双语文档 parity）
- group 内 danger 颜色、textarea borderless 描边移除

## 转出项（不在本分支处理）

| #   | 事项                                            | 去向                          |
| --- | ----------------------------------------------- | ----------------------------- |
| 5   | checkbox / radio-group 同输入用例是否按 D4 合并 | 待定                          |
| 8   | toast 同批次重复 id 不去重（真实缺陷）          | issue `pan-Z2l0aHVi/mono#135` |
