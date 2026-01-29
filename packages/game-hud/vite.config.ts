import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { type UserConfig } from 'vite'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default {
  base: '',
  plugins: [
    dts({
      tsconfigPath: './tsconfig.app.json'
    }),
    tsconfigPaths({ root: './' }),
    vue(),
    react()
  ],
  build: {
    target: 'esnext',
    cssMinify: 'lightningcss',
    sourcemap: true,
    lib: {
      formats: ['es', 'cjs', 'umd'],
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'GameHud',
      fileName: format => `index.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'vue'],
      output: {
        globals: {
          vue: 'Vue',
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  css: {
    transformer: 'lightningcss'
  }
} satisfies UserConfig
