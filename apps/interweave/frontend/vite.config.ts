import depsReload from '@greypan/deps-reload/vite'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import wails from '@wailsio/runtime/plugins/vite'
import autoImport from 'unplugin-auto-import/vite'
import { searchForWorkspaceRoot, type UserConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import vueRouter from 'vue-router/vite'

export default {
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
            // vitest 的 browser server 独占一个端口：默认的 63315 会被同机并行的其他 worktree、
            // 同一轮 turbo test 里的 web-ui browser project、以及两个 demo 的 browser project
            // 占住，所以固定到本包专用端口（两个 demo 分别占 63411 / 63412）。
            //
            // strictPort: false 必须在这里显式写出来：vitest browser 插件的 `vitest:browser:config`
            // 钩子构造测试服务器时是 `viteConfig.server = { ...viteConfig.server, port: defaultPort,
            // ...api, middlewareMode: false, open: false }`——把顶层 `server` 整块铺开、只覆盖
            // `port`，于是下面那个给 Wails dev server 定的 `strictPort: true` 会被测试服务器一并继承。
            // dev server 需要它——端口被占就硬失败，否则 Wails 的 webview 会被指向空气；测试服务器
            // 不需要：vitest 自己起它、再按 `resolvedUrls?.local[0] ?? resolvedUrls?.network[0]`（服务器
            // 实际监听的地址）把浏览器指过去，端口漂移零代价，被继承的 strictPort 却会让整包 browser
            // 用例在开跑之前直接判红。
            // host 必须显式钉回 loopback：`vitest:browser:config` 把顶层 `server` 整块铺开给测试服务器，
            // 于是给 Wails dev server 用的 `host: true` 会被继承下来，测试服务器绑到所有网卡——任何能
            // 连到这台机器的人都能经 `/@fs` 读走整个 workspace（含 `.herdr-project` 的内部文档）。
            // 写在 `api.host` 而不是顶层 `server.host`：vitest 只按 `api.host` 决定测试服务器绑哪里，
            // 并且只有这一支会走 `resolveApiServerConfig` 里「暴露到网络就默认关掉写/执行」的判据——
            // 只改顶层 `server.host` 会连带动到 dev server，而完全不写 `api.host` 时那条安全网永远
            // 不触发（实测日志里没有它的警告）。`allowWrite` / `allowExec` 保持不设：loopback 下
            // 默认 true 是要的，截图与附件要走它们。
            api: { host: '127.0.0.1', port: 63413, strictPort: false },
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
      { name: '@greypan/app-scrollbars', path: '../../../packages/app-scrollbars' },
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
} satisfies UserConfig
