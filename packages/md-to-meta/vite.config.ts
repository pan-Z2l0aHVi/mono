import type { UserConfig } from 'vite-plus'

export default {
  pack: [
    {
      entry: 'src/index.ts',
      dts: true
    }
  ]
} satisfies UserConfig
