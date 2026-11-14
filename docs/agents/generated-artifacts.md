# 生成物清单

这份文档只回答一个问题：仓库里哪些文件是生成的、由谁生成、怎么重新生成。生成物的生命周期与验证由对应构建和测试流程维护。

## 清单

| 产物                   | 路径                                                                                                                                                                                       | generator                                                                                      | 触发方式                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web-ui` icon 模块     | [`packages/web-ui/src/icons/index.ts`](../../packages/web-ui/src/icons/index.ts)、`packages/web-ui/src/icons/generated/**`                                                                 | [`packages/web-ui/scripts/generate-icons.ts`](../../packages/web-ui/scripts/generate-icons.ts) | `pnpm --filter @greypan/web-ui generate-icons`，产物入库                                                                                                                                                                                                                                                                                        |
| TanStack Router 路由树 | [`apps/react-web-ui-demo/src/routeTree.gen.ts`](../../apps/react-web-ui-demo/src/routeTree.gen.ts)                                                                                         | TanStack Router 的 Vite 插件                                                                   | React demo 的 dev 与 build                                                                                                                                                                                                                                                                                                                      |
| vue-router 路由类型    | [`apps/vue-web-ui-demo/typed-router.d.ts`](../../apps/vue-web-ui-demo/typed-router.d.ts)、[`apps/interweave/frontend/typed-router.d.ts`](../../apps/interweave/frontend/typed-router.d.ts) | unplugin-vue-router                                                                            | 对应宿主的 dev 与 build                                                                                                                                                                                                                                                                                                                         |
| auto-import 声明       | [`apps/vue-web-ui-demo/auto-imports.d.ts`](../../apps/vue-web-ui-demo/auto-imports.d.ts)、[`apps/interweave/frontend/auto-imports.d.ts`](../../apps/interweave/frontend/auto-imports.d.ts) | unplugin-auto-import                                                                           | 对应宿主的 dev 与 build                                                                                                                                                                                                                                                                                                                         |
| demo 文档 meta 与代码  | `apps/react-web-ui-demo/src/generated/**`、`apps/vue-web-ui-demo/src/generated/**`                                                                                                         | `@greypan/md-to-meta` 的 Vite 插件                                                             | 宿主 dev 与 build；输入是 `packages/web-ui/docs/*.md`（中文源 `.CN.md` + 英文译文 `.md`）、`packages/web-ui/CHANGELOG.md` 与 `packages/web-ui/README*.md`；README 使用 `src/generated/readme/` 的独立 output 且不执行围栏；CI 在宿主 build 前有只判校验步（`check-generated`）；版本 PR 由 `changeset-version.sh` 在 CHANGELOG 变更后显式重生成 |
| Wails Go bindings      | `apps/interweave/frontend/bindings/**`                                                                                                                                                     | Wails bindings generator（单一入口）                                                           | `pnpm exec turbo build --filter=@greypan/interweave-frontend`                                                                                                                                                                                                                                                                                   |
| 壳文案 catalog         | `apps/{react,vue}-web-ui-demo/src/locales/.wuchale/**`、`src/locales/*.loader.js`、`src/locales/{data,plural}.js`                                                                          | `wuchale` 的 Vite 插件与 CLI                                                                   | 宿主 dev 与 build 按 PO 重编译；增删壳文案后在应用目录跑 `pnpm exec wuchale --clean` 把 msgid 写进 PO；产物全部 gitignore                                                                                                                                                                                                                       |

`apps/*/src/generated/**` 里是 `theme.css`、逐文档的 `<basename>.meta.js` / `<basename>.meta.d.ts` 与 `codeblock/**`，同一次生成一起写盘，不要挑其中某一类单独改。文件名即文档身份（`button.CN`、`button`、`CHANGELOG`），不做 locale 解释；语种由宿主按 `.CN` 后缀判定，两个 demo 都平铺在各自的 `src/generated/`。`codeblock/**` 的每个文件都是某条围栏原文的落点，按内容 hash 寻址、跨文档去重；它们是会被真正编译执行的源码（命中 `exec` 的语言带 `load`），但落盘字节是围栏原文的逐字节副本，因此不参与 lint 与 format——任何自动改写都会破坏「围栏字节 = 落盘文件 = 页面文本」的一致性。

`apps/{react,vue}-web-ui-demo/src/locales/*.po` 反过来：它是**入库的译文源**，手写（英文由 agent 翻译后写回同一份 PO），不是生成物，也不由 generator 覆盖。PO 与代码抽取的一致性由两端应用的 `catalog.spec.ts` 随 `pnpm run test` 验证。

## 怎么判断一个文件是不是生成的

判据只有一条：**能不能由 generator 完整重建**。文件头标记是线索，不是定义——本仓库既有生成物不带任何标记（`packages/web-ui/src/icons/generated/**`、`apps/*/src/generated/**/codeblock/**`），也有带 `DO NOT EDIT` 却与本仓 generator 无关的文件（`.agents/skills-vendored/**`、`apps/interweave/build/windows/nsis/**` 是上游产物）。拿不准时按生成物处理：跑一次 generator 的代价远小于手改一次产物。

按成本从低到高，能定性就停：

1. **看文件头**。命中下列任一串即可定性：`Auto-generated by scripts/generate-icons.ts`（icon barrel）、`automatically generated by TanStack Router`（路由树）、`Generated by vue-router. !! DO NOT MODIFY THIS FILE !!`（路由类型）、`Generated by unplugin-auto-import`（auto-import 声明）、`本文件由 @greypan/md-to-meta 生成`（`*.meta.js`、`*.meta.d.ts`、`theme.css`）、`This file is automatically generated. DO NOT EDIT`（Wails bindings）。全仓扫一遍：

   ```sh
   git grep -l -E "Auto-generated|automatically generated|DO NOT (EDIT|MODIFY)|请勿手动编辑"
   ```

   没命中不代表手写，只代表这条线索用完了，进第 2 层。

2. **找写盘方**。搜「谁把这个路径写出来」，比看目录名可靠：

   ```sh
   git grep -n "writeFileSync\|writeFile(" -- packages apps        # 写盘点
   git grep -n "generated" -- packages/md-to-meta/src              # 输出目录由宿主配置传入，引擎只认 output
   grep -n '"generate' packages/*/package.json apps/*/package.json # 包内 generator 脚本
   ```

   写盘方的输出路径等于该文件路径，或以该目录为根（`src/generated`、`src/icons/generated`），就是生成物。

3. **反向验证（最硬）**。把文件挪走，跑 generator，看它是否原样重建：

   ```sh
   mv apps/react-web-ui-demo/src/generated/button.CN.meta.js /tmp/
   pnpm exec turbo build --filter=@greypan/react-web-ui-demo   # 让 Vite 插件写盘；dev 也可以
   git status --short apps/react-web-ui-demo/src/generated
   ```

   重建出来且 `git status` 干净 = 生成物且 generator 幂等。icon 脚本实测如此：移走一个 `icons/generated/*.ts`，`pnpm --filter @greypan/web-ui generate-icons` 原样补回，无 diff。没重建只有两种解释：不是生成物，或 generator 不负责它——回第 2 层确认，不要因为没重建就手写补回。

**看起来像但不是**：`apps/*/env.d.ts`（手写，只有 reference types）、`dist/**`（构建产物，已 gitignore）、`**/__screenshots__/` 与 `**/.vitest-attachments/`（测试证据，二进制）、[`pnpm-lock.yaml`](../../pnpm-lock.yaml)（工具写盘但属 source of truth，只能由 pnpm 改）。

## 要更新就跑 generator

生成文件不是 source of truth。跑对应 generator 让工具产生 diff，再核对生成结果与消费者；禁止手写新建或手工编辑生成文件，也不要用复制、补丁或格式化工具直接改写输出。`packages/web-ui/docs/*.md` 是 demo 组件文档的输入（中文源 `.CN.md`、英文译文 `.md`），`packages/web-ui/CHANGELOG.md` 是 changelog 页的输入，`packages/web-ui/README*.md` 是快速开始页的输入。改组件 API 必须同时改对应 markdown，generator 只负责把 markdown 落到两端产物。

`apps/interweave/frontend/bindings/**` 只经单一 generator 入口生成：生成过程不得删除已有文件，并用产出集合守卫防止静默少产出，陈旧文件由人工清理。

## 机器拦截的覆盖面

[`.claude/settings.json`](../../.claude/settings.json) 的 `permissions.deny` 是这些路径的权威名单：上表每一类**入库**生成物都有对应条目，另外拦截 `.env` 读取。它只挡工具调用，不挡 generator，所以「跑 generator 产生 diff」的正常路径不受影响。审查侧的 `REVIEW_EXCLUDE_PATHSPECS` 不是这份名单的复制（见下文「审查范围与编辑拦截的分工」），但两者覆盖的入库生成物必须一致：脚本单测用 git 的 glob 引擎比对两份名单命中的真实入库文件集合，再用一张显式覆盖表挡单侧增删；覆盖表与样例是人工维护的，新增生成物时仍须按判据逐条核对（尚无文件入库的新路径不在集合断言射程内）。

已 gitignore 的编译目录不在名单里（wuchale 的 `src/locales/.wuchale/**`、各包 `dist/**`）：它们永远不进 diff，手改的后果由下一次重编译原样收走，拦不住也不必拦。

`**/__screenshots__/` 与 `**/.vitest-attachments/` 是测试证据而不是生成物，故意不进 `deny`：基线由测试运行器写盘，拦手改既拦不彻底，又会挡掉显式更新基线的正当路径。

## 审查范围与编辑拦截的分工

**生成物不需要 diff，也不需要 review。** 它由 generator 完整重建，没有需要人判断的改动；让它们进 `pr.diff` 与 `review-scope.json` 的 `changed_paths`，只会淹没真实源码改动、吃掉大 PR 的审查预算。首次审查与各轮增量复审均在 `git diff` 入口用 `REVIEW_EXCLUDE_PATHSPECS` 把本文清单里的**入库生成物整批滤除**：

| 过滤路径                                                              | 覆盖的清单条目                                                               |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `**/generated/**`                                                     | demo 文档 meta/codeblock、`icons/generated/**`（目录型，重建时整批换哈希名） |
| `apps/*/frontend/bindings/**`                                         | Wails Go bindings                                                            |
| `**/routeTree.gen.ts`、`**/typed-router.d.ts`、`**/auto-imports.d.ts` | 各宿主的单文件生成声明                                                       |
| `packages/web-ui/src/icons/index.ts`                                  | icon barrel                                                                  |

路径参考 [`.claude/settings.json`](../../.claude/settings.json) 的 `permissions.deny`，但按本文清单取可表达的最小 glob：单文件生成物收到具体文件（`icons/index.ts` 而不是整个 `icons/**`），目录型产物仍按目录通配。过滤是**按本文判据取路径**，不是按目录名猜——新文件该不该进名单，仍用「能不能由 generator 完整重建」判定。名单必须留在取自 PR base 的可信脚本里：从 PR head 的工作树读它，等于让作者自己定义审查范围。`review-scope.json` 记 `excluded_pathspecs`、`changed_paths` 与 `empty_diff` 供审计，覆盖边界见 [ADR-0021](../adr/0021-codex-review-gate.md)「审查范围」。

滤除不等于免于核对，两者是不同职责：

- 滤除清单决定**自动审查看什么**；被滤除的生成物不进 `coverage.inspected`，也不算 `coverage.uncovered`——那不是「没查完」，是「不需要查」。
- 本文清单决定**人怎么核对**：generator 重建、适用的 `check-generated` 只判校验、消费者类型检查。生成物的正确性由 generator 幂等与相应守卫保证，不由审查意见保证；`reviewed` + `Block 0` 也不代表 `check-generated` 已过。
- 人工审查也使用滤除生成物的源码 diff，生成物另按清单核对；自动结论不得表述成「已看过 PR 的全部改动」。

新增生成物时的同步清单见下一节；落在 `**/generated/**` 下已被上表覆盖，其余按上表补可表达的最小 glob。

## 新增生成物时

同时更新，缺一处就会漂：本文的清单表与过滤路径表、turbo inputs 与产出集合守卫、[`.claude/settings.json`](../../.claude/settings.json) 的 `deny`、受影响包的测试、审查侧的 `REVIEW_EXCLUDE_PATHSPECS` 与脚本单测里的 deny 覆盖表及样例、审查 prompt（只有措辞变化时才动），以及 ADR-0021 的生成物滤除口径正文与验收项。口径见上文「审查范围与编辑拦截的分工」。根 [`AGENTS.md`](../../AGENTS.md) 只指向本文，不复制清单。
