import { unpluginWebComponents } from '@mono/unplugin-web-components'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { type PluginOption, searchForWorkspaceRoot, type UserConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default {
  plugins: [
    tsconfigPaths({ root: './' }),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true
    }),
    react({
      babel: {
        // plugins: [['babel-plugin-react-compiler']]
      }
    }),
    unpluginWebComponents.vite({
      tagPrefix: 'web-ui',
      packageName: '@mono/web-ui',
      sideEffects: true
    }),
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
