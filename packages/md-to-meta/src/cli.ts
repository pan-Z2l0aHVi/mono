#!/usr/bin/env node
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { checkArtifacts, generate, resolveGenerateOptions, writeArtifacts } from './index'

/*
 * headless 入口：CI 的新鲜度校验与版本 PR 的产物追平都从这里跑同一份生成逻辑，
 * 不用各自再写一遍「读包 manifest → 动态 import ESM 入口」的技巧——本模块经打包静态
 * 并入 ./index。唯一保留的动态 import 是宿主的 vite.config.ts：options 的单一来源在
 * 宿主配置里（具名导出 mdToMetaOptions），整文件求值会把插件工厂跑一遍，一次性进程里可接受。
 */

const USAGE = '用法：md-to-meta <check|write> <app-dir>...'

async function main(argv: readonly string[]): Promise<number> {
  const [mode, ...appDirs] = argv
  if (mode !== 'check' && mode !== 'write') {
    console.error(USAGE)
    return 2
  }
  if (appDirs.length === 0) {
    console.error(USAGE)
    return 2
  }
  for (const appDir of appDirs) {
    const root = path.resolve(appDir)
    const { mdToMetaOptions } = await import(pathToFileURL(path.join(root, 'vite.config.ts')).href)
    if (!mdToMetaOptions) throw new Error(`${root}/vite.config.ts 没有导出 mdToMetaOptions`)
    // 与插件共用同一份解析口径（相对 Vite root 的路径），配置只写一次，解析只写一次。
    const result = await generate(resolveGenerateOptions(root, mdToMetaOptions))
    if (mode === 'check') checkArtifacts(result.files, result.output)
    else writeArtifacts(result.files, result.output)
  }
  return 0
}

main(process.argv.slice(2)).then(
  code => {
    if (code !== 0) process.exit(code)
  },
  error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
)
