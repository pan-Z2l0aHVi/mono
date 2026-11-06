import { definePlugin, rust, type Plugin } from '@greypan/js-kit'

/**
 * 一条判定的执行体：不吃入参——判定需要的仓库事实与运行期参数都在装配期由 `defineXxx(options)`
 * 带进去了。`Err` 载荷是给人读的一行起头文案，域名前缀是链上唯一的归因抓手。
 *
 * 包内只有这一个签名。js-kit 的 `C & U` 交集下，同名键 `run` 只在两侧类型完全一致时才是同一个
 * 键；按插件分别建模签名会塌成重载集，编译通过而顶层调用点看到的是幻影签名。零参把这件事变成
 * 结构性的：没有入参位置可以各写一份。
 */
export type Run = () => Promise<rust.Result<void, string>>

/**
 * 由触发层经 `.make()` 注入的仓库事实。插件与 `plugin/**` 一律不产出 `root`。
 */
export interface KitCtx {
  readonly root: string
  readonly env: NodeJS.ProcessEnv
}

/**
 * 一条组装完的链对外交付的形状：根上只需要 `KitCtx`。js-kit 的 `use` 会把被用插件的入参
 * 需求并进结果类型，内部接线的 `run` 与能力键于是会一路漏到 `.make()` 的调用处，要求触发层
 * 供给本应由链自己提供的东西；对外形状因此收在这一层，由每个判定插件标注。
 */
export type Chain = Plugin<{ run: Run }, KitCtx>

/**
 * 链式协议的基座。带 `run` 的 ctx 上它原样转发（自己是链中位置），不带时返回恒等
 * （自己是链头位置）——同一个入口吸收两种角色，靠 `typeof ctx.run` 判分。
 *
 * 每个产 `run` 的插件都以它起头并自带所需能力，所以触发层只排顺序，不给插件接线。
 */
export const defineRunner = () =>
  definePlugin<{ run: Run }, KitCtx & { run?: Run }>(ctx => ({
    run: async () => (typeof ctx.run === 'function' ? ctx.run() : rust.ok(undefined))
  }))
