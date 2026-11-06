import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../../runner/runner'
import { defineGit, type GitApi } from '../git/git'

import { defineExec, type ExecApi } from './exec'

const { andThen, err, ok } = rust

// 运行全仓 tracked 的 *.test.mjs。发现规则见 ADR-0014：git 失败必须非零退出，
// 不能把「没有测试」和「git 不可用」都当成成功。
//
// `git ls-files '*.test.mjs'` 的 pathspec 里 `*` 跨越目录分隔符，所以这条命令覆盖全仓——
// `.github/scripts`、workspace 脚本与 skills 的测试都靠它跑，不能收窄成 `scripts/` 前缀。
//
// 完成行是脚本测试的成功输出约定（`<仓库相对路径>: all assertions passed`，见 docs/agents/script-policy.md）：
// 只看退出码会把「断言一次都没跑」当成通过，而这类脚本的断言全靠抛错表达失败。
const completionLine = (file: string): string => `${file}: all assertions passed`

/**
 * 脚本测试判定，链上以 `script: ` 起头归因。判定不转写子进程输出，成功路径一声不出；
 * 失败时把脚本自己写出的内容并进 `Err`，因为一句判据说不清 traceback 在哪一行。
 */
export const defineScriptTests = (): Chain =>
  defineRunner()
    .use(defineGit())
    .use(defineExec())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & GitApi & ExecApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), () => {
            const tests = ctx.files('*.test.mjs')
            if (tests.length === 0) return ok(undefined)

            for (const file of tests) {
              const result = ctx.exec(process.execPath, [file])
              if (!result.ok) {
                const status = result.status === undefined ? 'no exit code' : `exit ${result.status}`
                return err(`script: script test failed: ${file} (${status})\n${ctx.failureEvidence(result)}`)
              }
              const expected = completionLine(file)
              if (!result.stdout.split(/\r?\n/).some(line => line.trim() === expected))
                return err(
                  `script: script test printed no completion line: ${file} (expected "${expected}" on stdout)\n` +
                    `${ctx.commandOutput(result)}`
                )
            }

            return ok(undefined)
          })
      }))
    )
