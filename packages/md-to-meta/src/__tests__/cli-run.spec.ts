import path from 'node:path'

import { describe, expect, it, vi } from 'vite-plus/test'

import { CLI_USAGE, runCli, type CliDeps } from '../cli-run'
import type { GenerateResult, MdToMetaOptions } from '../types'

const OPTIONS: MdToMetaOptions = { input: 'docs/*.md', output: 'src/generated' }
const RESULT: GenerateResult = { files: [{ path: '/tmp/out/a.meta.js', content: '' }], output: '/tmp/out' }

function fakeDeps() {
  return {
    loadOptions: vi.fn<CliDeps['loadOptions']>(async () => ({ mdToMetaOptions: OPTIONS })),
    generate: vi.fn<CliDeps['generate']>(async () => RESULT),
    checkArtifacts: vi.fn<CliDeps['checkArtifacts']>(),
    writeArtifacts: vi.fn<CliDeps['writeArtifacts']>()
  }
}

describe('runCli 参数校验', () => {
  it('未知模式或缺 app-dir 时打印用法并返回 2，不碰宿主配置', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = fakeDeps()
    try {
      expect(await runCli([], deps)).toBe(2)
      expect(await runCli(['run', 'apps/a'], deps)).toBe(2)
      expect(await runCli(['check'], deps)).toBe(2)

      expect(error).toHaveBeenCalledTimes(3)
      expect(error).toHaveBeenCalledWith(CLI_USAGE)
      expect(deps.loadOptions).not.toHaveBeenCalled()
    } finally {
      error.mockRestore()
    }
  })
})

describe('runCli 生成与落盘', () => {
  it('check 只判不改；每个 app-dir 按自己的 root 解析配置', async () => {
    const deps = fakeDeps()

    expect(await runCli(['check', 'apps/a', 'apps/b'], deps)).toBe(0)

    expect(deps.loadOptions.mock.calls).toEqual([[path.resolve('apps/a')], [path.resolve('apps/b')]])
    expect(deps.generate.mock.calls).toEqual([
      [
        {
          root: path.resolve('apps/a'),
          input: ['docs/*.md'],
          output: path.resolve('apps/a', 'src/generated'),
          exec: []
        }
      ],
      [
        {
          root: path.resolve('apps/b'),
          input: ['docs/*.md'],
          output: path.resolve('apps/b', 'src/generated'),
          exec: []
        }
      ]
    ])
    expect(deps.checkArtifacts.mock.calls).toEqual([
      [RESULT.files, RESULT.output],
      [RESULT.files, RESULT.output]
    ])
    expect(deps.writeArtifacts).not.toHaveBeenCalled()
  })

  it('write 走落盘而不是校验', async () => {
    const deps = fakeDeps()

    expect(await runCli(['write', 'apps/a'], deps)).toBe(0)

    expect(deps.writeArtifacts).toHaveBeenCalledExactlyOnceWith(RESULT.files, RESULT.output)
    expect(deps.checkArtifacts).not.toHaveBeenCalled()
  })

  it('宿主配置没有导出 mdToMetaOptions 时抛错并带上配置路径', async () => {
    const deps = fakeDeps()
    deps.loadOptions.mockResolvedValue({})

    await expect(runCli(['check', 'apps/a'], deps)).rejects.toThrow(
      `${path.resolve('apps/a')}/vite.config.ts 没有导出 mdToMetaOptions`
    )
    expect(deps.generate).not.toHaveBeenCalled()
  })
})
