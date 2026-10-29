import { spawnSync } from 'node:child_process'

// 运行全仓 tracked 的 *.test.mjs。发现规则见 ADR-0027：git 失败必须非零退出，
// 不能把「没有测试」和「git 不可用」都当成成功。
//
// `git ls-files '*.test.mjs'` 的 pathspec 里 `*` 跨越目录分隔符，所以这条命令覆盖全仓——
// `.github/scripts`、workspace 脚本与 skills 的测试都靠它跑，不能收窄成 `scripts/` 前缀。
// 哪些测试已由别的执行面（如 workspace 自己的 `test` 任务）承担是仓库事实，由调用方传入排除目录；
// 本模块只做「排除这些目录」的通用逻辑，不认包名。排除按目录边界，不按文件名，新增测试不需要再登记。
export const name = 'test-scripts'

interface Options {
  root: string
  node?: string
  /** 仓库相对目录，其中的测试由各自的执行面承担 */
  exclude?: readonly string[]
}

/**
 * 补上尾斜杠，避免 `packages/foo` 把 `packages/foo-extra` 一起排掉。
 */
function directoryPrefix(directory: string): string {
  const normalized = directory.replace(/^\.\//, '')
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

export function listTrackedScriptTests(root: string, exclude: readonly string[] = []): string[] {
  const result = spawnSync('git', ['ls-files', '-z', '*.test.mjs'], { cwd: root, encoding: 'utf8' })
  if (result.error) throw new Error(`cannot run git ls-files: ${result.error.message}`)
  if (result.status !== 0)
    throw new Error(`git ls-files failed (exit ${result.status})${result.stderr ? `:\n${result.stderr.trim()}` : ''}`)
  const prefixes = exclude.map(directoryPrefix)
  return result.stdout
    .split('\0')
    .filter(Boolean)
    .filter(file => !prefixes.some(prefix => file.startsWith(prefix)))
}

export async function run({ root, node = process.execPath, exclude = [] }: Options): Promise<string> {
  const files = listTrackedScriptTests(root, exclude)
  if (files.length === 0) return 'no tracked script tests'

  for (const file of files) {
    const result = spawnSync(node, [file], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    if (result.error) throw new Error(`cannot run ${file}: ${result.error.message}`)
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    if (result.status !== 0) {
      const status = result.status === null ? `signal ${result.signal}` : `exit ${result.status}`
      throw new Error(`script test failed: ${file} (${status})`)
    }
  }

  return `${files.length} script test file(s) passed`
}
