import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vite-plus/test'

const state = vi.hoisted(() => ({
  loadShell: vi.fn<() => Promise<void>>(),
  bootstrap: vi.fn<() => Promise<{ degraded: boolean }>>(),
  bootDegraded: { value: false },
  mounted: [] as string[],
  mountError: undefined as Error | undefined
}))
vi.mock('@/i18n/locale', () => ({
  loadShellLocale: state.loadShell,
  bootstrapLocale: state.bootstrap,
  bootDegraded: state.bootDegraded
}))
vi.mock('@/assets/global.css', () => ({}))
vi.mock('@/generated/js-kit/theme.css', () => ({}))
vi.mock('@/locales/main.loader.js', () => ({}))
vi.mock('@unhead/vue/client', () => ({ createHead: () => ({}) }))
vi.mock('@/app/index.vue', () => ({ default: { name: 'AppShell' } }))
vi.mock('@/app/boot-error.vue', () => ({ default: { name: 'BootError' } }))
vi.mock('@/router/guards', () => ({ installRouteGuards: () => {} }))
vi.mock('vue-router', () => ({ createRouter: () => ({}), createWebHistory: () => ({}) }))
vi.mock('vue-router/auto-routes', () => ({ routes: [], handleHotUpdate: () => {} }))
vi.mock('vue', () => ({
  createApp: (component: { name: string }) => ({
    use() {
      return this
    },
    mount() {
      state.mounted.push(component.name)
      if (component.name === 'AppShell' && state.mountError) throw state.mountError
    }
  })
}))

let pendingMainImport: Promise<void> | undefined

function importMain() {
  const request = import('../main').then(() => undefined)
  pendingMainImport = request
  void request.catch(() => {})
  return request
}

beforeEach(() => {
  vi.resetModules()
  pendingMainImport = undefined
  state.mounted = []
  state.mountError = undefined
  state.bootDegraded.value = false
  state.loadShell.mockReset().mockResolvedValue(undefined)
  state.bootstrap.mockReset().mockResolvedValue({ degraded: false })
})

afterEach(async () => {
  const request = pendingMainImport
  if (request)
    await request.then(
      () => undefined,
      () => undefined
    )
  pendingMainImport = undefined
  vi.restoreAllMocks()
})

// 首次 import 的转换请求会排在项目级 Vite 服务队列里，而同一个服务还要为并行的 example-docs
// （58 个 meta + codeblock 组件）和 catalog 抽取做 wuchale 编译。CI 小核数 runner 上这段串行
// 开销实测超过 5s，落进用例自身的断言预算就成了假失败。预热放 beforeAll，让一次性开销归 setup
// （hookTimeout 10s），用例本身只承担 resetModules 后的增量求值。
beforeAll(async () => {
  state.loadShell.mockResolvedValue(undefined)
  state.bootstrap.mockResolvedValue({ degraded: false })
  await import('../main')
})

it('源语种 catalog 失败时挂载启动错误页，并保留原始错误', async () => {
  const failure = new Error('catalog unavailable')
  state.loadShell.mockRejectedValueOnce(failure)
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await importMain()
    expect(state.mounted).toEqual(['BootError'])
    expect(log).toHaveBeenCalledWith('Language initialization failed', failure)
  } finally {
    log.mockRestore()
  }
})

it('应用挂载失败不会被转换成语言资源错误', async () => {
  state.mountError = new Error('application mount failed')
  await expect(importMain()).rejects.toThrow('application mount failed')
  expect(state.mounted).toEqual(['AppShell'])
})

it('挂载后目标语种失败只降级，不撤下页面', async () => {
  const failure = new Error('target locale unavailable')
  state.bootstrap.mockRejectedValueOnce(failure)
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await importMain()
    expect(state.mounted).toEqual(['AppShell'])
    await vi.waitFor(() => expect(state.bootDegraded.value).toBe(true))
    expect(log).toHaveBeenCalledWith('Language initialization failed', failure)
  } finally {
    log.mockRestore()
  }
})
