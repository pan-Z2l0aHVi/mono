import { resolve } from 'node:path'

import dts from 'vite-plugin-dts'
import type { UserConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

export default {
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.app.json'
    })
  ],
  test: {
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
      external: ['@greypan/js-kit', 'nanoid', 'remeda', 'copy-to-clipboard'],
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
