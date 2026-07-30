import depsReload from '@greypan/deps-reload/vite'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import autoImport from 'unplugin-auto-import/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { searchForWorkspaceRoot, type UserConfig } from 'vite-plus'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import vueRouter from 'vue-router/vite'

export default {
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    vueDevTools(),
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
      imports: ['vue', VueRouterAutoImports],
      // 禁止 auto-import 自动导入 Vue 的 h 方法，防止与 Lit 的 h 冲突
      ignore: ['h']
    }),
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    }),
    depsReload([
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
    basicSsl(),
    legacy({
      modernTargets: ['Chrome >=111', 'Edge >=111', 'Safari >=16.4', 'iOS >=16.4', 'Firefox >=128'],
      renderLegacyChunks: false,
      modernPolyfills: true
    })
  ],
  test: {
    environment: 'jsdom'
  },
  build: {},
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
