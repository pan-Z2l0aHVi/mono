// 用法: node .github/scripts/detect-versioned-packages.mjs   （需 env: MERGE_SHA）
import { execFileSync } from 'node:child_process'
import { appendFile, readFile } from 'node:fs/promises'

const mergeSha = process.env.MERGE_SHA
const baseSha = execFileSync('git', ['rev-parse', `${mergeSha}^1`], { encoding: 'utf8' }).trim()
// 用 --name-status 取 manifest 变更，不依赖 git 对"路径缺失"的 stderr 措辞。rename/copy 必须一起收：
// 只挑 A/M 会让「包目录改名但版本没变」整笔静默跳过，而那个新 npm 名字从来没有产物。
// 删除（D）依旧跳过：当前树里已经没有它；新增（A）视为首次发布，不读 base。
const changedManifests = execFileSync(
  'git',
  ['diff', '--name-status', '--find-renames', '--diff-filter=AMRC', baseSha, mergeSha, '--', 'packages'],
  { encoding: 'utf8' }
)
  .split('\n')
  .filter(Boolean)
  .map(line => {
    const [status, ...paths] = line.split('\t')
    // R/C 行带 from 与 to 两个路径：发布面向当前树的 to，读上一版本只能按 base 侧的 from。
    return { status, manifestPath: paths.at(-1), previousPath: paths[0] }
  })
  .filter(({ manifestPath }) => /^packages\/[^/]+\/package\.json$/.test(manifestPath))

const releases = []
for (const { status, manifestPath, previousPath } of changedManifests) {
  const current = JSON.parse(await readFile(manifestPath, 'utf8'))
  let previous = null
  if (status !== 'A') {
    // 非新增包：base 侧必须存在，任何读取失败都是真实错误，直接抛出
    try {
      previous = JSON.parse(execFileSync('git', ['show', `${baseSha}:${previousPath}`], { encoding: 'utf8' }))
    } catch (error) {
      throw new Error(`无法读取 base 版本 ${previousPath}: ${String(error.stderr || error.message)}`)
    }
  }
  // 发布身份由 (name, version) 决定，不由目录决定：改名（R/C）若换了 npm 名字就必须发，那个名字在
  // registry 上从来没有产物；纯目录搬迁（名字与版本都没变）没有任何新东西，硬发只会凭空造一个 GitHub release。
  if (
    !current.private &&
    (previous === null || current.name !== previous.name || current.version !== previous.version)
  ) {
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
