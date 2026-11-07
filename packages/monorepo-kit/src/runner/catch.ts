import { definePlugin, rust } from '@greypan/js-kit'

import { errorMessage } from '../shared/errors'

import { type Chain, defineRunner, type KitCtx, type Run } from './runner'

/**
 * 把 `run()` 期抛出的异常收敛成 `throw: ` 起头的 `Err`：门禁只有「判定不通过」一种失败语义，
 * 不由未捕获异常表达，也不因异常而跳过前面的判定。放在链尾最后一个 `.use()`。
 *
 * 只覆盖 `run()` 期：插件工厂在 `.make()` 期间就同步执行，构造期抛错会冒泡到触发层，
 * 由触发层自己兜成一行 stderr 与非零退出码。两者都让门禁变红，别把这里当成全链护罩。
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
