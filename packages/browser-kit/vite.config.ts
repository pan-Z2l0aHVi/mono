import { resolve } from 'node:path'

import dts from 'vite-plugin-dts'
import type { UserConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

export default {
  resolve: {
    tsconfigPaths: true
  },
  optimizeDeps: {
    // workspace 依赖未构建（fresh clone，如 test-kit 无 dist）时 dep scan 会失败并跳过预打包；
    // expect-type 是 browser 运行时当前已知唯一的 CJS 依赖，必须显式预打包，
    // 否则浏览器直接加载裸 CJS 报 "does not provide an export named 'expectTypeOf'" 并挂起。
    // vitest 仅由 vite-plus 间接提供，需要从 vite-plus 上下文逐级解析。
    include: ['vite-plus > vitest > expect-type']
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.app.json'
    })
  ],
  test: {
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
} satisfies UserConfig
