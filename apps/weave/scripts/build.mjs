import { spawnSync } from 'node:child_process'

const scripts =
  process.platform === 'darwin'
    ? ['build:macos', 'build:windows']
    : process.platform === 'win32'
      ? ['build:windows']
      : ['build:frontend']

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

for (const script of scripts) {
  const result = spawnSync(pnpm, ['run', script], { stdio: 'inherit' })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
