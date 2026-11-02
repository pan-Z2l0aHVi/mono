import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import depsReload from '@greypan/deps-reload/vite'
import { mdToMeta, type MdToMetaOptions } from '@greypan/md-to-meta'
import { devHttpsPlugin, testApiPort } from '@greypan/monorepo-kit'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import autoImport from 'unplugin-auto-import/vite'
import { defineConfig, searchForWorkspaceRoot } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import vueRouter from 'vue-router/vite'
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
  // 只有 vue 围栏带 load thunk：Vue 站把示例挂成真 SFC；React 源码只用于显示。
  exec: ['vue'],
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
    // web-ui 那一半由 `@greypan/web-ui/vite` 提供，跟随组件库自己的运行时依赖，不要在这里抄一份。
    //
    // `pinia` 必须显式列出，判据是「摘掉就红」而不是「留着没坏处」：把它从这份清单里删掉并清掉依赖
    // 缓存，浏览器档会在跑途中收到 `dependency optimized: pinia` →
    // `optimized dependencies changed. reloading`，vitest 跟着报 `Vite unexpectedly reloaded a test`，
    // 37 条里红 8 条，报 `TypeError: Cannot define property form, object is not extensible`
    // （`drawer` 同一条），栈停在 `useTemplateRef`；把这条加回来同一批用例全绿。
    //
    // 为什么测试里碰得到它：import pinia 的只有 `src/main.ts` 和全仓无人引用的 `src/stores/counter.ts`，
    // 测试没有一处引 main.ts——main.ts 挂在 `index.html` 的入口 script 上，所以 pinia 在这份 config 的
    // 依赖图里可达，只是不在启动时那份清单里。
    //
    // 机制（下面是解释，不是本文件验证过的判据）：重打包让页面同时存在两份 Vue runtime，dev 模式下
    // 冻结的 `EMPTY_OBJ` 两边不是同一个对象，`i.refs === EMPTY_OBJ` 认不出对面那份，转而往对面那份
    // 冻结对象上 `defineProperty`，带模板 ref 的示例整块挂不上。
    include: ['pinia', ...webUiOptimizeDeps]
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
          setupFiles: ['./test-helper.ts', './src/i18n/__tests__/setup.ts'],
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.browser.spec.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          setupFiles: ['./src/i18n/__tests__/setup.ts'],
          // 断点与 collapsed state 都是真实浏览器才成立的东西：jsdom 里 media query 是替身、
          // 工具类是一串不生效的字符串。这一档在 Chromium 里读回渲染结果。
          include: ['src/**/*.browser.spec.ts'],
          // vitest 5 把 `browser.api` 挪到了 `test.api`，而且要写在 browser project 自己的
          // `test` 块里：写到根上会连 jsdom project 一起抢这个端口。默认 63315 会被同机并行的
          // 其他 worktree（或同一轮 turbo test 里其他包的测试进程）占住——同一进程内的多个
          // browser project 倒是会各自递增，不冲突；端口分配与多 worktree 的偏移见
          // 根 monorepo.json 与 GREYPAN_TEST_PORT_OFFSET。host 钉成 loopback 的理由见
          // apps/react-web-ui-demo/vite.config.ts。
          api: { host: '127.0.0.1', port: testApiPort('vue-web-ui-demo') },
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
    wuchale({ configPath: fileURLToPath(new URL('./wuchale.config.js', import.meta.url)) }),
    // 文档：markdown 是唯一来源，dev 与 build 都由这个插件生成 `src/generated/**`。
    // 生成物同样受版本控制，测试档只判不改（不一致就让这次的测试红）；CI 在 Build 步之前还经
    // `check-generated` 任务以 mdToMetaOptions 只判不改地复验一次（Build 的写盘会把失步产物
    // 治愈，测试档的判据到那时永远空转）。
    mdToMeta(mdToMetaOptions),
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
    devHttpsPlugin({ certDir: devCertDir }),
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
})
