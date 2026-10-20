import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// GOCACHE 探测是 .mise.toml 的 bootstrap 例外，只在渲染时执行；这里用假的 uname 与
// 隔离的 HOME/TMPDIR 钉住平台优先顺序、单行输出、exit 0 以及探测文件清理。
// 语义见 docs/agents/worktree.md「Go 缓存探测与共享」。
const repoRoot = path.resolve(import.meta.dirname, '../..')
const helper = path.join(repoRoot, 'scripts', 'lib', 'go-cache-dir.sh')
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-go-cache-dir-'))
const bin = path.join(sandbox, 'bin')
const blockedHome = path.join(sandbox, 'blocked-home')

function run(platform, extraEnv = {}) {
  const home = path.join(sandbox, `${platform.toLowerCase()}-home`)
  const temp = path.join(sandbox, `${platform.toLowerCase()}-tmp`)
  fs.mkdirSync(home, { recursive: true })
  fs.mkdirSync(temp, { recursive: true })
  const result = spawnSync('sh', [helper], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      HOME: home,
      TMPDIR: temp,
      FAKE_UNAME: platform,
      ...extraEnv
    }
  })
  assert.equal(result.status, 0, `helper must exit 0 on ${platform}: ${result.stderr}`)
  const lines = result.stdout.split('\n').filter(Boolean)
  assert.equal(lines.length, 1, `helper must print exactly one line on ${platform}`)
  return { home, temp, output: lines[0] }
}

try {
  fs.mkdirSync(bin)
  fs.writeFileSync(path.join(bin, 'uname'), '#!/bin/sh\nprintf "%s\\n" "$FAKE_UNAME"\n')
  fs.chmodSync(path.join(bin, 'uname'), 0o755)
  fs.writeFileSync(blockedHome, 'a regular file blocks mkdir -p\n')

  const darwin = run('Darwin')
  assert.equal(darwin.output, path.join(darwin.home, 'Library/Caches/go-build'))
  assert.ok(fs.statSync(darwin.output).isDirectory(), 'Darwin must probe the macOS default cache')
  assert.equal(fs.existsSync(path.join(darwin.home, '.cache')), false, 'Darwin must not probe Linux first')
  assert.deepEqual(
    fs.readdirSync(darwin.output).filter(name => name.startsWith('.herdr-gocache-probe.')),
    [],
    'probe files must be removed'
  )

  const linux = run('Linux')
  assert.equal(linux.output, path.join(linux.home, '.cache/go-build'))
  assert.ok(fs.statSync(linux.output).isDirectory(), 'Linux must probe the Linux default cache first')
  assert.equal(fs.existsSync(path.join(linux.home, 'Library')), false, 'Linux must not create ~/Library')

  // 两个平台默认路径都不可写时，只能打印 $TMPDIR 下的回落路径；该目录由第一次 turbo 运行时创建。
  const fallback = run('Linux', { HOME: blockedHome })
  assert.equal(fallback.output, path.join(fallback.temp, 'greypan/go-build'))
  assert.equal(fs.existsSync(fallback.output), false)

  process.stdout.write('scripts/lib/go-cache-dir.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true })
}
