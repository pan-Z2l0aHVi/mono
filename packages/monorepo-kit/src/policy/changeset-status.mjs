import { commandOutput, exec, pnpm } from '../shared/exec.mjs'

export const name = 'changeset-status'

export async function run({ root, base }) {
  const result = exec(pnpm, ['exec', 'changeset', 'status', `--since=${base}`], { cwd: root })
  if (!result.ok) {
    const output = commandOutput(result)
    throw new Error(`changeset status --since=${base} failed${output ? `:\n${output}` : ''}`)
  }
  return `since ${base}`
}
