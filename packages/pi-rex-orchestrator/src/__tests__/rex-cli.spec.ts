/**
 * `rex_cli` 的参数边界：session 注入、拒绝点、超时与结果截断。
 *
 * exec 是假实现；期望值来自 `rex --help` / `rex run --help` 真机输出与 brief 的已确认契约。
 */

import { describe, expect, it } from 'vite-plus/test'

import type { PiExecOptions, PiExecResult } from '../pi-types'
import { executeRexCli, truncateStdout, type RexCliDeps } from '../rex-cli'

const SESSION = 'session:01a1f203-b75e-7ca2-adad-9f68dc2c087c'
const ATTACHED_SERVER = '-S' + 'host'
const ATTACHED_SERVER_EQUALS = '-S=' + 'host'
const ATTACHED_CLIENT = '-C' + 'client'
const ATTACHED_CLIENT_EQUALS = '-C=' + 'client'

interface ExecCall {
  command: string
  args: string[]
  options?: PiExecOptions
}

function makeDeps(
  result?: Partial<PiExecResult>,
  workerAgentBinaries: readonly string[] = ['claude', 'codex', 'pi']
): {
  deps: RexCliDeps
  calls: ExecCall[]
} {
  const calls: ExecCall[] = []
  const exec = async (command: string, args: string[], options?: PiExecOptions): Promise<PiExecResult> => {
    calls.push({ command, args, options })
    return {
      stdout: '',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false,
      ...result
    }
  }
  return { deps: { exec, bin: '/opt/rex', session: SESSION, workerAgentBinaries: new Set(workerAgentBinaries) }, calls }
}

describe('session 注入', () => {
  it.each([
    {
      input: ['run', '-c', '/repo', '--', 'pnpm', 'test'],
      expected: ['run', '-c', '/repo', '-s', SESSION, '--', 'pnpm', 'test']
    },
    {
      input: ['split', '--', 'pnpm', 'test'],
      expected: ['split', '-s', SESSION, '--', 'pnpm', 'test']
    },
    {
      input: ['capture', '-b', 'block:1', '--trim'],
      expected: ['capture', '-b', 'block:1', '--trim', '-s', SESSION]
    },
    { input: ['send', '-b', 'block:1', 'hello'], expected: ['send', '-b', 'block:1', 'hello', '-s', SESSION] },
    {
      input: ['send-key', '-b', 'block:1', 'enter'],
      expected: ['send-key', '-b', 'block:1', 'enter', '-s', SESSION]
    },
    { input: ['block', 'ls'], expected: ['block', 'ls', '-s', SESSION] },
    { input: ['window', 'ls'], expected: ['window', 'ls', '-s', SESSION] },
    {
      input: ['do', 'session.select', `session_id=${SESSION}`],
      expected: ['do', 'session.select', `session_id=${SESSION}`, '-s', SESSION]
    },
    {
      input: ['window', 'new', 'Logs', '--', 'tail', '-f', 'app.log'],
      expected: ['window', 'new', 'Logs', '-s', SESSION, '--', 'tail', '-f', 'app.log']
    },
    { input: ['client', 'ls'], expected: ['client', 'ls', '-s', SESSION] }
  ])('白名单命令按实测形态生成最终 argv：$input', async ({ input, expected }) => {
    const { deps, calls } = makeDeps()
    await executeRexCli(input, deps)
    expect(calls[0]?.command).toBe('/opt/rex')
    expect(calls[0]?.args).toEqual(expected)
  })

  it.each([
    ['whoami', ['whoami', '--json']],
    ['hosts', ['hosts']],
    ['new', ['new', '--', 'echo', 'ready']],
    ['__internal skill', ['__internal', 'skill']],
    ['session ls', ['session', 'ls']],
    ['-h', ['-h']],
    ['--help', ['--help']],
    ['--version', ['--version']]
  ])('不支持或无需 session 的命令原样透传：%s', async (_name, input) => {
    const { deps, calls } = makeDeps()
    await executeRexCli(input, deps)
    expect(calls[0]?.args).toEqual(input)
  })

  it('显式 -s / --session / --session= 原样透传', async () => {
    const explicit = [
      ['capture', '-s', 'session:other', '-b', 'block:1'],
      ['capture', '--session', 'session:other', '-b', 'block:1'],
      ['capture', '--session=session:other', '-b', 'block:1']
    ]
    for (const args of explicit) {
      const { deps, calls } = makeDeps()
      await executeRexCli(args, deps)
      expect(calls[0]?.args).toEqual(args)
    }
  })

  it('run 命令段自己的 --session 不算 Rex session 参数', async () => {
    const { deps, calls } = makeDeps()
    await executeRexCli(['run', '--', 'pnpm', 'test', '--session=worker'], deps)
    expect(calls[0]?.args).toEqual(['run', '-s', SESSION, '--', 'pnpm', 'test', '--session=worker'])
  })

  it.each([
    'run',
    'split',
    'do',
    'send',
    'send-key',
    'capture',
    'focus',
    'zoom',
    'move',
    'swap',
    'wait',
    'block ls',
    'block list',
    'block inspect',
    'block focus',
    'block send',
    'block send-key',
    'block capture',
    'block zoom',
    'block move',
    'block swap',
    'block call',
    'block rename',
    'block close',
    'window new',
    'window ls',
    'window list',
    'window inspect',
    'window focus',
    'window move',
    'window rename',
    'window close',
    'client ls',
    'client list',
    'api call',
    'forward new',
    'forward open',
    'forward share',
    'forward ls',
    'forward list',
    'forward close',
    'fwd new',
    'fwd open',
    'fwd share',
    'fwd ls',
    'fwd list',
    'fwd close'
  ])('自动注入清单覆盖 %s', async command => {
    const input = [...command.split(' '), '--json']
    const { deps, calls } = makeDeps()
    await executeRexCli(input, deps)
    expect(calls[0]?.args).toEqual([...input, '-s', SESSION])
  })
})

describe('拒绝点', () => {
  it('rejects the long-lived events stream without starting a process', async () => {
    const { deps, calls } = makeDeps()
    const result = await executeRexCli(['events', '--json'], deps)
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('rex_inspect_output')
    expect(result.content[0]?.text).toContain('事件流由扩展内部消费')
    expect(calls).toEqual([])
  })

  it.each([
    ['claude', ['run', '--', 'claude', '-p', 'hello']],
    ['env-prefixed codex', ['run', '--', '/usr/bin/env', 'PI_REX_ORCH=0', 'codex', 'exec']],
    ['pi', ['run', '-c', '/repo', '--', '/opt/agents/pi']],
    ['new', ['new', '--', 'claude', '-p', 'hello']],
    ['split', ['split', '--', 'codex', 'exec']],
    ['do', ['do', 'claude', 'prompt=hello']],
    ['window new', ['window', 'new', 'Worker', '--', '/usr/bin/env', 'PI_REX_ORCH=0', 'codex', 'exec']]
  ])('rejects worker agent started through %s', async (_name, args) => {
    const { deps, calls } = makeDeps()
    const result = await executeRexCli(args, deps)
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('rex_spawn_agent')
    expect(result.content[0]?.text).toContain('白名单只服务 worker 生命周期')
    expect(calls).toEqual([])
  })

  it('rejects a configured profile binary by basename', async () => {
    const { deps, calls } = makeDeps(undefined, ['claude', 'codex', 'pi', 'coder'])
    const result = await executeRexCli(['run', '--', '/opt/acme/coder', '-p', 'hi'], deps)

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('自定义 profile')
    expect(result.content[0]?.text).toContain('rex_spawn_agent')
    expect(calls).toEqual([])
  })

  it('allows a custom binary outside the configured profile set', async () => {
    const { deps, calls } = makeDeps(undefined, ['claude', 'codex', 'pi', 'coder'])
    const result = await executeRexCli(['run', '--', '/opt/acme/other', '-p', 'hi'], deps)

    expect(result.isError).toBeFalsy()
    expect(calls[0]?.args).toEqual(['run', '-s', SESSION, '--', '/opt/acme/other', '-p', 'hi'])
  })

  it.each([
    ['短 verbose 前置 events', ['-v', 'events']],
    ['等号 color 前置 events', ['--color=never', 'events']],
    ['短 verbose 前置 run claude', ['-v', 'run', '--', 'claude']],
    ['短 client 值前置 run codex', ['-C', 'client', 'run', '--', 'codex', 'exec']],
    ['短 server 值前置 run pi', ['-S', 'host', 'run', '--', 'pi']]
  ])('全局 flag 前置仍拒绝 %s 且不启动子进程', async (_name, args) => {
    const { deps, calls } = makeDeps()
    const result = await executeRexCli(args, deps)
    expect(result.isError).toBe(true)
    expect(calls).toEqual([])
  })

  it.each([
    ['未知前置 flag', ['--unknown', 'whoami']],
    ['未知等号 flag', ['--unknown=value', 'whoami']],
    ['空子命令', ['']],
    ['缺少全局 flag 值', ['--timeout']],
    ['只有全局 flag', ['-v', '--autostart']],
    ['前置 --', ['--', 'whoami']],
    ['空的 flag 值', ['--color=', 'whoami']],
    ['空的 attached shorthand 值', ['-S=', 'whoami']],
    ['根自查 flag 后跟子命令', ['-v', '--help', 'whoami']]
  ])('解析失败时 fail closed：%s', async (_name, args) => {
    const { deps, calls } = makeDeps()
    const result = await executeRexCli(args, deps)
    const output = result.content[0]?.text ?? ''
    expect(result.isError).toBe(true)
    expect(output).toContain('请把子命令放在最前')
    expect(output).toContain('rex_cli(["--help"])')
    expect(calls).toEqual([])
  })

  it.each([
    ['布尔 flag 等号值', ['--autostart=false', 'whoami', '--json']],
    ['计数 flag 等号值', ['--verbose=2', 'whoami', '--json']],
    ['重复短 verbose', ['-vv', 'whoami', '--json']],
    ['attached 短 server', [ATTACHED_SERVER, '--timeout=1s', 'whoami', '--json']],
    ['等号形式 attached 短 server', [ATTACHED_SERVER_EQUALS, '--timeout=1s', 'whoami', '--json']],
    ['attached 短 client', [ATTACHED_CLIENT, '--timeout=1s', 'whoami', '--json']],
    ['等号形式 attached 短 client', [ATTACHED_CLIENT_EQUALS, '--timeout=1s', 'whoami', '--json']]
  ])('接受合法的紧凑全局 flag 并原样透传：%s', async (_name, args) => {
    const { deps, calls } = makeDeps()
    const result = await executeRexCli(args, deps)
    expect(result.isError).toBeFalsy()
    expect(calls[0]?.args).toEqual(args)
  })

  it.each([
    ['短 verbose', ['-v', '--help']],
    ['重复短 verbose', ['-vv', '--help']],
    ['布尔 flag 等号值', ['--autostart=false', '--help']],
    ['值型 flag + 短 verbose', ['-S', 'host', '-v', '--help']]
  ])('前置全局 flag 后允许根自查原样透传：%s', async (_name, args) => {
    const { deps, calls } = makeDeps()
    const result = await executeRexCli(args, deps)
    expect(result.isError).toBeFalsy()
    expect(calls[0]?.args).toEqual(args)
  })

  it('前置全局 flag 不妨碍 session 注入和原样透传', async () => {
    const cases = [
      {
        args: ['-v', 'run', '--', 'pnpm', 'test'],
        expected: ['-v', 'run', '-s', SESSION, '--', 'pnpm', 'test']
      },
      {
        args: ['--color=never', 'whoami', '--json'],
        expected: ['--color=never', 'whoami', '--json']
      },
      {
        args: ['--server=host', '--client=mirror', '--timeout=1s', 'capture', '-b', 'block:1'],
        expected: ['--server=host', '--client=mirror', '--timeout=1s', 'capture', '-b', 'block:1', '-s', SESSION]
      },
      {
        args: ['-S', 'host', '--color', 'never', '--timeout', '1s', '-v', '--autostart', 'whoami'],
        expected: ['-S', 'host', '--color', 'never', '--timeout', '1s', '-v', '--autostart', 'whoami']
      },
      {
        args: ['--verbose', '--autostart', 'whoami'],
        expected: ['--verbose', '--autostart', 'whoami']
      }
    ]
    for (const testCase of cases) {
      const { deps, calls } = makeDeps()
      await executeRexCli(testCase.args, deps)
      expect(calls[0]?.args).toEqual(testCase.expected)
    }
  })

  it('allows non-agent commands through every command-launching subcommand', async () => {
    const { deps, calls } = makeDeps({ stdout: 'ok' })
    const cases = [
      {
        args: ['run', '--', 'pnpm', 'test'],
        expected: ['run', '-s', SESSION, '--', 'pnpm', 'test']
      },
      {
        args: ['new', '--', 'echo', 'ready'],
        expected: ['new', '--', 'echo', 'ready']
      },
      {
        args: ['split', '--', 'pnpm', 'test'],
        expected: ['split', '-s', SESSION, '--', 'pnpm', 'test']
      },
      {
        args: ['window', 'new', 'Logs', '--', 'tail', '-f', 'app.log'],
        expected: ['window', 'new', 'Logs', '-s', SESSION, '--', 'tail', '-f', 'app.log']
      },
      {
        args: ['do', 'session.select', `session_id=${SESSION}`],
        expected: ['do', 'session.select', `session_id=${SESSION}`, '-s', SESSION]
      }
    ]
    for (const testCase of cases) {
      const result = await executeRexCli(testCase.args, deps)
      expect(result.isError).toBeFalsy()
    }
    expect(calls.map(call => call.args)).toEqual(cases.map(testCase => testCase.expected))
  })
})

describe('超时', () => {
  it('按子命令选择既有超时，capture 额外放宽 maxBuffer', async () => {
    const cases: Array<{ args: string[]; options: PiExecOptions }> = [
      { args: ['run', '--', 'pnpm', 'test'], options: { timeout: 15000 } },
      { args: ['-v', 'capture', '-b', 'block:1'], options: { timeout: 15000, maxBuffer: 8 * 1024 * 1024 } },
      { args: ['send', '-b', 'block:1', 'hello'], options: { timeout: 10000 } },
      { args: ['send-key', '-b', 'block:1', 'enter'], options: { timeout: 10000 } },
      { args: ['block', 'send', '-b', 'block:1', 'hello'], options: { timeout: 10000 } },
      { args: ['block', 'send-key', '-b', 'block:1', 'enter'], options: { timeout: 10000 } },
      {
        args: ['block', 'capture', '-b', 'block:1'],
        options: { timeout: 15000, maxBuffer: 8 * 1024 * 1024 }
      },
      {
        args: ['-v', 'block', 'capture', '-b', 'block:1'],
        options: { timeout: 15000, maxBuffer: 8 * 1024 * 1024 }
      },
      {
        args: ['capture', '-b', 'block:1', '--trim'],
        options: { timeout: 15000, maxBuffer: 8 * 1024 * 1024 }
      },
      { args: ['block', 'ls'], options: { timeout: 15000 } },
      { args: ['window', 'ls'], options: { timeout: 15000 } },
      { args: ['session', 'ls'], options: { timeout: 15000 } },
      { args: ['api', 'list'], options: { timeout: 15000 } },
      { args: ['whoami'], options: { timeout: 15000 } }
    ]

    for (const testCase of cases) {
      const { deps, calls } = makeDeps()
      await executeRexCli(testCase.args, deps)
      expect(calls[0]?.options).toEqual(testCase.options)
    }
  })
})

describe('结果回传', () => {
  it('先保留 stdout，再附 stderr 与完整退出码', async () => {
    const { deps } = makeDeps({ stdout: 'done', stderr: 'warning', code: 0 })
    const result = await executeRexCli(['window', 'ls'], deps)
    expect(result.isError).toBeFalsy()
    expect(result.content[0]?.text).toBe('done\n\n[stderr]\nwarning\n\n[exit code: 0]')
  })

  it('非零退出不抛异常，保留 stderr 尾部和完整退出码', async () => {
    const stderr = `${'A'.repeat(2500)}TAIL`
    const { deps } = makeDeps({ stdout: 'partial', stderr, code: 7 })
    const result = await executeRexCli(['capture', '-b', 'block:1'], deps)
    const output = result.content[0]?.text ?? ''
    const errorBody = output.split('[stderr]\n')[1]?.split('\n\n[exit code:')[0]

    expect(result.isError).toBe(true)
    expect(output.startsWith('partial\n\n[stderr]\n')).toBe(true)
    expect(errorBody).toHaveLength(2000)
    expect(errorBody?.endsWith('TAIL')).toBe(true)
    expect(output).toContain('[exit code: 7]')
  })

  it('200 行上限先到，尾注给出显示与总行数', async () => {
    const stdout = Array.from({ length: 205 }, (_, index) => `line ${index + 1}`).join('\n')
    const { deps } = makeDeps({ stdout })
    const result = await executeRexCli(['capture', '-b', 'block:1'], deps)
    const output = result.content[0]?.text ?? ''

    expect(output).toContain('line 200')
    expect(output).not.toContain('line 201')
    expect(output).toContain('[truncated: 显示 200 / 共 205 行]')
  })

  it('16000 字符上限先到，长单行仍计为一行', async () => {
    const stdout = 'x'.repeat(16001)
    const { deps } = makeDeps({ stdout })
    const result = await executeRexCli(['capture', '-b', 'block:1'], deps)
    const output = result.content[0]?.text ?? ''

    expect(output.startsWith('x'.repeat(16000))).toBe(true)
    expect(output).toContain('[truncated: 字符上限 16000 / 原长 16001 字符]')
    expect(output).not.toContain('显示 1 / 共 1 行')
  })

  it('恰好 200 行加一个尾换行不报截断', async () => {
    const stdout = `${Array.from({ length: 200 }, (_, index) => `line ${index + 1}`).join('\n')}\n`
    const result = truncateStdout(stdout)

    expect(result.truncated).toBe(false)
    expect(result.shownLines).toBe(200)
    expect(result.totalLines).toBe(200)
    expect(result.text).toBe(stdout)
  })

  it('空输出记为 0 行', () => {
    expect(truncateStdout('')).toMatchObject({
      text: '',
      truncated: false,
      truncation: 'none',
      shownLines: 0,
      totalLines: 0
    })
  })

  it('参数畸形时返回明确错误，不启动子进程', async () => {
    const { deps, calls } = makeDeps()
    for (const args of [[], ['window', 1], 'window', null]) {
      const result = await executeRexCli(args, deps)
      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toContain('非空字符串数组')
    }
    expect(calls).toEqual([])
  })

  it('exec reject 转成工具错误，保留原始 message', async () => {
    const deps: RexCliDeps = {
      bin: 'rex',
      session: SESSION,
      workerAgentBinaries: new Set(['claude', 'codex', 'pi']),
      exec: async () => {
        throw new Error('rex server unavailable')
      }
    }
    const result = await executeRexCli(['window', 'ls'], deps)
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('rex server unavailable')
  })
})

describe('truncateStdout', () => {
  it('未超限时原样返回', () => {
    expect(truncateStdout('a\nb')).toEqual({
      text: 'a\nb',
      truncated: false,
      truncation: 'none',
      shownLines: 2,
      totalLines: 2,
      totalChars: 3
    })
  })
})
