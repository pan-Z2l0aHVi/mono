import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { defineConfig, type Plugin } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

/**
 * Vitest 5 的 `@vitest/browser` 不再把 `/mockServiceWorker.js` 解析到
 * `msw/mockServiceWorker.js`（v4 内置这条映射，v5 移除了 MSW 集成）。缺少这个脚本时
 * MSW 的 `start()` 会在 `beforeAll` 直接失败，整个浏览器 spec 无法执行。
 */
function mswServiceWorker(): Plugin {
  const workerScript = readFileSync(createRequire(import.meta.url).resolve('msw/mockServiceWorker.js'))

  return {
    name: 'greypan:msw-service-worker',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/mockServiceWorker.js') {
          next()
          return
        }

        res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
        res.setHeader('Service-Worker-Allowed', '/')
        res.end(workerScript)
      })
    }
  }
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  // 浏览器 spec 与 dev server 都走这里的 Vite 插件；构建见 `pack`。
  plugins: [mswServiceWorker()],
  pack: {
    entry: {
      index: resolve(import.meta.dirname, 'src/index.ts'),
      // 这两个子目录只有纯转发的 barrel，`unbundle` 会把它们拍平进叶子模块，不产
      // `index.js` / `index.d.ts`，而 `exports` 的 `./*` 正指向它们。键要写成
      // `<dir>/index`，产物落点由键决定（写成 `shortcut` 会得到 `dist/shortcut.js`）。
      'shortcut/index': resolve(import.meta.dirname, 'src/shortcut/index.ts'),
      'tracker/index': resolve(import.meta.dirname, 'src/tracker/index.ts')
    },
    // 产物保持与源码树一一对应：exports 的 `./*` 通配依赖这个目录结构。
    unbundle: true,
    root: resolve(import.meta.dirname, 'src'),
    // pack 在 node 平台默认输出 `.mjs` / `.d.mts`，而 exports 指向 `.js` / `.d.ts`。
    fixedExtension: false,
    sourcemap: true,
    dts: {
      // 顶层 sourcemap 会给 `.d.ts` 也写 sourceMappingURL，只有同时打开声明映射才不会
      // 留下指向不存在文件的引用。
      sourcemap: true
    },
    tsconfig: './tsconfig.app.json'
  },
  test: {
    // Vitest 5 把默认附件目录从 `.vitest-attachments` 改成 `.vitest/attachments`；
    // 仓库在 `.gitignore` 与 docs/agents 里把测试证据路径固定为前者，这里跟着钉住。
    attachmentsDir: '.vitest-attachments',
    // Tracker specs share browser globals and one MSW service worker.
    fileParallelism: false,
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium' }]
    },
    setupFiles: ['./test-helper.ts']
  }
})
