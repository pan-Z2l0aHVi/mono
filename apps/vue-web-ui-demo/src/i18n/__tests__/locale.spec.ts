import { beforeEach, expect, it, vi } from 'vite-plus/test'

/*
 * 引擎判据（串行提交、降级、快照语义、偏好优先）在 kit 的 locale 用例里，这里只钉 Vue 侧接线：
 * 引擎 publish → shallowRef 换引用 → 三个 computed 视图跟着更新。wuchale 的壳文案 catalog
 * 是外部依赖，mock 掉，让它不影响视图接线的判定。
 */
vi.mock('wuchale/load-utils', () => ({
  loadLocale: vi.fn<(locale: string, syncDom?: boolean) => Promise<void>>(async () => {}),
  commitLocale: vi.fn<(locale: string) => void>()
}))

const { currentDocs, currentLocale, ensureExampleDoc, loadDemoLocale, localePending, registerExampleDoc } =
  await import('../locale')

beforeEach(() => {
  localStorage.clear()
})

it('切换提交后三个只读视图跟着快照更新，偏好落进 localStorage', async () => {
  expect(currentLocale.value).toBe('zh-CN')
  expect(localePending.value).toBe(false)
  const request = loadDemoLocale('en')
  expect(localePending.value).toBe(true)
  await request
  expect(currentLocale.value).toBe('en')
  expect(localePending.value).toBe(false)
  expect(localStorage.getItem('locale')).toBe('en')
})

it('注册的组件补载后出现在文档视图里', async () => {
  await loadDemoLocale('zh-CN')
  expect(currentDocs.value.has('radio')).toBe(false)
  const unregister = registerExampleDoc('radio')
  await ensureExampleDoc('radio')
  expect(currentDocs.value.has('radio')).toBe(true)
  unregister()
})
