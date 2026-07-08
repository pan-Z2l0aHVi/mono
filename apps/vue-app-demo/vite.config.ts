import { unpluginWebComponents } from '@greypan/unplugin-web-components'
import { fullReload } from '@greypan/vite-plugin-full-reload'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { visualizer } from 'rollup-plugin-visualizer'
import autoImport from 'unplugin-auto-import/vite'
import checker from 'vite-plugin-checker'
import VueDevTools from 'vite-plugin-vue-devtools'
import { type PluginOption, searchForWorkspaceRoot, type UserConfig } from 'vite-plus'
import vueRouter from 'vue-router/vite'

export default {
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    VueDevTools(),
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
      packageName: '@greypan/web-ui',
      sideEffects: true
    }),
    fullReload.vite([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui'
      },
      {
        name: '@greypan/js-kit',
        path: '../../packages/js-kit'
      },
      {
        name: '@greypan/browser-kit',
        path: '../../packages/browser-kit'
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
    basicSsl(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 9', 'iOS >= 15']
    }),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true
    }) as PluginOption
  ],
  test: {
    environment: 'jsdom'
  },
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
