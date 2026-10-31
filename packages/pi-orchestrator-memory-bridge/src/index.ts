/**
 * Pi 扩展入口。
 *
 * Pi 用 jiti 直接消费 `src/index.ts`，所以这里不能出现只有 Vite 构建期才注入的东西
 * （`import.meta.env` 之类）。激活探测是异步的，factory 因此也是异步的：Pi 会等它返回，
 * 期间不会有未注册的钩子漏跑。
 *
 * 探测用 `herdr agent list` 的 `name` 字段区分 lead 与 worker：Herdr 给每个 pane 注入同一组
 * `HERDR_*` 变量，没有角色字段，而这批变量在 worker pane 里同样成立。详见 `activation.ts`。
 *
 * 真实的 herdr 子进程只在这里注入：`createBridge` 自己不默认起进程，测试与直接装配方
 * 必须显式提供控制依赖，否则会在 `tool_result` 里动到真实会话。
 */

import { detectActivation } from './activation'
import { createBridge, type BridgePi } from './bridge'
import { clearPaneZoomViaHerdr, listAgentsViaHerdr, movePaneViaHerdr } from './dispatch/herdr-cli'
import type { ExtensionAPI } from './pi-types'

export default async function piOrchestratorMemoryBridge(pi: ExtensionAPI): Promise<void> {
  const activation = await detectActivation({
    env: process.env,
    listAgentNames: listAgentsViaHerdr
  })

  if (!activation.active) return

  // Pi 只调用这个工厂函数，不消费它的返回值；清理走 `createBridge` 内部注册的
  // `session_shutdown`。返回值只服务于测试与直接装配方，所以这里刻意不接。
  createBridge(pi as unknown as BridgePi, {
    activation,
    control: {
      listAgents: listAgentsViaHerdr,
      movePane: movePaneViaHerdr,
      clearPaneZoom: clearPaneZoomViaHerdr
    }
  })
}
