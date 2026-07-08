import { resolve } from 'node:path'

import dts from 'vite-plugin-dts'
import { type UserConfig } from 'vite-plus'

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
    environment: 'jsdom'
  },
  css: {
    transformer: 'lightningcss'
  },
  build: {
    cssMinify: 'lightningcss',
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es']
    },
    rollupOptions: {
      external: ['@greypan/browser-kit', '@greypan/js-kit', 'lit', 'iconify-icon', 'react', 'vue'],
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
