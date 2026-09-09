# Arch-Deepening 复扫评估报告

## 结论

截至本报告生成时：

- 原 10 个候选问题与小项已完成处理，或按机制差异明确 descope。
- 代码、契约、changesets、构建、测试与静态质量门禁全部完成。
- 独立 reviewer 已完成两轮 review 与一次 P1 复审，最终 P0/P1 清零。
- T7 真实浏览器验证已完成；Chrome DevTools MCP 已连接本地 React demo，交互、浮层、表单与主题观察均无回归。
- 因此整体目标已达成：代码、契约、测试、静态门禁、独立 review 与真实浏览器验证均完成，等待用户审批后进入 commit / merge / release 流程。

## 变更范围

- 基点：`366f1759`
- 工作区：`dev/arch-deepening`
- 交付形态：全部变更保持未提交状态，等待用户审批。
- 统计：约 80+ tracked files，`+866 / -1820`（不含后续新增 changesets、review 修复与报告；最终统计以 `git diff --stat` 和 untracked 清单为准）。

## Before / After 对照

| 候选问题                                      | Before                                                                                      | After                                                                                                             | 证据                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| dropdown / context-menu 重复交互逻辑          | 两组件各自维护 hover、outside click、roving keyboard、closing submenu 逻辑，约 250 行重复   | `shared/menu-behavior/` 单源；dropdown / context-menu 成为 adapter                                                | `packages/web-ui/src/shared/menu-behavior/index.ts`；dropdown/context-menu imports                   |
| portal removed-node 清理重复                  | popover / tooltip 内逐字维护 removed-node 清理                                              | portal 内建 removed-node untrack，consumer 块删除，补 portal 直接测试                                             | `shared/overlay/portal.ts`、`portal.spec.ts`                                                         |
| floating placement 多源                       | `ALLOWED_PLACEMENTS` / placement 常量分散 3 处                                              | `shared/overlay/placement-props.ts` 单源；更完整的 placement/offset property factory 仍为后续项                   | 3 个 imports：popover / tooltip / dropdown；详见残余 friction 表                                     |
| select / autocomplete combobox lifecycle 重复 | open/close、option 事件、focusout、环绕导航重复，约 110 行 × 2                              | `shared/option-portal/combobox-shell.ts` 单源；select / autocomplete 接入                                         | `packages/web-ui/src/shared/option-portal/combobox-shell.ts`                                         |
| 表单组件 validity / reset / disable 三连重复  | 12 个组件重复 ElementInternals 接线                                                         | `FormAssociated` mixin + `forwardInputValidity`；4 个组件保留自定义 lifecycle override                            | `shared/form-association/index.ts`；13 个文件引用                                                    |
| open-change emit 块重复                       | 9 个组件机械 emit                                                                           | `shared/open-state/dispatchOpenChangeEvent` 单源，保留两种契约 flavor                                             | 9 个组件 imports                                                                                     |
| interweave row-scan 重复                      | 5 处重复扫描                                                                                | `collectRows[T]` 单源                                                                                             | backend grep 命中 13 处引用/注释                                                                     |
| facade mapping 重复                           | facade 多处 nil→[] 归一、List/Search/映射循环逐字重复                                       | `mapped[From,To]` helper 收敛 facade 空集合与映射循环；`resourceViewToDTO` 内部也复用                             | `service/convert.go`、`resource_service.go`、`tag_service.go`、`map_service.go`；grep 9 处 `mapped(` |
| tracker plugin 宽依赖 + cast                  | plugins 依赖完整 tracker；last-words 使用 `ctx as` cast；batch wire contract 只活在组合顺序 | `TrackCapability` / `FlushCapability` / `PauseCapability` 窄接口；cast 消灭；数组 wire contract 进入 `track` 类型 | `packages/browser-kit/src/tracker/capabilities.ts`、`batch-track.ts`                                 |
| `safeCall` 错误吞噬                           | spread 调用 + silent catch                                                                  | `safeCall(fn, options?)` thunk + `onError`；offline-restore 使用 warn 出口                                        | `packages/js-kit/src/shortcut/index.ts`、offline-restore plugin                                      |
| js-kit 死接口面                               | asyncCompose / event-emitter / go / random / nanoid 暴露                                    | 全部删除；`./go` subpath 删除；双语 README 与实现对齐                                                             | manifest、dist d.ts、全仓 grep、tests                                                                |
| browser-kit 死接口面                          | sleep / sleepSync / defer / 重复文件工具暴露                                                | sleep 系列删除；文件工具迁入 js-kit；`maxBeaconSize` → `maxBatchKB`                                               | manifest、dist d.ts、tests                                                                           |
| theme token drift                             | 组件 fallback 与 theme 定义漂移                                                             | `theme-token-parity.spec.ts` 四类守卫；修复 7 处漂移                                                              | theme-token-parity.spec.ts；glass/dialog/input/textarea/dropdown-header CSS                          |
| layout 断点双源                               | 断点 640 可能漂移                                                                           | breakpoint parity spec 守卫                                                                                       | `breakpoint-parity.spec.ts`                                                                          |
| interweave metadata JSON 字符串               | 前端需理解 `metadata_json: string` + JSON shape + 失败策略                                  | `SourceMetadataDTO *` + facade 解析一次，失败回 nil；ADR-0041 落盘                                                | Go service/types、bindings、ADR-0041                                                                 |
| interweave frontend 数据翻译散点              | 页面直接处理 DTO 细节                                                                       | headless `library.ts` view-model store，filter / sort / search / preferred / kind 翻译一次                        | `apps/interweave/frontend/src/stores/library.ts`、9 tests                                            |

## Descope 与残余 friction

| 项                                                                           | 结论               | 理由                                                                                                                                                |
| ---------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| toast presence 与 open-state 合并                                            | descope            | host-visible flag 与 panel-presence dataset 是不同机制；强行合并会改变行为且无第二消费者。                                                          |
| context-menu `stopPropagation`                                               | 接受               | shared 化后键盘事件语义对齐；事件已冒泡到 document，实际路径无回归。                                                                                |
| `parseSourceMetadata` 非法 JSON 静默回 nil                                   | 接受，记录残余风险 | ADR-0041 显式决策：解析失败回 nil；本轮不引入日志策略，保留为可诊断性 friction。                                                                    |
| form validity disabled 测试使用 `ElementInternals.prototype.setValidity` spy | 接受               | 表单 API 对 barred 元素不聚合错误，只有直接观测 setValidity 才能锁定窗口期行为；实现方式变更时测试需跟进。                                          |
| changeset 跨检是包级 max bump                                                | 接受               | 机制保证包级 semver 决策不为 patch；removal 文件自身承载说明目前是文档纪律，当前 `./icons/*` 已在独立 minor changeset 中说明。                      |
| `glass.css` 未纳入 theme-token parity 自动守卫                               | 记录               | parity spec 显式排除 assets 层；当前靠人工同步，后续可扩展守卫。                                                                                    |
| anchored-panel placement/offset property factory                             | 记录残余           | 本轮完成 portal removed-node 清理默认化、portal 直接测试与 `FLOATING_PLACEMENTS` 单源；Lit reactive property 样板未继续抽 factory，属低风险后续项。 |
| theme README token 表生成器                                                  | 记录残余           | 已先落地 CSS parity 与 README 值 parity 守卫；README 表仍为手工编辑，generator 化按报告建议作为后续跟进。                                           |
| browser-kit file 错误约定                                                    | 记录残余           | 纯函数已迁入 js-kit，`downloadFile` 网络/URL 错误补 `cause`；多种错误形态的一致化超出本轮行为修复范围。                                             |
| browser-kit `on` / `off` pass-through                                        | 记录不删           | 保留原因是有类型化 Window/Document 重载且 tracker/history-nav/storage 内部消费；直接裸用 add/removeEventListener 会失去这些类型。                   |
| T7 真实浏览器验证                                                            | 完成               | Chrome DevTools MCP 已连接本地 React demo；交互、浮层、表单、主题与 glass 观察无回归，console 无非预期错误。                                        |

## 残余项二次评估（Reviewer + Lib Coder）

对上方残余 friction 中的 4 项做了只读深入评估，不扩大本轮范围：

| 残余项                                           | 结论 | 依据                                                                                                                                                      |
| ------------------------------------------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| anchored-panel placement/offset property factory | 延后 | 当前只有 popover / tooltip / dropdown 三个站点；`FLOATING_PLACEMENTS` 已单源，而 Lit reactive property factory 会增加公共组件接线抽象。收益低于回归风险。 |
| theme README token 表生成器                      | 延后 | 值漂移已被 `theme-token-parity.spec.ts` 拦截；生成器只省去低频手工步骤，但要处理中英双语描述列合并，会成为新的维护面。                                    |
| browser-kit file 错误约定统一                    | 挂起 | 全仓当前无真实消费者；typed error 是新的 minor 公共承诺，却缺少回归信号。已有 `{ cause }` 保留底层错误。                                                  |
| browser-kit `on` / `off` pass-through            | 保留 | 包内 5 个消费者依赖类型化 Window/Document 重载；删除是 major 且失去事件类型推断；升级为 unsubscribe 函数收益趋零，因为内部已用 `signal` 成对清理。        |

若未来继续处理，建议顺序为：browser-kit file 错误约定 → anchored-panel property factory → theme README generator；`on` / `off` 维持现状。

## 独立 Review 结论

第一轮：

- Block：0。
- Should fix：S1 `contract-diff` 漏报 `removedExports`；S2 plugin-system README 仍写 `defineEventEmitter`；S3 web-ui token fallback 可见变化应为 minor；S4 `forwardInputValidity` 丢失 disabled 短路。
- Nit：N1 js-kit nanoid external/doc 残留；N2 ADR-0041 表述矛盾；N3 context-menu `stopPropagation`；N4 metadata parse 静默 nil。
- 处理：S1-S4、N1、N2 已修；N3、N4 按上表记录。

第二轮：

- 发现最后 1 项 P1：`./icons/*` removal 在 patch changeset 中承载，跨检通过依赖 Map last-wins 顺序巧合。
- 处理：将 `./icons/*` removal 移入独立 minor changeset；`readChangesetDecisions` 改为按包聚合 max bump，并保留来源 changesets。

最终复审：

- P0/P1：清零。
- Reviewer 独立复跑 `pnpm test:scripts` 与 `contract-diff --base 366f1759` 均通过。

## 契约结论

- js-kit：major。
  - 删除 `asyncCompose`、event-emitter、Go paradigm、random 系列、`./go` subpath、nanoid dependency。
  - `safeCall` 签名改为 thunk；新增 `SafeCallOptions.onError`。
  - 新增 `getFileExtension` / `formatFileSize`。
- browser-kit：major + minor。
  - major：`maxBeaconSize` → `maxBatchKB`；删除 sleep 系列；文件工具迁出。
  - minor：导出 tracker capability types。
- web-ui：patch + minor。
  - patch：menu-behavior、combobox-shell、open-state、form association、portal、placement 单源收敛。
  - minor：可观察 token fallback 对齐与 `./icons/*` 无效 subpath 移除。
- interweave：私有 app，使用空 changeset 覆盖仓库级 DTO 变更。
- `contract-diff --base 366f1759` 现在正确报告：
  - `@greypan/js-kit` export removed: `./go`
  - `@greypan/web-ui` export removed: `./icons/*`

## 验证证据

| 验证                                    | 结果                                            |
| --------------------------------------- | ----------------------------------------------- |
| `pnpm check:code`                       | 绿                                              |
| `pnpm build`                            | 10/10 绿                                        |
| `pnpm test`                             | 14/14 绿                                        |
| web-ui tests                            | 100 files / 1153 tests 绿                       |
| interweave frontend store tests         | 9 tests 绿                                      |
| `pnpm test:scripts`                     | 绿，含 contract-diff removal 锁定测试           |
| `pnpm check:pack`                       | 绿                                              |
| `pnpm changeset status`                 | 绿                                              |
| `pnpm diff:contract -- --base 366f1759` | 绿，且正确报告两个 export removal 候选          |
| `pnpm validate:context`                 | 绿                                              |
| 真实浏览器验证                          | 完成，Chrome DevTools MCP，console 无非预期错误 |

## 交付判断

在完成以下事项前，不应执行 commit / merge / release：

交付摘要已补充浏览器验证 URL 与观察记录；当前无阻塞项，等待用户审批后才进入 commit / merge / release 流程。
