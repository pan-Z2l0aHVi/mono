import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DocError } from './errors'
import { generate, type GeneratedFile, type OutputTarget } from './generate'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const DOCS_DIR = path.join(root, 'docs', 'examples', 'web-ui')
const COMPONENTS_DIR = path.join(root, 'packages', 'web-ui', 'src', 'components')
const OUTPUTS: OutputTarget[] = [
  { dir: path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated'), flavor: 'react' },
  { dir: path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated'), flavor: 'vue' }
]

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

/**
 * `demos/` 归生成器独占：改了 `{#id}` 或删掉一条示例，上一轮那份文件必须跟着走。留在盘上的孤儿
 * 没有任何 markdown 引用它，因此也不被「围栏 == 落盘」那组断言覆盖，却照样被 app 的
 * `import.meta.glob` 收进依赖图——编译得进构建、页面上永远不出现的一个死组件。
 * 判据按产出集合而不是文件名或扩展名猜测：本轮没写出的那个文件，就是陈旧的。
 */
function staleDemoFiles(outputs: OutputTarget[], files: GeneratedFile[]): string[] {
  const expected = new Set(files.map(file => file.path))
  const stale: string[] = []
  for (const output of outputs) {
    const dir = path.join(output.dir, 'demos')
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const full = path.join(dir, entry.name)
      if (!expected.has(full)) stale.push(full)
    }
  }
  return stale
}

/**
 * `--docs-dir` / `--out-dir` / `--components-dir` 是测试 seam：包内的测试用一份被篡改的 markdown
 * 副本证明 join 是 fail-closed 的，而不去动仓库里的真实源文件。
 */
async function main(): Promise<void> {
  const checkOnly = process.argv.includes('--check')
  const docsDir = flagValue('--docs-dir') ?? DOCS_DIR
  const componentsDir = flagValue('--components-dir') ?? COMPONENTS_DIR
  const outDir = flagValue('--out-dir')
  const outputs: OutputTarget[] = outDir ? [{ dir: outDir, flavor: 'react' }] : OUTPUTS

  let files: GeneratedFile[]
  try {
    // generate() 是异步的（shiki 按需加载语法与主题），所以入口自己持有这一次事件循环。
    files = await generate({ docsDir, componentsDir, outputs })
  } catch (error) {
    if (error instanceof DocError) failAndExit(error.message)
    throw error
  }

  // 孤儿先比内容报：改了 `{#id}` 时「新文件不存在」那条一定会撞上来，可它只说得出缺哪份，说不出
  // 上一轮那份还赖在盘上。先报孤儿，一次运行就把改名这件事的两侧都讲完。
  const stale = staleDemoFiles(outputs, files)
  if (stale.length > 0) {
    if (checkOnly)
      failAndExit(
        `${stale.join('\n')} 是上一轮遗留的生成物：markdown 里已没有对应的示例 id，跑 node scripts/generate-web-ui-examples.mjs 清理`
      )
    for (const file of stale) rmSync(file)
  }

  for (const file of files) {
    if (checkOnly) {
      if (!existsSync(file.path))
        failAndExit(
          `${file.path} 不存在：受版本控制的生成物缺失，跑 node scripts/generate-web-ui-examples.mjs 重新生成`
        )
      const actual = readFileSync(file.path, 'utf8')
      if (actual !== file.content)
        failAndExit(
          `${file.path} 与生成器输出不一致：改动组件源码或 markdown 后必须跑 node scripts/generate-web-ui-examples.mjs`
        )
      continue
    }
    mkdirSync(path.dirname(file.path), { recursive: true })
    writeFileSync(file.path, file.content)
  }

  const pruned = stale.length === 0 ? '' : `，删除 ${stale.length} 个陈旧文件`
  const summary = files.map(file => `  ${path.relative(root, file.path)}`).join('\n')
  console.log(
    `${checkOnly ? '[check] 生成物与生成器输出一致' : '已生成'} ${files.length} 个文件${pruned}：\n${summary}`
  )
}

function failAndExit(message: string): never {
  console.error(message)
  process.exit(1)
}

await main()
