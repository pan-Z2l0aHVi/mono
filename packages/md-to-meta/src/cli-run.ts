import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { MdToMetaOptions } from './types'
import { resolveGenerateOptions } from './vite'

import { checkArtifacts, generate, writeArtifacts } from './index'

/*
 * headless 入口的实现：CI 的新鲜度校验与版本 PR 的产物追平都从这里跑同一份生成逻辑，
 * 不用各自再写一遍「读包 manifest → 动态 import ESM 入口」的技巧——本模块经打包静态
 * 并入 ./index。唯一保留的动态 import 是宿主的 vite.config.ts：options 的单一来源在
 * 宿主配置里（具名导出 mdToMetaOptions），整文件求值会把插件工厂跑一遍，一次性进程里可接受。
 *
 * 与入口文件分开是为了能被测试直接调用：入口在模块求值时就跑 main，import 它会顺带执行命令行。
 */

export const CLI_USAGE = '用法：md-to-meta <check|write> <app-dir>...'

export interface CliDeps {
  /** 读取宿主 vite.config.ts 里具名导出的 mdToMetaOptions。 */
  loadOptions: (root: string) => Promise<{ mdToMetaOptions?: MdToMetaOptions }>
  generate: typeof generate
  checkArtifacts: typeof checkArtifacts
  writeArtifacts: typeof writeArtifacts
}

const defaultDeps: CliDeps = {
  loadOptions: root => import(pathToFileURL(path.join(root, 'vite.config.ts')).href),
  generate,
  checkArtifacts,
  writeArtifacts
}

/**
 * 执行一次命令行，返回退出码。参数或宿主配置错误直接抛错，由入口统一打印成一行并退出。
 *
 * check 与 write 共用同一份生成结果，只差在产出落地的方式：CI 只判不改，版本 PR 追平写盘。
 */
export async function runCli(argv: readonly string[], deps: CliDeps = defaultDeps): Promise<number> {
  const [mode, ...appDirs] = argv
  if (mode !== 'check' && mode !== 'write') {
    console.error(CLI_USAGE)
    return 2
  }
  if (appDirs.length === 0) {
    console.error(CLI_USAGE)
    return 2
  }
  for (const appDir of appDirs) {
    const root = path.resolve(appDir)
    const { mdToMetaOptions } = await deps.loadOptions(root)
    if (!mdToMetaOptions) throw new Error(`${root}/vite.config.ts 没有导出 mdToMetaOptions`)
    // 与插件共用同一份解析口径（相对 Vite root 的路径），配置只写一次，解析只写一次。
    const result = await deps.generate(resolveGenerateOptions(root, mdToMetaOptions))
    if (mode === 'check') deps.checkArtifacts(result.files, result.output)
    else deps.writeArtifacts(result.files, result.output)
  }
  return 0
}
