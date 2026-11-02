import { homedir } from 'node:os'
import { join } from 'node:path'

import depsReload from '@greypan/deps-reload/vite'
import { mdToMeta, type MdToMetaOptions } from '@greypan/md-to-meta'
import { devHttpsPlugin, testApiPort } from '@greypan/monorepo-kit'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import { wuchale } from 'wuchale/vite'

// 证书按机器共享：同一台机器的所有 worktree 读同一份，不随 checkout 复制，也不入库。
const devCertDir = process.env.GREYPAN_DEV_CERT_DIR ?? join(homedir(), '.config', 'greypan', 'dev-certs')

// 具名导出供 scripts/checks/check-md-to-meta-artifacts.mjs 复用：CI 在 Build 步之前以这份配置
// 只判不改地校验生成物。配置只有这一份，不另抄。
export const mdToMetaOptions: MdToMetaOptions = {
  // 文档与 changelog 是全部输入；引擎按文件名产出 meta 模块，`.CN.md` 与 `.md` 各自独立（不做语种解释）。
  input: ['../../packages/web-ui/docs/*.md', '../../packages/web-ui/CHANGELOG.md'],
  // 单出口：中英文两份语料都落在同一目录，由宿主按文件名里的 `.CN` 判定语种。
  output: 'src/generated',
  // 只有 tsx 围栏带 load thunk：React 站把示例挂成真组件；Vue 源码只用于显示。
  exec: ['tsx'],
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
    // 启动扫描只覆盖路由图，覆盖不到 spec 直接 import 的生成代码块，所以这里显式列出。
    include: ['react-dom/client']
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
          // `test` 块里：写到根上会连 jsdom project 一起抢这个端口。默认 63315 会被同机并行的
          // 其他 worktree（或同一轮 turbo test 里其他包的测试进程）占住——同一进程内的多个
          // browser project 倒是会各自递增，不冲突；端口分配与多 worktree 的偏移见
          // 根 monorepo.json 与 GREYPAN_TEST_PORT_OFFSET。
          //
          // host 必须钉成 loopback。Vite 的可用性探测只绑通配地址（`isPortAvailable` 遍历
          // `wildcardHosts`），看不见只占 127.0.0.1 的进程，所以真正把关的是随后那次绑定。
          // 本应用顶层 `server.host` 是 `true`，不写 `api.host` 时测试服务器会继承成通配绑定：
          // 别的进程占着 127.0.0.1 上的同号端口不会让它失败，两个服务器同号并行，页面可能被
          // 导到别人的服务器（ERR_SSL_PROTOCOL_ERROR / ERR_EMPTY_RESPONSE / runtime 永不连回）。
          // 钉成 127.0.0.1 后绑定目标与占用者同址，才出 EADDRINUSE 并前进到下一个端口。
          api: { host: '127.0.0.1', port: testApiPort('react-web-ui-demo') },
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
    // 文档：markdown 是唯一来源，dev 与 build 都由这个插件生成 `src/generated/**`。
    // 生成物同样受版本控制，测试档只判不改（不一致就让这次的测试红）；CI 在 Build 步之前还经
    // `check-generated` 任务以 mdToMetaOptions 只判不改地复验一次（Build 的写盘会把失步产物
    // 治愈，测试档的判据到那时永远空转）。
    mdToMeta(mdToMetaOptions),
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
    // dev/preview 用本机 mkcert 证书提供 HTTPS；测试档在证书存在时沿用同一份配置，
    // CI 没有本机证书时才回退 HTTP。准备步骤见 docs/agents/worktree.md。
    devHttpsPlugin({ certDir: devCertDir })
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
