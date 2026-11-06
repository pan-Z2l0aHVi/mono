import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../../runner/runner'

import { defineChangesets, type ChangesetsApi, type ChangesetsOptions } from './changesets'

const { andThen, err, ok } = rust

// 区间是否配了 changeset 由 Changesets 自己判：本判定不复制它的匹配规则，只把 `status --since`
// 的退出转成链上的 `Err`。没有 base 就没有区间，所以它是装配期的必填参数，不是运行期的一种失败。

export interface ChangesetStatusOptions extends ChangesetsOptions {
  /** 区间下界，SHA 或 ref */
  readonly base: string
}

export const defineChangesetStatus = ({ base, ...changesets }: ChangesetStatusOptions): Chain =>
  defineRunner()
    .use(defineChangesets(changesets))
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & ChangesetsApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), () => {
            const failure = ctx.statusFailure(base)
            return failure === null ? ok(undefined) : err(failure)
          })
      }))
    )
