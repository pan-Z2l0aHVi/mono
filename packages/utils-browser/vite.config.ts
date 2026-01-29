import { resolve } from 'node:path'

import { type UserConfig } from 'vite'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default {
  plugins: [
    dts({
      tsconfigPath: './tsconfig.app.json'
    }),
    tsconfigPaths({ root: './' })
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es']
    },
    rollupOptions: {
      external: [],
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
