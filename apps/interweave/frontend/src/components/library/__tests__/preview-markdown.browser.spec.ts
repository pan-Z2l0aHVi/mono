import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import PreviewCode from '../PreviewCode.vue'
import PreviewMarkdown from '../PreviewMarkdown.vue'

/*
 * markdown / 代码预览渲染管线的浏览器冒烟：真实加载 @greypan/md-to-meta/runtime（shiki wasm、
 * markdown 解析）在 Chromium 里出结果。jsdom 里 wasm 分词器跑不起来，这条管线只能在这档验证。
 *
 * 铺垫的判据与 demo 一致：主题类（.mdm-heading / .mdm-code）来自 vite 的 mdmThemePlugin
 * 虚拟模块（main.ts 引入，浏览器测试同享）；清洗与拦截是 interweave 自己的信任边界。
 *
 * 与同目录其他 browser spec 一致用 createApp 裸挂：@vue/test-utils 不在本包 browser 档的
 * optimizeDeps 清单里，这里引它会在用例中途触发 re-optimize + reload。
 */

async function waitFor(condition: () => boolean, message: string) {
  const deadline = performance.now() + 10_000
  while (performance.now() < deadline) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(message)
}

function mount(component: Parameters<typeof h>[0], props: Record<string, unknown>) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({ render: () => h(component, props) })
  app.mount(host)
  return {
    host,
    unmount: () => {
      app.unmount()
      host.remove()
    }
  }
}

const SAMPLE = [
  '# 设计规范',
  '',
  '这是一段**加粗**与 `code` 文本。',
  '',
  '```ts',
  'const answer = 42;',
  '```',
  '',
  '- 列表项一',
  '- 列表项二',
  '',
  '[外链](https://example.com/ok) [相对](./x.md) [危险](javascript:alert(1))'
].join('\n')

describe('PreviewMarkdown（浏览器）', () => {
  it('按文档渲染标题、列表、着色代码与行内样式，链接改写并拦截，危险/相对目标判死', async () => {
    const openExternal = vi.fn<(target: string) => Promise<void>>(() => Promise.resolve())
    const mounted = mount(PreviewMarkdown, { markdown: SAMPLE, openExternal })
    try {
      await waitFor(() => {
        const root = mounted.host.querySelector('[data-preview-markdown]')
        return !!root && root.querySelectorAll('.mdm-heading').length > 0
      }, 'markdown 未渲染')

      const root = mounted.host.querySelector('[data-preview-markdown]')!
      expect(root.querySelector('h1.mdm-heading')?.textContent).toBe('设计规范')
      expect(root.querySelector('strong')).toBeTruthy()
      expect(root.querySelectorAll('li').length).toBe(2)

      // 代码块：runtime 管线（shiki 双主题 + 行号），md-to-meta 的 codeblock content 是可信产物。
      const pre = root.querySelector('pre')
      expect(pre?.innerHTML).toContain('--shiki-light')

      const live = root.querySelector<HTMLAnchorElement>('a[data-md-href]')
      expect(live?.getAttribute('data-md-href')).toBe('https://example.com/ok')
      expect(root.querySelectorAll('a[data-md-link-dead]').length).toBe(2)

      // 点击活链接：默认被拦截，交 openExternal，不让 WebView 导航。
      live!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await nextTick()
      expect(openExternal).toHaveBeenCalledWith('https://example.com/ok')
    } finally {
      mounted.unmount()
    }
  })
})

describe('PreviewCode（浏览器）', () => {
  it('白名单语言经 shiki 着色输出双主题与行号', async () => {
    const mounted = mount(PreviewCode, { code: 'const answer = 42;\n', language: 'ts' })
    try {
      await waitFor(() => {
        const code = mounted.host.querySelector('[data-code]')
        return !!code && code.innerHTML.includes('--shiki-light')
      }, '代码未着色')
      const html = mounted.host.querySelector('[data-code]')!.innerHTML
      expect(html).toContain('--shiki-dark')
      expect(html).toContain('mdm-code')
    } finally {
      mounted.unmount()
    }
  })

  it('超过输入上限退回纯文本并提示，不进着色器', async () => {
    const big = Array.from({ length: 5200 }, (_, index) => `const value${index} = ${index};`).join('\n')
    const mounted = mount(PreviewCode, { code: big, language: 'ts' })
    try {
      await waitFor(() => mounted.host.textContent?.includes('文件过大') ?? false, '未出现纯文本提示')
      expect(mounted.host.querySelector('[data-code]')).toBeNull()
      expect(mounted.host.querySelector('pre')).toBeTruthy()
    } finally {
      mounted.unmount()
    }
  })
})
