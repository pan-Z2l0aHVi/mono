import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { defineExec } from '../plugins/exec'
import { defineTurbo } from '../plugins/turbo'
import type { CheckUnit } from '../runner/check-runner'

// 包构建会读包目录之外的输入（工具链生成物、共享配置），它们的缓存键必须同时覆盖这些输入，
// 又不能被文档与测试文件污染。本检查在隔离的 workspace 副本里跑 Turbo 的 `--dry=json`，
// 既不读也不写真实应用的缓存，只看任务哈希。包名、包目录与输入清单都是消费仓库的事实，
// 经 options 传入。

const TASKS = ['build', 'test'] as const

export interface TurboInput {
  /** 仓库相对路径 */
  readonly path: string
  /** fixture 里的初始内容 */
  readonly contents: string
  /** 失败信息里用来指认这条输入的名字 */
  readonly label: string
  /** 改动后的内容，必须与初始内容不同 */
  readonly change: string
}

export interface TurboInputsOptions {
  readonly name: string
  /** `--filter` 使用的包名 */
  readonly packageName: string
  /** 包目录，仓库相对 */
  readonly packageDir: string
  /** 从真实仓库原样复制进 fixture 的文件（Turbo 配置、模块清单等） */
  readonly copiedFiles: readonly string[]
  /** 改动后必须让每个任务失效的文件 */
  readonly requiredInputs: readonly TurboInput[]
  /** 改动后不得让任何任务失效的文件 */
  readonly ignoredInputs: readonly TurboInput[]
}

function writeFixture(root: string, relativePath: string, contents: string): void {
  const absolutePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, contents)
}

export function defineTurboInputs(options: TurboInputsOptions): CheckUnit {
  const { name, packageName, packageDir, copiedFiles, requiredInputs, ignoredInputs } = options
  const plugins = defineExec().use(defineTurbo())

  return {
    name,
    async run({ root, env = process.env }: { root: string; env?: NodeJS.ProcessEnv }): Promise<string> {
      const { exec, cli } = plugins.make({ root })
      const turboCli = cli()
      if (!fs.existsSync(turboCli))
        throw new Error(`Turbo executable not found at ${turboCli}; install workspace dependencies first`)

      const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`))

      try {
        writeFixture(
          fixtureRoot,
          'package.json',
          JSON.stringify({ name: 'turbo-fixture', private: true, packageManager: 'pnpm@12.4.0' })
        )
        writeFixture(fixtureRoot, 'pnpm-workspace.yaml', `packages:\n  - ${packageDir}\n`)
        writeFixture(
          fixtureRoot,
          'pnpm-lock.yaml',
          `lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n  ${packageDir}: {}\n`
        )
        for (const file of copiedFiles) {
          const destination = path.join(fixtureRoot, file)
          fs.mkdirSync(path.dirname(destination), { recursive: true })
          fs.copyFileSync(path.join(root, file), destination)
        }
        writeFixture(
          fixtureRoot,
          `${packageDir}/package.json`,
          JSON.stringify({
            name: packageName,
            private: true,
            scripts: { build: 'echo build', test: 'echo test' }
          })
        )
        for (const input of [...requiredInputs, ...ignoredInputs]) {
          writeFixture(fixtureRoot, input.path, input.contents)
        }

        const fixtureEnv = {
          ...env,
          TURBO_CACHE_DIR: path.join(fixtureRoot, '.turbo'),
          TURBO_TELEMETRY_DISABLED: '1'
        }

        function taskHash(task: string): string {
          const result = exec(process.execPath, [turboCli, 'run', task, `--filter=${packageName}`, '--dry=json'], {
            cwd: fixtureRoot,
            env: fixtureEnv
          })
          if (!result.ok) throw new Error(`turbo ${task} dry-run failed: ${result.stderr}`)
          const output = JSON.parse(result.stdout) as { tasks: Array<{ taskId: string; hash: string }> }
          const target = output.tasks.find(item => item.taskId === `${packageName}#${task}`)
          if (!target) throw new Error(`turbo dry-run must contain ${packageName}#${task}`)
          return target.hash
        }

        const hashes = (): string[] => TASKS.map(taskHash)

        for (const input of requiredInputs) {
          const before = hashes()
          writeFixture(fixtureRoot, input.path, input.change)
          TASKS.forEach((task, index) => {
            if (taskHash(task) === before[index]) throw new Error(`${input.label} must invalidate ${task}`)
          })
          writeFixture(fixtureRoot, input.path, input.contents)
        }

        for (const input of ignoredInputs) {
          const before = hashes()
          writeFixture(fixtureRoot, input.path, input.change)
          TASKS.forEach((task, index) => {
            if (taskHash(task) !== before[index]) throw new Error(`${input.label} must not invalidate ${task}`)
          })
        }

        return `${requiredInputs.length} input(s) invalidate ${packageName}; ${ignoredInputs.length} do not`
      } finally {
        fs.rmSync(fixtureRoot, { recursive: true, force: true })
      }
    }
  }
}
