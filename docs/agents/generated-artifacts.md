# 生成物清单与审查滤除

判据只有一条：**能否由 generator 完整重建**。入库生成物禁止手写、手改或用格式化/补丁绕过；只能跑对应 generator 产生 diff，并由 `check-generated` 与消费者类型检查证明正确性。

## 入库生成物速查

| 产物                           | 路径                                                                                                                       | 触发方式                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `web-ui` icon 模块             | [`packages/web-ui/src/icons/index.ts`](../../packages/web-ui/src/icons/index.ts)、`packages/web-ui/src/icons/generated/**` | `pnpm --filter @greypan/web-ui generate-icons`                                                                  |
| TanStack Router 路由树         | [`apps/react-web-ui-demo/src/routeTree.gen.ts`](../../apps/react-web-ui-demo/src/routeTree.gen.ts)                         | React demo dev / build                                                                                          |
| vue-router 路由类型            | `apps/{vue-web-ui-demo,dev-kit-demo,interweave/frontend}/typed-router.d.ts`                                                | 对应宿主 dev / build                                                                                            |
| auto-import 声明               | `apps/{vue-web-ui-demo,dev-kit-demo,interweave/frontend}/auto-imports.d.ts`                                                | 对应宿主 dev / build                                                                                            |
| demo 文档 meta 与 codeblock    | `apps/{react-web-ui-demo,vue-web-ui-demo,dev-kit-demo}/src/generated/**`                                                   | 宿主 dev / build（`@greypan/md-to-meta`）；版本 PR 由 `changeset-version.sh` 重生成                             |
| Wails Go bindings              | `apps/interweave/frontend/bindings/**`                                                                                     | `pnpm exec turbo build --filter=@greypan/interweave-frontend`（单一入口，产出集合守卫防静默少产出，不删旧文件） |
| 壳文案编译产物（已 gitignore） | `apps/*/src/locales/.wuchale/**`、`*.loader.js`、`{data,plural}.js`                                                        | 宿主 dev / build；增删文案在应用目录跑 `pnpm exec wuchale --clean`                                              |

- `apps/*/src/generated/codeblock/**` 是 markdown 围栏的逐字节副本，不参与 lint/format，以保「围栏 = 落盘文件 = 页面 `<pre>`」一致。
- `apps/*/src/locales/*.po` 是**手写译文源**（非生成物），由各应用 `catalog.spec.ts` 校验。
- `**/__screenshots__/` 与 `**/.vitest-attachments/` 是测试证据，不是生成物，故意不进 `.claude/settings.json` 的 `deny`（以免阻挡合法的视觉基线更新）。

## 审查范围与编辑拦截的分工

[`.claude/settings.json`](../../.claude/settings.json) 的 `permissions.deny` 是入库生成物编辑拦截的权威名单（另有 `.env` 读取拦截）；CI 自动审查与人工审查在 `git diff` 入口用 `REVIEW_EXCLUDE_PATHSPECS` 整批滤除入库生成物，两份名单覆盖的入库文件集合由 `codex-review.test.mjs` 双向强校验。被滤除路径不计入 `coverage.inspected` 或 `coverage.uncovered`；生成物正确性由 generator 重建与 `check-generated` 证明，不由审查结论证明。

| 过滤路径                                                              | 覆盖的清单条目                                 |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| `**/generated/**`                                                     | demo 文档 meta/codeblock、`icons/generated/**` |
| `apps/*/frontend/bindings/**`                                         | Wails Go bindings                              |
| `**/routeTree.gen.ts`、`**/typed-router.d.ts`、`**/auto-imports.d.ts` | 各宿主的单文件生成声明                         |
| `packages/web-ui/src/icons/index.ts`                                  | icon barrel                                    |

## 新增生成物时

同步更新以下全部位置，缺一处即漂移：本文两张表、对应 `turbo.json` inputs 与产出集合守卫、[`.claude/settings.json`](../../.claude/settings.json) 的 `permissions.deny`、[`.gitattributes`](../../.gitattributes)（巨量 demo 目录另同步根 [`.ignore`](../../.ignore)）、`REVIEW_EXCLUDE_PATHSPECS` 与 `codex-review.test.mjs` 覆盖表，以及 [ADR-0021](../adr/0021-codex-review-gate.md) 相关口径。
