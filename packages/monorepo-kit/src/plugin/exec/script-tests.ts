import type { CheckUnit } from '../../runner/check-runner'
import { defineGit } from '../git/git'

import { defineExec } from './exec'

// 运行全仓 tracked 的 *.test.mjs。发现规则见 ADR-0027：git 失败必须非零退出，
// 不能把「没有测试」和「git 不可用」都当成成功。
//
// `git ls-files '*.test.mjs'` 的 pathspec 里 `*` 跨越目录分隔符，所以这条命令覆盖全仓——
// `.github/scripts`、workspace 脚本与 skills 的测试都靠它跑，不能收窄成 `scripts/` 前缀。
export function defineScriptTests(): CheckUnit {
  const plugins = defineGit().use(defineExec())

  return {
    name: 'test-scripts',
    async run({
      root,
      env = process.env,
      node = process.execPath
    }: {
      root: string
      env?: NodeJS.ProcessEnv
      node?: string
    }): Promise<string> {
      const { files, exec } = plugins.make({ root, env })
      const tests = files('*.test.mjs')
      if (tests.length === 0) return 'no tracked script tests'

      for (const file of tests) {
        const result = exec(node, [file], { cwd: root, env })
        if (result.stdout) process.stdout.write(result.stdout)
        if (result.stderr) process.stderr.write(result.stderr)
        if (!result.ok) {
          const status = result.status === undefined ? 'no exit code' : `exit ${result.status}`
          throw new Error(`script test failed: ${file} (${status})`)
        }
      }

      return `${tests.length} script test file(s) passed`
    }
  }
}
