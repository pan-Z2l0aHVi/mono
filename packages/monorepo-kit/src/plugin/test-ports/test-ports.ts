import fs from 'node:fs'
import path from 'node:path'

import { definePlugin } from '@greypan/js-kit'

import { findRepoRoot } from '../workspace/workspace'

// 浏览器测试的 API 端口分配。谁占哪个段是本仓库的编排事实，数据在根 `monorepo.json`；
// 这里只做读取、校验与偏移。
//
// 端口是「每台机器一套」的资源，而写进 vite.config 的数字是「每个 checkout 一份」的常量，
// 所以固定端口只能保证同一轮 turbo test 内不冲突，挡不住同一台机器上并行的其他 worktree。
// 每个项目占一个 bandWidth 宽的段：Vite 在端口被占且未设 strictPort 时会 +1 重试，段内留出的
// 空间让这次重试落回自己的段。偏移是整表平移，表内相对间隔不受影响；真正的约束是不同
// worktree 的两组端口不能重叠，也就是 offsetStride 不得小于全表跨度。
//
// 配置在首次调用时读取：入口是整包再导出，顶层读文件会让每个消费者都碰一次文件系统。

const MAX_PORT = 65535

export interface TestPortsOptions {
  /** 端口表文件名，相对仓库根 */
  readonly configFile?: string
}

export interface TestPortsContext {
  /** 仓库根；缺省从本模块位置向上找 `pnpm-workspace.yaml` */
  readonly root?: string
}

export interface TestPortsApi {
  /** 端口分配里登记的 project 名，顺序与端口表一致 */
  readonly names: () => readonly string[]
  /** 取某个项目的基端口；偏移只做整表平移，不改段内间隔 */
  readonly port: (name: string, env?: NodeJS.ProcessEnv) => number
}

interface Allocation {
  bandWidth: number
  offsetStride: number
  ports: Map<string, number>
  names: readonly string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveInteger(value: unknown, key: string, configFile: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0)
    throw new Error(`test-ports: ${configFile} 的 ${key} 必须是正整数，收到 ${JSON.stringify(value)}`)
  return value
}

function parse(raw: unknown, configFile: string): Allocation {
  if (!isPlainObject(raw) || !isPlainObject(raw.testPorts))
    throw new Error(`test-ports: ${configFile} 缺少 testPorts 对象`)

  const bandWidth = positiveInteger(raw.testPorts.bandWidth, 'testPorts.bandWidth', configFile)
  const offsetStride = positiveInteger(raw.testPorts.offsetStride, 'testPorts.offsetStride', configFile)
  const rawPorts = raw.testPorts.ports
  if (!isPlainObject(rawPorts) || Object.keys(rawPorts).length === 0)
    throw new Error(`test-ports: ${configFile} 的 testPorts.ports 必须是非空对象`)

  const ports = new Map<string, number>()
  for (const [name, base] of Object.entries(rawPorts)) {
    if (typeof base !== 'number' || !Number.isInteger(base) || base < 1 || base > MAX_PORT)
      throw new Error(
        `test-ports: ${configFile} 的 testPorts.ports["${name}"] 必须是 1..${MAX_PORT} 的整数，收到 ${JSON.stringify(base)}`
      )
    ports.set(name, base)
  }

  const sorted = [...ports.values()].sort((left, right) => left - right)
  for (const [index, base] of sorted.entries()) {
    if (index > 0 && base - sorted[index - 1] < bandWidth) {
      // 段没有真占住自己的宽度时，两个项目会在同一批端口上互相 +1 抢位，而调用点看不出来。
      throw new Error(`test-ports: 段 ${sorted[index - 1]} 与 ${base} 相距不足 ${bandWidth}，两个项目会重叠`)
    }
  }

  const span = Math.max(...sorted) + bandWidth - Math.min(...sorted)
  if (span > offsetStride) {
    // 跨度超过步长时，相邻两档偏移的 worktree 会抢同一批端口，而调用点看不出来。
    throw new Error(`test-ports: 端口表跨度 ${span} 超过偏移步长 ${offsetStride}，不同偏移会重叠`)
  }

  return { bandWidth, offsetStride, ports, names: Object.freeze([...ports.keys()]) }
}

export const defineTestPorts = ({ configFile = 'monorepo.json' }: TestPortsOptions = {}) =>
  definePlugin<TestPortsApi, TestPortsContext>(ctx => {
    let cached: Allocation | undefined

    function allocation(): Allocation {
      if (cached) return cached

      const file = path.join(ctx.root ?? findRepoRoot(import.meta.dirname), configFile)
      let text: string
      try {
        text = fs.readFileSync(file, 'utf8')
      } catch (cause) {
        throw new Error(`test-ports: cannot read ${file}`, { cause })
      }

      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch (cause) {
        throw new Error(`test-ports: ${file} is not valid JSON`, { cause })
      }

      cached = parse(raw, configFile)
      return cached
    }

    return {
      names: () => allocation().names,
      port: (name, env = process.env) => {
        const { bandWidth, offsetStride, ports, names } = allocation()

        const base = ports.get(name)
        if (base === undefined) {
          throw new Error(`test-ports: 未知项目 "${name}"；可选：${names.join(', ')}`)
        }

        const rawOffset = env.GREYPAN_TEST_PORT_OFFSET
        const offset = rawOffset === undefined || rawOffset === '' ? 0 : Number(rawOffset)
        if (!Number.isInteger(offset) || offset < 0) {
          throw new Error(`test-ports: GREYPAN_TEST_PORT_OFFSET 必须是非负整数，收到 "${rawOffset}"`)
        }
        if (offset % offsetStride !== 0) {
          throw new Error(`test-ports: GREYPAN_TEST_PORT_OFFSET 必须是 ${offsetStride} 的倍数，收到 ${offset}`)
        }
        if (base + offset + bandWidth - 1 > MAX_PORT) {
          throw new Error(`test-ports: 偏移 ${offset} 让 "${name}" 超出端口上限 ${MAX_PORT}`)
        }

        return base + offset
      }
    }
  })

const defaultPorts = defineTestPorts()
let defaultApi: TestPortsApi | undefined

function api(): TestPortsApi {
  defaultApi ??= defaultPorts.make({})
  return defaultApi
}

/** 端口分配里登记的 project 名，顺序与端口表一致。 */
export function testApiPortNames(): readonly string[] {
  return api().names()
}

/** 取某个项目的基端口；项目名在编译期只是 `string`，未知名字在这里报错并列出可选值。 */
export function testApiPort(name: string, env: NodeJS.ProcessEnv = process.env): number {
  return api().port(name, env)
}
