import { defineStagedClean, pnpm } from '@greypan/monorepo-kit'

/**
 * 提交边界要过的工具链。步骤顺序就是失败信息的呈现顺序；同一文件可以同时命中多条步骤
 * （`.css` 既进 `vp check` 也进 `stylelint`）。
 *
 * `seam` 是测试 seam：设成 JSON argv 数组就能替换整条命令，真实调用不受影响。
 * `hint` 是失败信息末尾的下一步提示，带本仓的修复命令。
 */
export const stagedClean = defineStagedClean({
  installHint: 'mise install; pnpm install for Node deps',
  steps: [
    {
      name: 'vp check',
      match: /.*/,
      seam: 'AGENT_VP_ARGV',
      command: [pnpm, 'exec', 'vp'],
      args: ['check', '--no-error-on-unmatched-pattern'],
      failOn: 'exit',
      hint: 'vp check --fix <files> repairs formatting and autofixable lint, never a type error'
    },
    {
      name: 'stylelint',
      match: /\.(?:css|scss|less|html|vue)$/,
      seam: 'AGENT_STYLELINT_ARGV',
      command: [pnpm, 'exec', 'stylelint'],
      args: ['--allow-empty-input'],
      failOn: 'exit',
      hint: 'stylelint <files>; pnpm run fix-stylelint fixes the whole repo'
    },
    {
      name: 'gofmt',
      match: /\.go$/,
      seam: 'AGENT_GOFMT_ARGV',
      command: ['gofmt'],
      args: ['-l'],
      failOn: 'stdout',
      hint: 'gofmt -w <files>; pnpm run fix-go fixes the whole repo'
    }
  ]
})
