import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import dts from 'vite-plugin-dts'
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
  plugins: [
    mswServiceWorker(),
    dts({
      tsconfigPath: './tsconfig.app.json'
    })
  ],
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
  },
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es']
    },
    rollupOptions: {
      external: [/^@greypan\//, 'nanoid', 'remeda', 'copy-to-clipboard', 'msw'],
      output: {
        preserveModules: true,
        // 指定源码根目录，这样 dist 下就不会多出一层 'src' 目录
        preserveModulesRoot: 'src',
        dir: 'dist',
        entryFileNames: '[name].js'
      }
    }
  }
})
