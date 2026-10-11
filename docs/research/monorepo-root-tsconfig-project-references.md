# monorepo 根 `tsconfig.json`（solution style）与 TypeScript Project References 调研

> 回答「根 `tsconfig.json` 用 solution style（`{"files": [], "references": [...]}`）在 monorepo 里是否有真实价值；主流开源 monorepo 实际怎么组织根 tsconfig 与 TypeScript project references」。调研日期 2026-10-09。官方论断追溯 typescriptlang.org / devblogs.microsoft.com；真实仓库论断追溯 GitHub 默认分支（main/master）的原始文件（ref = 抓取时的分支 HEAD）；本仓库行为在 TS 6.0.3 下用受控例程实测。逐条标注「官方文档 / 源码事实 / 实测 / 推断」。

---

## 结论（TL;DR）

1. **官方立场**：project references + `composite` + `tsc -b` 是 TypeScript 官方为一类特定需求（把大程序切成小片、增量构建、强制逻辑分层）设计的机制；官方**明确把「solution `tsconfig.json`」（`files: []` + `references` 指向所有叶子工程）列为一种推荐写法**（TypeScript 仓库自身即此法，`tsc -b src`）。但它同时要求被引用的工程开启 `composite`（官方文档原话：referenced projects **must** have the `composite` setting enabled）。

2. **实测纠偏（本仓库「缺 `composite` 也能 `tsc -b`」的真相）**：不是某个版本放宽了 `composite` 要求，而是**校验路径没被触发**。在 TS 6.0.3 下实测：
   - 只要一个**会编译源码（有输入文件）的工程**声明 `references` 指向一个非 `composite` 工程，**真实 `tsc -b` 立刻报 `error TS6306`（must have setting "composite": true）与 `error TS6310`（may not disable emit）**——即使它并不 `import` 那个被引用工程。
   - 而**纯 solution 工程**（`files: []`、只含 `references`）的 `references` **不触发**这两条校验。本仓库所有声明 `references` 的工程都是纯 solution（根 + 各包/各 app 的 `tsconfig.json`），所以 `tsc -b` 不报错。
   - 另：`tsc -b --dry` **不做**该校验（实测同一配置 `--dry` 退出 0、真实构建报错），不能用 `--dry` 当门禁。
   - TS 5.6 的 `--build` 变更（见 §1.5）是「允许带中间错误继续构建 / `--stopOnBuildErrors`」，与 `composite` 无关；**没有任何官方 release note 记录过「放宽 `composite` 要求」**。因此这是一个**未被文档化的实现行为**，脆弱：一旦某个有源码的工程加上 `references`，就会立刻爆 `TS6306`。

3. **主流模式（源码事实，9 个仓库）**：**两条路线并存，且使用 Turborepo 的一侧几乎一致地「不用根 solution、不用 references」**。
   - **不用 references / 无根 solution**：vercel/turborepo 自身、其 `examples/*` 与 `create-turbo` 脚手架、t3-oss/create-t3-turbo、vitejs/vite、TanStack/router。
   - **用 references + solution**：TypeScript 自身（官方范例）、Nx（`tsconfig.base.json` + 每项目 solution `tsconfig.json` 引用 `tsconfig.lib.json`）。
   - **中间态（单一根 tsconfig、无 references）**：vuejs/core（根 `tsconfig.json` 自身 `composite: true` + `paths` 映射到 `packages/*/src`）、TanStack/query（根 `tsconfig.json` `composite: true`，只 include 根配置/`knip.ts`）。
   - **Turborepo 官方文档明确反对**：`You likely don't need a tsconfig.json file in the root` 与 `You likely don't need TypeScript Project References`。

4. **根 solution tsconfig 真正买到的东西**只有三件：① 编辑器跨工程跳转/重命名（依赖 `declarationMap`）；② `tsc -b` 的增量构建图（依赖 `composite` + `declaration`）；③ CI 里一个 `tsc -b` 单入口。**三者都不需要时，它就是纯 vestigial（残留物）。**

5. **对本仓库的结论：DELETE（删除根 `tsconfig.json`）**。理由：没有任何脚本 / CI / hook 跑 `tsc -b`（源码事实）；类型检查已由 `vp check`（oxlint + tsgolint，TS 7 引擎）与各 app 的 `vue-tsc --build` 承担；被引用工程无 `composite`，构建图无增量价值；references 已漂移（缺 `apps/interweave/frontend`、`packages/test-kit`）；本仓库所用工具 Turborepo 官方建议就是「不要根 tsconfig、不要 project references」。若某天想保留「单一 `tsc -b` 入口」，才需要按 §5 的 REPAIR 条件补 `composite`、`declarationMap`、修 references 并接入脚本——但那与现有 `vp check` 工具链是**并行重复的第二个类型检查器**，收益为负。

---

## 1. TypeScript 官方立场（官方文档）

来源：[Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)（页面 Last updated: Sep 28, 2026）、[`composite`](https://www.typescriptlang.org/tsconfig/composite.html)、[tsc CLI Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)、[TSConfig Reference](https://www.typescriptlang.org/tsconfig)。

### 1.1 `references` / project references 是什么

- TS 3.0 起，`tsconfig.json` 支持顶层 `references`（数组，元素 `{ "path": ... }`，path 可指向目录或任意命名的配置文件）。
- 引用生效后：**从被引用工程 import 会改为加载它的输出 `.d.ts`**；build mode 会自动按需构建被引用工程。
- 目的（官方原话）：`greatly improve build times, enforce logical separation between components`，并在编辑器中 `reduce memory usage`。

### 1.2 `composite`：被引用的前提

- 官方文档：**`Referenced projects must have the new composite setting enabled.`**
- `composite` 官方选项页定义：`Enable constraints that allow a TypeScript project to be used with project references.` 开启后：
  - `rootDir` 未显式设置时默认 = 该 tsconfig 所在目录；
  - 所有实现文件必须被 `include`/`files` 匹配（否则报错指出漏掉的文件）；
  - `declaration` 默认变为 `true`（历史文档另一处表述为「必须开启」）。

### 1.3 `tsc -b`（build mode）

- 官方定位：`--build` 是 `tsc` 的**另一个入口**，更像构建编排器：找到所有被引用工程 → 判断是否 up-to-date → 按正确顺序构建过期工程。
- 常用开关：`--verbose`、`--dry`（只显示、不构建）、`--clean`、`--force`、`--watch`。
- 关键语义：**`tsc -b` 对所有工程等价于开启 `noEmitOnError`**（否则过期依赖的错误只会出现一次）。
- 相关选项（TSConfig Reference「Projects」组）：`disableReferencedProjectLoad`、`disableSolutionSearching`、`disableSourceOfProjectReferenceRedirect`。
- `declarationMap`：官方说明它让编辑器能**跨工程边界透明地**「Go to Definition」与 Rename。

### 1.4 官方推荐的「solution」根 tsconfig（本仓库根文件的写法来源）

官方 Project References 文档的 Guidance 原文（**这就是本仓库根 `tsconfig.json` 的模板**）：

> Another good practice is to have a "solution" `tsconfig.json` file that simply has `references` to all of your leaf-node projects and sets `files` to an empty array (otherwise the solution file will cause double compilation of files). Note that starting with 3.0, it is no longer an error to have an empty `files` array if you have at least one `reference` … This presents a simple entry point; e.g. in the TypeScript repo we simply run `tsc -b src` to build all endpoints.

- 即：`{"files": [], "references": [...]}` 是**官方成文推荐的 pattern**，不是野路子。
- 但它配套的隐含前提是：**存在 `tsc -b` 消费者**，且被引用工程成 `composite`。缺任一项，这个 solution 文件就只剩「一个空的 references 列表」。

### 1.5 TS 5.6+ 对 `--build` 的真实改动（与 `composite` 无关）

来源：[Announcing TypeScript 5.6](https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/)（2024-09-09）。

- 新增 `--noCheck`：可对 `--build` 使用「跳过类型检查的 emit」。
- **`Allow --build with Intermediate Errors`**：自 5.6 起 `tsc -b` **在遇到错误时仍继续构建**其余工程；若想回到旧行为，用新旗标 `--stopOnBuildErrors`。
- 结论：TS 5.6 之后的 `--build` 变化集中在「错误处理/`--noCheck`」，**没有**任何官方来源说 `composite` 不再是被引用工程的必需项。故本仓库「无 `composite` 也 `tsc -b` 通过」**不能用版本放宽来解释**，只能按 §2 的实测解释。

---

## 2. 本仓库实测：缺 `composite` 为何仍能 `tsc -b`（实测）

环境：本仓库 `pnpm exec tsc --version` → **Version 6.0.3**（darwin-arm64，2026-10-09）。测试例程全部建在 `/tmp/tsref*`，不触碰仓库。

| 例程 | 结构                                                                                                                                                                | 命令                           | 结果                                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | `b/`（**有源码**）`references: [{path:"../a"}]`，`a/` 无 `composite`、`noEmit: true`                                                                                | `tsc -b --verbose ./b`         | **报错** `error TS6306: Referenced project 'a' must have setting "composite": true.` + `error TS6310: Referenced project 'a' may not disable emit.` |
| A'   | 同 A，但 `b` 的源码**不 import** `a`                                                                                                                                | `tsc -b --verbose ./b`         | **同样报 TS6306 + TS6310**（触发条件是「声明了 references 且自身会编译」，不是「实际 import」）                                                     |
| A''  | 同 A，只把命令换成                                                                                                                                                  | `tsc -b --dry ./b`             | **退出 0、不报错**（`--dry` 跳过该校验）                                                                                                            |
| B    | **复刻本仓库拓扑**：根 solution → 包 solution（`files: []` + references）→ 叶子 app/node（**无 `composite`**、继承 `noEmit: true`）；根 solution 另直接引用一个叶子 | `tsc -b --verbose`（真实构建） | **退出 0，无 TS6306/TS6310**                                                                                                                        |

**结论（实测）**：

- `composite` / `may not disable emit` 的校验**只在「会编译源码的工程」声明 `references` 时执行**；**纯 solution 工程（`files: []`）的 `references` 不触发校验**。
- 本仓库所有带 `references` 的配置都是纯 solution（根 `tsconfig.json`，以及 `packages/{js-kit,browser-kit,web-ui}/tsconfig.json`、`apps/{react-web-ui-demo,vue-web-ui-demo,interweave/frontend}/tsconfig.json` 都是 `{"files": [], "references": [...]}`）；叶子 `tsconfig.{node,app,vitest}.json` 只有 `include`、没有 `references`。因此没有任何「会编译的工程」声明 references → 校验永不触发 → `tsc -b` 表面「能用」。
- 这是**未文档化的实现行为**（官方文档仍写 `must have composite`），**不要依赖**：只要把某个跨包依赖从「workspace package name」改成「TS `references`」，或给任一有源码的 tsconfig 加 `references`，`tsc -b` 立即报 `TS6306`/`TS6310`。
- `tsc -b --dry` 不能当门禁（不校验 composite/emit）。

---

## 3. 主流仓库如何组织根 tsconfig 与 references（源码事实）

以下均为 GitHub 默认分支原始文件（ref = 抓取时 HEAD，2026-10-09）。

| 仓库                                                                       | 根 `tsconfig.json`                                                                                                                               | 根是否 solution（`files: []` + references） | 子项目 `composite`                                                      | 类型检查实际入口                                                                                  | 备注                                                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **vercel/turborepo**（自身）                                               | 有，**单项目**：`target ES2018`、`module/moduleResolution nodenext`、`outDir dist`、`paths`                                                      | 否（有 `compilerOptions`，无 `references`） | 不适用                                                                  | 根脚本是 Rust/cargo；无 JS `tsc -b`                                                               | 官方 TypeScript guide 亦不推荐 references                                                                                                            |
| **vercel/turborepo `examples/basic`**（= `create-turbo` 核心示例 "Basic"） | **无根 `tsconfig.json`**（`examples/basic/tsconfig.json` 404）                                                                                   | —                                           | 共享 `packages/typescript-config/base.json` **无 `composite`**          | 根 `"check-types": "turbo run check-types"`；每包 `tsc --noEmit`                                  | `verify`：`examples/basic/package.json`、`turbo.json`（`check-types` task）                                                                          |
| **vercel/turborepo `examples/with-vite`**                                  | **无根 `tsconfig.json`**                                                                                                                         | —                                           | —                                                                       | `turbo run build/lint`                                                                            | `examples/with-vite/package.json`                                                                                                                    |
| **nrwl/nx**（自身）                                                        | **无 `tsconfig.json`**；根为 **`tsconfig.base.json`**（供 extends，`composite: true`、`declarationMap: true`、无 `references`）                  | 否                                          | 叶子 `packages/nx/tsconfig.lib.json` **`composite: true`**              | 每项目 `tsc` / Nx target                                                                          | `packages/nx/tsconfig.json` 是**项目级 solution**：`{"extends":"../../tsconfig.base.json","files":[],"references":[{"path":"./tsconfig.lib.json"}]}` |
| **Nx 官方文档**（生成/迁移工作区）                                         | 用 `tsconfig.base.json` 共享配置                                                                                                                 | 项目 `tsconfig.json` 为 solution            | `composite: true` + `declaration: true`                                 | Nx 的 `build`/`typecheck` inferred targets                                                        | 文档：`Each project's tsconfig.json should extend tsconfig.base.json and list references to its dependencies.`                                       |
| **vitejs/vite**                                                            | **无根 `tsconfig.json`**；有 `scripts/tsconfig.json`                                                                                             | 否                                          | —                                                                       | 根 `"typecheck": "tsc -p scripts && pnpm -r --parallel run typecheck"`                            | 无 build mode、无 references；逐包并行 `tsc`                                                                                                         |
| **vuejs/core**                                                             | 有，**单项目**：`composite: true`、`isolatedDeclarations: true`、`paths` 把 `@vue/*` 映射到 `packages/*/src`、include 全量 packages              | 否（**无 references**）                     | 根自身 `composite: true`（但未被引用）                                  | 根 `"check": "tsc --incremental --noEmit"`；`build-dts` 用 `tsc -p tsconfig.build.json --noCheck` | 用 `paths` 直连源码，而非 references                                                                                                                 |
| **TanStack/router**                                                        | 有，**单项目**：`noEmit: true`，`include: ["*.config.*", "scripts"]`                                                                             | 否（无 references）                         | —                                                                       | 交给 **Nx**：根脚本 `test:types` 等走 `nx affected/run-many --target=test:types`                  | 根 tsconfig 只服务根部配置文件/脚本                                                                                                                  |
| **TanStack/query**                                                         | 有，**单项目**：`composite: true`、`declaration: true`、`declarationMap: true`、`emitDeclarationOnly: true`，`include: ["*.config.*","knip.ts"]` | 否（**无 references**）                     | 根自身 `composite: true`                                                | （本轮未核查其脚本）                                                                              | 根自身 composite，但无 references                                                                                                                    |
| **t3-oss/create-t3-turbo**                                                 | **无根 `tsconfig.json`**                                                                                                                         | —                                           | 共享 `tooling/typescript/base.json` **无 `composite`、无 `references`** | 根 `"typecheck": "turbo run typecheck"`（每包 `tsc`，`tsBuildInfoFile` 指 `.cache/`）             | base 设 `incremental: true` + `disableSourceOfProjectReferenceRedirect: true`，并注释 `Keep TSC performant in monorepos`                             |
| **pnpm**（workspace 官方文档）                                             | 文档**未规定**任何 tsconfig 组织方式                                                                                                             | —                                           | —                                                                       | —                                                                                                 | `pnpm.io/workspaces` 全文不含 tsconfig/typescript/references 处理约定（仅讲 `pnpm-workspace.yaml`、`workspace:` 协议、link 策略）                    |

补充（源码事实）：

- **Turborepo 官方 TypeScript guide** 有两节标题即结论：`You likely don't need a tsconfig.json file in the root of your project` 与 **`You likely don't need TypeScript Project References`**。后者原文：`We don't recommend using TypeScript Project References as they introduce both another point of configuration as well as another caching layer to your workspace. Both of these can cause problems in your repository with little benefit, so we suggest avoiding them when using Turborepo.`
- **Nx 官方文档**（另一页 [TypeScript Project Linking](https://nx.dev/docs/kb/typescript-project-linking)）：项目 `tsconfig.json` 应只含 `compilerOptions`，且 `compilerOptions.composite` 与 `compilerOptions.declaration` 置 `true`；这与 Nx「每项目 solution + 叶子 composite」的模式一致。

---

## 4. 综合：行业模式与「根 solution tsconfig 到底买到什么」

### 4.1 谁在用什么

- **Turborepo 生态（本仓库所在生态）**：turborepo 自身、`examples/*`、`create-turbo`、create-t3-turbo **一致地**没有根 solution、没有 references；类型检查统一交给 `turbo run check-types` / `turbo run typecheck` 这类**逐包并行 `tsc`**（配合缓存），而不是 `tsc -b`。Turborepo 文档还专门解释「references 会多一层缓存/配置，收益小」。→ **这是与「根 solution 有价值」最直接冲突的一手证据。**
- **Nx 生态**：走 references 路线，但形态是**「根 `tsconfig.base.json`（extends）+ 每项目 solution `tsconfig.json`（引 `tsconfig.lib.json`/`tsconfig.spec.json`）」**，根上**没有** `tsconfig.json`。由 Nx 的 inferred target 驱动 `tsc`。
- **TypeScript 自身**：官方范例，根 `src/tsconfig.json` 是 solution，`tsc -b src` 一次构建所有 endpoint。这是「根 solution 有真实价值」的**唯一强样本**——因为它真的把 `tsc -b` 当构建入口，且全图 `composite`。
- **单项目大 config（vue/core、TanStack/query）**：用一个根 `tsconfig.json`（常带 `composite`/`paths`）覆盖全仓，靠 `paths` 直连源码或靠 workspace 解析，**不用 references**。
- **pnpm**：不表态（不规定 tsconfig），即「工具层不把根 tsconfig 视为必需」。

**一句话**：references/solution 是「TS 原生构建编排」路线（TypeScript 仓库、Nx）的选择；bundler/任务编排器驱动（Turborepo、Vite）的仓库普遍**回避**它。

### 4.2 根 solution tsconfig 的真实收益（条件成立时）

| 收益                                                | 成立条件                                  | 本仓库是否成立                                  |
| --------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| 编辑器跨工程 go-to-definition / rename 透明         | 被引用工程开 `declarationMap`（官方明说） | ❌ 无 `declarationMap`、无 `composite`          |
| `tsc -b` 增量构建图（只重编过期子工程、按依赖顺序） | 被引用工程 `composite: true`              | ❌ 全仓无 `composite`                           |
| CI 单一 `tsc -b` 类型检查入口                       | 有脚本/CI 调用 `tsc -b`                   | ❌ 无脚本、无 CI、无 hook 调用 `tsc -b`         |
| 强制逻辑分层（子工程不能反向 import）               | 依赖通过 `references` 表达                | ❌ 包间靠 workspace package name，非 references |

四项全不成立 → 根 solution 在本仓库**不承载任何机制**。

### 4.3 什么时候根 solution 是 load-bearing vs. vestigial

- **load-bearing（值得保留）**：① 你要用 `tsc -b` 做**单一构建/类型检查入口**（CI/hook 里真的跑）；② 全图 `composite: true` 且依赖顺序有实际意义；③ 需要 `declarationMap` 带来的跨工程编辑器导航；④ 发布型 library 需要按依赖顺序产出 `.d.ts`。
- **vestigial（残留物）**：① 类型检查已由别的 checker 承担（bundler-native checker、`vue-tsc`、oxlint-tsgolint 等）；② 没有任何 `tsc -b` 消费者；③ 被引用工程无 `composite`；④ 包间依赖靠 workspace/`paths` 解析而非 `references`；⑤ references 列表与真实工程集合已漂移。**命中任一条，就该质疑它的存在理由。**

---

## 5. keep / repair / delete 判据（针对本仓库）

### 5.1 本仓库现状（源码事实）

- 根 `tsconfig.json` = `{"files": [], "references": [5 个 package + 2 个 app]}`。
- **无任何脚本/CI/hook 跑 `tsc -b`**：根 `package.json` 的 `check-code` = `check-cspell && vp check && check-go && check-stylelint`；直接 `tsc` 调用为零。
- 类型检查实际由：`vp check`（oxlint + tsgolint，typescript-go / TS 7 引擎，**自行发现 tsconfig**）、各 app 的 `vue-tsc --build`（`apps/vue-web-ui-demo`、`apps/interweave/frontend`）承担。
- 全仓 **0 处 `composite`**；被引用工程也无 `declarationMap`。
- references 已漂移：`apps/interweave/frontend`、`packages/test-kit` **未列入**根 references（与 §2 结论呼应：反正不触发校验，漂移无人察觉）。
- 包以 **compiled package** 形态暴露类型（如 `@greypan/js-kit` 的 `exports.types` → `./dist/*.d.ts`），消费走 `dist` 声明文件，不经 `references`。

### 5.2 判定表

| 动作       | 适用条件                                                | 本仓库是否满足                                                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **KEEP**   | 有 `tsc -b` 消费者 + 全图 `composite` + references 完整 | ❌                                                                                                                                                                                                                                                           |
| **REPAIR** | 想引入「单一 `tsc -b` 入口」这一能力                    | 仅当同时做：给每个被引用工程加 `composite: true` + `declarationMap`（注意 `noEmit` 会被 `composite` 要求打破，需改为 emit 或 `emitDeclarationOnly`）、补齐漂移 references、新增并接入 `tsc -b` 脚本/CI——**代价是与现有 `vp check` 并行维护第二个类型检查器** |
| **DELETE** | references 无消费者 + 类型检查另有入口 + 无 `composite` | ✅                                                                                                                                                                                                                                                           |

### 5.3 结论与建议

**建议 DELETE 根 `tsconfig.json`**，理由按证据强度排序：

1. **没有任何消费者**（源码事实）：无脚本、无 CI、无 hook 跑 `tsc -b`；`vp check` 自己发现 tsconfig。文件当前是死配置。
2. **提供不了官方列出的任何收益**（§4.2 四项全空）：无 `composite`→无增量图；无 `declarationMap`→无编辑器跨工程导航；无调用方→无 CI 入口；无 references 依赖边→无分层约束。
3. **与所用工具的一手建议相反**：Turborepo 官方文档明确「不要根 tsconfig、不要 references」。本仓库正是 Turborepo 仓库。
4. **它是误导性信号**：solution 文件在「读起来像」这套仓库有 TS 项目图，实际上面 §2 已证该校验根本不触发、references 还漂移，容易让人误以为「改 references 就生效」。
5. **删除零风险**：类型检查由 `vp check` / `vue-tsc --build` 承担，删除根 solution 不影响任何门禁；编辑器依赖 workspace/`exports`+`dist` 解析，也依赖不到 references。

**若未来真需要「一个 `tsc -b` 入口」**（例如想在 CI 里跑一次全图类型检查、或把类型检查从 `vp check` 迁到原生 `tsc`），才按 REPAIR 做全套：加 `composite`、加 `declarationMap`、修 references、写脚本，并**移除并行的重复检查**——否则不要保留一个没人调用、无法触发机制的 solution 壳。

> 注：本调研只做结论与判据，不实施删除或修复；删除根 `tsconfig.json` 属独立变更任务，需按仓库 workflow 立项并验证 `vp check` / 各 app `vue-tsc --build` 不受影响。

---

## 6. 来源

**TypeScript 官方一手**

- [Project References（handbook）](https://www.typescriptlang.org/docs/handbook/project-references.html)（含 solution 写法、`composite` must、`tsc -b`、`declarationMap` 的原文；Last updated Sep 28, 2026）
- [`composite` 选项](https://www.typescriptlang.org/tsconfig/composite.html)
- [tsc CLI Options（`--composite` / `--build` / `--dry` / `--force` 等）](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TSConfig Reference（Projects 组：`disableReferencedProjectLoad` / `disableSolutionSearching` / `disableSourceOfProjectReferenceRedirect`）](https://www.typescriptlang.org/tsconfig)
- [Announcing TypeScript 5.6（`--noCheck`、`Allow --build with Intermediate Errors`、`--stopOnBuildErrors`，2024-09-09）](https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/)
- [Announcing TypeScript 6.0（2026-03-23；本轮通读，未含 references/composite 放宽）](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)

**真实仓库原始文件（ref = GitHub 默认分支 HEAD，抓取于 2026-10-09）**

- vercel/turborepo `@main`：`tsconfig.json`、`package.json`、`examples/basic/package.json`、`examples/basic/turbo.json`、`examples/basic/packages/typescript-config/base.json`、`examples/with-vite/package.json`
- nrwl/nx `@master`：`tsconfig.base.json`、`packages/nx/tsconfig.json`、`packages/nx/tsconfig.lib.json`
- vitejs/vite `@main`：`package.json`（根 `tsconfig.json` 抓取 404，无该文件）、`scripts/tsconfig.json`
- vuejs/core `@main`：`tsconfig.json`、`package.json`
- TanStack/router `@main`：`tsconfig.json`、`package.json`
- TanStack/query `@main`：`tsconfig.json`
- t3-oss/create-t3-turbo `@main`：`package.json`（根 `tsconfig.json` 抓取 404，无该文件）、`turbo.json`、`tooling/typescript/base.json`、`apps/nextjs/tsconfig.json`

**工具官方文档**

- [Turborepo TypeScript guide（"You likely don't need a tsconfig.json file in the root" / "You likely don't need TypeScript Project References"）](https://turborepo.com/docs/guides/tools/typescript)
- [create-turbo 参考（"Basic" = `examples/basic`）](https://turborepo.com/docs/reference/create-turbo)
- [Nx: Switch to Workspaces and Project References](https://nx.dev/docs/kb/switch-to-workspaces-project-references)
- [Nx: TypeScript Project Linking（项目 tsconfig 只含 compilerOptions，`composite`+`declaration` 为 true）](https://nx.dev/docs/kb/typescript-project-linking)
- [Nx with TypeScript（`build.configName` 默认 `tsconfig.lib.json`）](https://nx.dev/docs/technologies/typescript/introduction)
- [pnpm Workspace 文档（未规定 tsconfig 组织）](https://pnpm.io/workspaces)

**本仓库源码事实与实测**

- 源码：根 `tsconfig.json`；`packages/{js-kit,browser-kit,web-ui,unplugin-web-components,deps-reload,test-kit}/tsconfig*.json`；`apps/{react-web-ui-demo,vue-web-ui-demo,interweave/frontend}/tsconfig*.json`；`packages/tsconfig/base.json`；根 `package.json`（`check-code` 等脚本）；`packages/js-kit/package.json`（`exports.types` → `dist`）；`node_modules` 中 vite-plus `docs/guide/check.md`（tsconfig 自动发现）。
- 实测（TS 6.0.3，darwin-arm64，2026-10-09）：`pnpm exec tsc --version` = 6.0.3；`/tmp/tsref`、`/tmp/tsref2`、`/tmp/tsref3` 受控例程见 §2 表。
