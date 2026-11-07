import { definePlugin, rust } from '@greypan/js-kit'

import { errorMessage } from '../shared/errors'

import { type Chain, defineRunner, type KitCtx, type Run } from './runner'

/**
 * 把链上任何一处抛出的异常收敛成 `throw: ` 起头的 `Err`：门禁只有「判定不通过」一种失败语义，
 * 不由未捕获异常表达，也不因异常而跳过前面的判定。放在链尾最后一个 `.use()`。
 */
export const defineCatch = (): Chain =>
  defineRunner().use(
    definePlugin<{ run: Run }, KitCtx & { run: Run }>(ctx => ({
      run: async () => {
        try {
          return await ctx.run()
        } catch (error) {
          return rust.err(`throw: ${errorMessage(error)}`)
        }
      }
    }))
  )
