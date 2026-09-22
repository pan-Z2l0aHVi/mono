import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 这条测试钉的是发布检测的判据：git 默认开启改名检测，所以包目录改名在 `--name-status` 里是 `R`，
// 只挑 A/M 的旧实现会整笔丢掉它 —— 换了 npm 名字的包永远不会被发布，而 CI 全绿。判据收在
// (name, version) 身份上：名字变了要发，纯目录搬迁不发。删除与私有包同样要在清单里保持沉默而不是炸。
const repoRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repoRoot, '.github', 'scripts', 'detect-versioned-packages.mjs')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-detect-versioned-'))

const git = (...args) =>
  execFileSync('git', ['-C', fixture, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.com', ...args], {
    encoding: 'utf8'
  }).trim()

let outputSeq = 0

function writePackage(dir, name, version, { isPrivate = false } = {}) {
  const target = path.join(fixture, dir)
  fs.mkdirSync(target, { recursive: true })
  fs.writeFileSync(
    `${target}/package.json`,
    `${JSON.stringify({ name, version, ...(isPrivate ? { private: true } : {}) }, null, 2)}\n`
  )
}

function commit(message) {
  git('add', '-A')
  git('commit', '--quiet', '-m', message)
}

// 脚本按 MERGE_SHA^1 取 base，所以每一步都要在 commit 之后跑一次，断言它看见了什么、更断言它漏了什么。
function detect() {
  const mergeSha = git('rev-parse', 'HEAD')
  const outputFile = path.join(fixture, `.github-output-${(outputSeq += 1)}`)
  fs.writeFileSync(outputFile, '')
  execFileSync(process.execPath, [script], {
    cwd: fixture,
    // 固定 git 配置：改名是否报成 R 取决于 `diff.renames`，本机把它关掉会让 fixture 走另一条分支，
    // 而脚本自己带的是 `--find-renames`，这里必须让 fixture 与生产 runner 看到同一种形状。
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
      MERGE_SHA: mergeSha,
      GITHUB_OUTPUT: outputFile
    },
    encoding: 'utf8'
  })

  const entries = fs
    .readFileSync(outputFile, 'utf8')
    .trim()
    .split('\n')
    .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  const output = Object.fromEntries(entries)

  assert.equal(output['merge-sha'], mergeSha, 'the merge sha must be echoed back')
  const releases = JSON.parse(output['package-releases'])
  assert.equal(output['should-publish'], String(releases.length > 0), 'should-publish must agree with the release list')

  return releases
}

try {
  git('init', '--quiet')
  writePackage('packages/quiet', '@greypan/quiet', '1.0.0')
  writePackage('packages/rename-me', '@greypan/rename-me', '1.0.0')
  writePackage('packages/private-pkg', '@greypan/private-pkg', '1.0.0', { isPrivate: true })
  fs.writeFileSync(path.join(fixture, 'README.md'), 'fixture\n')
  commit('base')

  // 1. 改名 + 改 npm 名字，版本不动：旧实现这里返回空清单，正是那条静默跳过。
  git('mv', 'packages/rename-me', 'packages/renamed')
  writePackage('packages/renamed', '@greypan/renamed', '1.0.0')
  commit('rename')
  assert.deepEqual(detect(), [{ name: '@greypan/renamed', version: '1.0.0', directory: 'packages/renamed' }])

  // 1b. 紧接着只做纯目录搬迁（git 报 R100，npm 名字与版本都没变）：registry 上没有新东西，不发。
  git('mv', 'packages/renamed', 'packages/renamed-again')
  commit('pure move')
  assert.deepEqual(detect(), [])

  // 2. 版本 bump（M）：照常发布。
  writePackage('packages/quiet', '@greypan/quiet', '1.0.1')
  commit('bump')
  assert.deepEqual(detect(), [{ name: '@greypan/quiet', version: '1.0.1', directory: 'packages/quiet' }])

  // 3. 只碰非 manifest 文件：不产生版本变更。
  fs.writeFileSync(path.join(fixture, 'packages/quiet/README.md'), 'notes\n')
  commit('notes only')
  assert.deepEqual(detect(), [])

  // 4. 版本没变的 manifest 改写（只加字段）：仍然不发，避免空转一次发布。
  fs.writeFileSync(
    path.join(fixture, 'packages/quiet/package.json'),
    `${JSON.stringify({ name: '@greypan/quiet', version: '1.0.1', description: 'rewritten' }, null, 2)}\n`
  )
  commit('same version')
  assert.deepEqual(detect(), [])

  // 5. 新包（A）：首次发布，不读 base。
  writePackage('packages/fresh', '@greypan/fresh', '0.1.0')
  commit('fresh package')
  assert.deepEqual(detect(), [{ name: '@greypan/fresh', version: '0.1.0', directory: 'packages/fresh' }])

  // 6. 私有包 bump：永不进 npm 清单。
  writePackage('packages/private-pkg', '@greypan/private-pkg', '2.0.0', { isPrivate: true })
  commit('private bump')
  assert.deepEqual(detect(), [])

  // 7. 删除包：跳过而不是把 base 读失败当成错误抛出。
  git('rm', '-r', '--cached', 'packages/fresh')
  fs.rmSync(path.join(fixture, 'packages/fresh'), { recursive: true, force: true })
  commit('delete')
  assert.deepEqual(detect(), [])

  // 8. 改名同时版本也变：仍按新路径发一次，不重复也不漏。
  git('mv', 'packages/quiet', 'packages/quieter')
  writePackage('packages/quieter', '@greypan/quieter', '2.0.0')
  commit('rename and bump')
  assert.deepEqual(detect(), [{ name: '@greypan/quieter', version: '2.0.0', directory: 'packages/quieter' }])
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('scripts/detect-versioned-packages.test.mjs: all assertions passed')
