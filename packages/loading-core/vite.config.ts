import { resolve } from 'node:path'

import type { UserConfig } from 'vite-plus'

export default {
  resolve: {
    tsconfigPaths: true
  },
  pack: {
    entry: {
      index: resolve(import.meta.dirname, 'src/index.ts'),
      'styles/progress': resolve(import.meta.dirname, 'src/progress.css')
    },
    // 产物保持与源码树一一对应：exports 的 `./progress.css` 指向 dist 根。
    unbundle: true,
    root: resolve(import.meta.dirname, 'src'),
    platform: 'browser',
    target: ['chrome111', 'edge111', 'safari16.4', 'ios16.4', 'firefox128'],
    fixedExtension: false,
    sourcemap: true,
    dts: {
      sourcemap: true
    },
    tsconfig: './tsconfig.app.json'
  },
  test: {
    attachmentsDir: '.vitest-attachments',
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./test-helper.ts']
  }
} satisfies UserConfig
