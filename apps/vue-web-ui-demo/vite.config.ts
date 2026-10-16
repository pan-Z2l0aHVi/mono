import depsReload from '@greypan/deps-reload/vite'
import { braceAnchor } from '@greypan/md-to-comp'
import mdToCompVue from '@greypan/md-to-comp/vue'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
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
    // browser mode 下浏览器直接加载裸 CJS 时会报 "does not provide an export named
    // 'expectTypeOf'" 并挂起；expect-type 是该运行时已知唯一的 CJS 依赖，必须显式预打包。
    // vitest 仅由 vite-plus 间接提供，需要从 vite-plus 上下文逐级解析。
    //
    // 启动时还会打印 "Failed to resolve dependency: vitest > expect-type" 一类：那不是这条
    // 清单，是 vitest 自己注入的条目在本 pnpm 布局下解析不到，无害。
    //
    // web-ui 那一半由 `@greypan/web-ui/vite` 提供，跟随组件库自己的运行时依赖，不要在这里抄一份。
    include: ['vite-plus > vitest > expect-type', ...webUiOptimizeDeps]
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
          // 断点与折叠态都是真实浏览器才成立的东西：jsdom 里 media query 是替身、
          // 工具类是一串不生效的字符串。这一档在 Chromium 里读回渲染结果。
          include: ['src/**/*.browser.spec.ts'],
          browser: {
            enabled: true,
            headless: true,
            // vitest 的默认端口 63315 会被同机并行的其他 worktree（或同一轮 turbo test 里
            // web-ui 的 browser project）占住，而它的端口可用性检查不区分地址族：拿到
            // 冲突端口时页面会被导到别人的服务器上，症状是 ERR_SSL_PROTOCOL_ERROR /
            // ERR_EMPTY_RESPONSE / browser runtime 永不连回。固定到本包的专用端口。
            api: { port: 63412 },
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  },
  plugins: [
    // 示例文档：markdown 是唯一来源，dev 与 build 都由这个插件生成 `src/generated/**`。
    // 生成物同样受版本控制，测试档只判不改（不一致就让这次的测试红），所以 CI 不需要另跑生成命令。
    mdToCompVue({
      input: '../../packages/web-ui/docs',
      output: 'src/generated',
      dir: 'demos',
      anchor: braceAnchor,
      flavors: ['react', 'vue'],
      apiTables: {
        // 列序是引擎约定：名称、说明、类型、默认值。Events / Slots / Methods 只有前两列。
        // Props 记元素属性，Options 记命令式 API 的选项（`imagePreview()` / `toast()` 这类没有声明式契约的入口）。
        // Methods 记组件对外的公开方法：元素实例方法、静态方法，以及命令式 API 返回句柄上的方法。
        columns: {
          Props: ['名称', '说明', '类型', '默认值'],
          Options: ['名称', '说明', '类型', '默认值'],
          Events: ['名称', '说明'],
          Slots: ['名称', '说明'],
          Methods: ['名称', '说明']
        }
      },
      // 深浅外观源是 web-ui-theme 的派生属性；切外观不需要重新生成高亮 HTML。
      darkSelector: "web-ui-theme[resolved-appearance='dark']"
    }),
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
      // 禁止 auto-import 自动导入 Vue 的 h 方法，防止与 Lit 的 h 冲突
      ignore: ['h']
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
