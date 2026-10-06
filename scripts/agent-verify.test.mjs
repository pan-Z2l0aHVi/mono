import assert from 'node:assert/strict'

import {
  buildTouchSequence,
  chromeArgs,
  classifySamples,
  connectionHint,
  parsePoints,
  RECORDER_SOURCE
} from './agent-verify.mjs'

// ===== parsePoints =====
assert.deepEqual(parsePoints('10,20 300,400'), [
  { x: 10, y: 20 },
  { x: 300, y: 400 }
])
assert.deepEqual(parsePoints('  0,0   50.5,60.5 '), [
  { x: 0, y: 0 },
  { x: 50.5, y: 60.5 }
])
assert.throws(() => parsePoints('10,20'), /at least two points/)
assert.throws(() => parsePoints('10,x 20,y'), /invalid touch point/)
assert.throws(() => parsePoints('abc'), /invalid touch point/)
assert.equal(parsePoints(undefined), undefined)

// ===== buildTouchSequence =====
const sequence = buildTouchSequence(
  [
    { x: 0, y: 0 },
    { x: 100, y: 50 }
  ],
  5
)
assert.equal(sequence[0].type, 'touchStart')
assert.deepEqual(sequence[0].touchPoints, [{ x: 0, y: 0 }])
assert.equal(sequence.at(-1).type, 'touchEnd')
assert.deepEqual(sequence.at(-1).touchPoints, [])
const moves = sequence.filter(command => command.type === 'touchMove')
assert.equal(moves.length, 5)
assert.deepEqual(moves[0].touchPoints, [{ x: 20, y: 10 }])
assert.deepEqual(moves.at(-1).touchPoints, [{ x: 100, y: 50 }])
// 多段路径：起点、拐点、终点全部按顺序出现
const multi = buildTouchSequence(
  [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 20, y: 10 }
  ],
  2
)
const multiPoints = multi.filter(command => command.type !== 'touchEnd').map(command => command.touchPoints[0])
assert.deepEqual(multiPoints, [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 10, y: 0 },
  { x: 15, y: 5 },
  { x: 20, y: 10 }
])

// ===== RECORDER_SOURCE =====
// 录制器必须在 capture 阶段、非 passive 地监听全部 touch 事件类型。
assert.match(RECORDER_SOURCE, /addEventListener\(type, record\(type\), \{ capture: true, passive: false \}\)/)
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
  assert.ok(RECORDER_SOURCE.includes(`'${type}'`), `recorder must listen to ${type}`)

// ===== classifySamples =====
assert.equal(classifySamples([]), 'unknown')
assert.equal(classifySamples(['0.5', '0.5', '0.5']), 'none')
assert.equal(classifySamples(['0', '0.2', '0.4', '0.6', '0.8', '1']), 'linear')
assert.equal(classifySamples(['0', '0', '0', '1', '1', '1']), 'stepped')
assert.equal(classifySamples(['0', '0', '0', '1']), 'stepped')
// 浮点噪声不把 none 误判为 linear
assert.equal(classifySamples(['1', '1.0000001', '0.9999999']), 'none')

// ===== chromeArgs =====
const args = chromeArgs({ profileDir: '/tmp/profile', url: 'http://127.0.0.1:5173/' })
assert.equal(args[0], '--remote-debugging-port=0')
assert.equal(args[1], '--user-data-dir=/tmp/profile')
assert.equal(args.includes('--headless=new'), false)
assert.equal(args.at(-1), 'http://127.0.0.1:5173/')
const headless = chromeArgs({ profileDir: '/tmp/p', port: 9223, headless: true })
assert.equal(headless[0], '--remote-debugging-port=9223')
assert.ok(headless.includes('--headless=new'))

// ===== connectionHint =====
// 提示必须点名被访问的 URL、给出「先起 devserver」这个真实分布上的首选动作、并说明默认值可覆盖。
const defaultHint = connectionHint('https://127.0.0.1:5173/')
assert.match(defaultHint, /https:\/\/127\.0\.0\.1:5173\//)
assert.match(defaultHint, /pnpm dev:react-web-ui-demo/)
assert.match(defaultHint, /--url <url>/)
assert.match(defaultHint, /default is https:\/\/127\.0\.0\.1:5173\//)
// 显式传入别的目标时，提示不得退回到默认 URL 的措辞。
const customHint = connectionHint('https://example.test:8443/app')
assert.match(customHint, /https:\/\/example\.test:8443\/app/)

console.log('agent-verify tests passed')
