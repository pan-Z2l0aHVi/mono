import type { UserConfig } from 'vite-plus'

export default {
  pack: [
    {
      entry: 'src/index.ts',
      dts: true
    },
    // headless CLI：`md-to-meta check|write <app-dir>`，bin 指到 dist/cli.mjs。
    {
      entry: 'src/cli.ts'
    }
  ]
} satisfies UserConfig
