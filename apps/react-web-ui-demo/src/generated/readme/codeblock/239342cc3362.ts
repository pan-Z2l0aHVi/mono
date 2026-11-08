import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('web-ui-') } } }),
    unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true })
  ]
})
