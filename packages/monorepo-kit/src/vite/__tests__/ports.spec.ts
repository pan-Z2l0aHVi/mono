import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import {
  AUTO_MAX_PORT,
  BAND_WIDTH,
  BASE_PORT,
  MAX_PORT,
  SLOT_COUNT,
  type TestPortsPluginOptions,
  type TestPortsTargetConfig,
  applyTestPorts,
  resolveTestPort,
  testPorts
} from '../ports'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-test-ports-'))
let fixture = 0

function makeRoot(gitKind: 'dir' | 'file' | 'none'): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(root, { recursive: true })
  if (gitKind === 'dir') fs.mkdirSync(path.join(root, '.git'))
  else if (gitKind === 'file') fs.writeFileSync(path.join(root, '.git'), 'gitdir: /repo/.git/worktrees/wt\n')
  return root
}

function withTestPortOffset<T>(value: string | undefined, run: () => T): T {
  const hadOwn = Object.prototype.hasOwnProperty.call(process.env, 'GREYPAN_TEST_PORT_OFFSET')
  const previous = process.env.GREYPAN_TEST_PORT_OFFSET
  if (value === undefined) delete process.env.GREYPAN_TEST_PORT_OFFSET
  else process.env.GREYPAN_TEST_PORT_OFFSET = value
  try {
    return run()
  } finally {
    if (!hadOwn) delete process.env.GREYPAN_TEST_PORT_OFFSET
    else process.env.GREYPAN_TEST_PORT_OFFSET = previous
  }
}

it('resolveTestPort 按 project 确定性哈希分槽并避开 macOS 临时端口段', () => {
  assert.equal(BASE_PORT, 23410)
  assert.equal(AUTO_MAX_PORT, 49151)
  assert.equal(MAX_PORT, 65535)
  assert.equal(BAND_WIDTH, 10)
  assert.equal(SLOT_COUNT, 2574)

  const mainRoot = makeRoot('dir')

  // 独立 SHA-256 + BE uint32 参考向量，防止字节序、槽位数或种子格式漂移时自洽假绿。
  assert.equal(resolveTestPort({ project: 'alpha', root: mainRoot, env: {} }), 32540)
  assert.equal(resolveTestPort({ project: 'alpha', root: mainRoot, env: {} }), 32540)
  assert.equal(resolveTestPort({ project: 'beta', root: mainRoot, env: {} }), 48600)

  const projects = [
    'alpha',
    'beta',
    'gamma',
    'web-ui',
    'web-ui-touch',
    'web-ui-reduced-motion',
    'browser-kit',
    'react-web-ui-demo',
    'vue-web-ui-demo',
    'interweave-frontend',
    'interweave-frontend-touch'
  ]
  for (const project of projects) {
    const port = resolveTestPort({ project, root: mainRoot, env: {} })
    assert.equal(resolveTestPort({ project, root: mainRoot, env: {} }), port)
    assert.ok(Number.isInteger(port))
    assert.ok(port >= BASE_PORT && port <= 49140, `${project} port ${port} 超出自动槽位范围`)
    assert.ok(port + BAND_WIDTH - 1 <= AUTO_MAX_PORT, `${project} 端口段落入 macOS 临时端口区`)
    assert.equal((port - BASE_PORT) % BAND_WIDTH, 0, `${project} port ${port} 未按步长 ${BAND_WIDTH} 对齐`)
  }

  assert.throws(() => resolveTestPort({ project: '', root: mainRoot, env: {} }), /project 不能为空/)
  assert.throws(() => resolveTestPort({ project: '   ', root: mainRoot, env: {} }), /project 不能为空/)
})

it('resolveTestPort 自动隔离主仓与 linked worktree，且 symlink 指向同一 worktree 得相同端口', () => {
  const mainRoot = makeRoot('dir')
  const noGitRoot = makeRoot('none')
  const missingRoot = path.join(tempRoot, 'does-not-exist')
  const wtOne = makeRoot('file')
  const wtTwo = makeRoot('file')

  const mainPort = resolveTestPort({ project: 'alpha', root: mainRoot, env: {} })
  // 无 .git 与不存在目录按主仓处理，不因 ENOENT 抛错。
  assert.equal(resolveTestPort({ project: 'alpha', root: noGitRoot, env: {} }), mainPort)
  assert.equal(resolveTestPort({ project: 'alpha', root: missingRoot, env: {} }), mainPort)

  const wtOnePort = resolveTestPort({ project: 'alpha', root: wtOne, env: {} })
  const wtTwoPort = resolveTestPort({ project: 'alpha', root: wtTwo, env: {} })
  assert.ok(wtOnePort >= BASE_PORT && wtOnePort <= 49140)
  assert.ok(wtTwoPort >= BASE_PORT && wtTwoPort <= 49140)
  assert.notEqual(wtOnePort, mainPort)
  assert.notEqual(wtTwoPort, mainPort)
  assert.notEqual(wtOnePort, wtTwoPort)

  // 经 symlink 进入同一个 linked worktree（或主仓）时保持一致端口。
  const wtLink = path.join(tempRoot, 'wt-one-symlink')
  fs.symlinkSync(wtOne, wtLink, 'dir')
  assert.equal(resolveTestPort({ project: 'alpha', root: wtLink, env: {} }), wtOnePort)

  const mainLink = path.join(tempRoot, 'main-symlink')
  fs.symlinkSync(mainRoot, mainLink, 'dir')
  assert.equal(resolveTestPort({ project: 'alpha', root: mainLink, env: {} }), mainPort)
})

it('resolveTestPort 校验 GREYPAN_TEST_PORT_OFFSET 的归零、非负整数与整段上限', () => {
  const mainRoot = makeRoot('dir')
  const basePort = resolveTestPort({ project: 'alpha', root: mainRoot, env: {} })

  // 未设、空串与 '0' 均视为 0 偏移。
  assert.equal(resolveTestPort({ project: 'alpha', root: mainRoot, env: {} }), basePort)
  assert.equal(resolveTestPort({ project: 'alpha', root: mainRoot, env: { GREYPAN_TEST_PORT_OFFSET: '' } }), basePort)
  assert.equal(resolveTestPort({ project: 'alpha', root: mainRoot, env: { GREYPAN_TEST_PORT_OFFSET: '0' } }), basePort)

  // 允许任意非负整数偏移（不再强制 stride 倍数）。
  assert.equal(
    resolveTestPort({ project: 'alpha', root: mainRoot, env: { GREYPAN_TEST_PORT_OFFSET: '1' } }),
    basePort + 1
  )
  assert.equal(
    resolveTestPort({ project: 'alpha', root: mainRoot, env: { GREYPAN_TEST_PORT_OFFSET: '37' } }),
    basePort + 37
  )
  assert.equal(
    resolveTestPort({ project: 'alpha', root: mainRoot, env: { GREYPAN_TEST_PORT_OFFSET: '100' } }),
    basePort + 100
  )

  for (const invalid of ['-1', '-100', '1.5', 'abc', '   ', '1e2', '+10']) {
    assert.throws(
      () => resolveTestPort({ project: 'alpha', root: mainRoot, env: { GREYPAN_TEST_PORT_OFFSET: invalid } }),
      { message: `test-ports: GREYPAN_TEST_PORT_OFFSET 必须是非负整数，收到 "${invalid}"` }
    )
  }

  // 整段上界精确校验：basePort + offset + BAND_WIDTH - 1 <= 65535。
  const maxOffset = MAX_PORT - basePort - BAND_WIDTH + 1
  assert.equal(
    resolveTestPort({ project: 'alpha', root: mainRoot, env: { GREYPAN_TEST_PORT_OFFSET: String(maxOffset) } }),
    MAX_PORT - BAND_WIDTH + 1
  )
  assert.throws(
    () =>
      resolveTestPort({
        project: 'alpha',
        root: mainRoot,
        env: { GREYPAN_TEST_PORT_OFFSET: String(maxOffset + 1) }
      }),
    { message: `test-ports: 偏移 ${maxOffset + 1} 让 "alpha" 超出端口上限 ${MAX_PORT}` }
  )
  assert.throws(
    () => resolveTestPort({ project: 'alpha', root: mainRoot, env: { GREYPAN_TEST_PORT_OFFSET: '100000' } }),
    /超出端口上限 65535/
  )
})

it('applyTestPorts 只把端口段写进指定的 project 并拒绝与手写 test.api 共存', () => {
  function projectsConfig(): TestPortsTargetConfig {
    return { test: { projects: [{ test: { name: 'jsdom' } }, { test: { name: 'browser' } }] } }
  }

  // host 与 strictPort 跟着端口一起写：它们不是调用点的偏好，而是这次分配能落回自己段内的前提。
  const config = projectsConfig()
  applyTestPorts(config, 32540, { testName: 'browser' })
  assert.deepEqual(config.test?.projects?.[1]?.test?.api, { host: '127.0.0.1', port: 32540, strictPort: false })
  assert.equal(config.test?.projects?.[0]?.test?.api, undefined, 'jsdom project 不该抢这个端口')

  // 没有 projects 的单包配置写根 test 块。
  const root: TestPortsTargetConfig = { test: {} }
  applyTestPorts(root, 48600)
  assert.deepEqual(root.test?.api, { host: '127.0.0.1', port: 48600, strictPort: false })

  // vitest 5 还会为每个跑到的 project 单独求值一遍，那一遍手里没有 projects 数组。插件只动根那一遍，
  // 于是根上写进去的值随合并原样带过来（左），没被点名的 project 也拿不到别人的端口（右）。
  const inherited: TestPortsTargetConfig = { test: { name: 'browser', api: { host: '127.0.0.1', port: 32540 } } }
  applyTestPorts(inherited, 32540, { testName: 'browser' })
  assert.deepEqual(inherited.test?.api, { host: '127.0.0.1', port: 32540 })

  const jsdomPass: TestPortsTargetConfig = { test: { name: 'jsdom' } }
  applyTestPorts(jsdomPass, 32540, { testName: 'browser' })
  assert.equal(jsdomPass.test?.api, undefined, 'jsdom 那一遍不该拿到 browser 的端口')

  // 指错 project 必须响亮失败：静默什么都不写时，这一路退回 vitest 的默认端口，撞上同机并行风险。
  assert.throws(() => applyTestPorts(projectsConfig(), 32540, { testName: 'worker' }), {
    message: /^test-ports: 配置里没有 test\.name 为 "worker" 的 project/
  })
  assert.throws(() => applyTestPorts({}, 32540), /没有 test 块/)

  // 两处都能写 api 时生效的那一处取决于合并顺序，所以直接判配置写坏了。
  const bothProject: TestPortsTargetConfig = {
    test: { projects: [{ test: { name: 'browser', api: { port: 1234 } } }] }
  }
  assert.throws(() => applyTestPorts(bothProject, 32540, { testName: 'browser' }), /已经写了 test\.api/)

  const bothRoot: TestPortsTargetConfig = { test: { api: { port: 1234 } } }
  assert.throws(() => applyTestPorts(bothRoot, 32540), /已经写了 test\.api/)

  // host 是调用点唯一可以改写的默认值。
  const custom: TestPortsTargetConfig = { test: {} }
  applyTestPorts(custom, 32640, { host: 'localhost' })
  assert.deepEqual(custom.test?.api, { host: 'localhost', port: 32640, strictPort: false })
})

// Vite 的 config hook 带 `this: ConfigPluginContext`，直接当裸函数调用会被类型层拦下；
// 这里把被测的那支实现收窄成普通函数，只保留测试要用到的两个入参与「就地改 config」的副作用。
type ConfigEnv = { command: 'build' | 'serve'; mode: string }
type ConfigHook = (config: TestPortsTargetConfig, env: ConfigEnv) => void
const configHookOf = (options: TestPortsPluginOptions): ConfigHook => {
  const hook = testPorts(options).config
  assert.equal(typeof hook, 'function', 'testPorts must expose a callable config hook')
  return hook as ConfigHook
}

it('testPorts 的 config hook 在 build 档跳过，只在 serve 档写入确定性端口', () => {
  // build 档完全跳过：既不依赖 test 块，也不因环境里带了非法偏移而让构建失败。
  withTestPortOffset('invalid', () => {
    const buildHook = configHookOf({ project: 'alpha' })
    const buildConfig: TestPortsTargetConfig = {}
    assert.doesNotThrow(() => buildHook(buildConfig, { command: 'build', mode: 'test' }))
    assert.deepEqual(buildConfig, {})
  })

  withTestPortOffset(undefined, () => {
    const rootHook = configHookOf({ project: 'alpha' })
    // serve 档确实往下走：空配置会撞上「没有 test 块」这条判据。
    assert.throws(() => rootHook({}, { command: 'serve', mode: 'test' }), /没有 test 块/)

    const served: TestPortsTargetConfig = { test: {} }
    rootHook(served, { command: 'serve', mode: 'test' })
    assert.equal(served.test?.api?.host, '127.0.0.1')
    assert.equal(served.test?.api?.strictPort, false)
    const assigned = served.test?.api?.port
    assert.equal(typeof assigned, 'number')
    assert.ok(assigned! >= BASE_PORT && assigned! <= 49140)
    assert.equal((assigned! - BASE_PORT) % BAND_WIDTH, 0)

    const projectsHook = configHookOf({ project: 'alpha', testName: 'browser' })
    const projectsConfig: TestPortsTargetConfig = {
      test: { projects: [{ test: { name: 'jsdom' } }, { test: { name: 'browser' } }] }
    }
    projectsHook(projectsConfig, { command: 'serve', mode: 'test' })
    assert.equal(projectsConfig.test?.projects?.[0]?.test?.api, undefined)
    assert.deepEqual(projectsConfig.test?.projects?.[1]?.test?.api, {
      host: '127.0.0.1',
      port: assigned,
      strictPort: false
    })
  })
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
