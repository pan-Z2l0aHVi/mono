import fs from 'node:fs'
import path from 'node:path'

import { globSync } from 'glob'

import { defineTestPorts } from '../plugins/test-ports'
import type { CheckUnit } from '../runner/check-runner'
import { byCodeUnit } from '../shared/order'

// 端口表与调用点的一致性：分配在根配置里，调用散落在各 workspace 的 `vite.config.ts`。
// 漏登记、改名后残留的调用或两个 project 抢同一段位都不会在运行时报错——只会悄悄落到相邻
// 段位，所以两边必须完全相等。扫描面与调用名是消费仓库的事实，经 options 传入；项目名直接
// 取自同一份分配，守卫与被守对象不会各读一份。

export interface TestPortCallSitesOptions {
  readonly name?: string
  /** 相对仓库根的 glob，命中调用方配置 */
  readonly configGlobs: readonly string[]
  /** 取端口表的调用函数名 */
  readonly callName: string
  /** 端口表文件名，相对仓库根 */
  readonly configFile?: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function defineTestPortCallSites({
  name = 'test-port-call-sites',
  configGlobs,
  callName,
  configFile
}: TestPortCallSitesOptions): CheckUnit {
  const ports = defineTestPorts({ configFile })
  // 只认字面量实参的调用。实参不是字面量时这条调用点不进入集合，两种后果都仍有判据：
  // 已登记的 project 只剩动态调用 → 报「没有调用点」；未登记的名字 → `port()` 在运行时抛错。
  // 代价是一个 project 同时有字面量与动态调用时查重段漏检，而这需要有人先为同一个段位写两处调用。
  const literalCall = new RegExp(`\\b${escapeRegExp(callName)}\\s*\\(\\s*(['"])([^'"]+)\\1`, 'gu')

  return {
    name,
    async run({ root }: { root: string }): Promise<string> {
      const projectNames = ports.make({ root }).names()
      const files = [
        ...new Set(globSync([...configGlobs], { cwd: root, nodir: true, posix: true, ignore: ['**/node_modules/**'] }))
      ]
      files.sort(byCodeUnit)
      if (files.length === 0) throw new Error(`cannot run: ${configGlobs.join(', ')} matched no files`)

      const usage = new Map<string, string[]>()
      for (const file of files) {
        const source = fs.readFileSync(path.join(root, file), 'utf8')
        for (const match of source.matchAll(literalCall)) {
          const callers = usage.get(match[2]) ?? []
          callers.push(file)
          usage.set(match[2], callers)
        }
      }

      const allocated = new Set(projectNames)
      const violations: string[] = []
      const missing = projectNames.filter(project => !usage.has(project))
      if (missing.length > 0) violations.push(`allocated projects with no ${callName} call site: ${missing.join(', ')}`)
      const unknown = [...usage.keys()].filter(project => !allocated.has(project)).sort(byCodeUnit)
      if (unknown.length > 0)
        violations.push(`call sites reference projects that are not in the allocation: ${unknown.join(', ')}`)
      for (const [project, callers] of [...usage].sort(([left], [right]) => byCodeUnit(left, right))) {
        if (callers.length > 1)
          violations.push(
            `${project} is used by ${callers.length} call sites (${callers.join(', ')}): one band per project`
          )
      }
      if (violations.length > 0) throw new Error(violations.join('\n'))

      return `${files.length} config file(s), ${usage.size} call site(s)`
    }
  }
}
