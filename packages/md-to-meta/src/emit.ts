import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { fail } from './errors'
import type { GeneratedFile } from './types'

const CODEBLOCK_DIR = 'codeblock'
const THEME_FILE = 'theme.css'

/**
 * 产物本身就在宿主的构建输入里，无条件覆写会让这次任务改掉自己的输入哈希，从此再也拿不到缓存命中；
 * 开发时还会让宿主的 watcher 收到一次「生成物变了」的事件，绕回生成，形成死循环。所以内容相同就
 * 不碰磁盘。返回是否真的写了，便于调用方汇报。
 */
export function writeIfChanged(file: GeneratedFile): boolean {
  if (existsSync(file.path) && readFileSync(file.path, 'utf8') === file.content) return false
  mkdirSync(path.dirname(file.path), { recursive: true })
  writeFileSync(file.path, file.content)
  return true
}

function collectCodeFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collectCodeFiles(full))
    else if (entry.isFile()) files.push(full)
  }
  return files
}

/**
 * output 归生成器独占的那部分文件：目录根下的 meta 数据/声明与主题样式，以及 `codeblock/` 里的
 * 全部代码文件。宿主自己的其它文件不在清扫面里——引擎只删自己写得出来的东西。
 */
function ownedFiles(output: string): string[] {
  if (!existsSync(output)) return []
  const files: string[] = []
  for (const entry of readdirSync(output, { withFileTypes: true })) {
    const full = path.join(output, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === CODEBLOCK_DIR) files.push(...collectCodeFiles(full))
      continue
    }
    if (entry.name === THEME_FILE || entry.name.endsWith('.meta.js') || entry.name.endsWith('.meta.d.ts'))
      files.push(full)
  }
  return files
}

/** 本轮没写出的那个文件就是陈旧的；按产出集合判，不按文件名或扩展名猜。 */
function staleFiles(output: string, files: GeneratedFile[]): string[] {
  const expected = new Set(files.map(file => file.path))
  return ownedFiles(output).filter(file => !expected.has(file))
}

/** 落盘：内容真变了的才写，本轮没写出的生成物清掉。 */
export function writeArtifacts(files: GeneratedFile[], output: string): void {
  const stale = staleFiles(output, files)
  for (const file of stale) rmSync(file, { force: true })
  const written = files.filter(writeIfChanged).length
  const pruned = stale.length === 0 ? '' : `，清理 ${stale.length} 个陈旧文件`
  console.log(`[md-to-meta] 写入 ${written} 个文件（共 ${files.length} 个受版本控制的产物）${pruned}`)
}

/**
 * 只判不改：产物与磁盘不一致就让调用方的这一步失败。
 *
 * 存在的理由是开发与测试拿的是同一份配置。若改成「另写一个新鲜度 spec」，那个 spec 要么
 * `import` 宿主的 vite config（ES module 整文件求值，插件工厂会被无谓地跑一遍），要么把配置
 * 抄第二份（两份配置必然漂移）。在这里分叉，配置只有一份，断言贴在真正会漂移的那个动作上。
 * 测试期不改盘还有第二个好处：`?raw` 与页面上的 `<pre>` 钉的就是 git 里那份字节，不是刚生成的。
 */
export function checkArtifacts(files: GeneratedFile[], output: string): void {
  const stale = staleFiles(output, files)
  // 孤儿先报：改了文件名时「新文件不存在」那条一定会撞上来，可它只说得出缺哪份，说不出上一轮那份
  // 还赖在盘上。先报孤儿，一次运行就把改名这件事的两侧都讲完。
  if (stale.length > 0)
    fail(
      `生成物陈旧：${stale.join('\n')} 是上一轮遗留的文件，当前 markdown 已不再引用它们；` +
        `跑一次构建重新生成即可清掉`
    )
  for (const file of files) {
    if (!existsSync(file.path))
      fail(`生成物缺失：${file.path} 不存在。受版本控制的产物要跟着 markdown 一起进 git，跑一次构建重新生成`)
    const actual = readFileSync(file.path, 'utf8')
    if (actual !== file.content)
      fail(`生成物与 markdown 不一致：${file.path}。改完 markdown 必须重新生成产物，不能手改产物`)
  }
  console.log(`[md-to-meta] 生成物校验通过：${files.length} 个文件与 markdown 一致`)
}
