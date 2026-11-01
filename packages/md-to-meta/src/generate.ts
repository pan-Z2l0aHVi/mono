import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { glob } from 'tinyglobby'

import { fail } from './errors'
import { parseMarkdown } from './markdown'
import { renderCss, renderMetaModule, renderMetaTypes } from './render'
import type { CodeFile, GenerateResult, GeneratedFile, ResolvedOptions } from './types'

const THEME_FILE = 'theme.css'

/** 插件配置里的 glob 允许带 `./`，tinyglobby 的 cwd 匹配不需要它。 */
function normalizePattern(pattern: string): string {
  return pattern.replace(/^\.\//, '')
}

/**
 * input 命中的 markdown 文件。只接受 `.md`：匹配到别的扩展名说明配置写宽了，
 * 静默跳过会让「这篇文档为什么没产物」变成一个只能靠猜的问题。
 */
async function resolveInputs(options: ResolvedOptions): Promise<string[]> {
  const patterns = options.input.map(normalizePattern)
  const matched = await glob(patterns, { cwd: options.root, absolute: true, onlyFiles: true })
  const files = [...matched].sort()
  if (files.length === 0) fail(`input 没有匹配到任何文件：${options.input.join('、')}`)
  const others = files.filter(file => !file.endsWith('.md'))
  if (others.length > 0) fail(`input 只接受 .md 文件，匹配到：${others.join('、')}`)
  return files
}

/** 平铺产物按 md 文件名命名；同一 output 里两个同名来源会互相覆盖，必须由调用方改名。 */
function assertUniqueBasenames(files: readonly string[]): Map<string, string> {
  const owners = new Map<string, string>()
  for (const file of files) {
    const base = path.basename(file).slice(0, -'.md'.length)
    const previous = owners.get(base)
    if (previous)
      fail(
        `产物重名：${base}.meta.js 会被两个源文件同时写出——${previous} 与 ${file}。` +
          `请改名其中一个文件，或用 input 缩小匹配范围`
      )
    owners.set(base, file)
  }
  return owners
}

/**
 * 编排一次生成：解析 input → 一个 output 的产物集合。
 *
 * 产物的文件名由引擎固定（`<basename>.meta.js` / `<basename>.meta.d.ts`、`codeblock/` 下按内容
 * 寻址的代码文件、一份 `theme.css`）。代码文件逐字节落盘，与围栏原文同源；围栏内容相同就共享
 * 同一个文件，所以同一段代码出现在两篇文档里也只写一份。
 */
export async function generate(options: ResolvedOptions): Promise<GenerateResult> {
  const sources = await resolveInputs(options)
  assertUniqueBasenames(sources)

  const files: GeneratedFile[] = []
  const codeFiles = new Map<string, CodeFile>()

  for (const source of sources) {
    const base = path.basename(source).slice(0, -'.md'.length)
    const { nodes, codeFiles: docCodeFiles } = await parseMarkdown(await readFile(source, 'utf8'), source, {
      exec: options.exec
    })
    for (const codeFile of docCodeFiles) if (!codeFiles.has(codeFile.path)) codeFiles.set(codeFile.path, codeFile)
    files.push({ path: path.join(options.output, `${base}.meta.js`), content: renderMetaModule(nodes) })
    files.push({ path: path.join(options.output, `${base}.meta.d.ts`), content: renderMetaTypes() })
  }

  for (const codeFile of [...codeFiles.values()].sort((a, b) => a.path.localeCompare(b.path)))
    files.push({ path: path.join(options.output, normalizePattern(codeFile.path)), content: codeFile.content })

  files.push({ path: path.join(options.output, THEME_FILE), content: renderCss(options.darkSelector) })

  const paths = new Set<string>()
  for (const file of files) {
    if (paths.has(file.path)) fail(`产物路径重复：${file.path}（两个来源写出了同一个文件）`)
    paths.add(file.path)
  }

  // 只剩一份来源时 basename 映射没有用途；碰撞检查在解析文档前完成，失败得更早。
  return { files, output: options.output }
}
