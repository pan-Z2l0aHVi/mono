# TypeScript 7 升级可行性调研（mono monorepo）

> 回答「本 monorepo 能否整体升级到最新的 TypeScript 7」。调研日期 2026-09-09。官方事实（发布状态、破坏性变更、生态适配）均追溯一手来源（devblogs.microsoft.com、GitHub、npm registry），来源逐条标注；仓库事实来自当前源码与 manifest；另附本机原生 TS 7.0.2 的实测结果。「源码事实 / 实测 / 推断」按要求标注。

---

## 结论（TL;DR）

**可以升级，且本仓库是极少数"已经半只脚在 TS 7 上"的仓库；但正确形态是「混合态」而非单编译器一刀切。**

1. **类型检查早已在 TS 7 引擎上运行**（源码事实）：`vp check` 的 typecheck / type-aware lint 由 vite-plus 捆绑的 `oxlint-tsgolint@7.0.2001` 承担，其 README 明确写着"using [typescript-go] for full compatibility with the TypeScript type system, and targets **TypeScript 7**"。TS 7 就是 typescript-go 的正式版。
2. **`typescript` npm 包（当前 catalog `~6.0.3`）只剩三个消费者**（源码事实）：`vue-tsc --build`（Vue demo 构建门禁）、`vite-plugin-dts → unplugin-dts` 的 `.d.ts` 生成（js-kit / browser-kit / web-ui）、编辑器 LSP。TS 7.0 不提供 JS API，这三个消费者短期内必须留在 TS 6 JS API 上。
3. **配置面已完全兼容**（源码事实 + 实测）：共享 tsconfig 已经是 `module: preserve` + `moduleResolution: bundler` + `verbatimModuleSyntax` + `strict` + `types: []` 显式声明；全仓无 `baseUrl` / `outFile` / `node10` / AMD / `ignoreDeprecations` 等 TS 7 移除项。Lit 的 `experimentalDecorators + useDefineForClassFields: false` 在 TS 7 下受支持且已显式声明，避开默认值翻转陷阱。
4. **实测**（2026-09-09，本机 darwin-arm64）：原生 `typescript@7.0.2` 对全部 13 个非 Vue tsconfig `--noEmit` 零错误，与本地 tsc 6.0.3 输出一致；web-ui 包上 0.36s vs 1.56s（约 4x，小包）。
5. **建议路径**：维持 `typescript@6.0.x` 服务 JS API 消费者 → 编辑器与（可选）CI 影子检查切换原生 TS 7 → 等 7.1 新 API 落地后再收敛为纯 7.x。**不要**把 catalog `typescript` 直接跳到 7.x——会打断 unplugin-dts / vue-tsc。

---

## 1. 仓库现状盘点

### 1.1 工具链拓扑（源码事实）

`vp toolchain`（vite-plus 0.3.0）输出的实际版本关系：

```
vite-plus@0.3.0
├── @voidzero-dev/vite-plus-core@0.3.0
│   ├── bundles vite@8.2.2 (rolldown@1.2.5 → oxc@0.146.0)   # TS 转译走 oxc，不经 tsc
│   └── bundles tsdown@0.22.14                              # vp pack 的 .d.mts 生成
├── vitest@4.1.11
├── oxlint@1.79.0
├── oxlint-tsgolint@7.0.2001                                # type-aware lint + typecheck，基于 typescript-go
└── oxfmt@0.64.0
```

| 环节                                   | 执行者                                                                                                     | 是否依赖 `typescript` JS 包 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------- |
| TS 转译（build/dev/test）              | vite 8.2.2 / oxc                                                                                           | 否                          |
| 类型检查 + type-aware lint             | `vp check` → oxlint + tsgolint（`vite.config.ts` 中 `lint.options: { typeAware: true, typeCheck: true }`） | 否（typescript-go 原生）    |
| `.d.ts` 生成（子路径导出包）           | `vp build` → vite-plugin-dts 5.1.0 → unplugin-dts 1.1.0（peer `typescript >=4`）                           | **是**                      |
| `.d.mts` 生成（单入口包）              | `vp pack` → tsdown 0.22.14（vite-plus 内置）                                                               | 否                          |
| Vue demo 构建门禁                      | `vue-tsc --build`（3.3.11，peer `typescript >=5.0.0`）                                                     | **是**                      |
| 仓库脚本（repo-query / check-pack 等） | 纯 Node mjs，无 TS 编译器 API 使用（grep 验证）                                                            | 否                          |
| 直接 `tsc` 调用                        | 无（CI、scripts、hooks 均无；唯一 build 门禁是 Vue demo 的 `vue-tsc --build`）                             | —                           |

`typescript` 在 catalog 中只有一处声明（`typescript: ~6.0.3`），没有任何包在运行时 import `typescript` API。

### 1.2 TS 配置面（源码事实）

- `packages/tsconfig/base.json`：`module: preserve`、`moduleResolution: bundler`、`noEmit`、`strict`、`verbatimModuleSyntax`、`isolatedModules`、`noUncheckedSideEffectImports`、`esModuleInterop: true`。
- 唯一的非默认语言特性配置：`web-ui/tsconfig.app.json` 的 `experimentalDecorators: true` + `useDefineForClassFields: false`（Lit 37 个组件文件使用装饰器）。
- 不可擦除语法面极小：无 `enum`；仅 `web-ui/src/types/react.ts` 一处 ambient `declare module 'react'` 内的 `namespace JSX`（TS 7 允许；被移除的是 `module Foo {}` 写法）；无构造器参数属性。`react.json` 已启用 `erasableSyntaxOnly`。
- 全部 tsconfig 中无 `baseUrl`、`outFile`、`downlevelIteration`、`ignoreDeprecations`、`moduleResolution: node10`、AMD/UMD（grep 验证）；`@tsconfig/node24` 使用 `nodenext/node16`（TS 7 保留）。

### 1.3 与 TS 6 桥接的关系

官方迁移建议是"先落 6.0，再上 7.0"（见 §2.4）。**本仓库已经完成第一步**：catalog 即 `typescript: ~6.0.3`（TS 6.0 于 2026-03-23 GA）。

---

## 2. TypeScript 7 官方现状（截至 2026-09）

### 2.1 发布状态

| 事实                    | 内容                                                                                                                                  | 来源                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS 7.0 已 GA            | 2026-07-08 发布；npm `typescript` latest = **7.0.2**（Go 原生二进制，含 ~20 个平台子包）；`next` tag 已是 `7.1.0-dev.20260908.1`      | [GA 博客](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)、npm registry（本调研实测查询）                                                     |
| TS 6.0 是末代 JS 编译器 | 2026-03-23 GA，无 6.1 计划，仅补丁；以兼容包 `@typescript/typescript6@6.0.2` 延续（提供 `tsc6` 二进制 + 完整 6.0 JS API）             | [2025-12 进展博客](https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/)、npm registry                                                 |
| typescript-go 仓库归档  | 2026-09-01 归档，开发并入 microsoft/TypeScript                                                                                        | [typescript-go README](https://github.com/microsoft/typescript-go)                                                                                                  |
| 官方支持双编译器并存    | GA 博客给出 side-by-side 方案：`typescript@npm:@typescript/typescript6`（JS API 消费者）+ 指向 `typescript@^7.0.2` 的别名（原生 tsc） | [GA 博客](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)、[RC 博客](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/) |

### 2.2 破坏性变更（6.0 弃用 → 7.0 移除）

6.0 中以 `ignoreDeprecations: "6.0"` 压制，7.0 直接移除。来源：[6.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-beta/)、[7.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/)。**本仓库命中情况见右列：**

| 变更                                                                                                    | 本仓库状态                                                                               |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `target: es5` / `downlevelIteration` 移除（最低 ES2015）                                                | 未使用                                                                                   |
| `moduleResolution: node10/classic` 移除                                                                 | 未使用（bundler / nodenext）                                                             |
| `module: amd/umd/systemjs/none` 移除                                                                    | 未使用（preserve）                                                                       |
| `outFile` 移除                                                                                          | 未使用                                                                                   |
| `baseUrl` 不再支持；`paths` 需相对项目根                                                                | 未使用（paths 均为相对写法）                                                             |
| `esModuleInterop`/`allowSyntheticDefaultImports` 不可为 false；`alwaysStrict` 强制                      | 已为 true / 默认                                                                         |
| `module Foo {}` 写法移除（ambient `declare module` 保留）                                               | 未使用                                                                                   |
| 新默认值：`strict`、`module: esnext`、`target` 浮动最新 ES、**`types: []`**、`rootDir: ./`              | base 已显式 `strict`；`types` 已逐 project 显式声明（`[]`/`["node"]`/`["vite/client"]`） |
| `stableTypeOrdering` 强制（确定性类型排序，6.0 有 ~25% 检查减速报告）                                   | 接受（语义不变，仅顺序确定性）                                                           |
| **装饰器未列入移除**：experimental 与标准装饰器在 TS 7 均可转译（typescript-go#914 于 2025-12-12 关闭） | web-ui 的 Lit experimentalDecorators 可继续                                              |
| 陷阱：默认 `target` 升到 es2025 使 `useDefineForClassFields` 默认翻为 `true`                            | **已规避**：web-ui 显式声明 `false`（Lit 要求）                                          |

### 2.3 原生编译器能力覆盖（GA 时点）

已完成：程序创建/解析、类型检查（错误、位置、消息对齐）、JSX、**declaration emit**、JS 输出、**watch mode**、**build mode / project references**、增量构建；LSP "几乎全部特性"。**编译器 API "not ready"**；`isolatedDeclarations` 仍在已知未完成清单。来源：[typescript-go wiki](https://github.com/microsoft/typescript-go/wiki/What%27s-currently-supported)、[7.0 Beta 博客](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/)。

性能（GA 数据）：全量构建 8–12x（vscode 125.7s→10.6s），`--checkers 8` 可达 ~~16x；内存 −6%~~−26%。

### 2.4 官方迁移路径

1. 先在 6.0 下无 `ignoreDeprecations` 地干净编译（"should compile identically in TypeScript 7.0"）。
2. 需要编译器 JS API 的工具走 `@typescript/typescript6` 别名，原生 `tsc` 用 `typescript@^7.0.2`，二者并存。
3. API 消费者等待 7.1：[API roadmap #4830](https://github.com/microsoft/typescript-go/issues/4830)（2026-09-03 更新，Committed，目标 7.1.0 Beta）包含 `createProgram`/`createSourceFile`/`transpileModule`、solution builder、custom transformers 及 Vue/Svelte 内容映射器（content mappers）。

---

## 3. 逐项兼容矩阵

| 仓库环节                                         | 依赖                                                                     | TS 7 生态现状                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 结论                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `vp check` 类型检查/type-aware lint              | tsgolint（typescript-go）                                                | 其本体就是 TS 7 引擎                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **已就位**                                                                                                          |
| vite / vitest 转译                               | oxc                                                                      | 与 tsc 无关；VoidZero 是 TS 7.0 预发布测试者                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 不受影响                                                                                                            |
| `vp pack`（tsdown）dts                           | vite-plus 内置                                                           | 不依赖仓库级 typescript                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 不受影响                                                                                                            |
| `vp build` dts（vite-plugin-dts → unplugin-dts） | **typescript JS API**                                                    | unplugin-dts ≥1.0.0（2026-04-30）对 TS 7+ **自动 fallback** 到 `@typescript/typescript6`（已实测确认安装的 1.1.0 内置该逻辑；未装 fallback 包时报错信息会明确提示安装），见 [1.0.0 release](https://github.com/qmhc/unplugin-dts/releases/tag/unplugin-dts%401.0.0)、[#465](https://github.com/qmhc/unplugin-dts/issues/465)                                                                                                                                                                                                  | **TS 7 兼容**：catalog 升 7.x 不断 dts；但声明生成引擎仍是 TS 6 JS API（fallback），无原生加速                      |
| Vue demo `vue-tsc --build`                       | **typescript JS API**（Volar）                                           | 裸 `typescript@7.x` **不可用**（无 JS API）；tsgo 引擎经 [`typescript-native-bridge`](https://www.npmjs.com/package/typescript-native-bridge) drop-in 提供（API 面=6.0.3、引擎=tsgo 7.0.2，latest `6.0.3-bridge.16`，2026-09-03 仍在更新）；language-tools 仓库自身已于 2026-07-23 迁移（[PR #6129](https://github.com/vuejs/language-tools/pull/6129)，vue-tsc 检查 ~2.7x）；完整原生仍等 7.1 content mappers（#4712）与 TS 插件互操作（[microsoft/TypeScript#63772](https://github.com/microsoft/TypeScript/issues/63772)） | 留在 TS 6；想吃 tsgo 引擎收益需 pnpm override 把 `typescript` 指向 bridge fork（引入对个人维护 fork 的依赖，见 §6） |
| Lit experimentalDecorators（37 文件）            | 编译器 + oxc 转译                                                        | TS 7 支持两种装饰器；Lit 官方要求 `experimentalDecorators + useDefineForClassFields: false`（已显式）                                                                                                                                                                                                                                                                                                                                                                                                                         | 兼容（实测零错误）；长期可迁标准装饰器（`accessor`）                                                                |
| typescript-eslint                                | **本仓库未使用**（lint 规则由 oxlint Rust 原生实现 + tsgolint 提供语义） | typescript-eslint 官方支持范围 `<6.1.0`，tsgo 支持被 7.1 API 阻塞（#10940）                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 风险不存在；无需行动                                                                                                |
| 自写 AST 脚本                                    | 无                                                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 无风险                                                                                                              |
| 编辑器 LSP                                       | workspace typescript 6.0.3                                               | TS 7 LSP 已 GA（VS Code 内置可选原生版）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 建议切换，收益最直接                                                                                                |

来源：[tsgolint README](https://www.npmjs.com/package/oxlint-tsgolint)（node_modules 实读）、[Lit decorators 文档](https://lit.dev/docs/components/decorators/)、[vuejs/language-tools#5381](https://github.com/vuejs/language-tools/issues/5381)、[typescript-eslint dependency-versions](https://typescript-eslint.io/users/dependency-versions/)、[typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)、[Vite 8 博客](https://vite.dev/blog/announcing-vite8)。

---

## 4. 本机实测（2026-09-09，darwin-arm64）

```
$ pnpm dlx typescript@7.0.2 --version
Version 7.0.2

$ tsc --noEmit -p packages/web-ui/tsconfig.app.json        # TS 6.0.3 → 0 错误，1.56s
$ typescript@7.0.2 --noEmit -p ...（同一配置）              # 0 错误，0.36s（~4x）
```

原生 TS 7.0.2 对以下 13 个 tsconfig `--noEmit` **全部零错误**（js-kit app/node、browser-kit app/node、web-ui app/node、unplugin-web-components、deps-reload、react demo app/node），与 tsc 6.0.3 输出完全一致——包括含 `experimentalDecorators` 的 web-ui app 配置。

**附带发现（与 TS 7 无关的存量问题）**：`packages/web-ui/tsconfig.vitest.json` 在 tsc 6.0.3 与 7.0.2 下有完全相同的 3 个既有错误（`lib: []` 导致 `Array.prototype.at` 缺失 ×2、`types: ["node"]` 导致 `setTimeout` 返回 `Timeout` ×1）。该配置的错误不进入 `vp check` 门禁，属历史遗留；升级时顺手清理即可。

（Vue demo 的 `.vue` SFC 需 vue-tsc 虚拟文档，原生 tsc 不适用，未纳入本轮 `--noEmit` 实测。）

---

## 5. 建议路径（渐进，非一刀切）

**Phase 0 —— 已完成**：TS 6.0 桥接（catalog `~6.0.3`，配置面干净，无 `ignoreDeprecations`）。

**Phase 1 —— 零风险感知收益**：

- 编辑器切原生 TS 7 LSP（VS Code 选择 workspace 或内置原生版本），获得秒级首错与全面加速。
- 可选：CI 增加原生 `typescript@7.0.2` 的影子类型检查 job（与现有 `vp check` 并行跑一段时间，对比错误集漂移）。

**Phase 2 —— catalog 语义切换（可选，收益有限）**：

- 若希望 `typescript` 语义统一为 7：`typescript: npm:@typescript/typescript6@^6.0.2`（JS API 消费者）+ 新增原生别名（如 `@typescript/native: npm:typescript@^7.0.2`）。本仓库直接 `tsc` 调用为零，Phase 2 的净收益主要在 Vue demo 的 vue-tsc bridge 加速（~2.7x）与未来工具兼容。
- 2026-09 更新：unplugin-dts ≥1.0.0 已对 TS 7+ 自动 fallback（需同时安装 `@typescript/typescript6`），dts 生成不再是阻塞项；仍会断的是 vue-tsc——除非把 `typescript` override 成 `typescript-native-bridge` fork（获得 ~2.7x，但引入对个人 fork 的依赖）。

**Phase 3 —— 等待 7.1 后收敛为纯 7.x**：

- 7.1 API（`createProgram`/`transpileModule`/solution builder 等，roadmap Committed）落地后，unplugin-dts/tsdown 与 Volar content mappers 跟进，再移除 TS 6 别名；届时可评估 `isolatedDeclarations` 与更快的 Vue 全链路。

**与升级无关但建议顺手做**：清理 §4 所列 `tsconfig.vitest.json` 的 3 个存量错误。

---

## 6. 风险清单

| 风险                                                                                         | 等级 | 缓解                                                                                                                                                          |
| -------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 双引擎并存（tsgolint/TS7 ↔ tsc6）语义/错误消息漂移                                           | 低   | **现状即如此**（vp check 用 TS7 引擎、dts/vue-tsc 用 tsc6），已在共存且未观察冲突；`--skipLibCheck` 下冲突声明在 TS7 会一致报错（CHANGES.md），留意 dts 生成  |
| `stableTypeOrdering` 强制改变错误呈现顺序                                                    | 低   | 语义不变；tsgolint 已按 TS 7 语义运行                                                                                                                         |
| 装饰器输出差异（oxc 转译 vs tsc dts 声明）                                                   | 低   | 实测两编译器零错误；dts 生成链不变仍在 tsc6                                                                                                                   |
| 原生二进制平台覆盖（CI runner 架构）                                                         | 低   | 官方提供 win32/darwin/linux x64+arm64 全套子包                                                                                                                |
| 7.1 API 时间表无承诺日期                                                                     | 中   | Phase 2 是可选优化而非阻塞项；混合态可长期维持                                                                                                                |
| `typescript-native-bridge` 是个人维护的 fork（johnsoncodehk，非 microsoft/vuejs 官方发行物） | 中   | 若为 vue-tsc 采纳 override 方案：锁定精确版本（当前 `6.0.3-bridge.16.tsgo.7.0.2`）、CI 全量验证、关注其与 microsoft 主线的同步节奏（2026-09-03 仍在活跃更新） |
| unplugin-dts 的 TS 7 fallback 要求 `@typescript/typescript6` 与 7.x 同时安装                 | 低   | 未安装时报错信息会明确提示；升级变更中加入该依赖即可                                                                                                          |

---

## 7. 来源

官方一手：[TS 7.0 GA](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)（2026-07-08）· [TS 7.0 RC](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/) · [TS 7.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/) · [TS 6.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-beta/) · [Progress on TS 7（2025-12）](https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/) · [A 10x Faster TypeScript（2025-03）](https://devblogs.microsoft.com/typescript/typescript-native-port/) · [typescript-go wiki](https://github.com/microsoft/typescript-go/wiki/What%27s-currently-supported) · [typescript-go CHANGES.md](https://raw.githubusercontent.com/microsoft/typescript-go/main/CHANGES.md) · [typescript-go#914（装饰器，已修复）](https://github.com/microsoft/typescript-go/issues/914) · [API roadmap #4830](https://github.com/microsoft/typescript-go/issues/4830) · npm registry：`typescript` / `@typescript/typescript6` / `vue-tsc`（2026-09-09 实测查询）

生态：[Lit decorators](https://lit.dev/docs/components/decorators/) · [vuejs/language-tools#5381](https://github.com/vuejs/language-tools/issues/5381) · [vuejs/language-tools PR #6129（typescript-native-bridge 迁移）](https://github.com/vuejs/language-tools/pull/6129) · [unplugin-dts 1.0.0 release（TS 7+ auto fallback）](https://github.com/qmhc/unplugin-dts/releases/tag/unplugin-dts%401.0.0) · [qmhc/unplugin-dts#465](https://github.com/qmhc/unplugin-dts/issues/465) · [microsoft/TypeScript#63772（tsgo 插件互操作）](https://github.com/microsoft/TypeScript/issues/63772) · npm：`typescript-native-bridge` · [typescript-eslint dependency-versions](https://typescript-eslint.io/users/dependency-versions/) · [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) · [Vite 8](https://vite.dev/blog/announcing-vite8) · [api-extractor news](https://api-extractor.com/pages/news/)

仓库事实（源码）：`pnpm-workspace.yaml`（catalog）· `packages/tsconfig/*.json` · `packages/web-ui/tsconfig.{app,vitest}.json` · `vite.config.ts`（`lint.options.typeAware/typeCheck`）· `packages/web-ui/vite.config.ts` · `docs/agents/build.md` · `pnpm exec vp toolchain` · `node_modules/.pnpm/oxlint-tsgolint@7.0.2001/README.md` · 各 `package.json`（grep 验证无 typescript API 消费者与直接 tsc 调用）
