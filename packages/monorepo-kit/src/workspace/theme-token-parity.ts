import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'

const { andThen, err, ok } = rust

// 跨包 token 不变量：一个包把另一个包拥有的自定义属性当作回退字面量，两边都是手写 CSS，
// 改一边漏另一边就会漂移。这类判据读两个包的源文件，不住任何一侧的包测试——判据在根级
// check-policy 里跑，包内测试只测包内行为。文件与变量名是消费仓库的事实，经 options 传入。

export interface ThemeTokenParityOptions {
  /** 声明回退值的文件，仓库相对 */
  readonly consumerFile: string
  /** 回退值挂在哪个自定义属性上，不带 `--` 前缀，如 `os-handle-bg` */
  readonly consumerVar: string
  /** token 的权威文件，仓库相对 */
  readonly authorityFile: string
  /** token 名，不带 `--` 前缀，如 `wui-scrollbar-handle` */
  readonly authorityVar: string
  /** 权威文件里取值对比的块（如浅色分支），第一个捕获组是块内容 */
  readonly authorityBlock: RegExp
}

/** 取一条自定义属性的值；取不到返回空串，由调用方的判据落到失败分支。 */
function varValue(source: string, name: string): string {
  return new RegExp(`--${name}\\s*:\\s*([^;]+)`).exec(source)?.[1]?.trim() ?? ''
}

/**
 * 跨包 token 回退值一致性的判定，链上以 `theme: ` 起头归因，文案带上消费方文件。
 */
export const defineThemeTokenParity = ({
  consumerFile,
  consumerVar,
  authorityFile,
  authorityVar,
  authorityBlock
}: ThemeTokenParityOptions): Chain =>
  defineRunner().use(
    definePlugin<{ run: Run }, KitCtx & { run: Run }>(ctx => ({
      run: () =>
        andThen(ctx.run(), async () => {
          const fail = (message: string): rust.Result<void, string> => err(`theme: ${consumerFile}: ${message}`)
          // 断言只看声明：注释里为了讲清楚会提到属性名，不能被当成声明命中。
          const consumer = fs.readFileSync(path.join(ctx.root, consumerFile), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
          const authority = fs.readFileSync(path.join(ctx.root, authorityFile), 'utf8')

          const block = authorityBlock.exec(authority)?.[1]
          if (block === undefined) return fail(`cannot find the comparison block in ${authorityFile}`)
          const authorityValue = varValue(block, authorityVar)
          if (!authorityValue) return fail(`${authorityFile} does not declare --${authorityVar} in the block`)

          const fallback = new RegExp(`var\\(--${authorityVar},\\s*(.+)\\)$`).exec(varValue(consumer, consumerVar))?.[1]
          if (fallback === undefined)
            return fail(`--${consumerVar} is not a var(--${authorityVar}, …) fallback with a literal value`)
          // 两边都是手写字面量：不同值就是漂移，两边各自的红绿说明不了谁对，必须一起改。
          if (fallback.trim() !== authorityValue)
            return fail(
              `--${consumerVar} fallback ${fallback.trim()} != --${authorityVar} value ${authorityValue} in ${authorityFile}: two hand-written literals drifted apart`
            )
          // 消费方一旦写死同名声明，两个包就会各说各话；token 的归属在权威文件那边。
          if (new RegExp(`--${authorityVar}\\s*:`).test(consumer))
            return fail(`declares --${authorityVar} itself; the token is owned by ${authorityFile}`)

          return ok(undefined)
        })
    }))
  )
