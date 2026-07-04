import { unpluginWebComponents } from '@mono/unplugin-web-components'
import { fullReload } from '@mono/vite-plugin-full-reload'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'
import { type PluginOption, searchForWorkspaceRoot, type UserConfig } from 'vite-plus'

// https://vite.dev/config/
export default {
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true
    }),
    react(),
    unpluginWebComponents.vite({
      tagPrefix: 'web-ui',
      packageName: '@mono/web-ui',
      sideEffects: true
    }),
    fullReload.vite([
      {
        name: '@mono/web-ui',
        path: '../../packages/web-ui'
      },
      {
        name: '@mono/js-kit',
        path: '../../packages/js-kit'
      },
      {
        name: '@mono/browser-kit',
        path: '../../packages/browser-kit'
      }
    ]),
    tailwindcss(),
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
