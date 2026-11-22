import { readFileSync } from 'node:fs'

import depsReload from '@greypan/deps-reload/vite'
import { testPorts } from '@greypan/monorepo-kit/vite'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import wails from '@wailsio/runtime/plugins/vite'
import autoImport from 'unplugin-auto-import/vite'
import { defineConfig, searchForWorkspaceRoot } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import vueRouter from 'vue-router/vite'

// 从本包 manifest 派生所有外部运行时依赖：排除 workspace 内部包（由源码/dist 直接解析）与
// Wails runtime（自带虚拟模块插件），避免每次新增第三方依赖都在 CI 冷缓存的 browser test
// 中途触发 Vite re-optimize + iframe reload。
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>
}
const externalRuntimeDeps = Object.keys(pkg.dependencies ?? {}).filter(
  name => !name.startsWith('@greypan/') && name !== '@wailsio/runtime'
)

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  optimizeDeps: {
    // file-based 路由把 `src/pages/**` 折进 `vue-router/vite` 生成的虚拟模块，且 browser test
    // project 的 spec 不经 `main.ts` 入口，冷缓存下容易在用例中途发现新依赖并触发 reload。
    // 这里统一纳入 web-ui 裸依赖、本包所有外部运行时依赖，以及 browser spec 专用上下文模块。
    include: [
      ...webUiOptimizeDeps,
      ...externalRuntimeDeps,
      // 资源长按的 browser spec 经它拿 CDP 会话派发真实触控（镜像 web-ui 的 realTouchPress）。
      // 冷缓存下同样会在用例中途触发 re-optimize + reload，把 spec 的收集直接打断。
      'vite-plus/test/browser-playwright/context'
    ]
  },
  test: {
    // Vitest 5 把默认附件目录从 `.vitest-attachments` 改成 `.vitest/attachments`；
    // 仓库在 `.gitignore` 与 docs/agents 里把测试证据路径固定为前者，这里跟着钉住。
    attachmentsDir: '.vitest-attachments',
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['./test-helper.ts'],
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.browser.spec.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.spec.ts'],
          // 触屏仿真会翻转整个页面的 hover / pointer 媒体查询，单独成 project 拿自己的页面，
          // 不与其他文件的 CSS hover 断言抢同一页。
          exclude: [
            'src/components/__tests__/native-scrollbars.browser.spec.ts',
            'src/components/library/__tests__/resource-long-press.browser.spec.ts'
          ],
          // test-helper 补的是 jsdom 特有的 localStorage 漏洞，浏览器里有真实实现，不加载。
          setupFiles: [],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      },
      {
        extends: true,
        test: {
          // 输入能力仿真用例独立成 project，见 browser project 的 exclude 说明。
          name: 'browser-touch',
          include: [
            'src/components/__tests__/native-scrollbars.browser.spec.ts',
            'src/components/library/__tests__/resource-long-press.browser.spec.ts'
          ],
          setupFiles: [],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  },
  server: {
    host: true,
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [
    // browser project 的端口段由 testPorts() 写进上面那个 project 的 `test.api`，host 与
    // strictPort 一起给出：本包顶层 `server.host` 是 `true`（Wails dev server 要它），不显式钉
    // 回 loopback 时测试服务器会跟着绑通配地址。分配表与偏移见 docs/agents/build-browser.md「测试端口分配」。
    testPorts({ project: 'interweave-frontend', testName: 'browser' }),
    testPorts({ project: 'interweave-frontend-touch', testName: 'browser-touch' }),
    vueRouter({
      // 首屏实际路由为 /library（由 / 重定向而来）：保持同步不拆 chunk，其余路由按页懒加载。
      importMode: filepath => (/[/\\]pages[/\\]library(?:[/\\]|$)/.test(filepath) ? 'sync' : 'async')
    }),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith('web-ui-') || tag.startsWith('WebUi')
        }
      }
    }),
    autoImport({
      dts: true,
      imports: ['vue', VueRouterAutoImports],
      ignore: ['h']
    }),
    wails('./bindings'),
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    }),
    depsReload([
      // 包入口是 .mjs，默认的 .js 过滤匹配不到它
      { name: '@greypan/app-scrollbars', path: '../../../packages/app-scrollbars', extensions: ['.mjs', '.css'] },
      { name: '@greypan/route-progress', path: '../../../packages/route-progress', extensions: ['.mjs'] },
      { name: '@greypan/web-ui', path: '../../../packages/web-ui' },
      { name: '@greypan/js-kit', path: '../../../packages/js-kit' },
      { name: '@greypan/browser-kit', path: '../../../packages/browser-kit' }
    ]),
    tailwindcss(),
    legacy({
      modernTargets: ['Chrome >=111', 'Edge >=111', 'Safari >=16.4', 'iOS >=16.4', 'Firefox >=128'],
      renderLegacyChunks: false,
      modernPolyfills: true
    })
  ],
  css: {
    transformer: 'lightningcss'
  }
})
