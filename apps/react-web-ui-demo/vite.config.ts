import depsReload from '@greypan/deps-reload/vite'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import legacy from '@vitejs/plugin-legacy'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { searchForWorkspaceRoot, type UserConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

export default {
  resolve: {
    tsconfigPaths: true
  },
  optimizeDeps: {
    // browser mode 下浏览器直接加载裸 CJS 时会报 "does not provide an export named
    // 'expectTypeOf'" 并挂起；expect-type 是该运行时已知唯一的 CJS 依赖，必须显式预打包。
    //
    // `>` 是 vite 的「从某个包的角度解析」写法。这一整串都是 workspace 依赖 dist 里带出来的
    // 裸依赖：从 app 自己解析不到（app 没有这些直接依赖），写裸名会被静默跳过，随后 vite 在
    // 测试模块加载途中才发现它们并「optimized dependencies changed. reloading」，浏览器那次
    // fetch 就失败了——连带的症状是测试模块自己报 Failed to fetch dynamically imported module。
    // workspace 包新增裸依赖时要同步这条清单。
    //
    // 启动时还会打印 "Failed to resolve dependency: vitest > expect-type" 一类：那不是这条
    // 清单，是 vitest 自己注入的条目在本 pnpm 布局下解析不到，无害。
    include: [
      'vite-plus > vitest > expect-type',
      '@greypan/web-ui > lit',
      '@greypan/web-ui > @lit/context',
      '@greypan/web-ui > @floating-ui/dom',
      '@greypan/web-ui > lit/decorators.js',
      '@greypan/web-ui > lit/directives/class-map.js',
      '@greypan/web-ui > lit/directives/if-defined.js',
      '@greypan/web-ui > lit/directives/style-map.js',
      '@greypan/web-ui > lit/directives/unsafe-svg.js',
      '@greypan/js-kit > remeda',
      '@greypan/web-ui > @greypan/browser-kit > nanoid',
      '@greypan/web-ui > @greypan/browser-kit > remeda',
      '@greypan/web-ui > @greypan/browser-kit > copy-to-clipboard'
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
          include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
          exclude: ['src/**/*.browser.spec.ts', 'src/**/*.browser.spec.tsx']
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          // 断点与折叠态都是真实浏览器才成立的东西：jsdom 里 media query 是替身、
          // 工具类是一串不生效的字符串。这一档在 Chromium 里读回渲染结果。
          include: ['src/**/*.browser.spec.ts', 'src/**/*.browser.spec.tsx'],
          // 这一档同样要 act 开关（spec 直接 import react 的 `act`）；但 test-helper.ts 里的
          // 滚动替身绝不能进真实浏览器——那会掩盖真实滚动行为，所以只挂 act-setup。
          setupFiles: ['./act-setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            // vitest 的默认端口 63315 会被同机并行的其他 worktree（或同一轮 turbo test 里
            // web-ui 的 browser project）占住，而它的端口可用性检查不区分地址族：拿到
            // 冲突端口时页面会被导到别人的服务器上，症状是 ERR_SSL_PROTOCOL_ERROR /
            // ERR_EMPTY_RESPONSE / browser runtime 永不连回。固定到本包的专用端口。
            api: { port: 63411 },
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true
    }),
    react(),
    babel({
      presets: [reactCompilerPreset()]
    }),
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    }),
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui'
      },
      {
        name: '@greypan/js-kit',
        path: '../../packages/js-kit'
      },
      {
        name: '@greypan/browser-kit',
        path: '../../packages/browser-kit'
      }
    ]),
    tailwindcss(),
    // `basicSsl()` 只把 `server.https` 打开，而 vitest 的 browser mode 自己起服务、
    // 不跟着走 https：浏览器于是按 https 去连一个明文服务，得到 ERR_SSL_PROTOCOL_ERROR
    // （`ignoreHTTPSErrors` 治的是证书错误，救不了协议层）。它只服务 dev server，
    // 测试模式下去掉。
    ...(process.env.VITEST ? [] : [basicSsl()]),
    legacy({
      modernTargets: ['Chrome >=111', 'Edge >=111', 'Safari >=16.4', 'iOS >=16.4', 'Firefox >=128'],
      renderLegacyChunks: false,
      modernPolyfills: true
    })
  ],
  base: process.env.GITHUB_BASE_PATH || '/',
  build: {},
  css: {
    transformer: 'lightningcss'
  },
  server: {
    host: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  }
} satisfies UserConfig
