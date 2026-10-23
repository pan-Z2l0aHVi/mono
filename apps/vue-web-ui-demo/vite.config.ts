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
    //
    // `pinia` 必须显式列出，判据是「摘掉就红」而不是「留着没坏处」：把它从这份清单里删掉并清掉依赖
    // 缓存，`example-doc.browser.spec.ts` 会在跑途中收到 `dependency optimized: pinia` →
    // `optimized dependencies changed. reloading`，vitest 跟着报 `Vite unexpectedly reloaded a test`，
    // 37 条里红 8 条，报 `TypeError: Cannot define property form, object is not extensible`
    // （`drawer` 同一条），栈停在 `useTemplateRef`；把这条加回来同一份 spec 37/37 绿。
    //
    // 为什么测试里碰得到它：import pinia 的只有 `src/main.ts` 和全仓无人引用的 `src/stores/counter.ts`，
    // spec 没有一处引 main.ts——main.ts 挂在 `index.html` 的入口 script 上，所以 pinia 在这份 config 的
    // 依赖图里可达，只是不在启动时那份清单里。
    //
    // 机制（下面是解释，不是本文件验证过的判据）：重打包让页面同时存在两份 Vue runtime，dev 模式下
    // 冻结的 `EMPTY_OBJ` 两边不是同一个对象，`i.refs === EMPTY_OBJ` 认不出对面那份，转而往对面那份
    // 冻结对象上 `defineProperty`，带模板 ref 的示例整块挂不上。
    include: ['vite-plus > vitest > expect-type', 'pinia', ...webUiOptimizeDeps]
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
          // 断点与 collapsed state 都是真实浏览器才成立的东西：jsdom 里 media query 是替身、
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
        // 列序是引擎约定：首列是名称（行的身份）、次列是说明（富文本），第 3 列起都是普通值列。
        // 只登记表格小节；标题不在这里的 `###` 按散文渲染（正文整段 markdown）。
        // Props 记元素属性，Options 记命令式 API 的 option（`imagePreview()` / `toast()` 这类没有声明式契约的入口）。
        // Methods 记组件对外的公开方法：元素实例方法、静态方法，以及命令式 API 返回 handle 上的方法。
        // 返回 handle 记命令式 API 返回对象上的只读成员，那些成员的方法归 Methods。
        // CSS Custom Properties 记组件对外暴露的变量；theme 的 token 表按族分节，颜色与阴影两族另有浅色/深色两列。
        columns: {
          Props: ['名称', '说明', '类型', '默认值'],
          Options: ['名称', '说明', '类型', '默认值'],
          Events: ['名称', '说明'],
          Slots: ['名称', '说明'],
          Methods: ['名称', '说明'],
          '返回 handle': ['名称', '说明', '类型'],
          'CSS Custom Properties': ['名称', '说明', '默认值'],
          'Foundation tokens': ['名称', '说明', '默认值'],
          'Typography tokens': ['名称', '说明', '默认值'],
          'Spacing tokens': ['名称', '说明', '默认值'],
          'Selection control tokens': ['名称', '说明', '默认值'],
          'Radius tokens': ['名称', '说明', '默认值'],
          'Layer tokens': ['名称', '说明', '默认值'],
          'Color tokens': ['名称', '说明', '浅色默认值', '深色默认值'],
          'Shadow tokens': ['名称', '说明', '浅色默认值', '深色默认值']
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
