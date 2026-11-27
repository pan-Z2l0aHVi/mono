// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default defineConfig({
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
})
