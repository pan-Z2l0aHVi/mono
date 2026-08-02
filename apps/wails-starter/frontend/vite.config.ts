import depsReload from '@greypan/deps-reload/vite'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import wails from '@wailsio/runtime/plugins/vite'
import { searchForWorkspaceRoot } from 'vite-plus'

export default {
  resolve: {
    tsconfigPaths: true
  },
  server: {
    host: true,
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith('web-ui-') || tag.startsWith('WebUi')
        }
      }
    }),
    wails('./bindings'),
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    }),
    depsReload([
      { name: '@greypan/web-ui', path: '../../../packages/web-ui' },
      { name: '@greypan/js-kit', path: '../../../packages/js-kit' },
      { name: '@greypan/browser-kit', path: '../../../packages/browser-kit' }
    ]),
    tailwindcss(),
    ...legacy({
      modernTargets: ['Chrome >=111', 'Edge >=111', 'Safari >=16.4', 'iOS >=16.4', 'Firefox >=128'],
      renderLegacyChunks: false,
      modernPolyfills: true
    })
  ],
  css: {
    transformer: 'lightningcss'
  }
}
