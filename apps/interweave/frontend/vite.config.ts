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

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  optimizeDeps: {
    // file-based 路由把 `src/pages/**` 折进 `vue-router/vite` 生成的虚拟模块，依赖扫描器跟不进去，
    // 路由页经 `unplugin-web-components` 生成的组件导入就不可见。web-ui 的裸依赖由
    // `@greypan/web-ui/vite` 提供，跟随组件库自己的运行时依赖，不要在这里抄一份。
    include: [
      ...webUiOptimizeDeps,
      // browser test project 里 spec 的导入图会一路带到这三个（ResourceList → stores/library →
      // pinia / overlayscrollbars）。不预先声明的话，依赖扫描器会在**用例跑到一半**时才发现它们
      // 并触发一次 re-optimize，vite 直接 reload 整个页面：vitest 会警告「unexpectedly reloaded a
      // test」，结果就是用例可能重复跑或假失败。预先声明把那次 reload 挡在测试开始之前。
      'overlayscrollbars',
      'overlayscrollbars-vue',
      'pinia'
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
          // test-helper 补的是 jsdom 特有的 localStorage 漏洞，浏览器里有真实实现，不加载。
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
    // 回 loopback 时测试服务器会跟着绑通配地址。分配表与偏移见 docs/agents/build.md「测试端口分配」。
    testPorts({ project: 'interweave-frontend', testName: 'browser' }),
    vueRouter(),
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
