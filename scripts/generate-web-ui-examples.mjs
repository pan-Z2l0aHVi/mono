#!/usr/bin/env node
// generate-web-ui-examples.mjs — demo 示例文档生成器的仓库入口。
//
// 正常开发与构建不再需要跑这个文件：两个 demo 的 `vite.config.ts` 都挂了 `@greypan/md-to-comp`
// 的插件，dev 启动与 build 都会生成 `src/generated/**`。这个入口只剩两个用途：
//
//   1. `--check`：`ci:test-scripts` 用它把「产物 == markdown」钉在 CI 上（生成物受版本控制，
//      改了 markdown 没重新生成就会红）。
//   2. `--docs-dir` / `--out-dir`：`scripts/generate-web-ui-examples.test.mjs` 的 falsification
//      fixture 用它把一份被篡改的 markdown 副本喂给引擎，而不去动仓库里的真实源文件。
//
// source of truth 只有一份：`docs/examples/web-ui/*.md` 决定「有哪些示例、每个示例的代码是什么、
// 每个 API 字段的名称/说明/类型/默认值是什么」。组件源码不参与生成——把类型与默认值写进表格换来的是
// 「文档不会随组件内部重构隐形变更」，代价是组件改 API 时这张表要人手动跟着改，没有脚本来提醒。
//
// 带 `{#id}` 锚点的示例还有第二种产出：围栏原文被落成
// `apps/<demo>/src/generated/demos/<component>--<id>.<tsx|vue>`，那是两个 demo 真正编译执行的那份源码。
//
// 这里的配置与两个 app 的 `vite.config.ts` 里那份是同一份契约的三处副本：不另立配置文件，配置就地
// 写在插件的参数里。副本之间漂移不会静默——app 侧的测试档会拿 app 的配置对产物做 `checkArtifacts`，
// 任何一处写歪都会在那边的测试上红。
//
// 用法：`node scripts/generate-web-ui-examples.mjs [--check]`
//   --check  只比对不写入，输出不一致时非零退出。
//
// 引擎是 TypeScript，所以这个入口依赖已构建的 `dist`：根 `pnpm run build`（turbo）会顺带产出它，
// 单独跑用 `mise exec -- pnpm exec turbo build --filter=@greypan/md-to-comp`。缺 dist 时报一句
// 能归因的话，而不是把 ERR_MODULE_NOT_FOUND 丢给人。
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const dist = path.resolve(import.meta.dirname, '..', 'packages', 'md-to-comp', 'dist', 'index.mjs')
if (!existsSync(dist)) {
  console.error(
    `${dist} 不存在：生成器引擎还没构建，先跑 mise exec -- pnpm exec turbo build --filter=@greypan/md-to-comp`
  )
  process.exit(1)
}

const { braceAnchor, checkArtifacts, DocError, generate, writeArtifacts } = await import(pathToFileURL(dist).href)

const root = path.resolve(import.meta.dirname, '..')
const CONFIG = {
  input: path.join(root, 'docs', 'examples', 'web-ui'),
  dir: 'demos',
  anchor: braceAnchor,
  flavors: ['react', 'vue'],
  apiTables: {
    // 列序是引擎约定：名称、说明、类型、默认值。Events / Slots 只有前两列。
    columns: {
      Props: ['名称', '说明', '类型', '默认值'],
      Events: ['名称', '说明'],
      Slots: ['名称', '说明']
    }
  },
  // 深浅外观源是 web-ui-theme 的派生属性；切外观不需要重新生成高亮 HTML。
  darkSelector: "web-ui-theme[resolved-appearance='dark']"
}
const OUTPUTS = [
  { output: path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated'), flavor: 'react' },
  { output: path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated'), flavor: 'vue' }
]

function flagValue(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const checkOnly = process.argv.includes('--check')
const outDir = flagValue('--out-dir')
const options = {
  ...CONFIG,
  input: flagValue('--docs-dir') ?? CONFIG.input,
  outputs: outDir ? [{ output: outDir, flavor: 'react' }] : OUTPUTS
}

try {
  // generate() 是异步的（shiki 按需加载语法与主题），所以入口自己持有这一次事件循环。
  const { files, demosDirs } = await generate(options)
  if (checkOnly) checkArtifacts(files, demosDirs)
  else writeArtifacts(files, demosDirs)
} catch (error) {
  if (error instanceof DocError) {
    console.error(error.message)
    process.exit(1)
  }
  throw error
}
