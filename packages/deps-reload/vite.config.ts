import type { UserConfig } from 'vite-plus'

export default {
  pack: [
    {
      entry: 'src/vite.ts',
      dts: {
        build: true
      }
    },
    {
      entry: 'src/webpack.ts',
      dts: {
        build: true
      }
    }
  ]
} satisfies UserConfig
