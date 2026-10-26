import { beforeEach, expect, it, vi } from 'vite-plus/test'

const state = vi.hoisted(() => ({
  bootstrap: vi.fn<() => Promise<{ degraded: false }>>(),
  mounted: [] as string[],
  mountError: undefined as Error | undefined
}))
vi.mock('@/i18n/locale', async importOriginal => ({
  ...(await importOriginal<typeof import('@/i18n/locale')>()),
  bootstrapLocale: state.bootstrap
}))
vi.mock('@/app/index.vue', () => ({ default: { name: 'AppShell' } }))
vi.mock('@/app/boot-error.vue', () => ({ default: { name: 'BootError' } }))
vi.mock('vue-router', () => ({ createRouter: () => ({}), createWebHistory: () => ({}) }))
vi.mock('vue-router/auto-routes', () => ({ routes: [], handleHotUpdate: () => {} }))
vi.mock('vue', async importOriginal => ({
  ...(await importOriginal<typeof import('vue')>()),
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

beforeEach(() => {
  vi.resetModules()
  state.mounted = []
  state.mountError = undefined
  state.bootstrap.mockReset().mockResolvedValue({ degraded: false })
})

it('资源准备失败时挂载启动错误页，并保留原始错误', async () => {
  const failure = new Error('catalog unavailable')
  state.bootstrap.mockRejectedValueOnce(failure)
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await import('../main')
    expect(state.mounted).toEqual(['BootError'])
    expect(log).toHaveBeenCalledWith('Language initialization failed', failure)
  } finally {
    log.mockRestore()
  }
})

it('应用挂载失败不会被转换成语言资源错误', async () => {
  state.mountError = new Error('application mount failed')
  await expect(import('../main')).rejects.toThrow('application mount failed')
  expect(state.mounted).toEqual(['AppShell'])
})
