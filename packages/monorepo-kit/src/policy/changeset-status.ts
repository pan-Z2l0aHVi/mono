import { commandOutput, exec, pnpm } from '../shared/exec'

export const name = 'changeset-status'

interface Options {
  root: string
  base: string
}

export async function run({ root, base }: Options): Promise<string> {
  const result = exec(pnpm, ['exec', 'changeset', 'status', `--since=${base}`], { cwd: root })
  if (!result.ok) {
    const output = commandOutput(result)
    throw new Error(`changeset status --since=${base} failed${output ? `:\n${output}` : ''}`)
  }
  return `since ${base}`
}
