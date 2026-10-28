import depsReload from '@greypan/deps-reload/vite'
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
    // 挂载整页的用例在 CI 的 4 核 runner 上比本机慢一个量级：同一份 AppLayout.spec.ts 本机
    // 0.3s，CI 上 vitest 4 是 3.1s、vitest 5 是 7.7s，2~4s 的单条用例会轮流撞上默认 5s 上限。
    // 放宽上限而不改测试，是因为慢在环境：断言里没有靠超时兜底的等待。
    testTimeout: 15_000,
    // 同一台 runner 上 hook 也会超时：默认 10s 之内加载不完语言包或整页依赖。
    hookTimeout: 30_000,
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
          // vitest 5 把 `browser.api` 挪到了 `test.api`，而且要写在 browser project 自己的
          // `test` 块里：写到根上会连 jsdom project 一起抢这个端口（实测 `Port 63413 is
          // already in use`）。默认的 63315 会被同机并行的其他 worktree、同一轮 turbo test
          // 里的 web-ui browser project、以及两个 demo 的 browser project 占住，所以固定到
          // 本包专用端口（两个 demo 分别占 63411 / 63412）。
          //
          // host 必须显式钉回 loopback：api server 绑哪里只看 `api.host`；而
          // `resolveApiServerConfig` 只在 host 是 loopback 时才默认允许写盘与执行（截图、附件
          // 要走它们），绑到所有网卡则会关掉写/执行——任何能连到这台机器的人也能经 `/@fs` 读走
          // 整个 workspace（含 `.herdr-project` 的内部文档）。顶层 `server.host: true` 是给
          // Wails dev server 的，不要拿它代替这里。
          api: { host: '127.0.0.1', port: 63413 },
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
