import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/*
 * 语料的独立探针：从 markdown 原文与宿主页面源码里重新数出「骨架说了什么」，用来和生成数据对撞。
 *
 * 这几条**故意不复用** `./markdown` 的解析器。宿主判据是「产物与语料同源」，判据若走生成器自己
 * 那份代码就成了同义反复——解析器把某一节读错时，两侧一起错，断言照样绿。
 */

/**
 * `## Samples` 里的 `###` 标题，按出现次序。标题就是示例的身份（id 由生成器从它派生），所以这份
 * 序列是 markdown 与生成数据之间可比的那个轴；`## API` 的小节标题不参与，它们不是示例。
 */
export function sampleTitlesOf(markdown: string) {
  const titles: string[] = []
  let inSamples = false
  let fenced = false
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    if (/^##\s+/.test(line)) {
      inSamples = /^##\s+Samples\s*$/.test(line)
      continue
    }
    if (inSamples && /^###\s+/.test(line)) titles.push(line.replace(/^###\s+/, '').trim())
  }
  return titles
}

/** 某种语言的围栏正文，按出现次序。`lang` 取 `FLAVOR_LANG` 的值，不在宿主侧再抄一遍语言名。 */
export function fencesOf(markdown: string, lang: string) {
  return [...markdown.matchAll(new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\\n\`\`\``, 'g'))].map(match => match[1])
}

/** 一侧的清单：「文件裸名 → 它引用的 `component` 值列表」。 */
export interface Surface {
  used: Map<string, string[]>
}

/**
 * 扫宿主页面目录，读出每页里壳组件引用了哪些 `component`。壳的标签名由调用方传进来——标签名与
 * 目录都是宿主概念，本包不认任何一个宿主。
 */
export function surfaceOf(dir: string, ext: string, componentTag: string): Surface & { names: string[] } {
  const files = readdirSync(dir).filter(file => file.endsWith(ext))
  const bare = (file: string) => file.slice(0, -ext.length)
  const refs = new RegExp(`<${componentTag}\\s[^>]*component="([^"]+)"`, 'g')
  return {
    names: files.map(bare).sort(),
    used: new Map(
      files.map(file => [
        bare(file),
        [...readFileSync(path.join(dir, file), 'utf8').matchAll(refs)].map(match => match[1])
      ])
    )
  }
}
