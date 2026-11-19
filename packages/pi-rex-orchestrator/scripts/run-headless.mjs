#!/usr/bin/env node
/**
 * headless worker 的只读包装脚本（V3-03 契约）。
 *
 * 用法：`run-headless.mjs --events-out <path> -- <cli> <args...>`
 *
 * - 子进程 stdout 的原始 JSONL **无损**写入 events-out 文件，同时把解析后的
 *   工具调用、阶段进展与最终结论渲染成人类可读摘要打到本 PTY（Rex Tab 可读，
 *   无 JSON 刷屏）。
 * - 显式捕获 SIGINT / SIGTERM 并转发给子进程；用户在 Rex Tab 按 Ctrl+C 时不会
 *   遗留孤儿 claude/codex 进程。
 * - 子进程 exit 后先等 JSONL 写入流 `end()` flush，再以子进程真实退出码退出，
 *   防止截断末尾事件（丢 session_id）并保证 Rex 的 child_exited 状态真实。
 *
 * 只用 Node 内置模块；本脚本不经 jiti/TS，保持纯 JS 便于 `rex run` 直接执行。
 */

import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'

const argv = process.argv.slice(2)
const eventsOutIndex = argv.indexOf('--events-out')
const separatorIndex = argv.indexOf('--')
if (eventsOutIndex === -1 || separatorIndex === -1 || separatorIndex <= eventsOutIndex + 1) {
  process.stderr.write('usage: run-headless.mjs --events-out <path> -- <cli> <args...>\n')
  process.exit(64)
}
const eventsOut = argv[eventsOutIndex + 1]
const command = argv[separatorIndex + 1]
const commandArgs = argv.slice(separatorIndex + 2)
if (command === undefined) {
  process.stderr.write('run-headless: missing command after --\n')
  process.exit(64)
}

const eventsStream = createWriteStream(eventsOut, { flags: 'a' })
eventsStream.on('error', error => {
  process.stderr.write(`run-headless: events 文件写入失败: ${error.message}\n`)
})

const child = spawn(command, commandArgs, {
  stdio: ['inherit', 'pipe', 'inherit'],
  env: process.env
})

let childExitCode = null
let forwarding = false

// 转发终端信号给子进程；flush 完成前不退出进程。
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    forwarding = true
    if (child.pid !== undefined) {
      try {
        child.kill(signal)
      } catch {
        // 子进程已退出则忽略；flush 逻辑由 close handler 收尾。
      }
    }
  })
}

child.stdout.setEncoding('utf8')
let buffer = ''
child.stdout.on('data', chunk => {
  buffer += chunk
  let newline = buffer.indexOf('\n')
  while (newline !== -1) {
    const line = buffer.slice(0, newline)
    buffer = buffer.slice(newline + 1)
    handleLine(line)
    newline = buffer.indexOf('\n')
  }
})

child.on('close', (code, signal) => {
  // 子进程的真实退出码优先；只有被信号杀死（code 为 null）才按信号合成退出码。
  childExitCode = code !== null ? code : forwarding ? 128 + (signal === 'SIGINT' ? 2 : 15) : code
  if (buffer.trim() !== '') handleLine(buffer)
  eventsStream.end(() => {
    process.exit(childExitCode ?? 0)
  })
})

/** 原始行无损落盘，同时渲染一段人类可读摘要。 */
function handleLine(line) {
  const trimmed = line.replace(/\r$/, '')
  if (trimmed !== '') {
    eventsStream.write(trimmed + '\n')
    const summary = renderSummary(trimmed)
    if (summary !== undefined) process.stdout.write(summary + '\n')
  }
}

/**
 * 把一行 agent 事件渲染成摘要；不认识的形状返回 undefined（不刷屏）。
 * 已知形态来自 2026-11-19 实测：
 * - claude stream-json：`{type, subtype, message:{content:[{text}]}, result, session_id}`
 * - codex --json：`{id?, msg:{type,...}}` / `{type, ...}`；只挑得出文本的渲染。
 */
function renderSummary(line) {
  let event
  try {
    event = JSON.parse(line)
  } catch {
    return line.length <= 200 ? line : undefined
  }
  if (typeof event !== 'object' || event === null) return undefined

  if (event.type === 'result') {
    const result = typeof event.result === 'string' ? event.result : ''
    const usage =
      event.usage && typeof event.usage.total_cost_usd === 'number' ? ` (cost $${event.usage.total_cost_usd})` : ''
    return `── 结果（exit ${event.is_error === true ? 'error' : 'ok'}${usage}）\n${clip(result, 1200)}`
  }
  if (event.type === 'system' && event.subtype === 'init') {
    return `── ${event.app ?? 'agent'} 会话开始（model ${event.model ?? '?'}）`
  }
  if (event.type === 'assistant' && event.message && Array.isArray(event.message.content)) {
    const texts = event.message.content
      .filter(block => block && block.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
    if (texts.length > 0) return `▌ ${clip(texts.join(' '), 600)}`
    const toolUses = event.message.content.filter(block => block && block.type === 'tool_use')
    for (const use of toolUses) {
      return `· 工具调用 ${use.name} ${clip(JSON.stringify(use.input ?? {}), 200)}`
    }
    return undefined
  }
  if (event.msg && typeof event.msg === 'object') {
    const msg = event.msg
    if (msg.type === 'agent_message' && typeof msg.message === 'string') {
      return `▌ ${clip(msg.message, 600)}`
    }
    if (msg.type === 'task_started') return '── 任务开始'
    if (msg.type === 'task_complete') return '── 任务完成'
    if (typeof msg.type === 'string' && msg.type.startsWith('token_count')) return undefined
    if (typeof msg.type === 'string') return `· ${msg.type}`
  }
  if (typeof event.type === 'string' && event.type.startsWith('item.')) {
    return `· ${event.type}${event.item && event.item.type ? ` ${event.item.type}` : ''}`
  }
  return undefined
}

function clip(text, max) {
  return text.length > max ? `${text.slice(0, max)}…(截断)` : text
}
