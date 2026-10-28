import { spawnSync } from 'node:child_process'

// 运行全仓 tracked 的 *.test.mjs。发现规则见 ADR-0027：git 失败必须非零退出，
// 不能把「没有测试」和「git 不可用」都当成成功。
//
// `git ls-files '*.test.mjs'` 的 pathspec 里 `*` 跨越目录分隔符，所以这条命令覆盖全仓——
// `.github/scripts`、workspace 脚本与 skills 的测试都靠它跑，不能收窄成 `scripts/` 前缀。
// 代价是本包的测试也会被扫到，而它们由本包的 `test` 脚本（`node --test src`）在 turbo 图里跑：
// 不排除就会双跑，且失败时归属到两个地方。排除按目录前缀，不按文件名，新增测试不需要再登记。
export const name = 'test-scripts'

const OWN_PACKAGE_PREFIX = 'packages/monorepo-kit/'

/**
 * @param {string} root
 * @returns {string[]}
 */
export function listTrackedScriptTests(root) {
  const result = spawnSync('git', ['ls-files', '-z', '*.test.mjs'], { cwd: root, encoding: 'utf8' })
  if (result.error) throw new Error(`cannot run git ls-files: ${result.error.message}`)
  if (result.status !== 0)
    throw new Error(`git ls-files failed (exit ${result.status})${result.stderr ? `:\n${result.stderr.trim()}` : ''}`)
  return result.stdout
    .split('\0')
    .filter(Boolean)
    .filter(file => !file.startsWith(OWN_PACKAGE_PREFIX))
}

/**
 * @param {{ root: string, node?: string }} options
 * @returns {Promise<string>}
 */
export async function run({ root, node = process.execPath }) {
  const files = listTrackedScriptTests(root)
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
