// 检测版本 PR merge 中发生版本变更的公开包，把 merge-sha / should-publish / package-releases 写入 GITHUB_OUTPUT。
// 用法: node .github/scripts/detect-versioned-packages.mjs   （需 env: MERGE_SHA）
import { execFileSync } from 'node:child_process'
import { appendFile, readFile } from 'node:fs/promises'

const mergeSha = process.env.MERGE_SHA
const baseSha = execFileSync('git', ['rev-parse', `${mergeSha}^1`], { encoding: 'utf8' }).trim()
// 用 --name-status 取新增/修改的 manifest，不依赖 git 对"路径缺失"的 stderr 措辞：
// 删除/重命名跳过（无上一版本）；新增包直接视为首次发布，不跑 git show。
const changedManifests = execFileSync(
  'git',
  ['diff', '--name-status', '--diff-filter=AM', baseSha, mergeSha, '--', 'packages'],
  { encoding: 'utf8' }
)
  .split('\n')
  .filter(Boolean)
  .map(line => {
    const [status, manifestPath] = line.split('\t')
    return { status, manifestPath }
  })
  .filter(({ manifestPath }) => /^packages\/[^/]+\/package\.json$/.test(manifestPath))

const releases = []
for (const { status, manifestPath } of changedManifests) {
  const current = JSON.parse(await readFile(manifestPath, 'utf8'))
  let previous = null
  if (status === 'M') {
    // 修改包：base 侧必须存在，任何读取失败都是真实错误，直接抛出
    try {
      previous = JSON.parse(execFileSync('git', ['show', `${baseSha}:${manifestPath}`], { encoding: 'utf8' }))
    } catch (error) {
      throw new Error(`无法读取 base 版本 ${manifestPath}: ${String(error.stderr || error.message)}`)
    }
  }
  // 新增包（A）previous 保持 null，视为首次发布
  if (!current.private && (previous === null || current.version !== previous.version)) {
    releases.push({
      name: current.name,
      version: current.version,
      directory: manifestPath.slice(0, -'/package.json'.length)
    })
  }
}

const output =
  [
    `merge-sha=${mergeSha}`,
    `should-publish=${releases.length > 0}`,
    `package-releases=${JSON.stringify(releases)}`
  ].join('\n') + '\n'
await appendFile(process.env.GITHUB_OUTPUT, output)
