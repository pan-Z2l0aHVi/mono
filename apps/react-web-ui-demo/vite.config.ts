import depsReload from '@greypan/deps-reload/vite'
import type { MdToCompViteOptions } from '@greypan/md-to-comp'
import mdToCompReact from '@greypan/md-to-comp/react'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import { wuchale } from 'wuchale/vite'

// 具名导出供 scripts/workflow/check-md-to-comp-artifacts.mjs 复用：CI 在 Build 步之前以这份配置
// 只判不改地校验生成物。配置只有这一份，不另抄。
export const mdToCompOptions: MdToCompViteOptions = {
  input: '../../packages/web-ui/docs',
  // 中文是源语种，英文是按需译出的第二份；两份数据各占一个目录，宿主只 import 当前语种那一份。
  outputs: [
    { locale: 'zh-CN', output: 'src/generated/zh-CN' },
    { locale: 'en', output: 'src/generated/en' }
  ],
  // 样式与语种无关（高亮双主题 + Markdown 正文版式），只写一份。
  styles: 'src/generated/examples.css',
  dir: 'demos',
  flavors: ['react', 'vue'],
  // 语料文件名分语种：中文源是 `button.CN.md`，英文译文是 `button.md`。长后缀优先，所以
  // `.md` 不会把 `.CN.md` 抢走。
  locales: [
    {
      locale: 'zh-CN',
      suffix: '.CN.md',
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
      }
    },
    {
      locale: 'en',
      suffix: '.md',
      // 小节标题沿用术语（Props / Events / CSS Custom Properties……），只有列名与散文跟着翻译；
      // `返回 handle` 在英文语料里写成 `Return handle`，所以键名也跟着变。
      apiTables: {
        columns: {
          Props: ['Name', 'Description', 'Type', 'Default'],
          Options: ['Name', 'Description', 'Type', 'Default'],
          Events: ['Name', 'Description'],
          Slots: ['Name', 'Description'],
          Methods: ['Name', 'Description'],
          'Return handle': ['Name', 'Description', 'Type'],
          'CSS Custom Properties': ['Name', 'Description', 'Default'],
          'Foundation tokens': ['Name', 'Description', 'Default'],
          'Typography tokens': ['Name', 'Description', 'Default'],
          'Spacing tokens': ['Name', 'Description', 'Default'],
          'Selection control tokens': ['Name', 'Description', 'Default'],
          'Radius tokens': ['Name', 'Description', 'Default'],
          'Layer tokens': ['Name', 'Description', 'Default'],
          'Color tokens': ['Name', 'Description', 'Light default', 'Dark default'],
          'Shadow tokens': ['Name', 'Description', 'Light default', 'Dark default']
        }
      }
    }
  ],
  // 深浅外观源是 web-ui-theme 的派生属性；切外观不需要重新生成高亮 HTML。
  darkSelector: "web-ui-theme[resolved-appearance='dark']"
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  optimizeDeps: {
    // browser 运行时需要的 `vitest > expect-type` 由 vitest 5 自己注入。`vitest` 随
    // `vite-plus` 安装，本包不单独声明（也不要在 optimizeDeps 里补），那条链从 vite-plus
    // 的依赖位置解析。
    //
    // 这里不必并 `webUiOptimizeDeps`：本 app 的扫描入口 `routeTree.gen.ts` 静态 import 了每个路由
    // 模块，而路由模块对 `@greypan/web-ui` 根 barrel 的值导入（spinner / image-preview / toast 等）
    // 会把 web-ui 的组件图连同它的裸依赖一并带进启动扫描，扫描器自己就能发现。路由或页面改由虚拟
    // 模块加载（file-based routing、`import.meta.glob`）时扫描器跟不进去，那时才需要这份清单。
    // 冷缓存（CI fresh clone）下 `react-dom/client` 会被 browser 运行时在中段才发现并预打包，
    // 触发整页 reload，把已挂载的示例全部清空（"示例「基础」没有渲染"连锁失败）。
    // 启动扫描只覆盖路由图，覆盖不到 spec 直接 import 的生成 demo 图，所以这里显式列出。
    include: ['react-dom/client']
  },
  test: {
    // Vitest 5 把默认附件目录从 `.vitest-attachments` 改成 `.vitest/attachments`；
    // 仓库在 `.gitignore` 与 docs/agents 里把测试证据路径固定为前者，这里跟着钉住。
    attachmentsDir: '.vitest-attachments',
    // CI runner 上挂载型用例慢一个量级，默认 5s 上限不够；测量见 apps/interweave/frontend/vite.config.ts。
    testTimeout: 15_000,
    hookTimeout: 30_000,
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
          // 断点与 collapsed state 都是真实浏览器才成立的东西：jsdom 里 media query 是替身、
          // 工具类是一串不生效的字符串。这一档在 Chromium 里读回渲染结果。
          include: ['src/**/*.browser.spec.ts', 'src/**/*.browser.spec.tsx'],
          // 这一档同样要 act switch（spec 直接 import react 的 `act`）；但 test-helper.ts 里的
          // 滚动替身绝不能进真实浏览器——那会掩盖真实滚动行为，所以只挂 act-setup。
          setupFiles: ['./act-setup.ts'],
          // vitest 5 把 `browser.api` 挪到了 `test.api`，而且要写在 browser project 自己的
          // `test` 块里：写到根上会连 jsdom project 一起抢这个端口。默认端口 63315 会被同机
          // 并行的其他 worktree（或同一轮 turbo test 里 web-ui 的 browser project）占住，而它的
          // 端口可用性检查不区分地址族：拿到冲突端口时页面会被导到别人的服务器上，症状是
          // ERR_SSL_PROTOCOL_ERROR / ERR_EMPTY_RESPONSE / browser runtime 永不连回。
          api: { port: 63411 },
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
  plugins: [
    // 壳文案编译期抽取/替换。wuchale 的 transform 声明了 `order: 'pre'`，所以无论它在这个数组里
    // 注册在哪，transform 都排在 React 插件（`enforce: 'pre'`）之前；它按 AST 改写源码并把文案
    // 换成运行时调用，JSX 一旦被 React 降级就再也认不出来了。
    wuchale(),
    // 示例文档：markdown 是唯一来源，dev 与 build 都由这个插件生成 `src/generated/**`。
    // 生成物同样受版本控制，测试档只判不改（不一致就让这次的测试红）；CI 在 Build 步之前还经
    // `check-generated` 任务以 mdToCompOptions 只判不改地复验一次（Build 的写盘会把失步产物
    // 治愈，测试档的判据到那时永远空转）。
    mdToCompReact(mdToCompOptions),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true
    }),
    // 顺序是硬的：这个插件按源码文本匹配 `<web-ui-*` 决定注入哪些自定义元素导入，而
    // React Compiler 的 transform 同样是 `enforce: 'pre'`，跑完就把 JSX 降成 `jsx(...)` /
    // `jsxDEV(...)` 调用、tag 文本不复存在。同一 enforce 档按注册顺序执行，所以它必须排在 `react()` 之前。
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    }),
    // React Compiler 走 oxc 的 Rust 实现（`oxc-transform-react`，由这个选项按需加载），
    // 源码 transform 不经过 Babel。目标运行时是 React 19 自带的 `react/compiler-runtime`，
    // 不额外装 runtime 包。
    // `exclude` 也挡掉 workspace 链接包的 `dist`：那些路径经 realpath 解析后不在 `node_modules`
    // 里，默认 exclude 拦不住，Lit 的产物会被顺带当成 React 源码分析一遍。
    react({
      compiler: true,
      exclude: [/\/node_modules\//, /\/packages\/[^/]+\/dist\//]
    }),
    depsReload([
      {
        name: '@greypan/app-scrollbars',
        path: '../../packages/app-scrollbars',
        // 包入口是 .mjs，默认的 .js 过滤匹配不到它
        extensions: ['.mjs', '.css']
      },
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
    ...(process.env.VITEST ? [] : [basicSsl()])
    // 这里没有 `@vitejs/plugin-legacy`：它在本 app 只做 modern polyfill 注入（`renderLegacyChunks`
    // 从来是关的），而注入的那批 core-js 模块是 babel usage 检测在打包后的第三方代码与文档字符串上
    // 的误报——产物里调用点为 0，`browserslist` 基线原生覆盖全部实际用到的 API。不装它顺带把 Babel
    // 留在依赖图外，加载体积少 17.66 KB gzip。真要补某个老 API 就在入口显式 import 对应模块。
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
})
