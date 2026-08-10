import { spawnSync } from 'node:child_process'

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run('pnpm', ['exec', 'changeset', 'version'])

const versionChanged = spawnSync('git', ['diff', '--quiet', '--', 'apps/weave/package.json'])

if (versionChanged.error) {
  throw versionChanged.error
}
if (versionChanged.status === 1) {
  run('pnpm', ['--filter', '@greypan/weave', 'run', 'sync:version'])
} else if (versionChanged.status !== 0) {
  process.exit(versionChanged.status ?? 1)
}
