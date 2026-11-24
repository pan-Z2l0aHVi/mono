import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

const RUNTIME_ENTRY = path.resolve(import.meta.dirname, '../runtime.ts')

/**
 * `./runtime` 是浏览器子路径：从它出发的模块图不得触及任何 `node:` 内建（也不得触及只该活在
 * Node 侧的 `./node-hash`、`./emit`、`./vite`）。生成路径的 Node 依赖全部收在 `./generate` 一侧，
 * 由 `generate.ts` 显式注入；这条测试钉住边界，谁往 runtime 图里引回 Node 模块就当场红。
 *
 * 只跟随包内相对导入（`./x` / `../x`），外部包（shiki 等）是宿主打包器的事，不在本判定内。
 */
function collectRelativeGraph(entry: string): string[] {
  const seen = new Set<string>()
  const queue = [entry]
  const specifiers: string[] = []
  while (queue.length > 0) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(/(?:from|import)\s*["'](\.\.?\/[^"']+)["']/g)) {
      const resolved = path.resolve(path.dirname(file), match[1]!)
      const exists = fs.existsSync(resolved) || fs.existsSync(`${resolved}.ts`) || fs.existsSync(`${resolved}.mts`)
      if (!exists) continue
      specifiers.push(path.relative(path.dirname(entry), resolved))
      queue.push(fs.existsSync(`${resolved}.ts`) ? `${resolved}.ts` : resolved)
    }
  }
  return [...new Set(specifiers)]
}

describe('runtime 模块图纯净性', () => {
  it('从 ./runtime 出发的包内模块图不触及 node: 内建', () => {
    const entry = fs.existsSync(RUNTIME_ENTRY) ? RUNTIME_ENTRY : RUNTIME_ENTRY.replace(/\.ts$/, '.mts')
    expect(fs.existsSync(entry), 'runtime 入口存在').toBe(true)

    const reached = collectRelativeGraph(entry)
    expect(reached.length).toBeGreaterThan(0)

    const offenders = reached.filter(relative => {
      const file = path.resolve(path.dirname(entry), relative)
      const source = fs.readFileSync(fs.existsSync(`${file}.ts`) ? `${file}.ts` : file, 'utf8')
      return /["']node:[^"']+["']/.test(source)
    })
    expect(offenders, `runtime 模块图触及 node: 内建的文件：${offenders.join(', ')}`).toEqual([])
  })
})
