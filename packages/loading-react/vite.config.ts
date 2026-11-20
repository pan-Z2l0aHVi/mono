import { resolve } from 'node:path'

import type { UserConfig } from 'vite-plus'

export default {
  resolve: {
    tsconfigPaths: true
  },
  pack: {
    entry: {
      index: resolve(import.meta.dirname, 'src/index.tsx')
    },
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
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    setupFiles: ['./test-helper.ts']
  }
} satisfies UserConfig
