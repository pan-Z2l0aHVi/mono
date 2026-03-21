import { fullReload } from '@mono/full-reload'
import { unpluginWebComponents } from '@mono/unplugin-web-components'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { visualizer } from 'rollup-plugin-visualizer'
import autoImport from 'unplugin-auto-import/vite'
import { type PluginOption, searchForWorkspaceRoot, type UserConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import vueRouter from 'vue-router/vite'

// https://vite.dev/config/
export default {
  plugins: [
    tsconfigPaths({ root: './' }),
    vueRouter(),
    vue({
      template: {
        compilerOptions: {
          // web component
          isCustomElement: tag => tag.startsWith('web-ui-') || tag.startsWith('WebUi')
        }
      }
    }),
    vueJsx(),
    autoImport({
      dts: true,
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.js',
        globalsPropValue: true
      },
      imports: ['vue'],
      // 禁止 auto-import 自动导入 Vue 的 h 方法，防止与 Lit 的 h 冲突
      ignore: ['h']
    }),
    unpluginWebComponents.vite({
      tagPrefix: 'web-ui',
      packageName: '@mono/web-ui',
      sideEffects: true
    }),
    fullReload.vite([
      {
        name: '@mono/web-ui',
        path: '../../../packages/web-ui'
      },
      {
        name: '@mono/utils-core',
        path: '../../../packages/utils-core'
      },
      {
        name: '@mono/utils-browser',
        path: '../../../packages/utils-browser'
      }
    ]),
    tailwindcss(),
    checker({
      overlay: true,
      typescript: true,
      vueTsc: {
        tsconfigPath: './tsconfig.app.json'
      }
    }),
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 9', 'iOS >= 15']
    }),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true
    }) as PluginOption
  ],
  build: {
    cssMinify: 'lightningcss'
  },
  css: {
    transformer: 'lightningcss'
  },
  server: {
    host: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  }
} satisfies UserConfig
