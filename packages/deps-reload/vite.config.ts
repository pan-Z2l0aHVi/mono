import type { UserConfig } from 'vite-plus'

export default {
  pack: [
    {
      entry: 'src/vite.ts',
      dts: true
    },
    {
      entry: 'src/webpack.ts',
      dts: true
    }
  ]
} satisfies UserConfig
