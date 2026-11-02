import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test'

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
vi.mock('@/generated/theme.css', () => ({}))
vi.mock('@/locales/main.loader.js', () => ({}))
vi.mock('@unhead/vue/client', () => ({ createHead: () => ({}) }))
vi.mock('pinia', () => ({ createPinia: () => ({}) }))
vi.mock('@/app/index.vue', () => ({ default: { name: 'AppShell' } }))
vi.mock('@/app/boot-error.vue', () => ({ default: { name: 'BootError' } }))
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
  // 测试断言仍接收原始拒绝；提前附加处理器，避免测试先退出时产生未处理拒绝。
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
