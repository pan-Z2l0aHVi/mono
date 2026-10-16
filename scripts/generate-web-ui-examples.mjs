#!/usr/bin/env node
// generate-web-ui-examples.mjs — demo 示例文档生成器的仓库入口。
//
// 引擎在 `packages/web-ui-docs`，这个文件只负责「在固定路径上可跑」：`docs/agents/build.md` 的
// 生成物表、`scripts/generate-web-ui-examples.test.mjs` 以及人的肌肉记忆都指这个路径。
//
// source of truth 只有一份：`docs/examples/web-ui/*.md` 决定「有哪些示例、每个示例的代码是什么、
// 每个 API 字段的名称/说明/类型/默认值是什么」。组件源码不参与生成——把类型与默认值写进表格换来的是
// 「文档不会随组件内部重构隐形变更」，代价是组件改 API 时这张表要人手动跟着改，没有脚本来提醒。
//
// markdown 与产物的一致性由 `--check` 把守：改了 md 没跑生成器，`scripts/generate-web-ui-examples.test.mjs`
// 就让 `ci:test-scripts` 红。
//
// 带 `{#id}` 锚点的示例还多一种产出：围栏原文被落成
// `apps/<demo>/src/generated/demos/<component>--<id>.<tsx|vue>`，那是两个 demo 真正编译执行的那份组件源码。
//
// 生成物受版本控制，与生成器输出的一致性由 `scripts/generate-web-ui-examples.test.mjs`
// 断言（跑在 `ci:test-scripts` 里，因此也在 CI 的 `check` 里）。
//
// 用法：`node scripts/generate-web-ui-examples.mjs [--check]`
//   --check  只比对不写入，输出不一致时非零退出。
//
// 引擎是 TypeScript，所以这个入口依赖已构建的 `dist`：根 `pnpm run build`（turbo）会顺带产出它，
// 单独跑用 `mise exec -- pnpm exec turbo build --filter=@greypan/web-ui-docs`。缺 dist 时报一句
// 能归因的话，而不是把 ERR_MODULE_NOT_FOUND 丢给人。
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const cli = path.resolve(import.meta.dirname, '..', 'packages', 'web-ui-docs', 'dist', 'cli.mjs')
if (!existsSync(cli)) {
  console.error(
    `${cli} 不存在：生成器引擎还没构建，先跑 mise exec -- pnpm exec turbo build --filter=@greypan/web-ui-docs`
  )
  process.exit(1)
}

// argv 原样透传：`--check` 与 `--docs-dir` / `--out-dir` 这几个测试 seam 都由引擎解释。
await import(pathToFileURL(cli).href)
