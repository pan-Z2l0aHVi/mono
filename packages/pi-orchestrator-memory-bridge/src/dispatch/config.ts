/**
 * 编排控制配置。
 *
 * 配置与 `@ret2hell/pi-herdr-orchestrator` 共用同一份 `config.json`：它的 `mergeConfig`
 * 只取已知键，未知键被忽略，所以新增 `shepherd` 段对 orchestrator 无副作用，桥接自己读。
 * 不改 orchestrator 源码，也不另开一份配置文件——两份配置会随部署漂移。
 *
 * 读取失败与非法值都必须回退到缺省值并保留原因：让一次手写错误永久挡住 `herdr_dispatch`
 * 比用缺省值继续工作更糟。调用方根据 `warning` 只通知一次。
 */

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** 缺省并发 worker 上限。 */
export const DEFAULT_MAX_CONCURRENT_WORKERS = 4

/** 解析后的控制配置。`warning` 只在回退非法值时出现。 */
export interface ControlConfig {
  readonly maxConcurrentWorkers: number
  readonly separateTabs: boolean
  /** 回退原因；undefined 表示配置有效或缺失（缺失按缺省值处理，不告警）。 */
  readonly warning?: string
}

/** orchestrator 的配置根；与本包同机共用一份。 */
export function defaultControlConfigPath(home: string = homedir()): string {
  return join(home, '.pi', 'agent', 'pi-herdr-orchestrator', 'config.json')
}

const DEFAULTS: ControlConfig = {
  maxConcurrentWorkers: DEFAULT_MAX_CONCURRENT_WORKERS,
  separateTabs: true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 解析 `config.json` 的完整 JSON 值。
 *
 * 只读 `shepherd` 段；其他键属于 orchestrator，这里既不校验也不改动。
 */
export function parseControlConfig(raw: unknown): ControlConfig {
  if (!isRecord(raw)) {
    return { ...DEFAULTS, warning: 'config root is not a JSON object' }
  }

  const section = raw.shepherd
  if (section === undefined) return DEFAULTS
  if (!isRecord(section)) {
    return { ...DEFAULTS, warning: 'shepherd 段不是对象' }
  }

  const warnings: string[] = []

  const limit = section.maxConcurrentWorkers
  let maxConcurrentWorkers = DEFAULT_MAX_CONCURRENT_WORKERS
  if (limit !== undefined) {
    if (typeof limit === 'number' && Number.isInteger(limit) && limit >= 1) {
      maxConcurrentWorkers = limit
    } else {
      warnings.push(
        `shepherd.maxConcurrentWorkers 不是正整数（${JSON.stringify(limit)}），回退 ${DEFAULT_MAX_CONCURRENT_WORKERS}`
      )
    }
  }

  const tabs = section.separateTabs
  let separateTabs = true
  if (tabs !== undefined) {
    if (typeof tabs === 'boolean') separateTabs = tabs
    else warnings.push(`shepherd.separateTabs 不是布尔值（${JSON.stringify(tabs)}），回退 true`)
  }

  const warning = warnings.length > 0 ? warnings.join('；') : undefined
  return {
    maxConcurrentWorkers,
    separateTabs,
    ...(warning === undefined ? {} : { warning })
  }
}

/**
 * 读取配置文件。
 *
 * 文件不存在是正常状态（用户从未配置），静默使用缺省值；读取或解析失败才带 warning。
 * 这个函数本身不 throw：调用方是工具调用钩子，异常会打断 dispatch。
 */
export async function readControlConfig(path: string = defaultControlConfigPath()): Promise<ControlConfig> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return DEFAULTS
    const detail = error instanceof Error ? error.message : String(error)
    return { ...DEFAULTS, warning: `读取 ${path} 失败（${detail}）` }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { ...DEFAULTS, warning: `${path} 不是合法 JSON（${detail}）` }
  }
  return parseControlConfig(parsed)
}
