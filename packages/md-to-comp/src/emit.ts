import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { fail } from './errors'
import type { GeneratedFile } from './types'

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

/**
 * 组件示例目录归生成器独占：改了锚点或删掉一条示例，上一轮那份文件必须跟着走。留在盘上的孤儿
 * 没有任何 markdown 引用它，因此也不被「围栏 == 落盘」那组断言覆盖，却照样被宿主的
 * 按需加载通道收进依赖图——编译得进构建、页面上永远不出现的一个死组件。
 * 判据按本轮产出集合而不是文件名或扩展名猜测：本轮没写出的那个文件，就是陈旧的。
 */
function staleDemoFiles(demosDirs: string[], files: GeneratedFile[]): string[] {
  const expected = new Set(files.map(file => file.path))
  const stale: string[] = []
  for (const dir of demosDirs) {
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const full = path.join(dir, entry.name)
      if (!expected.has(full)) stale.push(full)
    }
  }
  return stale
}

/** 落盘：内容真变了的才写，本轮没写出的组件示例文件清掉。 */
export function writeArtifacts(files: GeneratedFile[], demosDirs: string[]): void {
  const stale = staleDemoFiles(demosDirs, files)
  for (const file of stale) rmSync(file)
  const written = files.filter(writeIfChanged).length
  const pruned = stale.length === 0 ? '' : `，清理 ${stale.length} 个陈旧文件`
  console.log(`[md-to-comp] 写入 ${written} 个文件（共 ${files.length} 个受版本控制的产物）${pruned}`)
}

/**
 * 只判不改：产物与磁盘不一致就让调用方的这一步失败。
 *
 * 存在的理由是开发与测试拿的是同一份配置。若改成「另写一个新鲜度 spec」，那个 spec 要么
 * `import` 宿主的 vite config（ES module 整文件求值，插件工厂会被无谓地跑一遍），要么把配置
 * 抄第二份（两份配置必然漂移）。改成在这里分叉，配置只有一份，断言贴在真正会漂移的那个动作上。
 * 测试期不改盘还有第二个好处：`?raw` 与页面上的 `<pre>` 钉的就是 git 里那份字节，不是刚生成的。
 */
export function checkArtifacts(files: GeneratedFile[], demosDirs: string[]): void {
  const stale = staleDemoFiles(demosDirs, files)
  // 孤儿先报：改了锚点时「新文件不存在」那条一定会撞上来，可它只说得出缺哪份，说不出上一轮那份
  // 还赖在盘上。先报孤儿，一次运行就把改名这件事的两侧都讲完。
  if (stale.length > 0)
    fail(
      `生成物陈旧：${stale.join('\n')} 是上一轮遗留的文件，markdown 里已没有对应的示例 id；` +
        `跑一次构建重新生成即可清掉`
    )
  for (const file of files) {
    if (!existsSync(file.path))
      fail(`生成物缺失：${file.path} 不存在。受版本控制的产物要跟着 markdown 一起进 git，跑一次构建重新生成`)
    const actual = readFileSync(file.path, 'utf8')
    if (actual !== file.content)
      fail(`生成物与 markdown 不一致：${file.path}。改完 markdown 必须重新生成产物，不能手改产物`)
  }
  console.log(`[md-to-comp] 生成物校验通过：${files.length} 个文件与 markdown 一致`)
}
