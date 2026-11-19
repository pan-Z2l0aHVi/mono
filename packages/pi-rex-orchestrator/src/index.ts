/**
 * Pi 扩展入口。
 *
 * Pi 用 jiti 直接消费 `src/index.ts`，因此这里不能出现只有构建期才注入的东西
 * （`import.meta.env` 之类）。激活门槛只看环境变量：`REX_SESSION` 存在且
 * `PI_REX_ORCH !== "0"`。Rex 之外的终端（Ghostty / iTerm2 / SSH）输入 `pi`
 * 保持 100% 原生 Coding Agent，零副作用。
 *
 * 本文件不做装配细节；真实的 rex 适配、注册表与工具在 `orchestrator.ts`，
 * 这里只负责激活判定、配置加载与依赖注入。
 */

import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { detectActivation } from './activation'
import { HandoffStore } from './handoff-store'
import { createOrchestrator, type BridgePi } from './orchestrator'
import type { ExtensionAPI } from './pi-types'
import { loadUserConfig, resolveProfiles } from './profiles'
import { RexAdapter, resolveRexBin } from './rex-adapter'
import { WorkerRegistry } from './state-machine'

export default async function rexOrchestrator(pi: ExtensionAPI): Promise<void> {
  const activation = detectActivation(process.env)
  if (!activation.active) return

  const loaded = await loadUserConfig({
    homedir: homedir(),
    readFile: async filePath => readFile(filePath, 'utf8'),
    stat: async filePath => {
      const info = await stat(filePath)
      return { mode: Number(info.mode & 0o777) }
    },
    exists: async filePath => {
      try {
        await stat(filePath)
        return true
      } catch {
        return false
      }
    }
  })

  const adapter = new RexAdapter({
    exec: (command, args, options) => pi.exec(command, args, options),
    bin: resolveRexBin(process.env),
    session: process.env.REX_SESSION as string
  })

  // 返回值只服务于测试与直接装配方；清理走 `createOrchestrator` 内部的
  // `session_shutdown`，Pi 不消费工厂返回值。
  createOrchestrator(pi as unknown as BridgePi, {
    adapter,
    registry: new WorkerRegistry(),
    profiles: resolveProfiles(loaded.config),
    createStore: sessionId => new HandoffStore({ sessionId }),
    config: loaded.config,
    configWarnings: loaded.warnings,
    // scripts/ 而非 bin/：根 .gitignore 把 bin/ 当构建产物目录排除。
    runHeadlessPath: fileURLToPath(new URL('../scripts/run-headless.mjs', import.meta.url)),
    nodePath: process.execPath
  })
}
