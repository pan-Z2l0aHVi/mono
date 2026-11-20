/**
 * Profile 白名单与双模命令模板。
 *
 * 守的核心契约：位置参数 prompt 永远在值型 flag（`--add-dir`）之前（claude 实测
 * 会把紧跟其后的 prompt 吞成 flag 值）；`codex exec resume` 不带 `--add-dir`；
 * 高危标志检测命中即产生告警。
 */

import { describe, expect, it, vi } from 'vite-plus/test'

import {
  auditProfileArgs,
  CODEX_PROFILE,
  CLAUDE_PROFILE,
  loadUserConfig,
  resolveExecutable,
  resolveProfiles,
  type RexOrchestratorConfig
} from '../profiles'

const ctx = { cwd: '/repo', handoffDir: '/cache/s/w-1', prompt: 'read the brief' }
const resumeCtx = { ...ctx, sessionId: 'sid-123' }

describe('内置 claude 模板', () => {
  it('interactive：prompt 在 --add-dir 之前', () => {
    expect(CLAUDE_PROFILE.interactiveArgs(ctx)).toEqual([ctx.prompt, '--add-dir', ctx.handoffDir])
  })

  it('headless：-p 在前、prompt 紧随，stream-json 落盘', () => {
    expect(CLAUDE_PROFILE.headlessArgs(ctx)).toEqual([
      '-p',
      ctx.prompt,
      '--add-dir',
      ctx.handoffDir,
      '--output-format',
      'stream-json',
      '--verbose'
    ])
  })

  it('headless 续跑带 --resume 且 prompt 不被值型 flag 吞掉', () => {
    const args = CLAUDE_PROFILE.headlessResumeArgs(resumeCtx, 'sid-123')
    expect(args[1]).toBe(ctx.prompt)
    expect(args).toContain('--resume')
    expect(args).toContain('sid-123')
  })
})

describe('内置 codex 模板', () => {
  it('headless 走 exec --json，prompt 在 --add-dir 之前', () => {
    expect(CODEX_PROFILE.headlessArgs(ctx)).toEqual(['exec', '--json', ctx.prompt, '--add-dir', ctx.handoffDir])
  })

  it('resume 不带 --add-dir（codex exec resume 没有该 flag）且 --json 在 resume 之后', () => {
    const args = CODEX_PROFILE.headlessResumeArgs(resumeCtx, 'uuid-1')
    expect(args).toEqual(['exec', 'resume', '--json', 'uuid-1', ctx.prompt])
    expect(args.some(arg => arg === '--add-dir')).toBe(false)
  })
})

describe('白名单解析', () => {
  it('默认只有 claude 与 codex', () => {
    expect([...resolveProfiles(undefined).keys()].sort()).toEqual(['claude', 'codex'])
  })

  it('config 覆写内置 profile 的 binary 与追加参数，模板保持', () => {
    const config: RexOrchestratorConfig = {
      profiles: { claude: { binary: '/opt/claude', extraArgs: ['--model', 'opus'] } }
    }
    const profiles = resolveProfiles(config)
    const claude = profiles.get('claude')
    expect(claude?.binary).toBe('/opt/claude')
    expect(claude?.headlessArgs(ctx)).toContain('--model')
    expect(claude?.headlessArgs(ctx)).toContain('stream-json')
  })

  it('覆写的 supportsOsc7501 与 dangerFlags 真正生效，不被静默丢弃（PR 审查 Should fix）', () => {
    const claude = resolveProfiles({
      profiles: { claude: { supportsOsc7501: false, dangerFlags: ['--my-danger'] } }
    }).get('claude')
    expect(claude?.supportsOsc7501).toBe(false)
    expect(auditProfileArgs(claude as NonNullable<typeof claude>, ['--my-danger'])).toHaveLength(1)
  })

  it('追加参数覆盖全部模板，含 headless resume（re-review #8）', () => {
    const config: RexOrchestratorConfig = { profiles: { claude: { extraArgs: ['--model', 'opus'] } } }
    const claude = resolveProfiles(config).get('claude')
    expect(claude?.headlessResumeArgs(resumeCtx, 'sid-1')).toEqual([
      '-p',
      ctx.prompt,
      '--resume',
      'sid-1',
      '--add-dir',
      ctx.handoffDir,
      '--output-format',
      'stream-json',
      '--verbose',
      '--model',
      'opus'
    ])
  })

  it('字段级类型不符的条目按缺省处理（re-review #16）', () => {
    const profiles = resolveProfiles({
      profiles: { claude: { binary: 123 }, codex: { extraArgs: 1 }, ghost: { extraArgs: ['ok'] } }
    } as unknown as Parameters<typeof resolveProfiles>[0])
    expect(profiles.get('claude')).toBe(CLAUDE_PROFILE)
    expect(profiles.get('codex')).toBe(CODEX_PROFILE)
    expect(profiles.has('ghost')).toBe(false)
  })

  it('自定义 profile 必须显式给 binary，否则被忽略', () => {
    const profiles = resolveProfiles({ profiles: { ghost: { extraArgs: ['--x'] } } })
    expect(profiles.has('ghost')).toBe(false)
  })

  it('结构不合法的条目（null / 非 object）按缺省处理，不抛异常（review #16）', () => {
    const profiles = resolveProfiles({
      profiles: { claude: null, codex: 'oops', ghost: null }
    } as unknown as Parameters<typeof resolveProfiles>[0])
    expect([...profiles.keys()].sort()).toEqual(['claude', 'codex'])
    expect(profiles.get('claude')).toBe(CLAUDE_PROFILE)
  })

  it('自定义 profile 的 prompt 在 extraArgs 之前', () => {
    const profiles = resolveProfiles({ profiles: { ghost: { binary: 'ghost-cli', extraArgs: ['--fast'] } } })
    const ghost = profiles.get('ghost')
    expect(ghost?.interactiveArgs(ctx)).toEqual([ctx.prompt, '--fast'])
  })
})

describe('高危标志审计', () => {
  it('命中即告警', () => {
    const warnings = auditProfileArgs(CLAUDE_PROFILE, ['--yolo', ctx.prompt])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('--yolo')
  })

  it('干净参数不告警', () => {
    expect(auditProfileArgs(CLAUDE_PROFILE, CLAUDE_PROFILE.headlessArgs(ctx))).toEqual([])
  })
})

describe('可执行解析', () => {
  type ExecResult = { stdout: string; stderr: string; code: number; killed: boolean; truncated: boolean }

  it('绝对路径存在即直用，不存在返回 null', async () => {
    const exec = vi.fn<() => Promise<ExecResult>>(async () => ({
      stdout: '',
      stderr: '',
      code: 1,
      killed: false,
      truncated: false
    }))
    expect(await resolveExecutable('/opt/claude', { exec, fileExists: async () => true })).toBe('/opt/claude')
    expect(await resolveExecutable('/opt/claude', { exec, fileExists: async () => false })).toBeNull()
    expect(exec).not.toHaveBeenCalled()
  })

  it('裸命令名经 which 解析，找不到返回 null', async () => {
    const exec = vi.fn<() => Promise<ExecResult>>(async () => ({
      stdout: '/opt/homebrew/bin/claude\n/usr/bin/claude\n',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    expect(await resolveExecutable('claude', { exec, fileExists: async () => false })).toBe('/opt/homebrew/bin/claude')
    const empty = vi.fn<() => Promise<ExecResult>>(async () => ({
      stdout: '',
      stderr: 'not found',
      code: 1,
      killed: false,
      truncated: false
    }))
    expect(await resolveExecutable('nope', { exec: empty, fileExists: async () => false })).toBeNull()
  })
})

describe('用户配置加载', () => {
  const base = {
    homedir: '/home/u',
    readFile: async (path: string) => {
      if (path === '/home/u/.pi/agent/rex-orchestrator.json') return '{"profiles":{"claude":{"binary":"/opt/claude"}}}'
      throw new Error('missing')
    },
    stat: async () => ({ mode: 0o600 }),
    exists: async (path: string) => path === '/home/u/.pi/agent/rex-orchestrator.json'
  }

  it('文件缺失时零告警、零配置', async () => {
    const loaded = await loadUserConfig({ ...base, exists: async () => false })
    expect(loaded.config).toBeUndefined()
    expect(loaded.warnings).toEqual([])
  })

  it('group/other 可写时告警但不阻断', async () => {
    const loaded = await loadUserConfig({ ...base, stat: async () => ({ mode: 0o646 }) })
    expect(loaded.config?.profiles?.claude?.binary).toBe('/opt/claude')
    expect(loaded.warnings.join('\n')).toContain('权限过宽')
  })

  it('JSON 损坏降级为默认配置并保留原因', async () => {
    const loaded = await loadUserConfig({ ...base, readFile: async () => '{oops' })
    expect(loaded.config).toBeUndefined()
    expect(loaded.warnings.join('\n')).toContain('解析失败')
  })
})
