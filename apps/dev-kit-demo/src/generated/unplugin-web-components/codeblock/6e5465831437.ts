// webpack.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/webpack'

export default {
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
}
