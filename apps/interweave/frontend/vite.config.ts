import depsReload from '@greypan/deps-reload/vite'
import { testApiPort } from '@greypan/monorepo-kit'
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
          // vitest 5 把 `browser.api` 挪到了 `test.api`，而且要写在 browser project 自己的
          // `test` 块里：写到根上会连 jsdom project 一起抢这个端口。默认的 63315 会被同机并行的
          // 其他 worktree、同一轮 turbo test 里其他包的测试进程占住，所以端口从
          // packages/monorepo-kit/src/repo/test-ports.mjs 的分配表取，多 worktree 时用 GREYPAN_TEST_PORT_OFFSET 错开。
          //
          // host 必须显式钉回 loopback：api server 绑哪里只看 `api.host`；而
          // `resolveApiServerConfig` 只在 `api.host` 是字面量 `localhost` / `127.0.0.1`（或不设）
          // 时才默认允许写盘与执行（截图、附件要走它们），设成其他值会关掉写/执行——反过来，
          // 绑到所有网卡时任何能连到这台机器的人也能经 `/@fs` 读走整个 workspace（含
          // `.herdr-project` 的内部文档）。顶层 `server.host: true` 是给 Wails dev server 的，
          // 不要拿它代替这里。
          // strictPort: false 必须显式写出来：vitest 5 的 `vitest:config:server` 把 `api` 合并进
          // 测试服务器，同时顶层 `server` 的 `strictPort: true` 会被一并带过去——实测占住本包基
          // 端口后直接 `Startup Error: Port N is already in use`，整包 browser 用例在开跑之前判
          // 红。dev server 需要它（端口被占就硬失败，否则 webview 指向空气），测试服务器不需要：
          // vitest 按实际监听地址把浏览器指向过去，端口漂移零代价。
          api: { host: '127.0.0.1', port: testApiPort('interweave-frontend'), strictPort: false },
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
