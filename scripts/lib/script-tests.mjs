import { spawnSync } from 'node:child_process'

// 运行全仓 tracked 的 *.test.mjs。发现规则见 ADR-0014：git 失败必须非零退出，
// 不能把「没有测试」和「git 不可用」都当成成功。
export const name = 'test-scripts'

export function listTrackedScriptTests(root) {
  const result = spawnSync('git', ['ls-files', '-z', '*.test.mjs'], { cwd: root, encoding: 'utf8' })
  if (result.error) throw new Error(`cannot run git ls-files: ${result.error.message}`)
  if (result.status !== 0)
    throw new Error(`git ls-files failed (exit ${result.status})${result.stderr ? `:\n${result.stderr.trim()}` : ''}`)
  return result.stdout.split('\0').filter(Boolean)
}

export async function run({ root, node = process.execPath } = {}) {
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
