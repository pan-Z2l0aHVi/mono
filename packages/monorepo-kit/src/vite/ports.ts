import fs from 'node:fs'
import path from 'node:path'

import type { Plugin } from 'vite'

import { getWorkspaceRoot } from '../shared/workspace-root'

// 浏览器测试的 API 端口分配。谁占哪个段是本仓库的编排事实，数据在根 `monorepo.json`；
// 这里只做读取、校验与偏移，外加把它写进 Vite 配置的那只插件。
//
// 端口是「每台机器一套」的资源，而写进 vite.config 的数字是「每个 checkout 一份」的常量，
// 所以固定端口只能保证同一轮 turbo test 内不冲突，挡不住同一台机器上并行的其他 worktree。
// 每个项目占一个 bandWidth 宽的段：Vite 在端口被占且未设 strictPort 时会 +1 重试，段内留出的
// 空间让这次重试落回自己的段。偏移是整表平移，表内相对间隔不受影响；真正的约束是不同
// worktree 的两组端口不能重叠，也就是 offsetStride 不得小于全表跨度。

const MAX_PORT = 65535

export interface TestPorts {
  /** 端口分配里登记的 project 名，顺序与端口表一致 */
  readonly names: () => readonly string[]
  /** 取某个项目的基端口；偏移只做整表平移，不改段内间隔，偏移量读 `env` */
  readonly port: (name: string) => number
}

export interface ReadTestPortsOptions {
  /** 仓库根：端口表按相对根的路径读取 */
  readonly root: string
  /** 偏移量的来源，默认 `process.env` */
  readonly env?: NodeJS.ProcessEnv
  /** 端口表文件名，相对仓库根 */
  readonly configFile?: string
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

function offsetOf(env: NodeJS.ProcessEnv, offsetStride: number): number {
  const rawOffset = env.GREYPAN_TEST_PORT_OFFSET
  const offset = rawOffset === undefined || rawOffset === '' ? 0 : Number(rawOffset)
  if (!Number.isInteger(offset) || offset < 0)
    throw new Error(`test-ports: GREYPAN_TEST_PORT_OFFSET 必须是非负整数，收到 "${rawOffset}"`)
  if (offset % offsetStride !== 0)
    throw new Error(`test-ports: GREYPAN_TEST_PORT_OFFSET 必须是 ${offsetStride} 的倍数，收到 ${offset}`)
  return offset
}

/**
 * 读取并校验端口表，返回按名字取段的读数。
 *
 * 坏表与未知项目都抛错而不返回 `Result`：配置求值要的是能用的数字，判定层要的是「这一步没跑成」，
 * 两边各自决定怎么呈现失败，而表坏掉时没有任何可继续的形状。
 */
export function readTestPorts({
  root,
  env = process.env,
  configFile = 'monorepo.json'
}: ReadTestPortsOptions): TestPorts {
  const file = path.join(root, configFile)
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

  const allocation = parse(raw, configFile)
  return {
    names: () => allocation.names,
    port: name => {
      const base = allocation.ports.get(name)
      if (base === undefined) throw new Error(`test-ports: 未知项目 "${name}"；可选：${allocation.names.join(', ')}`)

      const offset = offsetOf(env, allocation.offsetStride)
      if (base + offset + allocation.bandWidth - 1 > MAX_PORT)
        throw new Error(`test-ports: 偏移 ${offset} 让 "${name}" 超出端口上限 ${MAX_PORT}`)

      return base + offset
    }
  }
}

export interface TestPortsPluginOptions {
  /** 端口表里登记的项目名，也就是这次分配占的那一段 */
  readonly project: string
  /** 要写入的 vitest project 的 `test.name`；不填时写根 `test` */
  readonly testName?: string
  /** API 绑定地址，默认 `127.0.0.1` */
  readonly host?: string
  /** 端口表文件名，相对仓库根 */
  readonly configFile?: string
}

interface TestApi {
  host?: string
  port?: number
  strictPort?: boolean
  [key: string]: unknown
}

interface ProjectBlock {
  test?: { api?: TestApi; name?: string }
}

export interface TestPortsTargetConfig {
  test?: { api?: TestApi; name?: string; projects?: ProjectBlock[] }
}

/**
 * 把分配到的端口段写进这份配置的 test 块，`testPorts()` 的实现体。
 *
 * vitest 5 对一份带 `test.projects` 的配置会跑多遍求值：根上一遍（那里看得见 projects 数组），每个
 * 会被跑到的 project 各一遍（那里只有它自己的 test 块，没有数组）。根上写进那个 project 的值随后一
 * 遍的合并原样带过去，所以只在根那一遍动手：`testName` 给出时它必须真的对应一个 project（写错的名
 * 字不会静默落到 63315），project 那一遍则直接交回它继承的结果，不再判第二次来源。
 * 不填 `testName` 时写根 `test`，那是没有 projects 数组的配置的用法。
 */
export function applyTestPorts(
  config: TestPortsTargetConfig,
  ports: TestPorts,
  { project, testName, host = '127.0.0.1' }: Pick<TestPortsPluginOptions, 'project' | 'testName' | 'host'>
): void {
  const test = config.test
  if (!test) throw new Error('test-ports: 这份 Vite 配置没有 test 块，testPorts() 无处可写')

  if (testName === undefined) return writeApi(test, ports, project, host, testName)
  if (!test.projects) return

  const entry = test.projects.find(item => item.test?.name === testName)?.test
  if (!entry) throw new Error(`test-ports: 配置里没有 test.name 为 "${testName}" 的 project`)
  writeApi(entry, ports, project, host, testName)
}

interface ApiTarget {
  api?: TestApi
}

function writeApi(
  target: ApiTarget,
  ports: TestPorts,
  project: string,
  host: string,
  testName: string | undefined
): void {
  // 手写 api 与插件互斥：两处都能写时，生效的那一处取决于合并顺序，读配置的人看不出来。
  if (target.api) throw new Error(`test-ports: "${testName ?? 'root'}" 已经写了 test.api，端口由 testPorts() 设置`)

  target.api = { host, port: ports.port(project), strictPort: false }
}

/**
 * 把分配到的端口段写进 vitest 的 API server，用法与其他 Vite 插件一致：
 * `plugins: [testPorts({ project: 'web-ui', testName: 'browser' })]`。
 *
 * 三件事一起写，是因为它们都是这段分配的后果而不是调用点的偏好：`host` 钉 loopback，Vite 的
 * 可用性探测只绑通配地址，看不见只占 `127.0.0.1` 的进程，绑定同址才会 EADDRINUSE 并前进到段内
 * 下一个端口；`strictPort: false` 必须显式写出来，vitest 5 的 `vitest:config:server` 会把顶层
 * `server.strictPort: true` 一并带进测试服务器，端口被占就整包判红，而测试服务器按实际监听地址
 * 指浏览器，漂移零代价。
 */
export function testPorts({ project, testName, host = '127.0.0.1', configFile }: TestPortsPluginOptions): Plugin {
  return {
    name: 'greypan:test-ports',
    // Vite 在 build 也会求值 config hook。端口表是测试编排数据，不该变成构建的前置依赖：
    // 根 monorepo.json 缺失或坏表、或 build 环境里带了非法端口偏移，都不该让不跑测试的构建失败。
    config: (config, env) => {
      if (env.command === 'build') return
      applyTestPorts(
        config as TestPortsTargetConfig,
        readTestPorts({ root: getWorkspaceRoot(import.meta.dirname), configFile }),
        {
          project,
          testName,
          host
        }
      )
    }
  }
}
