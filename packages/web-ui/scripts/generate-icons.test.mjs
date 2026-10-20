import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'web-ui-icons-')))
const scriptDir = path.join(fixture, 'scripts')
const script = path.join(scriptDir, 'generate-icons.ts')
fs.mkdirSync(scriptDir, { recursive: true })
fs.copyFileSync(path.join(import.meta.dirname, 'generate-icons.ts'), script)

function writeIconSet(name, data) {
  const dir = path.join(fixture, 'node_modules/@iconify-json', name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'icons.json'), JSON.stringify(data))
}

function writeUsed(entries) {
  fs.writeFileSync(path.join(fixture, 'icons.used.json'), JSON.stringify(entries))
}

function run() {
  return execFileSync(process.execPath, ['--experimental-strip-types', script], {
    cwd: fixture,
    encoding: 'utf8',
    stdio: 'pipe'
  })
}

function runExpectingFailure() {
  try {
    run()
  } catch (error) {
    return error
  }
  assert.fail('expected generate-icons to fail')
}

try {
  writeIconSet('test', {
    icons: {
      home: { body: '<path d="M0 0h16v16H0z"/>' },
      plain: { body: '<path d="M1 1h14v14H1z"/>' }
    },
    aliases: {
      house: { parent: 'home' }
    },
    width: 24,
    height: 24
  })
  writeIconSet('bare', {
    icons: {
      dot: { body: '<circle cx="8" cy="8" r="8"/>' }
    }
  })
  writeUsed(['test:house', 'test:plain', 'bare:dot'])

  assert.match(run(), /Generated 3 icons/)
  const generatedDir = path.join(fixture, 'src/icons/generated')
  const house = fs.readFileSync(path.join(generatedDir, 'test-house.ts'), 'utf8')
  const dot = fs.readFileSync(path.join(generatedDir, 'bare-dot.ts'), 'utf8')
  assert.match(house, /body: '<path d="M0 0h16v16H0z"\/>'/)
  assert.match(house, /width: 24/)
  assert.match(dot, /width: 16/)
  assert.match(dot, /height: 16/)
  const index = fs.readFileSync(path.join(fixture, 'src/icons/index.ts'), 'utf8')
  assert.match(index, /export \{ default as testHouse \}/)
  assert.match(index, /export \{ default as bareDot \}/)

  // 输入里移除的 icon 必须从生成目录消失；非生成文件不归这个脚本清理。
  const stale = path.join(generatedDir, 'stale-icon.ts')
  const foreign = path.join(generatedDir, 'keep.txt')
  fs.writeFileSync(stale, 'stale\n')
  fs.writeFileSync(foreign, 'keep\n')
  assert.match(run(), /Generated 3 icons/)
  assert.equal(fs.existsSync(stale), false)
  assert.equal(fs.existsSync(foreign), true)
  fs.rmSync(foreign)

  writeUsed(['test:missing'])
  assert.match(runExpectingFailure().stderr, /was not found in icons or aliases/)

  writeIconSet('test', {
    icons: {},
    aliases: { turned: { parent: 'home', rotate: 90 } },
    width: 24,
    height: 24
  })
  writeUsed(['test:turned'])
  assert.match(runExpectingFailure().stderr, /uses transformations that are not supported/)

  writeIconSet('test', {
    icons: {},
    aliases: { a: { parent: 'b' }, b: { parent: 'a' } },
    width: 24,
    height: 24
  })
  writeUsed(['test:a'])
  assert.match(runExpectingFailure().stderr, /creates a parent cycle/)
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('packages/web-ui/scripts/generate-icons.test.mjs: all assertions passed')
