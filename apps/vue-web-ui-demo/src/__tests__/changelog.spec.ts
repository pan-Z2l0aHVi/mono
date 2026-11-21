import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { describe, expect, it } from 'vite-plus/test'
import { createSSRApp, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { renderToString } from 'vue/server-renderer'

import Changelog from '../pages/changelog.vue'

/*
 * 整份 CHANGELOG.md 有 3k+ 节点，jsdom 挂载在 CI 的负载下会撞默认的 5s。这里只验产出内容，
 * 用静态渲染把 DOM 构建换成字符串拼接，断言与挂载后取 DOM 等价。
 */
describe('更新日志页', () => {
  it('从 CHANGELOG.md 原样渲染整份文档', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Changelog }] })
    await router.push('/')
    const app = createSSRApp({ render: () => h(Changelog) })
      .use(router)
      .use(VueQueryPlugin, { queryClient: new QueryClient() })
    const markup = await renderToString(app)

    expect(markup).toMatch(/<h1[^>]*>@greypan\/web-ui<\/h1>/)
    // 版本号来自 CHANGELOG.md，会随发版变化：这里只校验形状，不写死具体版本。
    expect(markup).toMatch(/<h2[^>]*>\d+\.\d+\.\d+<\/h2>/)
    expect(markup).toContain('mdm-heading')
    // 围栏代码块来自 CHANGELOG.md，渲染成 codeblock 卡片。
    expect(markup).toContain('data-codeblock')
    expect(markup).not.toContain('# @greypan/web-ui')
  })
})
