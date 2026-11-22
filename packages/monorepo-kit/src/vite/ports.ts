import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { Plugin } from 'vite'

import { getWorkspaceRoot } from '../shared/workspace-root'

// 浏览器测试的 API 端口分配：基于 project 与 worktree 根路径的零配置确定性哈希分槽。
// 遵循 ADR-0018 零本仓数据边界，包内不维护或读取任何消费仓库的端口表与项目清单。
//
// 自动分槽落在 23410..49151（2574 个 10 端口宽槽位，基址 23410..49140），严格避开
// macOS 默认临时端口段 49152..65535，防止并行构建或系统临时出站连接随机抢占基端口。
// 每个项目占一个 10 端口宽的段：Vite 在端口被占且设 strictPort: false 时会 +1 重试，
// 段内留出的空间让重试落回自己的段。
//
// 多 worktree 并发零配置自动隔离：主仓（`.git` 为目录或不存在）哈希输入为 `${project}`；
// linked worktree（`.git` 为文件）哈希输入为 `${realpathSync(root)}\0${project}`，确保并行
// worktree 各自落到独立槽位，同时经 symlink 访问同一 worktree 仍得出一致端口。

export const BASE_PORT = 23410
export const AUTO_MAX_PORT = 49151
export const MAX_PORT = 65535
export const BAND_WIDTH = 10
export const SLOT_COUNT = Math.floor((AUTO_MAX_PORT - BASE_PORT + 1) / BAND_WIDTH)

export interface ResolveTestPortOptions {
  /** 项目名，参与确定性哈希分槽 */
  readonly project: string
  /** 仓库或 worktree 根路径，用于探测 `.git` 并按需隔离 linked worktree */
  readonly root: string
  /** 偏移量的来源，默认 `process.env` */
  readonly env?: NodeJS.ProcessEnv
}

function isLinkedWorktree(root: string): boolean {
  try {
    return fs.statSync(path.join(root, '.git')).isFile()
  } catch (error) {
    // 只有路径不存在按非 linked worktree 处理；权限等其他文件系统错误保留原异常。
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

function resolveRealRoot(root: string): string {
  try {
    return fs.realpathSync(root)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return path.resolve(root)
    throw error
  }
}

function offsetOf(env: NodeJS.ProcessEnv): number {
  const rawOffset = env.GREYPAN_TEST_PORT_OFFSET
  if (rawOffset === undefined || rawOffset === '') return 0
  const offset = /^\d+$/.test(rawOffset) ? Number(rawOffset) : Number.NaN
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new Error(`test-ports: GREYPAN_TEST_PORT_OFFSET 必须是非负整数，收到 "${rawOffset}"`)
  return offset
}

/**
 * 计算指定项目在当前工作区下的测试 API 基端口。
 *
 * 主仓（`.git` 为目录或不存在）按 `${project}` 哈希分槽，linked worktree（`.git` 为文件）
 * 按 `${realpathSync(root)}\0${project}` 哈希分槽；可选读取 `GREYPAN_TEST_PORT_OFFSET` 做非负整数偏移，
 * 并校验整段不越过端口上限 `65535`。
 */
export function resolveTestPort({ project, root, env = process.env }: ResolveTestPortOptions): number {
  if (project.trim().length === 0) throw new Error('test-ports: project 不能为空')

  const seed = isLinkedWorktree(root) ? `${resolveRealRoot(root)}\0${project}` : project
  const slot = crypto.createHash('sha256').update(seed).digest().readUInt32BE(0) % SLOT_COUNT
  const basePort = BASE_PORT + slot * BAND_WIDTH
  const offset = offsetOf(env)

  if (basePort + offset + BAND_WIDTH - 1 > MAX_PORT)
    throw new Error(`test-ports: 偏移 ${offset} 让 "${project}" 超出端口上限 ${MAX_PORT}`)

  return basePort + offset
}

export interface TestPortsPluginOptions {
  /** 项目名，用于确定性哈希分槽 */
  readonly project: string
  /** 要写入的 vitest project 的 `test.name`；不填时写根 `test` */
  readonly testName?: string
  /** API 绑定地址，默认 `127.0.0.1` */
  readonly host?: string
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
  port: number,
  { testName, host = '127.0.0.1' }: Pick<TestPortsPluginOptions, 'testName' | 'host'> = {}
): void {
  const test = config.test
  if (!test) throw new Error('test-ports: 这份 Vite 配置没有 test 块，testPorts() 无处可写')

  if (testName === undefined) return writeApi(test, port, host, testName)
  if (!test.projects) return

  const entry = test.projects.find(item => item.test?.name === testName)?.test
  if (!entry) throw new Error(`test-ports: 配置里没有 test.name 为 "${testName}" 的 project`)
  writeApi(entry, port, host, testName)
}

interface ApiTarget {
  api?: TestApi
}

function writeApi(target: ApiTarget, port: number, host: string, testName: string | undefined): void {
  // 手写 api 与插件互斥：两处都能写时，生效的那一处取决于合并顺序，读配置的人看不出来。
  if (target.api) throw new Error(`test-ports: "${testName ?? 'root'}" 已经写了 test.api，端口由 testPorts() 设置`)

  target.api = { host, port, strictPort: false }
}

/**
 * 把确定性分配的端口段写进 vitest 的 API server，用法与其他 Vite 插件一致：
 * `plugins: [testPorts({ project: 'web-ui', testName: 'browser' })]`。
 *
 * 三件事一起写，是因为它们都是这段分配的后果而不是调用点的偏好：`host` 钉 loopback，Vite 的
 * 可用性探测只绑通配地址，看不见只占 `127.0.0.1` 的进程，绑定同址才会 EADDRINUSE 并前进到段内
 * 下一个端口；`strictPort: false` 必须显式写出来，vitest 5 的 `vitest:config:server` 会把顶层
 * `server.strictPort: true` 一并带进测试服务器，端口被占就整包判红，而测试服务器按实际监听地址
 * 指浏览器，漂移零代价。
 */
export function testPorts({ project, testName, host = '127.0.0.1' }: TestPortsPluginOptions): Plugin {
  return {
    name: 'greypan:test-ports',
    // Vite 在 build 也会求值 config hook。测试端口不该变成构建的前置依赖：
    // build 环境里带了非法端口偏移或配置里没有 test 块，都不该让不跑测试的构建失败。
    config: (config, env) => {
      if (env.command === 'build') return
      const port = resolveTestPort({
        project,
        root: getWorkspaceRoot(import.meta.dirname)
      })
      applyTestPorts(config as TestPortsTargetConfig, port, { testName, host })
    }
  }
}
