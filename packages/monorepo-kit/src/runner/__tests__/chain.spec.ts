import assert from 'node:assert/strict'

import { definePlugin, rust } from '@greypan/js-kit'
import { it } from 'vite-plus/test'

import { defineCatch } from '../catch'
import { type Chain, type KitCtx, defineRunner, type Run } from '../runner'

const { andThen, err, ok } = rust

// 合成链不读仓库事实，root 只用来满足 KitCtx；指一个不存在的路径，恰好证明它没被读过。
const ctx = { root: '/chain-protocol', env: {} as NodeJS.ProcessEnv }

// 链部件的替身与真实判定走同一套协议：`run: () => andThen(ctx.run(), self)`，对外同样只交付 `Chain`。
// 这里钉的顺序、短路、转发与抛出收敛，就是判定在门禁链里拿到的行为。
function step(label: string, trace: string[], outcome: 'ok' | 'fail' | 'throw'): Chain {
  return defineRunner().use(
    definePlugin<{ run: Run }, KitCtx & { run: Run }>(chain => ({
      run: () =>
        andThen(chain.run(), () => {
          trace.push(label)
          if (outcome === 'fail') return err(`dom: ${label} failed`)
          if (outcome === 'throw') throw new Error(`${label} exploded`)
          return ok(undefined)
        })
    }))
  )
}

it('链按 .use() 顺序执行，首个 Err 短路后续判定', async () => {
  const trace: string[] = []
  const result = await defineRunner()
    .use(step('a', trace, 'ok'))
    .use(step('b', trace, 'fail'))
    .use(step('c', trace, 'ok'))
    .make(ctx)
    .run()

  assert.ok(!result.ok)
  assert.equal(result.error, 'dom: b failed')
  assert.deepEqual(trace, ['a', 'b'])
})

it('判定文案原样到达链尾，域名前缀不被基座或链尾改写', async () => {
  const trace: string[] = []
  const result = await defineRunner()
    .use(step('a', trace, 'ok'))
    .use(step('b', trace, 'fail'))
    .use(defineCatch())
    .make(ctx)
    .run()

  assert.ok(!result.ok)
  assert.equal(result.error, 'dom: b failed')
})

it('链头只有基座时按恒等通过', async () => {
  assert.deepEqual(await defineRunner().make(ctx).run(), ok(undefined))
  assert.ok((await defineRunner().use(defineCatch()).make(ctx).run()).ok)
})

it('链尾 defineCatch 把抛出收敛成 throw: 前缀', async () => {
  const trace: string[] = []
  const result = await defineRunner()
    .use(step('a', trace, 'ok'))
    .use(step('b', trace, 'throw'))
    .use(defineCatch())
    .make(ctx)
    .run()

  assert.ok(!result.ok)
  assert.equal(result.error, 'throw: b exploded')
  assert.deepEqual(trace, ['a', 'b'])
})

it('构造期抛错不在 defineCatch 的射程内，由触发层承担', () => {
  // js-kit 的 make 是 eager 的：插件工厂在 `.make()` 期就执行，早于链上的 run()。
  // defineCatch 只包 run()，所以这里钉死「工厂抛错会冒泡」这个边界，别把契约读成全链护罩。
  const factory: Chain = definePlugin<{ run: Run }, KitCtx>(() => {
    throw new Error('factory exploded')
  })
  assert.throws(() => defineRunner().use(factory).use(defineCatch()).make(ctx), {
    message: 'factory exploded'
  })
})

it('先到的 Err 不被后面的抛出覆盖', async () => {
  const trace: string[] = []
  const result = await defineRunner()
    .use(step('a', trace, 'fail'))
    .use(step('b', trace, 'throw'))
    .use(defineCatch())
    .make(ctx)
    .run()

  assert.ok(!result.ok)
  assert.equal(result.error, 'dom: a failed')
  assert.deepEqual(trace, ['a'])
})
