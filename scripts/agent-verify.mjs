#!/usr/bin/env node
// 引擎级浏览器取证工具包：绕过 MCP/WebDriver 等高层封装，直接以 CDP 原语驱动
// 真实 Chrome，用于复现「高层 API 做不到」的三类取证——
//   check-env    测试环境前置检查（visibilityState / rAF 推进 / 时钟推进 /
//                hasFocus / webdriver / 视口）：后台窗口 rAF 停摆、计时器节流
//                曾分别制造「复现了不存在的 bug」与插值测试假阴性。
//   touch-flow   Input.dispatchTouchEvent 真实触控管线取证：注入 capture 阶段
//                非 passive 录制器并回读事件；零事件即退出非零——「mouse-only
//                输入环境」检测器（CDP touch 会触发真实手势识别，合成
//                PointerEvent 不会）。
//   interpolate  过渡插值取证：强制 reflow 固定起始帧 → 触发过渡 → 逐 rAF 采样
//                computed 样式 → 分类 linear/stepped/none。
//
// 连接设计：默认 spawn 专用 Chrome（随机调试端口 + 一次性 profile；非 headless
// ——headless/隐藏窗口正是节流伪影域，headless 需显式 --headless opt-in）；
// CHROME_DEBUG_PORT 或 --port 可附着既有专用实例。仅依赖 Node 24 全局
// WebSocket 与 fetch，零第三方依赖。
//
// 用法：pnpm agent:verify <check-env|touch-flow|interpolate> [options]
//   --url <url>         目标页面（默认 https://127.0.0.1:5173/，本地 devserver 为自签 HTTPS）
//   --port <n>          附着既有实例的调试端口（默认 env CHROME_DEBUG_PORT，否则 spawn）
//   --headless          显式 opt-in headless（取证结果可能含节流伪影）
//   --points "x,y ..."  touch-flow 触点序列（默认视口对角线拖拽）
//   --steps <n>         touch-flow 每段插值步数（默认 10）
//   --selector <css>    interpolate 采样目标（默认 dialog）
//   --property <css>    interpolate 采样属性（默认 opacity）
//   --trigger <css>     interpolate 触发元素（默认点击 selector 自身）
//   --duration <ms>     interpolate 采样时长（默认 800）
//   --json              机器可读报告
//
// 可单测面（无 Chrome）：parsePoints / buildTouchSequence / RECORDER_SOURCE /
// classifySamples / chromeArgs；连接与分发路径为 integration-only。

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const [command] = args
const option = name => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] !== undefined && !args[index + 1].startsWith('--') ? args[index + 1] : undefined
}
const flag = name => args.includes(`--${name}`)

function fail(message) {
  console.error(`agent-verify failed: ${message}`)
  process.exitCode = 1
}

// ===== 纯函数层（可单测） =====

export function parsePoints(input) {
  if (!input) return undefined
  const points = input
    .trim()
    .split(/\s+/)
    .map(pair => {
      const [x, y] = pair.split(',').map(Number)
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`invalid touch point: ${pair}`)
      return { x, y }
    })
  if (points.length < 2) throw new Error('touch sequence requires at least two points')
  return points
}

// 构造 Input.dispatchTouchEvent 序列：touchStart 落第一点，段内线性插值 touchMove，
// touchEnd 以空 touchPoints 收尾（CDP 协议要求）。
export function buildTouchSequence(points, stepsPerSegment = 10) {
  const commands = []
  commands.push({ type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y }] })
  for (let segment = 0; segment < points.length - 1; segment += 1) {
    const from = points[segment]
    const to = points[segment + 1]
    for (let step = 1; step <= stepsPerSegment; step += 1) {
      const ratio = step / stepsPerSegment
      commands.push({
        type: 'touchMove',
        touchPoints: [
          { x: Math.round(from.x + (to.x - from.x) * ratio), y: Math.round(from.y + (to.y - from.y) * ratio) }
        ]
      })
    }
  }
  commands.push({ type: 'touchEnd', touchPoints: [] })
  return commands
}

// capture 阶段 + 非 passive：无论目标元素如何消费手势，录制器都能看到完整事件流。
export const RECORDER_SOURCE = `
  () => {
    const log = []
    const record = type => event => {
      const touch = event.changedTouches?.[0] ?? event.touches?.[0]
      log.push({
        type,
        x: touch ? Math.round(touch.clientX) : null,
        y: touch ? Math.round(touch.clientY) : null,
        defaultPrevented: event.defaultPrevented,
        timestamp: performance.now()
      })
    }
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
      window.addEventListener(type, record(type), { capture: true, passive: false })
    window.__touchLog = log
    return true
  }
`

// 插值分类：none = 全程无变化；stepped = 主要变化集中在单帧（离散跳变，等价于
// 没有插值）；linear = 变化分布在多帧（连续插值）。epsilon 用于浮点/颜色量化噪声。
export function classifySamples(samples, epsilon = 1e-3) {
  const values = samples.map(value => Number.parseFloat(value)).filter(value => Number.isFinite(value))
  if (values.length === 0) return 'unknown'
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max - min < epsilon) return 'none'
  let maxDelta = 0
  for (let index = 1; index < values.length; index += 1)
    maxDelta = Math.max(maxDelta, Math.abs(values[index] - values[index - 1]))
  return maxDelta >= (max - min) * 0.6 ? 'stepped' : 'linear'
}

export function chromeArgs({ profileDir, port = 0, headless = false, url } = {}) {
  const result = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-session-crashed-bubble',
    // 专用一次性 profile 的取证实例；本地 devserver 普遍自签证书。
    // --no-proxy-server：系统代理（如抓包工具）会把 localhost 导向无法回连的位置。
    '--ignore-certificate-errors',
    '--no-proxy-server'
  ]
  if (headless) result.push('--headless=new')
  if (url) result.push(url)
  return result
}

// ===== 集成层（integration-only，不单测） =====

function chromeCandidates() {
  if (process.platform === 'darwin') return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  return ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']
}

export async function spawnChrome() {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-agent-verify-'))
  const executable = chromeCandidates().find(candidate => fs.existsSync(candidate))
  if (!executable) fail(`no Chrome executable found; set CHROME_DEBUG_PORT to attach an existing instance`)
  if (!executable) return null
  const child = spawn(executable, chromeArgs({ profileDir, headless: flag('headless') }), {
    stdio: ['ignore', 'ignore', 'pipe']
  })
  // Chrome 在 stderr 输出 "DevTools listening on ws://127.0.0.1:<port>/..."；端口随机时必须解析。
  const port = await new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => reject(new Error('timed out waiting for Chrome DevTools port')), 15000)
    child.stderr.on('data', chunk => {
      buffer += chunk.toString()
      const match = /DevTools listening on ws:\/\/[0-9.]+:(\d+)\//.exec(buffer)
      if (match) {
        clearTimeout(timer)
        resolve(Number(match[1]))
      }
    })
    child.on('exit', code => {
      clearTimeout(timer)
      reject(new Error(`Chrome exited early with code ${code}`))
    })
  })
  return { child, port, profileDir }
}

export async function connectCdp(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const page = targets.find(target => target.type === 'page')
  if (!page) fail('no page target in Chrome instance')
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onerror = () => reject(new Error('WebSocket connection failed'))
  })
  let messageId = 0
  const pending = new Map()
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`))
      else resolve(message.result)
    }
  }
  return {
    send(method, params = {}) {
      const id = (messageId += 1)
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
    close: () => socket.close()
  }
}

export async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(`page evaluation failed: ${result.exceptionDetails.text}`)
  return result.result.value
}

export async function navigate(cdp, url) {
  await cdp.send('Page.enable')
  const navigation = await cdp.send('Page.navigate', { url })
  // 不校验 errorText 会把取证跑在 chrome-error 页上，产出全部失真。
  if (navigation.errorText) throw new Error(`navigation failed: ${navigation.errorText} (${url})`)
  // 轮询 readyState，避免固定 sleep 在慢速 devserver 上采样到空页面。
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await evaluate(cdp, 'document.readyState')) {
      if ((await evaluate(cdp, 'document.readyState')) === 'complete') break
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  await new Promise(resolve => setTimeout(resolve, 200))
}

// ===== check-env =====

const ENV_PROBE = `
  (async () => {
    const rafCount = await new Promise(resolve => {
      let count = 0
      const start = performance.now()
      const tick = () => {
        count += 1
        if (performance.now() - start < 500 && count < 1000) requestAnimationFrame(tick)
        else resolve(count)
      }
      requestAnimationFrame(tick)
      setTimeout(() => resolve(count), 2000)
    })
    const clockStart = Date.now()
    await new Promise(resolve => setTimeout(resolve, 100))
    const clockDrift = Date.now() - clockStart - 100
    return {
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
      webdriver: Boolean(navigator.webdriver),
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      rafCount500ms: rafCount,
      clockDriftMs: clockDrift
    }
  })()
`

async function checkEnv(cdp, url) {
  await navigate(cdp, url)
  const probe = await evaluate(cdp, ENV_PROBE)
  const verdicts = []
  if (probe.visibilityState !== 'visible')
    verdicts.push({
      level: 'fail',
      message: `page is ${probe.visibilityState}; hidden/background windows starve rAF and fabricate artifacts`
    })
  else verdicts.push({ level: 'ok', message: 'page is visible' })
  if (probe.rafCount500ms < 5)
    verdicts.push({ level: 'fail', message: `rAF starvation: only ${probe.rafCount500ms} frames in ~500ms` })
  else verdicts.push({ level: 'ok', message: `rAF advancing (${probe.rafCount500ms} frames in ~500ms)` })
  if (probe.clockDriftMs > 200)
    verdicts.push({
      level: 'warn',
      message: `timer throttling suspected: 100ms timer took ${100 + probe.clockDriftMs}ms`
    })
  else verdicts.push({ level: 'ok', message: 'clock advancing normally' })
  if (!probe.hasFocus)
    verdicts.push({ level: 'warn', message: 'window lacks focus; interpolation samples may be throttled' })
  const failed = verdicts.some(verdict => verdict.level === 'fail')
  return { command: 'check-env', url, probe, verdicts, verdict: failed ? 'fail' : 'pass' }
}

// ===== touch-flow =====

async function touchFlow(cdp, url, { points, steps }) {
  await navigate(cdp, url)
  // 桌面 Chrome 默认不带触控数字化仪；不开 touch 仿真时 dispatchTouchEvent
  // 不会产生真实 touch 事件流（录制器零事件）——零事件检测因此依然成立。
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  // IIFE：RECORDER_SOURCE 是函数表达式，直接 evaluate 只会得到函数值而不安装录制器。
  await evaluate(cdp, `(${RECORDER_SOURCE})()`)
  const sequence = buildTouchSequence(points, steps)
  for (const { type, touchPoints } of sequence) await cdp.send('Input.dispatchTouchEvent', { type, touchPoints })
  await new Promise(resolve => setTimeout(resolve, 100))
  const events = await evaluate(cdp, 'window.__touchLog ?? []')
  const touchEvents = events.filter(event => event.type.startsWith('touch'))
  const verdict =
    touchEvents.length === 0
      ? {
          level: 'fail',
          message:
            'zero touch events reached the page; this environment delivers mouse-only input and CDP touch findings are void'
        }
      : {
          level: 'ok',
          message: `${touchEvents.length} touch events captured (${[...new Set(touchEvents.map(e => e.type))].join(', ')})`
        }
  return {
    command: 'touch-flow',
    url,
    dispatched: sequence.length,
    events: touchEvents,
    verdicts: [verdict],
    verdict: verdict.level === 'ok' ? 'pass' : 'fail'
  }
}

// ===== interpolate =====

const INTERPOLATE_PROBE = `
  (args) => {
    const target = document.querySelector(args.selector)
    if (!target) return { error: 'target not found: ' + args.selector }
    const read = () => getComputedStyle(target).getPropertyValue(args.property).trim()
    read()
    // 双 rAF + 强制 reflow 固定起始帧，避免把未提交的样式当作过渡起点。
    void target.offsetWidth
    const trigger = args.trigger ? document.querySelector(args.trigger) : target
    if (!trigger) return { error: 'trigger not found: ' + args.trigger }
    trigger.click()
    return new Promise(resolve => {
      const samples = [{ t: 0, value: read() }]
      const start = performance.now()
      const tick = () => {
        const t = performance.now() - start
        samples.push({ t: Math.round(t), value: read() })
        if (t < args.duration) requestAnimationFrame(tick)
        else resolve({ samples })
      }
      requestAnimationFrame(tick)
    })
  }
`

async function interpolate(cdp, url, options) {
  await navigate(cdp, url)
  const { selector, property, trigger, duration } = options
  const result = await evaluate(
    cdp,
    `(${INTERPOLATE_PROBE})(${JSON.stringify({ selector, property, trigger, duration })})`
  )
  if (result.error)
    return { command: 'interpolate', url, verdicts: [{ level: 'fail', message: result.error }], verdict: 'fail' }
  const classification = classifySamples(result.samples.map(sample => sample.value))
  const verdicts = {
    linear: { level: 'ok', message: 'computed value interpolates across frames' },
    stepped: { level: 'fail', message: 'value jumps in a single frame; no interpolation (discrete transition)' },
    none: { level: 'warn', message: 'value never changed; no transition observed (check trigger/selector/duration)' },
    unknown: { level: 'warn', message: 'sampled values are not numeric; provide --property with a numeric value' }
  }[classification]
  return {
    command: 'interpolate',
    url,
    selector,
    property,
    samples: result.samples,
    classification,
    verdicts: [verdicts],
    verdict: classification === 'linear' ? 'pass' : 'fail'
  }
}

// ===== 入口 =====

function printReport(report) {
  if (flag('json')) {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  console.log(`agent-verify ${report.command} @ ${report.url} → ${report.verdict.toUpperCase()}`)
  for (const verdict of report.verdicts)
    console.log(`  ${verdict.level === 'ok' ? '✓' : verdict.level === 'warn' ? '!' : '✗'} ${verdict.message}`)
  if (report.command === 'interpolate')
    console.log(`  classification: ${report.classification} (${report.samples.length} samples)`)
}

async function main() {
  if (!command || command === 'help') {
    console.log(
      'usage: pnpm agent:verify <check-env|touch-flow|interpolate> [--url <url>] [--port <n>] [--headless] [--json] ...'
    )
    return
  }
  const handlers = { 'check-env': checkEnv, 'touch-flow': touchFlow, interpolate }
  const handler = handlers[command]
  if (!handler) return fail(`unknown command: ${command}`)
  const url = option('url') ?? 'https://127.0.0.1:5173/'
  const attachPort = Number(option('port') ?? process.env.CHROME_DEBUG_PORT) || undefined
  let session
  if (attachPort) session = { port: attachPort, child: null, profileDir: null }
  else {
    session = await spawnChrome()
    if (!session) return
  }
  try {
    const cdp = await connectCdp(session.port)
    try {
      let report
      if (command === 'touch-flow') {
        const points = parsePoints(option('points')) ?? [
          { x: 40, y: 80 },
          { x: 340, y: 420 }
        ]
        report = await touchFlow(cdp, url, { points, steps: Number(option('steps') ?? 10) })
      } else if (command === 'interpolate') {
        report = await interpolate(cdp, url, {
          selector: option('selector') ?? 'dialog',
          property: option('property') ?? 'opacity',
          trigger: option('trigger'),
          duration: Number(option('duration') ?? 800)
        })
      } else report = await checkEnv(cdp, url)
      printReport(report)
      process.exitCode = report.verdict === 'pass' ? 0 : 1
    } finally {
      cdp.close()
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  } finally {
    session.child?.kill()
    // Chrome 退出与文件刷盘是异步的，profile 清理尽力而为（mkdtemp 目录由系统回收）。
    if (session.profileDir)
      setTimeout(() => fs.rmSync(session.profileDir, { recursive: true, force: true, maxRetries: 3 }), 500)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
