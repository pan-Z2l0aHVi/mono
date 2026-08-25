// 为已发布的 npm 包创建 GitHub release；已存在的跳过（保证重跑幂等）。
// 用法: node .github/scripts/create-github-releases.mjs   （需 env: GH_TOKEN, MERGE_SHA, PACKAGE_RELEASES；GITHUB_REPOSITORY 为 ambient）
import { execFileSync } from 'node:child_process'

const repository = process.env.GITHUB_REPOSITORY
const mergeSha = process.env.MERGE_SHA
const releases = JSON.parse(process.env.PACKAGE_RELEASES)

for (const { name, version, directory } of releases) {
  const tag = `${name}@${version}`
  try {
    execFileSync('gh', ['release', 'view', tag, '--repo', repository], { stdio: 'ignore' })
    console.log(`Release ${tag} already exists; skipping.`)
    continue
  } catch {
    // 下面创建缺失的 release；这保证 workflow 重跑是幂等的。
  }

  const npmUrl = `https://www.npmjs.com/package/${name}/v/${version}`
  const changelogUrl = `https://github.com/${repository}/blob/${mergeSha}/${directory}/CHANGELOG.md`
  const notes = `Published to npm: [${name}@${version}](${npmUrl}).\n\nSee [${directory}/CHANGELOG.md](${changelogUrl}) for release notes.`

  execFileSync(
    'gh',
    [
      'release',
      'create',
      tag,
      '--repo',
      repository,
      '--target',
      mergeSha,
      '--title',
      `${name} v${version}`,
      '--notes',
      notes,
      '--latest=false'
    ],
    { stdio: 'inherit' }
  )
}
