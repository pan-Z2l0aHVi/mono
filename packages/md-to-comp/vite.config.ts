import type { UserConfig } from 'vite-plus'

export default {
  pack: [
    {
      entry: 'src/index.ts',
      dts: true
    },
    {
      entry: 'src/react.ts',
      dts: true
    },
    {
      entry: 'src/markdown-entry.ts',
      dts: true
    },
    {
      entry: 'src/vue.ts',
      dts: true
    }
  ]
} satisfies UserConfig
